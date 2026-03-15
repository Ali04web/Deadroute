// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
});

// GET /api/projects — list all projects for current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await db.project.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { endpoints: true } },
      endpoints: {
        where: { isDead: true },
        select: { id: true },
      },
      apiKeys: {
        where: { revokedAt: null },
        select: { key: true, name: true, lastUsed: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ projects });
}

// POST /api/projects — create a project
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateProjectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const slug = parsed.data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + nanoid(6);

  const project = await db.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      slug,
      userId: session.user.id,
      apiKeys: {
        create: {
          key: `dr_live_${nanoid(32)}`,
          name: "Default",
        },
      },
    },
    include: {
      apiKeys: { select: { key: true, name: true } },
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
