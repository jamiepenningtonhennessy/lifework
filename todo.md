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

## Cognitive Screener (30-item, timed)

- [ ] Write shared/cognitive-screener-data.ts with 30 items (10 verbal, 10 numerical, 10 abstract)
- [ ] Add cognitive_screener_results table to database schema
- [ ] Add cognitiveScreener router to server (save results, get results)
- [ ] Build CognitiveScreener.tsx page (timed, one question at a time)
- [ ] Build CognitiveResults.tsx page showing domain scores and interpretation
- [ ] Add cognitive screener step to ClientDashboard progress tracker
- [ ] Add cognitive screener route to App.tsx
- [ ] Update PDF export to include cognitive profile section
- [ ] Write tests for screener scoring logic

## IPIP Survey UX

- [x] Randomise question order within each domain on every sitting (shuffle on mount, consistent within session)

## Bug Fixes

- [x] Fix 404 on IPIP results page after survey submission
- [x] Show existing IPIP results without requiring retake

- [x] Fix AI analysis report not generating (db helpers returning undefined instead of null)
- [x] Fix all remaining db helpers returning undefined instead of null
- [x] Add /my-report client-facing report page
- [x] Fix View Report button in ClientDashboard to navigate to /my-report

## Virtual Peter — Parallel Client Matching

- [x] Extract and clean all life history narratives from Peter's MDB file into structured JSON
- [x] Add historical_clients and parallel_client_matches tables to schema (migration applied)
- [x] Batch generate LLM semantic tags for all 449 historical clients (all complete, embeddingReady=1)
- [x] Build semantic tag similarity matching tRPC procedure (virtualPeter.findMatches)
- [x] Build thematic tag extraction for new clients via LLM (themes, environment, motivation, sector)
- [x] Build Virtual Peter counsellor interface: expandable narrative cards with anonymised summaries
- [x] Add "Virtual Peter" tab to ClientProfile counsellor page
- [x] Write tests for matching procedure (7 tests: identical profiles, zero similarity, partial overlap, weight dominance, edge cases, case-insensitivity, Peter's principle)

## Virtual Peter — Match Enrichment (Why this match? + Conversation Starters)

- [x] Add matchNarrative and conversationStarters columns to parallel_client_matches table
- [x] Extend findMatches procedure to generate per-match LLM narrative and questions (parallel LLM calls)
- [x] Update Virtual Peter UI cards to display "Why this match?" and "Conversation Starters"
- [x] Updated loading message to reflect enrichment step duration

## Chat to Peter — Conversational Reflection

- [x] Add chat_sessions table to schema (clientId, section, messages JSON, summary, createdAt)
- [x] Build tRPC chatPeter.sendMessage procedure (reads achievements + career history, Peter's voice)
- [x] Build tRPC chatPeter.getSession, generateSummary, resetSession procedures
- [x] Write Peter's system prompt: reflective, specific, grounded in life history (Haldane methodology)
- [x] Build ChatToPeter floating panel component (typing indicator, save-insights, reset, keyboard shortcuts)
- [x] Add "Chat to Peter" button to Life History section of client dashboard (shows when in-progress or complete)
- [x] Add "Chat to Peter" button to Career & Education section of client dashboard
- [x] Wire chat session summaries into analysis report generation as primary context
- [x] Write tests for chat procedures (14 tests: transcript formatting, section context, first-message detection, message counting, summary threshold, analysis prompt injection)

## Chat to Peter — Prompt Refinement

- [x] Update life history system prompt: cover full chronological arc (childhood → adult decades) within ~30 mins, with explicit pacing guide per phase
- [x] Update career/family system prompt: cover full career arc + family backdrop in ~30 mins, with pacing guide
- [x] Add wrap-up signal detection — Peter responds to "ready to summarise", "let's wrap up", "that covers it" etc. with closing observations
- [x] Update first-message instruction to reflect full-arc approach from the opening
- [x] Add UI hint text: "You can tell Peter you're ready to wrap up, or click Save insights"

## Copy Fixes

- [x] Home page: correct "three-part" to "four-part"
- [x] Home page step 01: remove "AI-guided", replace with "structured conversation"
- [x] Home page step 04: remove "AI Analysis & Report", replace with counsellor-centred description
- [x] Client dashboard: same AI reference fixes applied to step descriptions

## Home Page — 3-Stage Process

- [x] Consolidate "How it works" from 4 steps to 3 stages (Life History / Psychometrics / Analysis & Report)
- [x] Update grid from 4-column to 3-column (max-w-4xl centred)
- [x] Update subtitle to "A three-stage process that reveals the career that is authentically yours"

## Rename & Restyle — Lifework / Pennington Hennessy

- [x] Analyse penningtonhennessy.com design: navy #0f1f35, gold #c9973a, cream #f5f0e8, Playfair Display serif, rectangular buttons, gold eyebrow rules
- [x] Rename all user-facing "Plum Trees" references to "Lifework" (6 files + PDF export)
- [x] Update browser tab title (index.html) to "Lifework"
- [x] Apply PH colour palette to CSS variables (--lw-navy, --lw-gold, --lw-cream tokens)
- [x] Apply PH typography: Playfair Display for all h1-h4, Inter for body, radius: 0rem
- [x] Restyle home page: dark navy hero, gold eyebrow rules, stats bar, cream process section, navy quote section
- [x] Restyle client dashboard and counsellor dashboard headers to PH navy/gold style
- [x] Update logo/wordmark to "L" monogram in gold-bordered square + Lifework wordmark
- [x] Replace all --plum CSS tokens with --lw-gold / --lw-navy throughout all client files

## Bug Fix

- [ ] Restore Peter Daws quote on home page (accidentally removed when removing dates)

## Home Page & Inner Page Polish

- [x] Add "About the Methodology" section to home page (Haldane/Dependable Strengths lineage, Peter's 30 years, 965 clients, psychometrics as lenses)
- [x] Add Pennington Hennessy footer with clickable gold link to penningtonhennessy.com
- [x] Style Interview page with navy/gold sticky header (both intro and phase views)
- [x] Style VIA survey page with navy/gold sticky header and gold progress bar
- [x] Style IPIP survey page with navy/gold sticky header, gold domain tabs, gold progress bar

## Virtual Peter — Persona Names

- [x] Infer gender from career description text in findMatches procedure
- [x] Assign a gender-appropriate imaginary first name to each match
- [x] Store persona name in parallel_client_matches table
- [x] Display persona name prominently on each Virtual Peter card

## Bug Fix — Life Achievement Buttons

- [x] Diagnose "buttons blank out" after clicking OK on a life achievement entry
- [x] Fix button visibility/state so they remain clearly visible after save

## Counsellor View — Life History Visibility

- [x] Display client's life history achievements in the Interview tab of ClientProfile
- [x] Organise by decade/phase with ESF badge, age, title, and description
- [x] Show Chat to Peter transcript summaries alongside the structured entries
