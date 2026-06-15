# 01 — Substrate: What LifeWorks Is Built On

## Classification

LifeWorks is a **Manus-native, full-stack web application**. It is not a static site, not a no-code platform (Bubble, Webflow, Fliplet), and not embedded in a third-party tool. It is a bespoke application built and deployed through the Manus WebDev platform, with a custom codebase that lives in a GitHub repository.

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Front end | React | 19.x |
| Routing | Wouter | 3.x |
| Styling | Tailwind CSS | 4.x (OKLCH colour space) |
| Component library | shadcn/ui (Radix UI primitives) | — |
| State / data fetching | TanStack Query + tRPC | v5 / v11 |
| Back end | Express | 4.x |
| RPC layer | tRPC | 11.x |
| Serialisation | Superjson | 1.x |
| Database ORM | Drizzle ORM | 0.44.x |
| Database | MySQL / TiDB (cloud-hosted) | — |
| File storage | S3-compatible (via Manus Forge proxy) | — |
| AI model | Claude Sonnet 4.5 | via Manus Forge proxy |
| PDF generation | WeasyPrint (Python, installed at startup) | — |
| Build tool | Vite | 5.x |
| Language | TypeScript | 5.9.x |
| Runtime | Node.js | 22.x |

---

## Hosting and Serving

The application is deployed on **Google Cloud Run** (managed by the Manus platform). Key runtime characteristics:

- **Single process.** The Vite-built React bundle is served as static files by the Express server. There is no separate CDN or separate API host. One process handles both the HTML/JS/CSS and all `/api/trpc` calls.
- **Cold starts.** Cloud Run scales to zero when idle (`min-instances=0`). Cold start time is typically 2–5 seconds.
- **Request timeout.** 180 seconds. Long-running operations (WOW report generation, which calls the LLM 12+ times) are designed to complete within this window.
- **Resources.** 1 vCPU, 512 MiB RAM per instance.
- **No persistent filesystem.** The container filesystem is ephemeral. All persistent data goes to MySQL (via `DATABASE_URL`) or S3 (via the Forge storage proxy). WeasyPrint is installed at server startup via `pip3` because it cannot be bundled into the Node image.
- **Domains.** The application is served at `lifework.manus.space` (client-facing) and `penningtonhennessy.com` / `www.penningtonhennessy.com` (the Pennington Hennessy marketing site, which is the same application).

---

## Authentication

- **Clients** authenticate via Manus OAuth (`/api/oauth/callback`). The OAuth flow drops a signed JWT session cookie. All protected tRPC procedures read `ctx.user` from this cookie.
- **Counsellors** use the same Manus OAuth login, but the counsellor dashboard (`/counselor`) additionally requires a bcrypt-hashed PIN stored in the `counsellor_pin` table.
- **Access code gate.** Before OAuth login, clients must enter a shared access code (`LIFEWORK_ACCESS_CODE` env var, currently `lifework2024`). This is a lightweight enrolment gate, not a security boundary.

---

## Environment Variables

All secrets are injected at deploy time by the Manus platform. They are never committed to the repository.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL/TiDB connection string |
| `JWT_SECRET` | Session cookie signing key |
| `VITE_APP_ID` | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | Manus OAuth backend |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal (frontend) |
| `BUILT_IN_FORGE_API_URL` | Manus Forge proxy (LLM + storage) |
| `BUILT_IN_FORGE_API_KEY` | Bearer token for Forge (server-side) |
| `VITE_FRONTEND_FORGE_API_KEY` | Bearer token for Forge (frontend, limited scope) |
| `ANTHROPIC_API_KEY` | Direct Anthropic key (fallback, not currently used in production) |
| `LIFEWORK_ACCESS_CODE` | Shared enrolment code for new clients |
| `DEBRIEF_PASSWORD` | Password gate for the `/debrief` counsellor prep page |
| `OWNER_OPEN_ID`, `OWNER_NAME` | Owner identity for notifications |

---

## What Makes Adding a Feature Easy

- **Type-safe contracts.** Adding a new tRPC router in `server/routers/` and importing it in `server/routers.ts` immediately gives the front end full TypeScript types with no manual contract maintenance.
- **Shared component library.** shadcn/ui components are already installed and themed. A new page can be built entirely from existing primitives.
- **Database migrations are simple.** Add a table to `drizzle/schema.ts`, run `pnpm drizzle-kit generate`, apply the SQL via `webdev_execute_sql`. No migration framework ceremony.
- **LLM is one function call.** `invokeLLM({ messages })` from `server/_core/llm.ts` — no API key management, no model selection, no streaming setup required for non-streaming calls.
- **S3 storage is one function call.** `storagePut(key, buffer, mimeType)` from `server/storage.ts`.

## What Makes Adding a Feature Hard

- **Single process / 180s timeout.** Any feature that requires long-running background jobs (e.g. crawling job boards, sending scheduled emails) cannot run inside a request handler. It would need a separate scheduled mechanism (Manus Heartbeat, an external cron, or a queue).
- **No Python/binary dependencies at build time.** WeasyPrint works because it is installed at startup via a shell command in the server init. Any new native binary dependency would need the same pattern and adds startup latency.
- **Cold starts.** If the Jobs module involves real-time data (live job listings), cold start latency may be noticeable. Consider warming strategies or caching.
- **512 MiB RAM.** In-memory caching of large job datasets is not feasible. External caching (Redis, or S3-backed JSON) would be needed.
