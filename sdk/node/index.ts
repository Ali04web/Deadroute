// sdk/node/index.ts
// DeadRoute Node.js SDK
// Supports: Express, Fastify, Koa, and any Node.js HTTP framework
//
// Install: npm install deadroute-node
// Usage (Express):
//   import { deadroute } from 'deadroute-node'
//   app.use(deadroute({ apiKey: 'dr_live_...', ingestUrl: 'https://yourapp.com/api/ingest' }))

export interface DeadRouteOptions {
  apiKey: string;
  ingestUrl?: string;
  batchSize?: number;
  flushInterval?: number;
  sampleRate?: number;
  exclude?: RegExp[];
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
    this.flushTimer = setInterval(() => this.flush(), this.opts.flushInterval);
    process.on("beforeExit", () => this.flush());
  }

  record(hit: HitPayload) {
    if (Math.random() > this.opts.sampleRate) return;
    if (this.opts.exclude.some((re) => re.test(hit.path))) return;
    this.queue.push(hit);
    if (this.queue.length >= this.opts.batchSize) this.flush();
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

let _client: DeadRouteClient | null = null;

export function deadroute(opts: DeadRouteOptions) {
  _client = new DeadRouteClient(opts);

  return function deadrouteMiddleware(req: any, _res: any, next: any) {
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

export async function fastifyDeadRoute(fastify: any, opts: DeadRouteOptions) {
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