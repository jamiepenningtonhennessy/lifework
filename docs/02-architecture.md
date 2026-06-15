# 02 — Architecture Map

## Overview

LifeWorks is a **monolithic full-stack application** — a single Node.js process that serves both the React SPA and all API endpoints. There is no microservice boundary, no separate API gateway, and no message queue in the current architecture. All AI inference is synchronous within the request lifecycle.

---

## End-to-End Architecture Diagram

```mermaid
graph TD
    subgraph Browser["Browser (React 19 / Vite SPA)"]
        UI[Pages & Components]
        TRPC_CLIENT[tRPC Client\ntanstack/react-query]
        AUTH_HOOK[useAuth hook\nManus OAuth state]
    end

    subgraph Server["Node.js Process (Express 4 / tRPC 11)"]
        VITE_BRIDGE[Vite Dev Bridge\nor Static File Serve]
        TRPC_SERVER[tRPC Router\n/api/trpc]
        AUTH_MW[OAuth Middleware\n/api/oauth/callback]
        CONTEXT[Request Context\nctx.user from JWT cookie]

        subgraph Routers["tRPC Routers"]
            R_PROFILE[profile / background\nachievements / via / ipip]
            R_INTERVIEW[interview\nSage AI enrichment]
            R_ANALYSIS[analysis\nWOW report generation]
            R_CAREER[careerExplorer\ncounsellorSage]
            R_COUNSELOR[counselor dashboard\ncoachingAnnex]
            R_TOOLS[roleDecoder\nlinkedInRewriter\nblogWriter\ndebriefChat]
        end

        subgraph AI["AI Layer"]
            LLM[invokeLLM\nserver/_core/llm.ts]
            CANON[canonicalStage1\nlife-history synthesis]
            WEASY[WeasyPrint\nPDF renderer]
        end

        subgraph Data["Data Layer"]
            DB_HELPERS[db.ts\nDrizzle query helpers]
            STORAGE[storage.ts\nS3 helpers]
        end
    end

    subgraph External["External Services"]
        FORGE[Manus Forge Proxy\nOpenAI-compatible endpoint]
        CLAUDE[Claude Sonnet 4.5\nAnthropic]
        MYSQL[(MySQL / TiDB\ncloud-hosted)]
        S3[(S3-compatible\nfile storage)]
        OAUTH[Manus OAuth Server\napi.manus.im]
    end

    UI --> TRPC_CLIENT
    TRPC_CLIENT -->|HTTP POST /api/trpc| TRPC_SERVER
    AUTH_HOOK -->|GET /api/trpc/auth.me| TRPC_SERVER
    Browser -->|OAuth redirect| OAUTH
    OAUTH -->|callback + JWT cookie| AUTH_MW

    TRPC_SERVER --> CONTEXT
    CONTEXT --> Routers
    R_PROFILE --> DB_HELPERS
    R_INTERVIEW --> LLM
    R_INTERVIEW --> DB_HELPERS
    R_ANALYSIS --> CANON
    R_ANALYSIS --> LLM
    R_ANALYSIS --> WEASY
    R_ANALYSIS --> STORAGE
    R_CAREER --> LLM
    R_CAREER --> DB_HELPERS
    R_COUNSELOR --> DB_HELPERS
    R_TOOLS --> LLM

    LLM -->|Bearer token| FORGE
    FORGE --> CLAUDE
    DB_HELPERS --> MYSQL
    STORAGE -->|Bearer token| S3
    WEASY -->|HTML/CSS → PDF bytes| STORAGE
```

---

## Component Descriptions

### Front End

The front end is a React 19 single-page application built with Vite. Routing is handled by Wouter (lightweight, no React Router). All data fetching uses tRPC hooks (`trpc.*.useQuery`, `trpc.*.useMutation`) backed by TanStack Query. There is no Axios, no fetch wrapper, and no REST client. The `useAuth()` hook reads the current user from `trpc.auth.me.useQuery()`.

The front end is divided into two distinct "sites" within the same application:

- **Pennington Hennessy marketing site** — routes under `/`, `/coaching`, `/training`, `/about`. Navy/gold/cream brand, public-facing, no auth required.
- **LifeWorks coaching app** — routes under `/coaching/lifework/*` and `/dashboard`. Requires Manus OAuth login. Uses `LifeworkLayout` (PHNav + content).
- **Counsellor dashboard** — route `/counselor/*`. Requires OAuth + PIN gate.

### Back End

The Express server handles three categories of traffic:

1. **`/api/oauth/*`** — Manus OAuth flow (callback, state validation).
2. **`/api/trpc/*`** — All application logic, exposed as tRPC procedures. The router tree is defined in `server/routers.ts` and imports sub-routers from `server/routers/`.
3. **Static files** — In production, the Vite-built `dist/public/` directory is served directly by Express. In development, Vite runs as middleware.

### AI Layer

All AI inference is server-side. The entry point is `invokeLLM()` in `server/_core/llm.ts`, which:

1. Builds an OpenAI-compatible payload with `model: "claude-sonnet-4-5"`.
2. POSTs to the Manus Forge proxy (`BUILT_IN_FORGE_API_URL/v1/chat/completions`).
3. Returns an OpenAI-compatible response object.

The Forge proxy handles routing to Anthropic's API. The application never calls Anthropic directly in production (the `ANTHROPIC_API_KEY` env var exists as a fallback but is not used by the current `invokeLLM` implementation).

**Canonical Stage 1** (`server/routers/canonicalStage1.ts`) is a cached intermediate synthesis. Before generating the WOW report, the system runs a single LLM call that synthesises all of a client's life history data into a structured narrative. This canonical text is stored in `analysis_reports.canonicalStage1` and reused across all subsequent report sections, avoiding redundant context assembly.

**WOW Report generation** (`server/routers/wowReport.ts`) runs 12 sequential LLM calls — one per report section — each receiving the canonical stage 1 text plus section-specific instructions. Results are stored in `analysis_reports.wowReportJson` and the final HTML is rendered to PDF by WeasyPrint.

### PDF Generation

WeasyPrint is a Python library installed at server startup (`pip3 install weasyprint`). The server generates an HTML string from `server/html-report.ts` (a TypeScript template engine), then shells out to WeasyPrint to render it to PDF bytes, which are uploaded to S3. The PDF URL is stored in `analysis_reports.wowReportPdfUrl`.

---

## Data Flow: Psychometrics → AI Insights

```mermaid
sequenceDiagram
    participant Client as Client Browser
    participant Server as Express/tRPC
    participant DB as MySQL
    participant LLM as Claude Sonnet 4.5

    Client->>Server: Complete VIA survey (120 questions)
    Server->>DB: upsertViaResults(clientId, rankedStrengths, rawScores)

    Client->>Server: Complete IPIP-NEO-120 survey
    Server->>DB: upsertIpipResults(clientId, domainScores, facetScores)

    Client->>Server: Trigger WOW report generation
    Server->>DB: Load all client data (achievements, background, career, VIA, IPIP)
    Server->>LLM: canonicalStage1 — synthesise life history
    LLM-->>Server: Structured narrative (stored in DB)

    loop 12 report sections
        Server->>LLM: Section prompt + canonical text + VIA/IPIP context
        LLM-->>Server: Section prose
        Server->>DB: Store section in wowReportJson
    end

    Server->>Server: Render HTML report (html-report.ts template)
    Server->>Server: WeasyPrint HTML → PDF bytes
    Server->>S3: Upload PDF
    Server->>DB: Store PDF URL in wowReportPdfUrl
    Server-->>Client: { pdfUrl, reportJson }
```

---

## Counsellor Tools

The counsellor dashboard (`/counselor`) is a separate view of the same data, gated by PIN. It provides:

- **Client list** — all registered clients with completion status.
- **Client profile** — full data view, ability to add counsellor notes to achievements.
- **WOW report generation** — trigger report generation for any client, choose writing style and report type.
- **Coaching Annex** — paste a Sybill coaching transcript; the system generates a five-section closing annex in the counsellor's voice.
- **Counsellor Sage** — AI assistant that reads a client's full profile and answers counsellor questions.
- **Career Explorer (counsellor view)** — run a career exploration conversation on behalf of a client.
- **Insights Wheel** — visual PNG of the client's VIA/IPIP profile.
- **Blog Writer** — AI-assisted blog post generation for the PH website (counsellor-facing only).
