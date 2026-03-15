// app/api/endpoints/[projectId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

type Params = { params: { projectId: string } };

// GET /api/endpoints/[projectId]?filter=all|dead|active&sort=lastSeen|hits
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findFirst({
    where: { id: params.projectId, userId: session.user.id },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "all";
  const sort = searchParams.get("sort") ?? "lastSeen";

  const where: Record<string, unknown> = { projectId: params.projectId, isIgnored: false };
  if (filter === "dead") where.isDead = true;
  if (filter === "active") where.isDead = false;
  if (filter === "flagged") where.isFlagged = true;

  const endpoints = await db.endpoint.findMany({
    where,
    orderBy: sort === "hits" ? { totalHits: "desc" } : { lastSeen: "desc" },
    include: {
      hits: {
        orderBy: { timestamp: "desc" },
        take: 50,
        select: { timestamp: true, statusCode: true, durationMs: true },
      },
    },
  });

  // Stats
  const total = await db.endpoint.count({ where: { projectId: params.projectId } });
  const dead = await db.endpoint.count({ where: { projectId: params.projectId, isDead: true } });
  const flagged = await db.endpoint.count({ where: { projectId: params.projectId, isFlagged: true } });

  return NextResponse.json({ endpoints, stats: { total, dead, flagged, active: total - dead } });
}

// PATCH /api/endpoints/[projectId] — update single endpoint (flag, ignore, etc.)
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpointId, action } = await req.json();

  const endpoint = await db.endpoint.findFirst({
    where: { id: endpointId, project: { userId: session.user.id } },
  });
  if (!endpoint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (action === "flag") updates.isFlagged = true;
  if (action === "unflag") updates.isFlagged = false;
  if (action === "ignore") updates.isIgnored = true;
  if (action === "unignore") updates.isIgnored = false;

  const updated = await db.endpoint.update({ where: { id: endpointId }, data: updates });
  return NextResponse.json({ endpoint: updated });
}
