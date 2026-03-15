// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const passwordHash = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@deadroute.dev" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@deadroute.dev",
      passwordHash,
    },
  });

  const project = await prisma.project.upsert({
    where: { slug: "my-api" },
    update: {},
    create: {
      name: "My API",
      slug: "my-api",
      description: "Main production API",
      userId: user.id,
      apiKeys: {
        create: { key: `dr_live_${nanoid(32)}`, name: "Production" },
      },
    },
  });

  const endpoints = [
    { method: "GET", path: "/api/v1/users", hits: 12847, daysAgo: 0 },
    { method: "POST", path: "/api/v1/auth/login", hits: 45293, daysAgo: 0 },
    { method: "GET", path: "/api/v1/products", hits: 8432, daysAgo: 0 },
    { method: "GET", path: "/api/v1/analytics", hits: 3249, daysAgo: 0 },
    { method: "POST", path: "/api/v1/orders", hits: 1823, daysAgo: 1 },
    { method: "GET", path: "/api/v1/users/:id", hits: 5621, daysAgo: 0 },
    { method: "DELETE", path: "/api/v1/legacy/export", hits: 0, daysAgo: 87, dead: true },
    { method: "POST", path: "/api/v2/old-checkout", hits: 3, daysAgo: 124, dead: true },
    { method: "GET", path: "/api/v1/reports/weekly", hits: 12, daysAgo: 45, dead: true },
  ];

  for (const ep of endpoints) {
    const lastSeen = new Date();
    lastSeen.setDate(lastSeen.getDate() - ep.daysAgo);

    await prisma.endpoint.upsert({
      where: {
        projectId_method_path: { projectId: project.id, method: ep.method, path: ep.path },
      },
      update: {},
      create: {
        method: ep.method,
        path: ep.path,
        rawPath: ep.path,
        totalHits: ep.hits,
        lastSeen,
        isDead: ep.dead ?? false,
        isFlagged: ep.dead ?? false,
        deadSince: ep.dead ? lastSeen : undefined,
        projectId: project.id,
      },
    });
  }

  console.log("✅ Done! Demo credentials: demo@deadroute.dev / password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
