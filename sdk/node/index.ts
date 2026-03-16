// sdk/node/index.ts
// DeadRoute Node.js SDK
// Supports: Express, Fastify, Koa, and any Node.js HTTP framework
//
// Install: npm install deadroute-node
// Usage (Express):
//   import { deadroute } from 'deadroute-node'
//   app.use(deadroute({ apiKey: 'dr_live_...', ingestUrl: 'https://yourapp.com/api/ingest' }))



export interface DeadRouteOptions {
  /** Your project API key (starts with dr_live_) */
  apiKey: string;
  /** URL of your DeadRoute ingest endpoint */
  ingestUrl?: string;
  /** Batch size before flushing to the server (default: 50) */
  batchSize?: number;
  /** Flush interval in ms (default: 5000) */
  flushInterval?: number;
  /** Sampling rate 0–1 (default: 1 = 100%) */
  sampleRate?: number;
  /** Paths to exclude (regex array) */
  exclude?: RegExp[];
  /** Framework hint e.g. 'express', 'fastify', 'koa' */
  framework?: string;
}

interface HitPayload {
  method: string;
  path: string;
  statusCode?: number;
  durationMs?: number;
  userAgent?: string;
  framework?: string;
}

class DeadRouteClient {
  private queue: HitPayload[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private opts: Required<DeadRouteOptions>;

  constructor(opts: DeadRouteOptions) {
    this.opts = {
      ingestUrl: "https://your-app.vercel.app/api/ingest",
      batchSize: 50,
      flushInterval: 5000,
      sampleRate: 1,
      exclude: [],
      framework: "express",
      ...opts,
    };

    // Auto-flush on interval
    this.flushTimer = setInterval(() => this.flush(), this.opts.flushInterval);

    // Flush on process exit
    process.on("beforeExit", () => this.flush());
  }

  record(hit: HitPayload) {
    // Sampling
    if (Math.random() > this.opts.sampleRate) return;

    // Exclude patterns
    if (this.opts.exclude.some((re) => re.test(hit.path))) return;

    this.queue.push(hit);

    if (this.queue.length >= this.opts.batchSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.queue.length === 0) return;

    const hits = this.queue.splice(0);

    try {
      await fetch(this.opts.ingestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.opts.apiKey}`,
        },
        body: JSON.stringify({ hits }),
      });
    } catch {
      // Silently fail — never impact your app's performance
      if (process.env.NODE_ENV === "development") {
        console.warn("[DeadRoute] Failed to flush hits. Check your ingestUrl and apiKey.");
      }
    }
  }

  destroy() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flush();
  }
}

// Singleton client
let _client: DeadRouteClient | null = null;

/**
 * Express/Connect middleware factory.
 *
 * @example
 * import express from 'express'
 * import { deadroute } from 'deadroute-node'
 *
 * const app = express()
 * app.use(deadroute({
 *   apiKey: process.env.DEADROUTE_API_KEY!,
 *   ingestUrl: process.env.DEADROUTE_INGEST_URL,
 * }))
 */
export function deadroute(opts: DeadRouteOptions) {
  _client = new DeadRouteClient(opts);

  return function deadrouteMiddleware(req: Request, _res: Response, next: NextFunction) {
    const start = Date.now();
    const path = req.path || req.url || "/";
    const method = req.method?.toUpperCase() ?? "GET";

    _res.on("finish", () => {
      _client!.record({
        method,
        path,
        statusCode: _res.statusCode,
        durationMs: Date.now() - start,
        userAgent: req.headers?.["user-agent"],
        framework: opts.framework ?? "express",
      });
    });

    next();
  };
}

/**
 * Fastify plugin.
 *
 * @example
 * import Fastify from 'fastify'
 * import { fastifyDeadRoute } from 'deadroute-node'
 *
 * const app = Fastify()
 * await app.register(fastifyDeadRoute, { apiKey: '...' })
 */
export async function fastifyDeadRoute(
  fastify: any,
  opts: DeadRouteOptions
) {
  const client = new DeadRouteClient({ framework: "fastify", ...opts });

  fastify.addHook("onResponse", async (request: any, reply: any) => {
    client.record({
      method: request.method,
      path: request.routerPath ?? request.url,
      statusCode: reply.statusCode,
      durationMs: reply.elapsedTime ? Math.round(reply.elapsedTime) : undefined,
      userAgent: request.headers["user-agent"],
      framework: "fastify",
    });
  });
}

/**
 * Next.js middleware (edge-compatible).
 * Place in middleware.ts at the project root.
 *
 * @example
 * // middleware.ts
 * import { NextRequest, NextResponse } from 'next/server'
 * import { nextDeadRoute } from 'deadroute-node'
 *
 * export function middleware(req: NextRequest) {
 *   nextDeadRoute(req, { apiKey: process.env.DEADROUTE_API_KEY! })
 *   return NextResponse.next()
 * }
 */
export function nextDeadRoute(req: any, opts: DeadRouteOptions) {
  if (!_client) _client = new DeadRouteClient({ framework: "nextjs", ...opts });

  _client.record({
    method: req.method ?? "GET",
    path: req.nextUrl?.pathname ?? req.url,
    userAgent: req.headers.get?.("user-agent") ?? undefined,
    framework: "nextjs",
  });
}

export { DeadRouteClient };
export default deadroute;