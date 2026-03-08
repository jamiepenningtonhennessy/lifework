# Plum Trees Career Analysis - MVP TODO

## Phase 1: Database & Schema
- [x] Define schema: clients, achievements, family_background, education, career_history, via_results, analysis_reports
- [x] Run migration and apply SQL

## Phase 2: Server / API
- [x] tRPC router: interview (save/load achievements, background, education, career)
- [x] tRPC router: VIA (save VIA results, fetch VIA questions/scoring)
- [x] tRPC router: analysis (trigger AI thematic analysis, save/load report)
- [x] tRPC router: counselor (list clients, get full client profile, trigger analysis, save notes)
- [x] PDF/HTML export route (full report with VIA character work section)

## Phase 3: Client Interview Flow
- [x] Landing / home page with warm, professional design (plum + warm cream palette)
- [x] AI conversational interview: decade-by-decade achievements with ESF classification
- [x] Family background structured form
- [x] Education history form
- [x] Career timeline form
- [x] VIA Character Strengths survey (120 questions, 24 strengths, scored and ranked)
- [x] VIA results page with ranked strengths and virtue categories
- [x] Client dashboard with progress tracking across all steps

## Phase 4: Counselor Dashboard
- [x] Counselor login / role gate (admin role required)
- [x] Client list with status indicators (interview, VIA, analysis)
- [x] Client profile page with tabbed view: overview, interview transcript, background, VIA, report
- [x] VIA results display (ranked strengths with descriptions and career hints)
- [x] AI analysis report view (themes, motivations, skills, environment preferences)
- [x] Counselor notes field (private, saved per client)
- [x] Trigger / regenerate analysis button

## Phase 5: Export & Polish
- [x] HTML export: full report including life story, VIA strengths, AI analysis (print-to-PDF ready)
- [x] VIA Character Work section in export with all 24 strengths ranked
- [x] Vitest unit tests (12 tests passing: auth, VIA data integrity, scoring, access control)
- [x] Checkpoint and deliver

## Interview Page Rewrite (Peter's Methodology)
- [x] Replace AI chat interview with structured phase-based form matching Peter's document
- [x] Add Peter's opening framing text verbatim
- [x] Structure phases: Early Childhood (0-5), Mid Childhood (6-11), Late Childhood (12-18), then adult decades (20s, 30s, 40s, 50s, 60s+)
- [x] 4 actions per phase, each with: Action title, Age, Description, ESF choice
- [x] ESF definitions with Peter's exact wording (Enjoyable = "in the moment", Satisfying = "rewarding", Fulfilling = "longer-term satisfying")
- [x] Hints & Tips section from Peter's document
- [x] Playing Teacher worked example
- [x] Progress indicator showing which phase user is on

## IPIP-NEO-120 Integration

- [x] Add ipip_results table to database schema (30 facet scores + 5 domain scores)
- [x] Write shared/ipip-data.ts with all 120 questions, 30 facets, 5 domains
- [x] Build IpipSurvey.tsx page (120 questions, 5-point scale, paginated by domain)
- [x] Build IpipResults.tsx page showing domain and facet scores with descriptions
- [x] Add IPIP router to server (save scores, get results)
- [x] Add IPIP step to ClientDashboard progress tracker (after VIA)
- [x] Add IPIP results section to CounselorProfile view
- [x] Update AI analysis prompt to incorporate IPIP facet scores
- [x] Update PDF/HTML export to include IPIP personality profile section
- [x] Add IPIP route to App.tsx
- [x] Write tests for IPIP scoring logic
