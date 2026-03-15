// app/api/ingest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { recordHit, runDeadRouteDetection } from "@/lib/detect";

const HitSchema = z.object({
  method: z.string().toUpperCase(),
  path: z.string(),
  statusCode: z.number().int().optional(),
  durationMs: z.number().int().optional(),
  userAgent: z.string().optional(),
  ip: z.string().optional(),
  framework: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

const BatchSchema = z.object({
  hits: z.array(HitSchema).max(500),
});

/**
 * POST /api/ingest
 * Authorization: Bearer dr_live_<key>
 *
 * Body (single hit):
 * { method, path, statusCode?, durationMs?, userAgent?, ip?, framework? }
 *
 * Body (batch):
 * { hits: [...] }
 */
export async function POST(req: NextRequest) {
  // 1. Authenticate
  const authHeader = req.headers.get("authorization");
  const apiKey = authHeader?.replace("Bearer ", "").trim();

  if (!apiKey) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  const keyRecord = await db.apiKey.findUnique({
    where: { key: apiKey },
    include: { project: true },
  });

  if (!keyRecord || keyRecord.revokedAt) {
    return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 });
  }

  // Update last used
  await db.apiKey.update({
    where: { id: keyRecord.id },
    data: { lastUsed: new Date() },
  });

  const projectId = keyRecord.projectId;

  // 2. Parse body — support both single hit and batch
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const isBatch = body && typeof body === "object" && "hits" in (body as object);

  if (isBatch) {
    // Batch ingest
    const parsed = BatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    await Promise.all(
      parsed.data.hits.map((hit) =>
        recordHit({ projectId, ...hit })
      )
    );

    // Run detection async (don't await — keep response fast)
    runDeadRouteDetection(projectId).catch(console.error);

    return NextResponse.json({ ok: true, ingested: parsed.data.hits.length });
  } else {
    // Single hit
    const parsed = HitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    await recordHit({ projectId, ...parsed.data });

    return NextResponse.json({ ok: true, ingested: 1 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: "ok", version: "1.0" });
}
