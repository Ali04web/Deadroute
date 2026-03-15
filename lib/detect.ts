// lib/detect.ts
import { db } from "./db";
import { differenceInDays } from "date-fns";

const DEFAULT_DEAD_THRESHOLD_DAYS = 30;

/**
 * Run dead-route detection for a project.
 * Call this after ingesting hits, or on a cron schedule.
 */
export async function runDeadRouteDetection(projectId: string) {
  const endpoints = await db.endpoint.findMany({
    where: { projectId, isIgnored: false },
  });

  const now = new Date();

  for (const endpoint of endpoints) {
    const threshold = endpoint.deadThresholdDays ?? DEFAULT_DEAD_THRESHOLD_DAYS;
    const daysSinceLastHit = differenceInDays(now, endpoint.lastSeen);
    const isDead = daysSinceLastHit >= threshold;

    if (isDead && !endpoint.isDead) {
      // Mark as newly dead
      await db.endpoint.update({
        where: { id: endpoint.id },
        data: { isDead: true, deadSince: now },
      });
    } else if (!isDead && endpoint.isDead) {
      // Revive if it got a hit
      await db.endpoint.update({
        where: { id: endpoint.id },
        data: { isDead: false, deadSince: null, isFlagged: false },
      });
    }
  }
}

/**
 * Normalize a URL path: replace segments that look like IDs with a param placeholder.
 * e.g. /api/v1/users/123/posts/abc-def → /api/v1/users/:id/posts/:id
 */
export function normalizePath(path: string): string {
  return path
    .split("?")[0] // strip query string
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id") // UUID
    .replace(/\/\d+/g, "/:id") // numeric IDs
    .replace(/\/[a-z0-9]{20,}/gi, "/:id"); // nanoid-style
}

/**
 * Upsert an endpoint and record a hit.
 * Returns the endpoint record.
 */
export async function recordHit(opts: {
  projectId: string;
  method: string;
  path: string;
  statusCode?: number;
  durationMs?: number;
  userAgent?: string;
  ip?: string;
  framework?: string;
}) {
  const { projectId, method, statusCode, durationMs, userAgent, ip, framework } = opts;
  const normalizedPath = normalizePath(opts.path);

  const endpoint = await db.endpoint.upsert({
    where: {
      projectId_method_path: { projectId, method, path: normalizedPath },
    },
    create: {
      projectId,
      method,
      path: normalizedPath,
      rawPath: opts.path,
      framework,
      totalHits: 1,
      lastSeen: new Date(),
    },
    update: {
      totalHits: { increment: 1 },
      lastSeen: new Date(),
      rawPath: opts.path,
      isDead: false,      // revive if it was dead
      deadSince: null,
    },
  });

  await db.hit.create({
    data: {
      endpointId: endpoint.id,
      statusCode,
      durationMs,
      userAgent,
      ip,
    },
  });

  return endpoint;
}
