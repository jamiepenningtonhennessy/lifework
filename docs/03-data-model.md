# 03 — Data Model and the No-Retention Constraint

## The No-Retention Principle — What It Actually Means

The platform's client-facing messaging refers to a "no retained data" principle. In practice, this means:

> **Client data is not shared with third parties and is not used to train AI models.** It does not mean data is ephemeral or session-only.

All psychometric results, life history data, and generated reports are **persisted in a MySQL database and in S3**. They persist across sessions, across devices, and indefinitely until a client account is deleted. The constraint is about *data sovereignty and third-party sharing*, not about storage.

**Implication for the Jobs module.** A jobs pipeline is a database. There is no architectural constraint that prevents persisting job listings, saved searches, match scores, or application tracking data. The constraint that applies is: any data fed to the LLM must not be transmitted to third-party services beyond the Manus Forge proxy (which routes to Anthropic under a data processing agreement).

---

## Database Tables

All tables are in MySQL/TiDB. The ORM is Drizzle. Primary keys are auto-increment integers. Timestamps are stored as MySQL `TIMESTAMP` (UTC).

### Core Identity

| Table | Purpose | Key Fields |
|---|---|---|
| `users` | Manus OAuth identity | `id`, `openId`, `name`, `email`, `role` (admin\|user) |
| `client_profiles` | One per user; the coaching profile | `id`, `userId`, `firstName`, `lastName`, `currentRole`, `targetRole`, `pronouns`, `careerExplorerUnlocked` |

### Life History Data

| Table | Purpose | Key Fields |
|---|---|---|
| `achievements` | Life history events, one row per event | `clientId`, `decade`, `title`, `age`, `description`, `esf` (enjoyable\|satisfying\|fulfilling), `sageEnrichment`, `counsellorNotes`, `skills`, `sortOrder` |
| `family_background` | Family context (one row per client) | `clientId`, `fatherOccupation`, `motherOccupation`, `siblingPosition`, `upbringingLocation`, `familyNarrative`, `significantInfluences` |
| `education_history` | Education timeline | `clientId`, `institution`, `qualification`, `subject`, `yearFrom`, `yearTo`, `highlights` |
| `career_history` | Career timeline | `clientId`, `organisation`, `role`, `yearFrom`, `yearTo`, `keyResponsibilities`, `whyLeft`, `highlights` |

### Psychometric Results

| Table | Purpose | Key Fields |
|---|---|---|
| `via_results` | VIA Character Strengths (120-question survey) | `clientId`, `rankedStrengths` (JSON array of `{strength, score, rank}`), `rawScores` (JSON object) |
| `ipip_results` | IPIP-NEO-120 Big Five personality | `clientId`, `domainScores` (JSON: `{N, E, O, A, C}` each 0–100), `facetScores` (JSON: 30 facets), `rawAnswers` |

### AI-Generated Content

| Table | Purpose | Key Fields |
|---|---|---|
| `analysis_reports` | All AI outputs for a client (one row per client) | `clientId`, `canonicalStage1` (life history synthesis), `wowReportJson` (full report as JSON), `wowReportPdfUrl` (S3 URL), `wowReportStatus`, `wowReportType`, `wowReportWritingStyle`, `wowReportLocked` |
| `report_generation_logs` | Audit log of every LLM call | `clientId`, `runId`, `sectionKey`, `promptSent`, `contextSent`, `rawOutput`, `durationMs` |

### Conversation Data

| Table | Purpose | Key Fields |
|---|---|---|
| `interview_messages` | Sage interview conversation | `clientId`, `role` (user\|assistant), `content`, `createdAt` |
| `chat_sessions` | AI coaching chat (Virtual Peter / Sage) | `clientId`, `sessionType`, `messages` (JSON), `summary`, `uploadedDocuments` (JSON) |
| `career_explorer_sessions` | Career exploration conversations | `clientId`, `messages` (JSON array), `preferredName` |

### Counsellor Tools

| Table | Purpose | Key Fields |
|---|---|---|
| `coaching_annexes` | Post-session coaching annex | `clientId`, `transcriptText`, `draftAnnex`, `approvedAnnex`, `status` (draft\|approved) |
| `historical_clients` | Anonymised historical client profiles for Virtual Peter | `pseudonym`, `profileText`, `themes`, `outcomes` |
| `parallel_matches` | Virtual Peter: matched historical clients | `clientId`, `historicalClientId`, `matchScore`, `notes` |
| `counsellor_pin` | Bcrypt-hashed counsellor PIN | `pinHash` |

### System / Marketing

| Table | Purpose | Key Fields |
|---|---|---|
| `leads` | Email sign-ups from landing pages | `name`, `email`, `source` |

---

## Data Shape: Maz's LifeWorks Profile (Illustrative)

To make the data model concrete, here is the shape of data for a typical completed client profile (using Maz as the example, with no real data included — field names and structure only):

```
client_profiles:
  firstName: "Maz"
  currentRole: "Career Coach / Founder"
  targetRole: null  (not set)
  pronouns: "she/her"
  careerExplorerUnlocked: true

achievements: ~35 rows spanning childhood → fifties_plus
  Each row: decade, title, age, description (~150 words), esf tag,
  sageEnrichment (~100 words of Sage's reflective questions/observations),
  counsellorNotes (optional)

via_results:
  rankedStrengths: [
    { strength: "Curiosity", score: 4.8, rank: 1 },
    { strength: "Love of Learning", score: 4.7, rank: 2 },
    ... (24 total)
  ]

ipip_results:
  domainScores: { N: 28, E: 72, O: 91, A: 65, C: 58 }
  facetScores: { E1_warmth: 78, E2_gregariousness: 65, ... (30 facets) }

analysis_reports:
  canonicalStage1: ~2,000 words of synthesised life narrative
  wowReportJson: {
    summary: "...",
    lifeHistoryPattern: "...",
    recurringThemes: "...",
    fourPillars: { places: "...", people: "...", problems: "...", procedures: "..." },
    characterStrengths: "...",
    developmentEdge: "...",
    careerDirections: "...",
    ... (12 sections total)
  }
  wowReportPdfUrl: "https://cdn.../wow-reports/client-870001-xxx.pdf"
```

---

## What the Jobs Module Would Need to Persist

A jobs pipeline is fundamentally different from the current data model in one key way: it involves **external, time-varying data** (job listings) rather than client-generated data. The table design should reflect this:

| Proposed Table | Purpose |
|---|---|
| `job_listings` | Cached job listings from external sources, with TTL |
| `job_matches` | AI-scored matches between a client profile and a listing |
| `saved_jobs` | Client-saved listings |
| `job_applications` | Application tracking (optional) |

The `clientId` foreign key links all of these to the existing `client_profiles` table. The client's `canonicalStage1` text and `wowReportJson` are the natural inputs to any AI matching logic — they already contain the synthesised profile.

---

## S3 Storage Structure

Files are stored with non-enumerable keys (random suffixes). Current key patterns:

```
wow-reports/client-{clientId}-{timestamp}.pdf
insights-wheel/client-{clientId}-{timestamp}.png
coaching-slides/client-{clientId}-{timestamp}.pptx
```

The Jobs module could use:
```
job-exports/client-{clientId}-{timestamp}.pdf
```
