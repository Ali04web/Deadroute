# ☠ DeadRoute

> Monitor every API endpoint. Identify unused routes. Delete with confidence.

Self-hosted alternative to deadroute.vercel.app — built with Next.js 14, PostgreSQL, and Prisma.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js (Credentials + GitHub) |
| Styling | Tailwind CSS |
| Deployment | Vercel + Neon (free tier) |

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/you/deadroute
cd deadroute
npm install
```

### 2. Set up environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
DATABASE_URL="postgresql://..."   # Neon or Supabase free tier
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Set up the database

```bash
npm run db:push      # Create tables
npm run db:seed      # Add demo project + endpoints
```

### 4. Start dev server

```bash
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login)
Demo credentials: `demo@deadroute.dev` / `password123`

---

## Deploy to Vercel (free)

```bash
npm i -g vercel
vercel
```

Set these environment variables in the Vercel dashboard:
- `DATABASE_URL` — from [neon.tech](https://neon.tech) (free tier)
- `NEXTAUTH_SECRET` — random 32-byte string
- `NEXTAUTH_URL` — your Vercel URL, e.g. `https://deadroute.vercel.app`

After deploy:
```bash
DATABASE_URL="..." npx prisma db push
DATABASE_URL="..." npx tsx prisma/seed.ts
```

---

## SDK Integration

### Node.js / Express

```bash
npm install deadroute-node
```

```typescript
import express from 'express'
import { deadroute } from 'deadroute-node'

const app = express()

app.use(deadroute({
  apiKey: process.env.DEADROUTE_API_KEY!,
  ingestUrl: 'https://your-app.vercel.app/api/ingest',
  // Optional:
  sampleRate: 1.0,          // 0–1, default 1 (100%)
  flushInterval: 5000,      // ms, default 5000
  batchSize: 50,            // hits per batch, default 50
  exclude: [/\/health/, /\/metrics/],
}))
```

### Next.js

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { nextDeadRoute } from 'deadroute-node'

export function middleware(req: NextRequest) {
  nextDeadRoute(req, { apiKey: process.env.DEADROUTE_API_KEY! })
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
```

### Fastify

```typescript
import Fastify from 'fastify'
import { fastifyDeadRoute } from 'deadroute-node'

const app = Fastify()
await app.register(fastifyDeadRoute, {
  apiKey: process.env.DEADROUTE_API_KEY!,
})
```

### Python / FastAPI

```bash
pip install deadroute-python
```

```python
from fastapi import FastAPI
from deadroute import DeadRouteMiddleware
import os

app = FastAPI()
app.add_middleware(
    DeadRouteMiddleware,
    api_key=os.environ["DEADROUTE_API_KEY"],
    ingest_url="https://your-app.vercel.app/api/ingest",
)
```

### Python / Flask

```python
from flask import Flask
from deadroute import DeadRouteFlask
import os

app = Flask(__name__)
DeadRouteFlask(app, api_key=os.environ["DEADROUTE_API_KEY"])
```

### Python / Django

```python
# settings.py
MIDDLEWARE = [
    'deadroute.DeadRouteDjango',
    # ... rest of your middleware
]

DEADROUTE_API_KEY = os.environ["DEADROUTE_API_KEY"]
DEADROUTE_INGEST_URL = "https://your-app.vercel.app/api/ingest"
```

### Ruby / Rails

```ruby
# Gemfile
gem 'deadroute-ruby'

# config/initializers/deadroute.rb
DeadRoute.configure do |c|
  c.api_key    = ENV["DEADROUTE_API_KEY"]
  c.ingest_url = ENV["DEADROUTE_INGEST_URL"]
  c.framework  = "rails"
  c.exclude    = [/\/health/, /\/assets/]
end

# config/application.rb
config.middleware.use DeadRoute::Middleware
```

### Raw HTTP (any language)

```bash
# Single hit
curl -X POST https://your-app.vercel.app/api/ingest \
  -H "Authorization: Bearer dr_live_..." \
  -H "Content-Type: application/json" \
  -d '{"method":"GET","path":"/api/v1/users","statusCode":200,"durationMs":45}'

# Batch
curl -X POST https://your-app.vercel.app/api/ingest \
  -H "Authorization: Bearer dr_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "hits": [
      {"method":"GET","path":"/api/v1/users","statusCode":200},
      {"method":"POST","path":"/api/v1/orders","statusCode":201,"durationMs":120}
    ]
  }'
```

---

## API Reference

### `POST /api/ingest`

Ingest one or more endpoint hits.

**Headers**
```
Authorization: Bearer dr_live_<key>
Content-Type: application/json
```

**Single hit body**
| Field | Type | Required | Description |
|---|---|---|---|
| `method` | string | ✓ | HTTP method (GET, POST, …) |
| `path` | string | ✓ | Request path |
| `statusCode` | number | | HTTP response status |
| `durationMs` | number | | Response time in ms |
| `userAgent` | string | | User-Agent header |
| `framework` | string | | SDK framework hint |

**Batch body**: `{ "hits": [...] }` — up to 500 hits per request.

### `GET /api/endpoints/[projectId]`

Query params: `filter=all|dead|active|flagged`, `sort=lastSeen|hits`

### `PATCH /api/endpoints/[projectId]`

Body: `{ "endpointId": "...", "action": "flag"|"unflag"|"ignore"|"unignore" }`

---

## Dead Route Detection Logic

An endpoint is marked **dead** when:
- It has not received a hit in ≥ N days (default: 30)
- N is configurable per-endpoint or per-project

An endpoint is **revived** automatically when a new hit arrives.

Detection runs:
1. After each batch ingest (async, non-blocking)
2. You can also call `runDeadRouteDetection(projectId)` manually or via cron

---

## Project Structure

```
deadroute/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth handler
│   │   ├── ingest/               # SDK hit ingestion
│   │   ├── projects/             # Project CRUD
│   │   └── endpoints/[projectId] # Endpoint queries + actions
│   ├── (dashboard)/dashboard/    # Main dashboard UI
│   └── (auth)/login/             # Login page
├── lib/
│   ├── db.ts                     # Prisma singleton
│   ├── auth.ts                   # NextAuth config
│   └── detect.ts                 # Dead route detection logic
├── prisma/
│   ├── schema.prisma             # Full DB schema
│   └── seed.ts                   # Demo data seeder
└── sdk/
    ├── node/index.ts             # Express, Fastify, Next.js
    ├── python/deadroute.py       # FastAPI, Flask, Django
    └── ruby/deadroute.rb         # Rails, Sinatra, Rack
```

---

## Roadmap

- [ ] GitHub PR auto-creation for flagged routes
- [ ] Slack / Discord / email alerts
- [ ] Per-endpoint hit graphs (recharts already installed)
- [ ] Go SDK
- [ ] PHP / Laravel SDK
- [ ] Team members & invites
- [ ] Custom dead threshold per project
- [ ] Export dead routes as JSON / CSV

---

## License

MIT
