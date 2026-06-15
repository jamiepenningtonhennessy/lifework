# 06 — Integration Surfaces and Recommended Approach

## Available Integration Surfaces

The platform exposes the following surfaces that a Jobs module can use:

| Surface | What it provides | How to access |
|---|---|---|
| `analysis_reports.canonicalStage1` | 2,000-word synthesised life narrative — the richest profile input | `getAnalysisReport(clientId)` in `server/db.ts` |
| `analysis_reports.wowReportJson` | Full 12-section report as JSON — includes `careerDirections`, `characterStrengths`, `developmentEdge` | Same |
| `via_results.rankedStrengths` | Top 24 character strengths with scores | `getViaResults(clientId)` |
| `ipip_results.domainScores` | Big Five profile (N, E, O, A, C) | `getIpipResults(clientId)` |
| `career_history` | Current and past roles, sectors, seniority | `getCareerHistory(clientId)` |
| `client_profiles.targetRole` | Client's stated target role (if set) | `getClientProfileById(clientId)` |
| `invokeLLM()` | Claude Sonnet 4.5 via Forge proxy | `server/_core/llm.ts` |
| `storagePut()` | S3 file storage | `server/storage.ts` |
| `notifyOwner()` | Push notification to the platform owner | `server/_core/notification.ts` |
| Manus Heartbeat | Scheduled/periodic jobs (external to the request lifecycle) | See `references/periodic-updates.md` |

---

## What the Jobs Module Needs That Does Not Yet Exist

| Need | Current state | What to build |
|---|---|---|
| Job listings data | Not present | External API integration or manual curation (see below) |
| Job–profile matching | Not present | New tRPC procedure using `invokeLLM` |
| Saved jobs | Not present | New DB table `saved_jobs` |
| Application tracking | Not present | New DB table `job_applications` (optional) |
| Jobs page / UI | Not present | New page `client/src/pages/JobsExplorer.tsx` |
| Counsellor job curation | Not present | New counsellor dashboard tab (optional) |

---

## Recommended Architecture

### Option A — AI-Curated, No External API (Recommended for v1)

Rather than integrating a live job board API (which introduces rate limits, API keys, data freshness concerns, and cold-start latency), the v1 module uses the existing AI infrastructure to generate **personalised opportunity suggestions** from the client's profile. This is consistent with the platform's existing approach (the Career Explorer already does this conversationally).

**How it works:**

1. The client opens the Jobs Explorer page (`/coaching/lifework/jobs`).
2. A tRPC mutation (`jobsExplorer.generateOpportunities`) is called.
3. The server loads `canonicalStage1`, `wowReportJson.careerDirections`, and `via_results`.
4. A single `invokeLLM` call generates a structured JSON response: 6–8 opportunity suggestions, each with title, sector, why it fits, what to watch out for, and suggested search terms.
5. Results are stored in a new `job_suggestions` table (keyed by `clientId`, with a `generatedAt` timestamp) so they persist across sessions.
6. The client can save individual suggestions, add notes, and mark them as "exploring" or "not for me."

**Advantages:**
- No external API dependency, no rate limits, no API keys.
- Consistent with the platform's existing AI-first approach.
- Results are deeply personalised — grounded in the client's actual profile, not keyword matching.
- Can be built entirely within the existing stack in a single sprint.

**Limitation:** Suggestions are not live job listings. They are career direction suggestions with search guidance. This is appropriate for a coaching platform — the goal is to help the client think, not to replace a job board.

---

### Option B — Live Job Board Integration (v2, if required)

If live listings are required, the recommended approach is to use a job aggregator API (e.g. Adzuna, Reed, or LinkedIn Jobs API) as a **server-side data source**, not a client-side embed. The server fetches listings, stores them in a `job_listings` table with a TTL, and the AI layer scores them against the client's profile.

**Key constraints:**

- **180-second request timeout.** Fetching and scoring 50 listings in a single request is feasible; fetching 500 is not. Use pagination.
- **512 MiB RAM.** Do not load all listings into memory. Fetch, score, and persist in batches.
- **Background refresh.** Listings go stale. Use Manus Heartbeat (see `references/periodic-updates.md`) to refresh listings on a schedule, not on every client request.
- **No Python/binary dependencies.** All API calls must be made from Node.js using `fetch`. Do not introduce a Python scraping layer.

---

## Implementation Plan (Option A — v1)

### 1. Database Schema

Add to `drizzle/schema.ts`:

```ts
export const jobSuggestions = mysqlTable("job_suggestions", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  suggestions: json("suggestions").notNull(), // JSON array of suggestion objects
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const savedJobs = mysqlTable("saved_jobs", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  suggestionId: int("suggestionId"),       // FK to job_suggestions (if from AI)
  externalUrl: varchar("externalUrl", { length: 1024 }), // if client pastes a listing
  title: varchar("title", { length: 256 }).notNull(),
  organisation: varchar("organisation", { length: 256 }),
  notes: text("notes"),
  status: mysqlEnum("status", ["exploring", "applied", "not_for_me"]).default("exploring"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

### 2. Server Router

Create `server/routers/jobsExplorer.ts`:

```ts
// Key procedures:
// jobsExplorer.generateSuggestions — protected, calls invokeLLM with client profile
// jobsExplorer.getSuggestions — protected, returns latest suggestions for client
// jobsExplorer.saveJob — protected, saves a suggestion or external listing
// jobsExplorer.updateJobStatus — protected, updates status/notes on a saved job
// jobsExplorer.getSavedJobs — protected, returns all saved jobs for client
```

Import and register in `server/routers.ts`:
```ts
jobsExplorer: jobsExplorerRouter,
```

### 3. Frontend Page

Create `client/src/pages/JobsExplorer.tsx`. Use `LifeworkLayout` as the wrapper.

Page structure:
- **Navy header** with gold eyebrow "OPPORTUNITIES", h1 "Jobs Explorer", subtitle explaining the AI-curated approach.
- **Generate button** (gold, `variant="default"`) — triggers `jobsExplorer.generateSuggestions`.
- **Suggestions grid** — 6–8 `Card` components, each showing: role title, sector, a "why it fits" paragraph, a "watch out for" note, and suggested search terms. A "Save" button on each card.
- **Saved Jobs tab** — a `Tabs` component switching between "Suggestions" and "Saved". Saved jobs show status badges and a notes field.

### 4. Dashboard Entry Point

Add to the `STEPS` array in `ClientDashboard.tsx`:

```ts
{
  id: "jobs_explorer",
  icon: <Briefcase className="w-5 h-5" />,
  title: "7. Jobs Explorer",
  description: "AI-curated opportunity suggestions based on your Lifework profile.",
  path: "/coaching/lifework/jobs",
  statusKey: null,
  cta: "Explore Opportunities",
  ctaInProgress: "Continue Exploring",
}
```

Gate it behind `careerExplorerUnlocked` (same gate as Career Explorer).

### 5. Route

Add to `client/src/App.tsx`:
```tsx
<Route path="/coaching/lifework/jobs">
  {() => <LifeworkLayout><JobsExplorer /></LifeworkLayout>}
</Route>
```

---

## What to Flag / Constraints

**The 180-second timeout is the primary constraint.** If the LLM call for generating suggestions takes longer than expected (rare, but possible under load), the request will time out. Mitigate by: (a) generating suggestions asynchronously and polling, or (b) using streaming (`invokeLLM` supports streaming via the Forge proxy).

**The `careerExplorerUnlocked` gate is the right access control.** Do not add a separate gate for the Jobs module — reuse the existing one. The counsellor unlocks it after the coaching conversation, which is the right moment for both Career Explorer and Jobs Explorer.

**Do not expose the client's raw profile data in the UI.** The suggestions page should show AI-generated output, not the raw `canonicalStage1` text. The client has already seen their profile in the WOW report.

**The counsellor dashboard should have visibility.** Add a read-only "Jobs" tab to the counsellor's client profile view so the counsellor can see what suggestions were generated and what the client has saved. This supports the coaching conversation.

**Manus Heartbeat for scheduled refresh (v2 only).** If live listings are added in v2, read `references/periodic-updates.md` before writing any scheduling code. The platform has a specific mechanism for this.
