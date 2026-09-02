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

- [x] ~~Restore Peter Daws quote on home page~~ — quote not recoverable, removed from backlog

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

## Career Explorer

- [x] Add career_explorer_sessions table to schema and migrate
- [x] Add server procedures: getSession, sendMessage (with full profile context), clearSession
- [x] Build CareerExplorer page with chat interface
- [x] Add Career Explorer entry to client dashboard navigation
- [ ] Add Career Explorer tab to counsellor ClientProfile view
- [x] Write vitest tests for Career Explorer procedures

## Bug Fix — Career Explorer null messages

- [x] Guard against null messages column in getOrCreateCareerExplorerSession and appendCareerExplorerMessage
- [x] Ensure insert always writes '[]' explicitly; guard all JSON.parse calls with null fallback

## Coaching Session Annex

- [x] Add coaching_annexes table to schema (clientId, transcriptText, draftAnnex, approvedAnnex, status, createdAt, approvedAt)
- [x] Add server procedures: generateAnnexDraft (LLM from transcript + report), saveAnnexDraft, approveAnnex
- [x] Seed an imagined coaching transcript for Jamie using his real profile data
- [x] Build Coaching Annex tab in counsellor ClientProfile: upload/paste transcript, generate draft, rich-text review/edit, approve
- [x] Update PDF/HTML export to include approved annex as final section
- [x] Write vitest tests for annex procedures

## Career Explorer — Counsellor-Controlled Unlock

- [x] Add careerExplorerUnlocked boolean column to client_profiles table
- [x] Add counselor.unlockCareerExplorer and counselor.lockCareerExplorer tRPC procedures
- [x] Gate Career Explorer card on client dashboard behind careerExplorerUnlocked flag
- [x] Show locked state message on /career-explorer if not yet unlocked
- [x] Add "Unlock Career Explorer" button to counsellor ClientProfile overview tab
- [x] Write vitest tests for unlock/lock procedures

## Counsellor View — IPIP & Cognitive Screener Tabs

- [ ] Add IPIP personality tab to counsellor ClientProfile view (Big Five scores with bar chart and interpretation)
- [ ] Add Cognitive Screener tab to counsellor ClientProfile view (verbal/numerical/abstract scores with interpretation)

## ~~Branding — Replace Peter Daws with Bernard Haldane in public-facing copy~~ — removed from backlog

- [ ] Update Home.tsx landing copy (hero, about section, footer attribution)
- [ ] Update Virtual Peter description in ClientProfile.tsx
- [ ] Update PDF export footer text in pdf-export.ts

## Report — Add Missing Test Results

- [x] Add cognitive screener results section to PDF/HTML report (verbal/numerical/abstract scores, interpretation, career implications)
- [x] Verify IPIP personality section is present in report; add if missing

## Report — Section Order & Page Breaks

- [x] Reorder report: Analysis → Life History (achievements + background) → VIA → IPIP → Screener → Coaching Annex
- [x] Add page-break-before to each major section so each begins on a new page when printed

## Client Dashboard — View My Report

- [x] Add prominent "View My Report" card to client dashboard (visible once analysis is complete, links to /my-report and /api/export/report)

## PDF Export — Print Fixes

- [x] Suppress browser URL/date/title print headers and footers via consolidated @page rule
- [x] Add on-screen instruction bar telling user to disable headers/footers in print dialog
- [x] Fix cover "Prepared for" to show client name (was showing raw variable)
- [x] Replace bottom footer with © Pennington Hennessy [year] — Confidential

## Interview — Save & Resume

- [x] Auto-advance phaseIndex to first incomplete phase when client returns to Interview
- [x] Show "Resume from where you left off" message on intro screen when partial data exists
- [x] Add "Save progress" button so client can save mid-phase without advancing

## Branding — PH Logo Square

- [x] Replace "L" monogram in website nav/headers with PH brand square image (CDN: https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/phsquare_98c01de4.jpg)
- [x] Replace "PT" / "L" logo on PDF report cover with PH brand square image

## Client Dashboard — Welcome Text & Chat to Jamie

- [x] Update welcome subtitle text with new wording about saving/returning and Chat to Jamie instruction
- [x] Remove Chat to Jamie button from the Life History Interview step (keep only on Background & History step)

## Interview — Others' Observations Field (Peter's "Others:" field)

- [x] Add others_observations column to achievements table in drizzle schema and run migration
- [x] Add "What did others say about you at this time?" textarea to each life history phase in Interview.tsx
- [x] Save others_observations to DB via tRPC mutation (update saveAchievement procedure)
- [x] Include others_observations data in the AI analysis prompt

## Counsellor Dashboard — Guided Coaching View (Slow Reveal)

- [x] Add CoachingView component with 5 tabs: Life History & Family, Career, VIA, IPIP Personality, Reasoning
- [x] Each tab: AI-generated summary paragraph, 3-5 client-specific examples, 3-5 reflective questions
- [x] Life History tab: bar chart of achievements by decade and ESF type
- [x] VIA tab: horizontal bar chart of top 10 strengths
- [x] IPIP tab: bar chart of Big Five dimensions
- [x] Reasoning tab: score bars for verbal/numerical/abstract
- [x] Wire CoachingView into counsellor ClientProfile page as a new "Coaching Session" tab
- [x] Add tRPC procedure to generate coaching summaries (LLM, cached per client)

## Bug Fix — Coaching Summary JSON Parse Error

- [x] Fix generateCoachingSummary to handle malformed/truncated LLM JSON responses robustly

## Coaching Session — ESF Life History Print Report

- [x] Add /api/export/esf-report/:clientId route to pdf-export.ts — achievements grouped by E/S/F, chronological within each group, printable HTML
- [x] Add "Print ESF Report" button to the Life History tab of CoachingSessionTab.tsx

## Bug Fix — ESF Print Report Grouping

- [x] Fix ESF grouping to use lowercase full words (enjoyable/satisfying/fulfilling) not uppercase letters

## Bug Fix — ESF Report Route 500 Error

- [x] Fix ESF report route returning {"error":"Failed to generate ESF report"}

## AI Coach — Rename to Sage & Coaching Redesign

- [x] Rename "Jamie" to "Sage" in all UI text (ClientDashboard, chat intro screens, report, etc.)
- [x] Rename "Jamie"/"Peter" references in all system prompts in routers.ts
- [x] Rewrite career coaching (Background & History) system prompt: Sage as coach, observed behaviour format, 1-2 para max, question-led
- [x] Rewrite career explorer system prompt: same Sage coaching persona
- [x] Redesign chat UI to render Sage's observed behaviour as italic narrative above her spoken words
- [x] Update any hardcoded "Jamie" in the PDF report cover or footer

## Reasoning Screener — Remove

- [x] Remove reasoning screener from client dashboard progress tracker and nav
- [x] Remove Reasoning tab from CoachingView in counsellor ClientProfile
- [x] Remove cognitive screener tRPC routes from routers.ts
- [x] Remove cognitive_screener_results table from drizzle/schema.ts and run migration
- [x] Remove CognitiveScreener.tsx and CognitiveResults.tsx pages
- [x] Remove cognitive screener route from App.tsx
- [x] Remove cognitive screener section from PDF/HTML export

## OCEAN Visualisation — Graphical Client Display

- [x] Design OCEAN results component: radar chart or horizontal bar chart with Insights-style colour coding
- [x] Map OCEAN facets to Jungian E/I, T/F, S/N dimensions and derive approximate DISC/Insights quadrant
- [x] Build InsightsMapping component showing client's position on Insights colour wheel
- [x] Add InsightsMapping to client IpipResults page
- [x] Add InsightsMapping to counsellor IPIP tab in ClientProfile
- [ ] Add graphical OCEAN display to client dashboard (My Report or dedicated Personality page)
- [ ] Add graphical OCEAN display to counsellor CoachingView IPIP tab
- [ ] Update PDF export to include graphical OCEAN summary
- [x] Fix InsightsMapping SVG: expand viewBox so "Sunshine Yellow" label is not cropped

## Coaching Session Tab — Past / Present / Future Redesign

- [x] Replace existing coaching session tab with Past / Present / Future three-tab structure (coach view)
- [x] Past tab: Life History sub-group with ESF grouping, Sage transcript (collapsed), coach notes field
- [x] Past tab: Family sub-group with verbatim text, Sage transcript (collapsed), coach notes field
- [x] Past tab: Career History sub-group with verbatim text, Sage transcript (collapsed), coach notes field
- [x] Past tab: on-demand Sage analysis per sub-group (Option A with caching + refresh button)
- [x] Present tab: Insights colour wheel sub-group, clean coach display
- [x] Present tab: VIA Signature Strengths sub-group
- [x] Present tab: OCEAN sub-group, coach context notes
- [x] Future tab: Focus statement (coach-set, saveable)
- [x] Future tab: Sage questions (How do you know / Why now / What would success look like) with coach notes
- [x] Future tab: Emerging Themes briefing (LLM synthesis of Past + Present + Focus)
- [x] Future tab: Session Notes panel
- [ ] Add video placeholder slots to client-side Life History, VIA, and Personality sections

## Bug Fix — Coaching Session Transcript Speaker Labels

- [x] Fix Sage transcript in Past tab: client messages labelled "Sage" — should be labelled with client's first name

## Bug Fix — OCEAN Score Display

- [x] Fix OCEAN scores in Coaching Session Present tab showing as e.g. 5000% instead of 50%

## Feature — OCEAN Facet Drill-Down

- [x] OCEAN domains in Coaching Session Present tab: click to expand and show the 6 facet subscale scores

## Feature — Sequential Four-Stage Report Analysis

- [x] Replace existing report generation prompts with new four-stage sequential analysis (Stage 1: Dependable Strengths, Stage 2: VIA, Stage 3: OCEAN, Stage 4: Insights standalone)

## Bug Fix — Mobile Tab Overflow

- [x] Counsellor dashboard tabs overlap on mobile — fix to wrap onto 2–3 rows

## Feature — Client Name & Pronouns

- [x] Add pronouns field to client_profiles schema and migrate
- [x] Life history interview: collect first name and pronouns as first two questions before life story begins
- [x] Save first name and pronouns to client_profiles when collected during interview
- [x] Thread first name and pronouns into all four report generation prompts (use first name in body text, correct pronouns throughout)

## First-Login Password Guidance

- [x] Show a dismissible first-login welcome banner on the client dashboard explaining that the client sets their own password via the Manus login portal (persist dismissed state in localStorage)

## Pennington Hennessy Marketing Site (penningtonhennessy.com)

- [x] Build shared PHNav component (navy top nav with logo, Home/Coaching/Training/About links)
- [x] Build shared PHFooter component (contact details, links to Lifework and AI Scenarios)
- [x] Build PHHome page (hero, two service pillars, about teaser, clients strip)
- [x] Build PHCoaching page (coaching services, Lifework link, Take Counsel methodology)
- [x] Build PHTraining page (training programmes, AI Scenarios link, Qinect partnership)
- [x] Build PHAbout page (bio, photo placeholder, selected clients)
- [x] Register all PH routes in App.tsx (/ph, /ph/coaching, /ph/training, /ph/about)
- [x] Embed Google Drive video on /interview page below "The Story of who you are" headline

## Dashboard Restructure — 5 Steps
- [x] Reorder dashboard to 5 steps: Life History, Background & History, Sage, Psychometrics, Career Explorer
- [x] Remove Analysis & Report step from client dashboard
- [x] Remove View Report button from client dashboard
- [x] Remove Chat to Sage button from Background & History card
- [x] Add dedicated Sage step 3 card with correct heading and sub-heading
- [x] Update Sage step-3 context to Life History + Background & History only (no career/IPIP context)

## Lifework Landing Page Redesign
- [x] Rewrite /lifework as StoryBrand 2.0 marketing page with video, CTA, and access code gate
- [x] Add access code gate: server-side tRPC procedure to validate code, frontend modal before sign-in
- [x] Set default access code via LIFEWORK_ACCESS_CODE env secret

## WOW Report — AI-Generated Premium PDF Report
- [x] Add wowReportJson and wowReportPdfUrl columns to analysis_reports schema and migrate
- [x] Build server-side wowReport router with generateWowReport and getWowReport procedures
- [x] Write AI prompt for 7-section WOW report (Summary, Life History Pattern, VIA, Big Five, Career Directions, Development Edge, Coaching Questions)
- [x] Build PDF renderer using pdfmake with navy/gold/cream Lifework brand styling
- [x] Upload generated PDF to S3 and store URL in database
- [x] Add "WOW Report" tab to counsellor ClientProfile page
- [x] Build WOW Report tab UI: generate button, status indicator, PDF preview/download, regenerate option
- [x] Add vitest tests for wowReport router procedures

## WOW Report Snag List (2026-03-24)
- [x] Add VIA strength name labels to the bar chart in WowReportTab
- [x] Reorder SECTION_META: Life History Pattern first, then Lifework Summary, then psychometrics
- [x] Pass client first name into all 7 AI prompts so "the client" is replaced with the person's name

## WOW Report — Markdown Rendering Fix
- [x] Render WowReportTab section text as styled Markdown (headings, bold, paragraphs) not raw text
- [x] Add Markdown-to-pdfmake converter in renderWowPdf so ## becomes styled headings, **bold** becomes bold text, etc.

## WOW Report — PDF Layout Improvements
- [x] Each section starts on a new page (pageBreak: "before" on section headings)
- [x] AI prompts updated to write short paragraphs (max ~5 sentences / 6 lines)

## Conclusions Section Refinement
- [x] Update Conclusions AI prompt: one 4-5 sentence paragraph per dependable strength, framed by opening and closing paragraphs

## Bug Fix — WOW Report Stuck in 'generating' Loop

- [x] Fix: server restart mid-job leaves wowReportStatus = 'generating' forever, causing UI polling loop
- [x] Add startup recovery in server/_core/index.ts: reset any 'generating' records to 'error' on boot

## Bug Fix — WOW Report Content & PDF Layout

- [x] Remove intro text before "Your Personality Profile: A Deep Dive" heading in personality section
- [x] Fix blank page 2 in WOW Report PDF

## Behavioural Style Section — WOW Report

- [x] Add behaviouralStyle field to WowReportSections type
- [x] Add Insights colour energy derivation (from Big Five) to generateWowSections
- [x] Add behaviouralStyle LLM prompt (reuse coaching session stage4 prompt) to parallel generation
- [x] Add Section 5 "Behavioural Style" to PDF renderer (before Career Directions)
- [x] Renumber sections 5→6 (Career Directions), 6→7 (Development Edge), 7→8 (Conclusions) in PDF
- [x] Add Behavioural Style tab to WOW Report counsellor UI (before Career Directions tab)
- [x] Reset existing reports to regenerate with new section

## Insights Colour Wheel — Behavioural Style Section

- [x] Build SVG InsightsWheel component with 4 colour quadrants and client position dot
- [x] Add wheel to WowReportTab Behavioural Style accordion
- [x] Add wheel to PDF renderer (Section 5) as embedded SVG/image

## Bug Fix — Insights Wheel Labels

- [x] Fix quadrant label positions in insightsWheelPng.ts (server/PDF) — labels overlapping axis text
- [x] Fix quadrant label positions in InsightsWheel.tsx (React UI) — same issue

## Bug Fix — Insights Wheel Axis Labels

- [x] Remove Introvert/Extravert and Thinker/Feeler axis labels from InsightsWheel.tsx (React UI)
- [x] Remove axis labels from insightsWheelPng.ts (server-side PDF PNG)

## Cover Page Template

- [x] Inspect lifeworkcover.pdf to understand layout, colours, fonts, and dimensions
- [x] Recreate cover page in pdfmake matching the template design
- [x] Insert client name and report date in appropriate spaces
- [x] Add client full name to top-right header on all pages
- [x] Move footer down so it is the same distance from the bottom as the header text is from the top
- [x] Suppress header and footer on cover page (page 1)
- [x] Page numbers offset by 1 (cover = page 0, inner pages start at 1)

## Life History Analysis — Early Experience Primacy

- [x] Update WOW Report Life History Pattern prompt: anchor analysis in earliest experiences as seed themes, trace how they reproduce across decades
- [x] Update WOW Report Summary prompt: reference early-imprinted patterns as the foundation of the career narrative
- [x] Update coaching session Past tab Sage analysis prompts: same early-experience-first methodology
- [x] Update coaching session Emerging Themes (Future tab) prompt: root emerging themes in early-established patterns

## Life History Pattern Chapter — Expansion to 2-3 Pages

- [x] Rewrite Life History Pattern prompt: structured multi-section chapter tracing each seed theme from earliest appearance through the decades
- [x] Reset existing reports to regenerate with expanded chapter

## Prompt Tone — Remove Obsequious Openings

- [x] Audit all WOW Report chapter prompts and add explicit "do not open with salutations or flattery" instruction
- [x] Add a shared system prompt rule: open each chapter directly with the analysis, no "Dear X" or introductory flattery
- [x] Reset existing reports to regenerate with corrected tone

## Conclusions Chapter — Past/Present/Future Structure

- [x] Rewrite Conclusions prompt: Past (life history patterns), Present (VIA + OCEAN + Behavioural Style), Future (Career Directions + Development Edge)
- [x] Add closing "Tell Me About Yourself" paragraph — a 90-second interview answer synthesising the whole report
- [x] Reset existing reports to regenerate with new Conclusions structure

## Sage Prompt Improvements

- [x] Sage 1: Add early-life primacy instruction — earliest achievements are most important, always probe for first instance of each theme
- [x] Sage 1: Add closing ritual — when client signals done, Sage names 2-3 patterns she noticed and asks "Does that feel true?"
- [x] Sage 1: Give Sage a distinct professional identity (not just "warm and empathetic")
- [x] Sage 1: Add stage direction format (physical presence before each spoken response)
- [x] Sage 1: Natural ESF classification — weave into conversation, not as a form question
- [x] Sage 2: Add opening move — on first message, Sage introduces herself, names the most striking thing in the profile, asks one question
- [x] Sage 2: Inject full WOW Report sections into context (not just careerThemes/careerSuggestions)
- [x] Sage 2: Add challenge instruction — when client repeatedly returns to a direction without committing, name the hesitation
- [x] Sage 2: Add session arc instruction — opening → exploration → challenge → commitment
- [x] Sage 2: Give Sage a distinct professional identity
- [x] Sage 2: Add stage direction format (physical presence before each spoken response)

## WOW Report — Third-Person Voice

- [x] Convert all 8 WOW Report section prompts from second-person ("you"/"your") to third-person (client first name + pronouns)
- [x] Update section heading text in PDF renderer if any contain "Your" (e.g. "Your Personality Profile")
- [x] Reset all existing WOW Reports to regenerate with corrected voice

## Background & History Tab — Intro Video

- [x] Identify video file in Google Drive folder (file ID: 1d5tJEmwsCXmvdsXJGSe1yzN1csLqoK6h)
- [x] Embed video at the top of the Background & History page (above the Family/Education/Career tabs)
- [x] Video is responsive (16:9 aspect ratio, gold border, consistent with other embedded videos)

## WOW Report — Covering Letter

- [x] Add covering letter from Jamie Pennington as standalone page 2 of every WOW Report PDF (after cover, before Section 1)
- [x] Insert client first name in the salutation ("Hi [firstname]")
- [x] Header/footer suppressed on pages 1 and 2; main report numbering starts at 1 from Section 1
- [x] Reset existing reports to regenerate with covering letter

## Counsellor Preview Mode

- [x] Audit all client-facing pages and their data requirements
- [x] Create rich dummy data fixture (fake client Alex Morgan — solicitor/Legal Director, all surveys, WOW report JSON, career explorer messages)
- [x] Build /preview route with 9 preview pages rendering real UI with static dummy data
- [x] Add Preview button to counsellor dashboard header
- [x] All 64 tests pass

## Preview Mode — First-Visit State Rework

- [x] Rework preview pages to show first-visit / empty state (as new client sees them)
- [x] Add persistent preview nav bar so you can click between all pages without returning to hub
- [x] Dashboard: show all steps as "Not Started", no report available
- [x] Home page: show Lifework landing page with overview video
- [x] Interview: show intro page with life history video, opening framing text, and How it Works
- [x] Background: show empty forms with intro video playable
- [x] VIA Survey: show page 1 with video, About box, and sample questions
- [x] VIA Results: show completed results (useful to see)
- [x] IPIP Survey: show domain 1 with video, About card, and sample questions
- [x] IPIP Results: show completed results (useful to see)
- [x] My Report: show "report not ready yet" state
- [x] Career Explorer: show first-visit state with Sage's opening message only

## Dashboard Welcome Text

- [x] Replace dashboard subtitle with new five-stage journey description

## Completion Email

- [ ] Send congratulatory email to client when all five Lifework steps are complete
- [ ] Notify counsellor when a client completes all steps
- [ ] Ensure email sends only once (idempotent — not re-sent if client revisits)

## Preview Mode — Sage Page

- [x] Add PreviewSage page showing the life history chat panel in first-visit state
- [x] Register /preview/sage route in App.tsx
- [x] Add Sage to preview hub nav bar and hub page

## Lifework Marketing Page — Brochure Downloads

- [x] Upload 4 Lifework PDFs to CDN (general, retirement, mid-career, return to work)
- [x] Link each PDF to its matching client type card in the Guide section with a download button

## Public Access — /lifework Marketing Page

- [ ] Confirm /lifework is publicly accessible without login
- [ ] Ensure CTAs only prompt login when navigating to the dashboard

## Edgar Persona — WOW Report Voice

- [x] Create Edgar persona — focused, analytical, forensic voice for the WOW Report
- [x] Apply Edgar as the system prompt for all 8 WOW Report section prompts (main + Insights)
- [x] Update Tell Me About Yourself section to three-driver structure (Three Drivers / Roles / Intent)
- [x] Update Development Edge prompt to remove encouraging closing line
- [x] Reset existing reports to regenerate with Edgar's voice

## Edgar — Jamie Style Integration

- [x] Update Edgar's system prompt to reflect Jamie Pennington's writing style (directness, rhetorical questions, rhythm of three, wry aside, evidence-led, endings that land)
- [x] Update insightsSys (Behavioural Style) prompt with same style characteristics
- [x] Reset existing reports to regenerate with updated voice

## Edgar — First-Person Voice

- [x] Change Edgar's voice instruction from "write in the style of Jamie Pennington" to "write as Jamie Pennington in first person (I)"
- [x] Update insightsSys to match
- [x] Reset existing reports

## WOW Report — Second-Person Voice & Pronoun Selector

- [ ] Add pronoun selector (he/him, she/her, they/them) to Add Client form
- [ ] Ensure pronouns field is stored in client_profiles table (already exists — verify)
- [ ] Switch all WOW Report prompts from third-person (client name) to second-person (you/your)
- [ ] Update the CRITICAL TONE RULES in Edgar's system prompt to mandate second-person
- [ ] Reset existing reports to regenerate with second-person voice

## Dashboard — Step 3 Title

- [x] Rename Step 3 from "Sage the online career coach" to "Sage - Exploring your Life History"

## Dashboard — Step Restructure

- [x] Remove VIA results box from client dashboard (/dashboard)
- [x] Add new Step 5 "Lifework Coaching" before Career Explorer
- [x] Number all stages 1–6 in step titles
- [x] Update progress bar from "x of 5" to "x of 6 steps completed"

## WOW Report — Fix Remaining Third-Person Prompts

- [x] Convert system prompt (Edgar) from third-person to second-person
- [x] Convert Summary Portrait prompt to second-person
- [x] Convert Life History Pattern prompt to second-person
- [x] Convert VIA prompt to second-person
- [x] Convert Big Five prompt — confirmed two-movement OCEAN format in place
- [x] Convert Insights (Jamie) system prompt and sub-section headings to second-person
- [x] Convert Career Directions prompt to second-person
- [x] Convert Development Edge prompt to second-person
- [x] Convert Conclusions prompt to second-person
- [x] Reset all existing reports to force regeneration

## Bug: OCEAN Scores Not Showing on Counsellor Client Page

- [ ] Fix OCEAN scores not displaying under Personality tab on /counsellor/client page

## WOW Report — Completeness Guard

- [x] Add pre-flight check in runGenerationJob: block if life history achievements < 3, VIA not completed, IPIP not completed
- [x] Return a structured error listing exactly which items are missing
- [x] Surface the missing-data error clearly in the counsellor UI (amber checklist panel instead of generic red error)
- [x] TypeScript clean, 64 tests pass

## Counsellor Dashboard — Client Card Status Rows

- [x] Replace "Analysis" status row with "OCEAN" (wired to ipipStatus) on counsellor client cards

## Routing — Consolidate Lifework Entry Point

- [x] Move Lifework front page from /lifework to /coaching/lifework
- [x] Move all /lifework/* sub-routes to /coaching/lifework/* (interview, background, via, ipip, etc.)
- [x] Add redirects from old /lifework/* paths for backward compatibility
- [x] Update PHCoaching page "Open Lifework" link to /coaching/lifework
- [x] TypeScript clean, 64 tests pass

## VIA — Three-Movement Prompt Rewrite

- [x] Rewrite VIA prompt: Movement 1 — VIA definitions of the top 5 strengths
- [x] Rewrite VIA prompt: Movement 2 — frequency count against fulfilling achievements with specific evidence
- [x] Rewrite VIA prompt: Movement 3 — narrative interpretation including salience divergences
- [x] Reset existing reports and save checkpoint

## Coaching Page — Lifework Section

- [x] Remove Lifework methodology section from /coaching page
- [x] Add "Open Lifework" button at the bottom of box 3 (Career Development)

## VIA — Table + Key Findings Structure

- [x] Update VIA prompt to produce markdown table (Strength / Survey Rank / Freq / Identity Salience / Achievements) followed by "The Key Findings" with bold lead sentences and quoted evidence
- [x] Reset existing reports

## VIA — Strength Cards in WOW Report

- [x] Display Top 5 VIA strengths as styled cards (rank, name, virtue category, score bar, description) in the WOW Report VIA section

## VIA — Remove Redundant Definitions Movement

- [x] Remove "Your Top 5 Signature Strengths" section from VIA AI prompt (cards already show definitions)
- [x] Ensure Evidence Table includes a VIA definition for every strength cited (not just top 5)
- [x] Reset reports and save checkpoint

## Bug: VIA Evidence Table — PDF Rendering

- [ ] Fix VIA Evidence Table not rendering in PDF (markdown pipe characters shown as raw text)

## PDF Export — Behavioural Style Section

- [x] Replace markdownToPdfContent(sections.behaviouralStyle) in renderWowPdf with structured pdfmake Insights Discovery panel (axis cards + strengths/watch-outs/career fit)
- [x] Clear cached wowReportPdfUrl values so all PDFs regenerate with the new structured panel

## Bug Fix — Insights Wheel PNG (PDF version)

- [x] Fix quadrant labels rendering as garbled boxes in PDF PNG — removed labels entirely (no font issues)
- [x] Ensure outer ring colour arcs are visible in PDF PNG
- [x] Simplify PDF wheel to quadrants + ring + dot only (no labels) per user request

## PWA — Progressive Web App

- [x] Add manifest.json to client/public with name, icons, theme colour, display mode
- [x] Register service worker via inline script in index.html
- [x] Add PWA meta tags to client/index.html (theme-color, apple-touch-icon, apple-mobile-web-app)
- [x] Resize and upload icons (192px, 512px, maskable) to CDN
- [ ] Verify installability on real devices (user testing step)
- [x] Add PWA install prompt banner (beforeinstallprompt, mobile only, dismissible)
- [x] Fix PWA start_url to open at /coaching/lifework instead of PH home page

## StoryBrand Landing Page — Youth Market

- [x] Add leads table to drizzle schema (name, email, source, createdAt)
- [x] Apply leads table migration to database
- [x] Add marketing.submitLead tRPC procedure (public, stores lead + notifies owner)
- [x] Add marketing router to appRouter
- [x] Build LifeworkLanding.tsx — full StoryBrand 7-element page (Hero, Problem, Guide, Plan, Success, CTA, Failure)
- [x] Add /lifework-landing route to App.tsx
- [x] Write a vitest test for the marketing.submitLead procedure (6 tests: validation, defaults, edge cases)

## Client-Reported Bugs

- [x] Fix step completion indicators — backgroundStatus field added; psychometrics step now requires both VIA + IPIP complete
- [x] Fix life history interview — age screen added before intro; ACTIVE_PHASES filters out future decades
- [x] Fix "Invalid hook call" React error — removed stale wouter patch, reinstalled dependencies

## Design Changes — Client Journey Sequencing

- [x] Withhold VIA results from client — VIASurvey completion screen now shows held-results message; View My Results button removed
- [x] Withhold OCEAN (IPIP) results from client — IpipSurvey now navigates to /results-held/ipip after submit
- [x] Derailer not yet part of this project — no change needed
- [x] Sage 1 step already in dashboard at position 3 (after Background, before Psychometrics) — no change needed
- [x] Update preview mode — PreviewVIAResults and PreviewIpipResults nav links and survey buttons now point to held-results screen

## WOW Report — New House Style

- [x] Update system prompt to enforce punchy house style (short paragraphs, evidence-led, bullet points with "From what you have told us, we can see:", active voice, no theatrical flourishes)
- [x] Update Lifework Summary prompt: one opening paragraph + 5-6 specific bullets
- [x] Update Life History Pattern prompt: structured sections with short paragraphs + bullet closes
- [x] Update Character Strengths prompt: evidence table + 3 short paragraphs + bullet close
- [x] Update Personality Profile prompt: streamlined two-movement structure with bullet close
- [x] Update Career Directions prompt: 3 directions, 2 paragraphs each + bullet close
- [x] Update Development Edge prompt: 2-3 edges, 2 paragraphs each + bullet close
- [x] Update Conclusions prompt: shorter Past/Present/Future + Tell Me About Yourself
- [x] Add "Rewrite in New Style" button to WOW Report tab (bottom CTA card)
- [x] Add "Regenerate" label to the header icon button for clarity

## WOW Report — Four Variant System (Student / Career Changer / Job Returner / Retirement)

- [x] Add reportType column to wow_reports table in drizzle schema (enum: standard | student | career_changer | job_returner | retirement)
- [x] Add variant-specific prompts for Chapters 6 (Directions), 7 (Development Edge), 8 (Conclusions) in wowReport.ts
- [x] Add report type selector UI to WowReportTab (shown before first generation and when regenerating)
- [x] Update generate procedure to accept and store reportType
- [x] Show report type badge on generated report header in counsellor UI
- [x] Checkpoint and deliver

## Sage Counsellor Panel (Pre-Session Thinking Partner)

- [x] Add counsellorSage tRPC procedure with streaming and full client context system prompt
- [x] Build SageCounsellorPanel slide-over component (chat UI, ephemeral, pre-loaded context)
- [x] Add "Ask Sage" button to WOW Report tab header
- [x] Checkpoint and deliver

## Sage Panel — Mobile Scroll Fix

- [x] Fix SageCounsellorPanel scroll layout so messages are scrollable on mobile devices

## Sage Briefing — Remove Suggested Question from Prompt

- [x] Update getBriefing system prompt so it does not end with a suggested question for the counsellor

## WOW Report — Variant-Aware Section Titles

- [x] Fix PDF section titles to use variant-specific names (e.g. "What To Do With What You Know" for retirement variant)
- [x] Fix web accordion section titles to match variant

## WOW Report — Screen/PDF Sync Bug

- [ ] Diagnose why on-screen accordion shows old standard content after retirement variant regeneration
- [ ] Fix so screen content always matches the generated PDF

## WOW Report — Variant Footer in PDF

- [x] Add variant explanation footer to all PDF variants (names current variant, briefly describes the other three)

## WOW Report — Student & Job Returner Variants

- [x] Write Student variant prompts for Chapters 6 (Where You Are Headed), 7 (What To Build First), 8 (Conclusions)
- [x] Write Job Returner variant prompts for Chapters 6 (What You Bring Back), 7 (What To Rebuild), 8 (Conclusions)
- [x] Relabel Career Changer to use Standard prompts with Career Change Edition label
- [x] Update variant-aware section titles for Student and Job Returner
- [x] Checkpoint and deliver

## PDF Appendix — Font Fix

- [x] Replace RobotoBold font references with bold:true in the variant appendix table

## Sage Enrichment — Auditable Life History Records

- [x] Add sageEnrichment column to achievements table (ALTER TABLE applied)
- [x] Update Drizzle schema.ts with sageEnrichment field
- [x] Add updateAchievementSageEnrichment helper to db.ts
- [x] Build runSageEnrichment() helper function in routers.ts (AI matches Sage transcript to achievement records)
- [x] Add achievements.enrichFromSage tRPC procedure (client-side trigger)
- [x] Add counselor.enrichClientFromSage tRPC procedure (counsellor-side trigger)
- [x] Wire enrichment to fire automatically on completeInterview (non-blocking)
- [x] Update ClientProfile interview tab: show sageEnrichment with gold separator and "Sage conversation" label
- [x] Add "Sage-enriched" badge to achievement cards that have enrichment data
- [x] Add "Enrich from Sage" action bar to interview tab (shows when Sage messages exist)
- [x] Run enrichment against Toby Greenhill's data (6 of 12 records enriched)

## Counsellor-Editable Life History

- [x] Add counsellorNotes column to achievements table (for premium counsellor annotations)
- [x] Update Drizzle schema.ts with counsellorNotes field
- [x] Add counselor.updateAchievement tRPC procedure (edit title, description, age, ESF, sageEnrichment, counsellorNotes)
- [x] Build inline edit UI on achievement cards in counsellor ClientProfile view
- [x] Show counsellorNotes as a distinct section on each card
- [x] Add per-card edit/save/cancel controls (pencil icon → inline form → save)

## WoW Report — Chapter Overviews

- [x] Add VIA framework overview text at the start of Chapter 3 (Character Strengths)
- [x] Add Big Five / OCEAN overview text at the start of Chapter 4 (Personality Profile)
- [x] Add Behavioural Style overview text at the start of Chapter 5 (Option B — extrapolation from Big Five, treat as basis for discussion)

## Single Canonical Life History Analysis

- [x] Add canonicalStage1 and canonicalStage1GeneratedAt columns to analysis_reports table
- [x] Update Drizzle schema.ts with new columns
- [x] Build generateCanonicalStage1 shared helper (reads achievements + sageEnrichment + counsellorNotes + Sage interview)
- [x] Update WoW report Stage 1 to use canonical output (generate if missing)
- [x] Update counsellor triggerAnalysis to use canonical Stage 1 instead of re-running its own
- [x] Add Regenerate Life History Analysis button to counsellor ClientProfile view
- [x] Run canonical Stage 1 for Toby so both reports are immediately consistent

## Life History Tab & WoW Report Improvements

- [x] Add "Last analysed" timestamp to the Life History tab showing when canonical Stage 1 was last generated
- [x] Wire canonical Stage 1 into WoW report Chapter 3 (VIA / Character Strengths) so VIA analysis is grounded in the same life history interpretation

## WoW Report — Mark Brandon Writing Style

- [x] Add WritingStyle type ("house" | "mark") and wowReportWritingStyle column to database and Drizzle schema
- [x] Build MARK_BRANDON_STYLE_PROMPT constant with full voice brief
- [x] Apply style prompt as an additional system instruction to all four WoW report stage LLM calls
- [x] Add writingStyle parameter to generate procedure input schema
- [x] Add writingStyle to get procedure return value
- [x] Add Writing Style selector (House Style / Mark) to WowReportTab UI alongside Report Variant selector
- [x] Show "Regenerate in Mark Style" button when style has changed

## WoW Report PDF — Writing Style Fix

- [x] Identify why PDF renderer ignores writingStyle and always uses house style
- [x] Pass writingStyle through to the PDF build function
- [x] Apply Mark-specific formatting to PDF (no subheadings within sections, flowing prose paragraphs)

## WoW Report — Writing Style Selector Bug

- [ ] Restore the Writing Style selector (House Style / Mark) to the WoW report generation panel

## WoW Report PDF — Stale Cache Fix

- [x] Add server-side rebuildPdf procedure that re-renders PDF from stored JSON sections with correct writing style
- [x] Update Download PDF button to detect style mismatch and trigger rebuild
- [x] Ensure PDF always reflects the currently displayed on-screen content
- [x] Fix Life History Pattern (Chapter 2) not applying Mark Brandon style — canonical Stage 1 is style-neutral; WoW pipeline must re-write it through the Mark voice LLM when Mark style is selected
- [x] Fix Behavioural Style (Chapter 5 / Insights section) not applying Mark Brandon style — insightsSys was hardcoded, now uses effectiveInsightsSys with Mark overlay

## Mark Style Rewrite — Post-Processing Stage

- [x] Build rewriteSectionsForMark() function: takes completed house-style WowReportSections, runs each prose section through a Mark Brandon rewrite LLM call
- [x] Wire rewriteSectionsForMark() into runGenerationJob: call after generateWowSections() when writingStyle === "mark"
- [x] Remove old effectiveSys / effectiveInsightsSys voice overlay from generateWowSections (revert to always using house-style prompts)
- [x] Remove the Mark-style Life History rewrite pass from generateWowSections (now handled by post-processor)
- [x] Write rewrite prompt: instructs LLM to rewrite prose in Mark's voice, shorter, punchier, no "From what you have told us" bullet formula, max 2 sub-sections per chapter
- [ ] Test: regenerate Mark Brandon's report in Mark style and verify all 8 sections are in Mark's voice

## Bug Fix — Sage Enrichment Not Integrating Chat to Sage Content

- [x] Fix runSageEnrichment to read from chat_sessions (life_history section) instead of deprecated interview_messages table
- [x] Also trigger runSageEnrichment when generateSummary is called (so enrichment runs automatically when client saves Sage insights)
- [ ] Re-run enrichment for Charlie Gush via counsellor dashboard "Run Sage Enrichment" button
- [x] Add visible "Run Sage Enrichment" button to the Interview tab header in ClientProfile.tsx (currently missing/hidden)
- [x] Fix infinite loop in client Lifework onboarding: clicking "Begin Early Childhood" sends user back to "A couple of quick questions" instead of proceeding to life history entry
- [x] Always show name/pronouns screen at start of Lifework process, pre-filled with existing profile data
- [x] After login from /lifework access code page, redirect to Lifework opening page (with video) instead of main homepage
- [x] Move "Others" field from each individual action to a single phase-level box after Action 4, with updated wording about what others said during that phase

## Coaching Session Slides

- [x] Build server-side PPTX generation using pptxgenjs (Lifework navy/gold theme)
- [x] 8-slide structure: title, who you are, life history, VIA, OCEAN, colour energies, cross-instrument synthesis, so what
- [x] LLM-extracted bullet points from stored report sections (runs in parallel)
- [x] Add coachingSlidesRouter to main router
- [x] Add "Coaching Slides" button to WowReportTab (gold-accented, beside Ask Sage)
- [x] Download triggers automatically when PPTX is ready

## StoryBrand Homepage (Lifework)

- [x] Build /lifework-storybrand page with all 7 StoryBrand sections in navy/gold/cream brand design
- [x] Hero section: headline, subheadline, primary + transitional CTA
- [x] Problem section: external/internal/philosophical framing
- [x] Guide section: empathy statement + authority stats
- [x] Plan section: 3-step process with icons
- [x] CTA section: repeated direct CTA with visual weight
- [x] Stakes section: cost of inaction
- [x] Success section: transformation + testimonial quote
- [x] Wire into App.tsx as /lifework-storybrand route

## Lead Magnet — "What Lifework Reveals" PDF

- [x] Server-side PDF generation endpoint using pdfkit/weasyprint in navy/gold brand style
- [x] Database table to store leads (name, email, timestamp)
- [x] Name/email capture modal on StoryBrand page before download
- [x] PDF content: overview, 3 instruments, dummy quotes, CTA
- [x] Store lead and serve PDF download on form submit

## PDF Download Fix

- [x] Switch PDF delivery from tRPC base64 to direct Express HTTP streaming endpoint
- [x] Update frontend modal to use fetch + blob URL for reliable browser download

## Coaching Slides Amendments (v2)

- [x] Slide 2: font 32pt, spacing, add 2 examples per bullet
- [x] Slide 3: font 32pt, spacing, add 2 examples per bullet
- [x] Slide 4: replace bar chart with evidence table (strength + life history evidence)
- [x] Slide 5: bars in top half, conclusions (what it says + VIA comparison) in bottom half
- [x] Slide 6: descriptor font 14pt, add "On bad day" paragraph
- [x] Slide 7: descriptor font 14pt, add "On bad day" paragraph
- [x] Slide 8: subtitle 14pt, career direction bullets 32pt

## Coaching Slides — Download Fix

- [x] Switch PPTX delivery from tRPC blob URL to direct Express streaming endpoint (same pattern as PDF fix)
- [x] Update frontend button to use fetch + blob URL trigger reliably

## Coaching Slides — Slide 8 & Logo Updates

- [x] Move "Your question for today" box to top of Slide 8 (below heading, above career direction bullets)
- [x] Replace logo in all slides with correct navy-background Lifework logo (no white band)

## WOW Report — VIA & Big Five Intro Text Update

- [x] Replace VIA intro (4 paragraphs) with new shorter 3-sentence version
- [x] Replace Big Five intro (3 paragraphs) with new shorter 3-sentence version
- [x] Reset existing reports to regenerate with updated intros

## Coaching Slides — Download Fix (Round 2)

- [x] Add Express POST /api/download/coaching-slides endpoint that streams PPTX directly (same pattern as PDF)
- [x] Update frontend to use fetch + createObjectURL + click trigger (same-origin, no cross-origin block)

## Coaching Slides — Slide 4 Evidence Table

- [x] Replace current Slide 4 strength table with full 5-column evidence table (Strength, VIA Definition, Survey Rank, Freq of N, Identity Salience, Achievements with evidence)
- [x] Rename slide heading from "Evidence Table" to "Character Strengths"
- [x] Parse table directly from stored viaSection markdown (no extra data passing needed)

## WOW Report — Lookup Bug & Lock Feature

- [x] Diagnose and fix: `exists` check was using `wowReportPdfUrl` (null for many clients) instead of `wowReportJson`
- [x] Add `wowReportLocked` boolean field to analysis_reports schema (migration applied)
- [x] Auto-lock report when PDF is first downloaded
- [x] Show Lock/Unlock toggle button in counsellor header actions
- [x] Hide Regenerate and Rewrite buttons when report is locked
- [x] Add Rebuild PDF button for reports with JSON but no PDF URL

## WOW Report & Slides — Chapter Reorder & Rename

- [x] WOW report: rename all "Section N" headings to "Chapter N" (in LLM prompts, PDF renderer, UI labels)
- [x] WOW report: swap Chapter 6 (Career Directions) and Chapter 7 (Development Edge) — Development Edge first
- [x] Slides: add new Slide 6 "Development Edge" summarising the development edge section
- [x] Slides: rename existing "So What?" slide to "Chapter 7 — Career Directions" with career direction bullets
- [x] Reset cached WOW report PDFs so all reports regenerate with new chapter order

## WOW Report & Slides — Conclusions/Career Directions Swap

- [x] Slides: rename Slide 7 "The Pattern" → "Chapter 7 — Conclusions" (keep synthesis content, update eyebrow/heading)
- [x] WOW report: swap Ch7 (Conclusions/coachingQuestions) and Ch8 (Career Directions) — Conclusions first, Career Directions last
- [x] WOW report: update LLM prompt labels and appendix text to reflect new order
- [x] WOW report UI: update SECTION_META order so Conclusions is Chapter 7, Career Directions is Chapter 8
- [x] Reset cached WOW report PDFs

## Coaching Slides — Reorder & Conclusions Rebuild

- [ ] Swap Slide 7 (Conclusions) and Slide 8 (Development Edge) — Dev Edge first
- [ ] Rebuild Conclusions slide to mirror WOW Chapter 7: Past / Present / Future sections with bullets extracted from coachingQuestions
- [ ] Add new Slide 9 "Tell Me About Yourself" with verbatim paragraph extracted from coachingQuestions chapter
- [ ] Career Directions becomes Slide 10, update TOTAL to 10
- [ ] Update title slide agenda to reflect new order

## Slides & WOW Report — Tell Me About Yourself Refactor

- [ ] Remove Conclusions slide (slide 8) from coaching deck; renumber footers
- [ ] Update Tell Me About Yourself LLM prompt: 3 driver bullets + 2 short paragraphs
- [ ] Clear cached WOW report PDFs so all reports regenerate with new style

## Coaching Slides — Tell Me About Yourself Third Person

- [ ] Convert paragraph lines (non-bullet) on Slide 8 from second person to third person (You→first name, your→their, you→them/first name)

## Counsellor Layer — VIA & OCEAN Analysis Tabs

- [x] Add counsellor_via_analysis and counsellor_ocean_analysis columns to analysisReports schema
- [x] Apply DB migration for new columns
- [x] Add generateCounsellorVia tRPC procedure (5-stage VIA framework, stores markdown in DB)
- [x] Add generateCounsellorOcean tRPC procedure (4-stage OCEAN lens, stores markdown in DB)
- [x] Rename "Personality" tab to "OCEAN" in counsellor ClientProfile
- [x] Replace VIA tab content with CounsellorAnalysisTab component (generate + display stored analysis)
- [x] Replace OCEAN tab content with CounsellorAnalysisTab component
- [x] Add new "Insights" tab with dedicated InsightsTab component (Insights Discovery colour-energy mapping)
- [x] CounsellorAnalysisTab: generate-once, stored forever, regenerate button available
- [x] CounsellorAnalysisTab: toggle between rendered analysis and raw survey data

## Bug Fix — CounsellorAnalysisTab

- [x] Fix: generated analysis briefly flashes then disappears — invalidation not persisting the result in the tab

## Bug Fix — CounsellorAnalysisTab (Round 2)

- [x] Deep debug: white box appears but analysis does not render in tab — ROOT CAUSE: counsellor_ocean_generated_at was INT (32-bit) but Date.now() is 13-digit ms timestamp, causing silent DB write failure. Fixed by migrating columns to BIGINT.

## Bug Fix — VIA Tab Content

- [x] Fix: VIA tab content does not match PDF — fixed S1 prompt to suppress episode-by-episode coding output; LLM now does coding as internal reasoning and outputs only Evidence Table + Key Findings

## VIA Tab — Full Profile Table

- [x] Add full VIA profile (all 24 strengths ranked 1-24) as opening data section above the generated analysis

## VIA Tab — Button Behaviour

- [x] Remove Regenerate button from VIA tab; show single Generate button that greys out permanently after analysis is generated

## OCEAN Tab — Button Behaviour

- [x] Apply same one-time generate-and-grey-out pattern to OCEAN tab (remove Regenerate, grey out Generate after use)

## OCEAN Tab — Facet Definitions

- [x] Add short plain-language definitions for all 30 OCEAN sub-scale facets, displayed inline beneath each facet name in the raw survey data section

## WOW Report — Print Counsellor Report Button

- [x] Add "Print Counsellor Report" button to WOW report page that generates and downloads the Career Analysis Brief PDF

## WOW Report — Print Enhanced VIA & OCEAN Buttons

- [x] Add "Print Enhanced VIA" button — generates Lifework-styled PDF from stored counsellor VIA analysis
- [x] Add "Print Enhanced OCEAN" button — generates Lifework-styled PDF from stored counsellor OCEAN analysis
- [x] Replace standalone Career Explorer (Sage 2) system prompt with the WOW-mode Sage 2 prompt, and inject full context (30 OCEAN facets, counsellor VIA/OCEAN analyses, all 24 VIA scores)

## Claude Handoff JSON Export
- [x] Build `server/routers/claudeExport.ts` — pure helper functions that shape WOW report data into Claude's exact handoff schema (BRAND, CLIENT, REPORT, COVER_LETTER, CH1–CH8, VIA, OCEAN, APPENDIX, LIFE_HISTORY)
- [x] Add Express download route `POST /api/download/claude-export` in `server/claude-export-download.ts`
- [x] Register route and tRPC router in `server/_core/index.ts` and `server/routers.ts`
- [x] Add "JSON for Claude" button to WowReportTab (violet style, appears next to Coaching Slides button when report is ready)
- [x] Vitest unit tests for all pure helper functions (22 tests passing)

## Claude JSON Preview Modal
- [x] Add `claudeExport.getJson` tRPC procedure that returns the JSON payload as an object (already existed)
- [x] Build `ClaudeJsonPreviewModal` component with collapsible top-level keys, syntax highlighting, and copy-to-clipboard
- [x] Add "Preview JSON" button to WowReportTab (opens modal, violet style, next to JSON for Claude download button)

## In-App HTML Report (lifework-template.html design system)
- [x] Upload ph-tangram.jpg, lifework.css to CDN; store URLs as server constants
- [x] Build server/html-report.ts — template renderer ({{X}}, {{#EACH}}, {{#IF}} directives)
- [x] Add Express route GET /api/report/html/:clientId — streams rendered HTML
- [x] Add "View Report" button to WowReportTab (gold button, opens rendered report in new tab)
- [x] 118 tests passing (including 13 new html-report renderer tests)

## HTML Report — CH6/CH8 Fix & Print Quality
- [x] Fix nested EACH dot-path bug in renderTemplate ({{#EACH .paragraphs}} not resolving inside outer EACH — CH6 Development Edge and CH8 Career Directions showing raw template tags)
- [x] Improve print CSS: @page A4 portrait with 0 margins, print-color-adjust: exact, pt-based font sizes, sharper text rendering

## HTML Report — CH6/CH8 EACH1 Fix & Puppeteer PDF
- [x] Fix EACH1/EACH2 tag handling in renderTemplate — CH6 and CH8 used {{#EACH1 ...}}/{{/EACH1}} which the old regex did not match; replaced with generalised multi-tag parser
- [x] Install Puppeteer (headless Chromium) and build GET /api/report/pdf/:clientId route
- [x] Add "Download Report PDF" button to WowReportTab (gold, triggers server-side Puppeteer render)
- [x] All 118 tests pass

## HTML Report — Content Gaps (Round 4)
- [ ] CH8: each career direction shows title only — paragraphs missing ({{#EACH .paragraphs}} not resolving)
- [ ] CH6: each development edge shows title only — paragraphs missing (same pattern as CH8)
- [ ] CH5: ESF distribution box shows heading + one line only — full paragraph list missing
- [ ] CH3: Key Findings page shows intro paragraph + one pull-quote only — additional paragraphs missing

## HTML Report — Nested EACH Depth Fix
- [x] Fix processEach depth-tracking to count any EACH open tag with same tag-name (not just exact same string)
- [x] This fixes CH6/CH8 paragraphs not rendering when outer EACH and inner EACH share the same tag name (e.g. {{#EACH CH8.DIRECTIONS}} outer + {{#EACH .paragraphs}} inner both use {{/EACH}})
- [x] Apply same fix to test file inline renderer
- [x] Add 4 new nested EACH regression tests (122 tests total passing)

## HTML Report — CH2 Layout Fixes
- [x] Remove duplicate "Recurring themes" section on CH2 page 2 (was PAGE2_SECTION_H + PAGE2_PARAGRAPHS duplicating KEYFIND)
- [x] Rename "Recurring motifs" to "Recurring themes" on CH2 page 1 (static label in template)
- [x] Promote both headings to clear section-h styled headings
- [x] Add "Your ESF Distribution" heading above the ESF_PARA on CH2 page 2
- [x] Add ESF_PARA field to CH2.KEYFIND in claudeExport builder (last paragraph of key findings)

## HTML Report — CH3 Key Findings Fix
- [x] Fix CH3 Key Findings: KEY_FINDINGS now excludes the last paragraph (which becomes PULLQUOTE), so all 3 body paragraphs render correctly without duplication

## HTML Report — v6 Fixes
- [x] CH2 page 1: fixed extractAllSections to handle ### headings (LLM uses 3 hashes)
- [x] CH2 page 2: KEYFIND.PARAGRAPHS now uses "What the Pattern Reveals" section paragraphs directly
- [x] CH3: key findings now uses "Key Findings" section paragraphs directly (all paragraphs shown)
- [x] CH3: pull-quote box removed from template
- [x] CH6: pull-quote box removed from template

## HTML Report — Layout Tweaks (v7)
- [x] Cover letter: body text moved down ~1cm (padding-top: 28px on .page.letter .ph-body)
- [x] Cover page: title changed to "A portrait of / who you are."
- [x] Cover page: analyst credit changed to "Jamie Pennington" (removed "with Sage")
- [x] Cover page: padding-top reduced from 96px to 60px; t-main margin-bottom 28px to shift content block up ~1cm

## HTML Report — PDF Generation Fix
- [x] Fix "Failed to generate PDF" error in deployed environment (Puppeteer launch config)
- [x] Fix: deployed container missing bundled Chrome v147 — puppeteer-pdf.ts now probes system Chromium paths (/usr/bin/chromium-browser etc.) before falling back to Puppeteer bundled Chrome

## Cover Letter — Paragraph Spacing
- [x] Move cover letter body paragraphs down 10mm to give them more breathing room

## Annex A1 — Blank Page Fix
- [x] Remove blank pages in Annex A1 life history: buildLifeHistoryPages now only emits pages that have content (no more empty pages for unused decades)

## Life History Interview — Summary Section Bug
- [x] Fix: summary section at bottom of each life history page reverts to page 1 content — phaseOthers loader now applies the same subPhase filter as phaseActions so each phase reads its own othersObservations row

## Life History Interview — Auto-Save
- [x] Add auto-save: saves every 30 seconds when dirty (ref-based snapshot so timer always sees fresh state), "Auto-saving…" spinner on button, "Saved HH:MM" status indicator below button

## PDF Generation — Production Container Fix
- [x] Fix: deployed container has no Chrome — added postinstall script (npx puppeteer browsers install chrome) + .puppeteerrc.cjs to store Chrome in project-relative .cache/puppeteer + updated resolveChromiumPath to check project cache first

## Report Page 5 — Chapter 2 Missing Content
- [x] Fix: Page 5 (Chapter 2 — Life History Pattern) blank when AI omits "What the Pattern Reveals" section — added 5-level fallback chain in ch2KeyFindings extraction (last named section → bullet list → last 3 paragraphs)

## Sage Chat Panel — Completion UX
- [x] Add prominent "Close & continue →" button to the Sage "Conversation complete" state so users know what to do next

## Lifework Dashboard — Step 4 Unlock Bug
- [x] Fix: Step 4 (Psychometrics/VIA) not unlocking after completing Sage conversation — added sageStatus column to DB, set on generateSummary for life_history section, backfilled 10 existing clients

## Life History Interview — Auto-Save Not Working
- [x] Fix: auto-save not triggering when user only edits the "Others" summary textarea — isDirtyRef.current = true now set on that onChange handler too

## WOW Report — Text Overflow Fix
- [x] Fix: text runs off the page on Chapter 2 (page 4) and Chapter 4 (page 9) — added paragraph caps: CH2 page 1 max 3 body + 3 section paras; CH4 page 9 max 3 psychometrics + 3 synthesis paras

## WOW Report — Career Direction Overflow Fix

- [x] Extend Career Direction section to a second page instead of cutting content short (first career edition)

## WOW Report — Page 13 Pull Quote Fix

- [x] Page 13 (Chapter 7 Conclusions) pull quote duplicates the first "Present" paragraph verbatim — replaced with an AI-generated punchy distillation (max 25 words, second person, never verbatim)

## Bug — Post-Counsellor "Ask Sage" Uses Sage 1 Instead of Sage 2

- [x] The "Ask Sage" offered to users after the counsellor chat was opening in Sage 1 mode — removed the ChatToPeter (Sage 1) block from the Career Explorer step; the "Open Career Explorer" button now correctly leads to Sage 2

## Bug — Career Explorer (Step 6) Locked with "Complete previous step first"

- [x] Career Explorer step shows "Complete previous step first" — fixed: locking logic now skips informational steps with no statusKey (Step 5) and looks back to the nearest real blocker (Step 4 Psychometrics)

## Step 5 — Lifework Coaching mailto CTA

- [x] Updated Step 5 description text and added mailto button pre-filled with coaching request to jamie@penningtonhennessy.com

## Bug — Page 5 "What the Pattern Reveals" duplicates Recurring Themes verbatim

- [x] AI sometimes omits the ## What the Pattern Reveals heading — fixed with deduplication guard in claudeExport.ts (detects when fallback would repeat page 4 content and falls through to raw paragraphs instead) and strengthened CRITICAL instruction in canonicalStage1.ts prompt.

## Sage 1 — Context-setting and questioning variety

- [x] Added contextual framing at the start of Sage 1's conversation — she now explains her purpose in her own warm voice on first message: data points, ESF dimensions, "not looking for literal repetition" reassurance
- [x] Added 15-type questioning repertoire to Sage 1's prompt (sensory anchor, contrast question, recognition question, solo/group probe, initiative question, difficulty probe, counterfactual, legacy question, surprise question, audience question, quiet moment, etc.) with instruction to rotate through all of them

## Sage 1 — Avatar photo in chat interface

- [x] Cropped Sage photo to square portrait, uploaded as static CDN asset, and replaced the gold "S" initial avatar with her photo in the ChatToPeter component — header, message bubbles, and typing indicator all updated

## Counsellor Hub — Sage 1 Preview Tab

- [x] Replaced static mock on /preview/sage with a live interactive Sage 1 chat using Jamie's own life history data — autoOpen prop added to ChatToPeter so the panel opens immediately on page load

## Sage 1 — Opening Message Update

- [x] Replaced Sage 1's opening message with Jamie's scripted intro — injected via new getOpeningMessage procedure on session start, before the client types anything. Fires only once for new sessions; existing sessions show their saved history.

## Sage 1 — Second Scripted Message

- [x] After client's first reply, Sage sends a second scripted message: "Thank you. The easiest way for me to work is to go through your life achievements methodically..." — fires when existingMessages.length === 1 (exactly the scripted opening saved), returns immediately without an LLM call

## Sage 1 — Third Message (first LLM response)

- [x] Third message (first LLM response) now instructed to start with "Good. Let's start" and go straight to the first achievement question — no reflection paragraph, no preamble

## Sage 1 — Message 4 (first achievement question)

- [x] Message 4: one reflective paragraph ending with a varied confirmation question. Accept-and-move-on rule added to system prompt for corrections/pushback throughout the conversation.

## Sage 1 — Summary-Confirm-Then-Next Rhythm

- [x] Every Sage response is EITHER a standalone summary+confirmation question OR a transition to the next question — never both. System prompt rewritten with explicit SUMMARY MODE / NEXT QUESTION MODE distinction and the key rule: "NEVER ask the next question in the same message as the summary."

## Sage 1 — Milestone Messages

- [x] After ~5 activities explored: scripted milestone message fires (range-based detection, deduplication guard). "We've explored the first few achievements..."
- [x] After ~20 activities explored: scripted milestone message fires. "We now have done 20 — doing a few more would help establish patterns. Shall we continue?"

## Sage 2 — Rebrand to Alistair

- [x] Crop Alistair's photo to square portrait and upload as static CDN asset
- [x] Update Career Explorer system prompt: rename Sage to Alistair, change all pronouns to male
- [x] Add Alistair's avatar photo to the Career Explorer chat UI (header, message bubbles, typing indicator)

## Alistair — Scripted Opening Messages

- [x] Message 1 (on session open): "Hello. Good to meet you. I'm Alistair..." — ask for preferred name
- [x] Message 2 (after client's first reply — use given name): "OK [name]. So although I have read and pondered everything..." — ask what they'd like to clarify or add
- [x] Message 3 (after client's second reply — LLM responds to clarification then transitions): respond to clarification then "So now that you know who you are..." — open the career exploration
- [x] Extract preferred name from client's first reply (server-side, stored in session or passed via context)

## Retire Sage 2 / Swap Ask Sage → Ask Alistair

- [x] WowReportTab: rename "Ask Sage" button to "Ask Alistair", update tooltip
- [x] WowReportTab: rename SageCounsellorPanel comment to Alistair
- [x] ClientProfile: update "Unlocked — client has access to Sage" → "Unlocked — client has access to Alistair"
- [x] ClientProfile: update unlock description text to mention Alistair
- [x] ClientProfile: add "View Alistair conversation" link when Career Explorer is unlocked (links to counsellor read-only view)
- [x] Add counsellor read-only career explorer procedure (getClientCareerExplorerSession) to routers.ts
- [x] Add counsellor career explorer view page (CounsellorCareerExplorer.tsx)
- [x] Add route /counselor/client/:id/career-explorer in App.tsx
- [x] PreviewMode.tsx: rename "Career Explorer (Sage 2)" → "Career Explorer (Alistair)"
- [x] PreviewMode.tsx: update description to mention Alistair
- [x] PreviewPages.tsx NAV_PAGES: remove "Sage (Life History)" entry (retire Sage 2 preview nav item)
- [x] PreviewPages.tsx: remove PreviewSage component export (or keep but remove from nav)
- [x] App.tsx: remove /preview/sage route

## Alistair — Snapshot Save/Upload & UX Polish

- [x] Expand CareerExplorer textarea to 4 rows
- [x] Update Alistair opening message to include upload invitation
- [x] Add resumeFromSnapshot tRPC procedure (replaces session messages with uploaded ones, fires welcome-back message)
- [x] Add PIN-encrypted JSON download (Save conversation button → PIN dialog → download file)
- [x] Add upload-to-resume flow (Upload transcript button in empty state → file picker → PIN dialog → restore session)
- [x] Alistair sends welcome-back message after upload: "Ah yes, I remember now — welcome back [name]. Where were we?"

## Alistair — Upload Summary on Resume

- [x] On resumeFromSnapshot: instead of a static "Where were we?", use LLM to generate a personalised recap of the previous conversation, then invite the client to continue

## Dashboard — Tighten Sage Gate for Psychometrics

- [x] Change isLocked condition in ClientDashboard.tsx: psychometrics locked until prevBlockerStatus === "completed" (not just "not_started")
- [x] Add server-side guard on VIA/IPIP save procedures: reject if sageStatus !== "completed"

## Dashboard — Sage Enrichment Count Gate for Psychometrics

- [x] Add getMyProfileWithEnrichmentCount query: return enrichedCount (achievements with sageEnrichment) and totalAchievements alongside profile
- [x] Update VIA/IPIP server-side guard: block if enrichedCount < min(totalAchievements, 20)
- [x] Update ClientDashboard.tsx: fetch enrichment counts, show progress message on psychometrics card ("Sage has explored X of your Y achievements. Complete Z to unlock Psychometrics.")
- [x] Update isLocked condition for psychometrics: locked if enrichedCount < min(totalAchievements, 20)
- [x] Show clearer lock icon/message on psychometrics card when locked

## PDF Generation — Fix Production Puppeteer Error

- [x] Replace Puppeteer/Chromium PDF generation with WeasyPrint (browser-independent, no system Chrome needed) — postinstall installs weasyprint via pip; Puppeteer kept as local fallback

## PDF Generation — PDFKit Pure Node.js Renderer

- [x] Replace WeasyPrint/Puppeteer with PDFKit as primary PDF renderer (pure Node.js, zero system dependencies)
- [x] Build server/pdfkit-report.ts: full WOW report renderer (cover, covering letter, chapters 1–8, appendix, VIA bar charts, OCEAN bars, pull-quotes)
- [x] Update puppeteer-pdf.ts: try PDFKit first, then WeasyPrint, then Puppeteer as fallbacks
- [x] Verify 15-page PDF renders correctly (all chapters, charts, appendix)
- [x] 138 tests passing
- [x] Add /api/debug/pdfkit-test diagnostic endpoint (public, no auth) to diagnose production failures
- [x] Update puppeteer-pdf.ts: surface PDFKit error directly instead of falling through to Puppeteer
- [x] Fix NaN error: OCEAN.DOMAINS uses `name`+`pct` fields (not `label`+`score`+`leftPole`+`rightPole`); add `num()` helper for safe numeric coercion; add OCEAN_POLES lookup for pole labels

## PDF Generation — Puppeteer with Bundled Chromium (DEFERRED)

- [ ] Add `"postinstall": "npx puppeteer browsers install chrome"` to package.json so Chromium is downloaded into the container at build time
- [ ] Remove PDFKit/WeasyPrint fallback chain in puppeteer-pdf.ts — go straight to Puppeteer since Chromium will always be present
- [ ] Remove /api/debug/pdfkit-test diagnostic endpoint (no longer needed once Puppeteer works)
- [ ] Test: deploy, then download a WOW report PDF and confirm it matches the on-screen HTML report exactly
- NOTE: Adds ~3–5 min to deploy time (one-off Chromium download ~150 MB); no impact on day-to-day site use or print speed (5–15 sec per PDF)
- NOTE: Deferred until batch of report content changes is complete to minimise deploys

## Canonical Stage 1 — Full Context Enrichment

- [x] Add family background, education history, and career history to the canonical Stage 1 context so the life history analysis has the complete picture, not just achievements and the Sage transcript

## Chapter 2 Prompt — Explicit Family & Career Context Instructions

- [x] Update LIFE_HISTORY_PROMPT to instruct the AI to draw on family background and career trajectory explicitly, not just achievements

## Tell Me About Yourself — Format Fix

- [x] Remove the "You are fundamentally driven by:" bullet-point preamble from the Conclusions prompt (all 5 variants updated)
- [x] Reformat the three drivers as bullet points within the paragraph rather than inline prose
- [x] Standardise all 5 variants to use first-person "I am fundamentally driven by:" followed by 3 bullets
- [x] Remove hardcoded "You are fundamentally driven by —" label from html-report.ts template
- [x] Fix ch7TmayAfterDrives extraction in claudeExport.ts: strip the drives line and bullet lines from TMAY_PARAS so they don’t appear inline as plain text

## Chapter 8 — Minimum 3 Career Directions

- [x] Update Chapter 8 prompt in all report variants to always produce at least 3 distinct named career direction options (strengthened to "MUST write EXACTLY 3" in all 5 variants)

## Chapter 6 — Minimum 3 Development Edges

- [x] Update Chapter 6 Development Edge prompt in all 5 report variants to always produce exactly 3 named development edges (strengthened to "MUST write EXACTLY 3" in all 5 variants)

## Download Report PDF — Revert to HTML View

- [x] Change "Download Report PDF" button to open the HTML report view (same as "View Report") rather than the PDFKit server-side renderer
- [x] Renamed button to "Print / Save as PDF" (top toolbar) and "Open Report for Printing" (lower panel) with updated tooltip
- [x] Updated lower panel description text to guide user to use File → Print → Save as PDF
- [x] Server-side /api/report/pdf/:clientId route kept in code for future Puppeteer fix but no longer wired to any button

## Download Report PDF — Restore Puppeteer/Chromium (PRIORITY)

- [x] Add postinstall script to package.json: `npx puppeteer browsers install chrome` so Chromium is installed in the production container at build time
- [x] Restore the Download Report PDF button to call /api/report/pdf/:clientId (Puppeteer route)
- [x] Puppeteer is now primary; PDFKit is fallback if Chromium not available
- [ ] Test end-to-end in production after publish

## Chapter 5 — Insights Wheel Redesign

- [x] Replace Chapter 5 (Behavioural Style) content in html-report.ts with: disclaimer text box, SVG Insights wheel with dynamic client dot, two colour-energy cards (primary + secondary)
- [x] Remove Strengths / Watch-outs / Career Environment Fit section from Chapter 5
- [x] Ensure claudeExport.ts passes the correct wheel position (x, y) and colour-energy data to the template

## Sage Preview Override
- [x] Add previewContext prop to ChatToPeter so preview mode passes Alex's dummy life history instead of the real user's data
- [x] Add a new publicProcedure chatPeter.sendMessagePreview that accepts inline context (no DB lookup)
- [x] Wire the preview dashboard Sage step to use the new prop

## Role Decoder

- [x] Create server/routers/roleDecoder.ts — protectedProcedure, input: { clientId, jobDescription }, assembles client profile context, calls invokeLLM, returns { roleCore, patternConnection, interviewLanguage }
- [x] Wire roleDecoderRouter into appRouter in server/routers.ts
- [x] Create client/src/components/RoleDecoderTab.tsx — textarea for JD, Decode button with loading state, three-section output display
- [x] Add "role-decoder" tab to ClientProfile.tsx (Tab type, TABS array, tab content block)
- [x] Write server/role-decoder.test.ts — unit tests for the new procedure

## Bug Fixes

- [x] Fix duplicate paragraphs in Oliver Sacks WOW report Chapter 2: rewrite context now instructs the model to open with a DIFFERENT episode from the life history (not the canonical earliest childhood scene) and to produce a genuinely distinct "## What the Pattern Reveals" synthesis
- [x] Fix Oliver Sacks Development Edge: enforce exactly 3 named areas with ## headings (2 paragraphs each), allow second page, close with nature-and-will synthesis
- [x] Fix Michael Lewis repeated "if you had been watching" opener: phrase now banned as paragraph opener (max once per rewrite), with alternative constructions specified
- [x] Fix Michael Lewis Development Edge: enforce exactly 3 named areas with sharp ## headings, 2 paragraphs each, closing with retrospective-inevitability synthesis
- [x] Audit Clive James voice: add banned repetitive openers ("What is striking", "The thing that stands out", "It is worth noting", "There is something", "One of the most") to system prompt
- [x] Fix Clive James Development Edge: enforce exactly 3 named areas with precise ironic ## headings, 2 paragraphs each, "This is not a weakness" construction limited to once, closing epigrammatic paragraph
- [x] Expand Clive James Key Findings: viaSection context now requires 3 substantial paragraphs (5-6 lines each) with reframing opener, evidence-accumulation-with-commentary, closing bullets, and epigrammatic final line

## LinkedIn Profile Rewriter

- [x] Create server/routers/linkedInRewriter.ts — tRPC procedure that generates Headline, About, and Experience framing guide from Lifework data
- [x] Wire linkedInRewriterRouter into appRouter in routers.ts
- [x] Create client/src/components/LinkedInRewriterTab.tsx — counsellor-only tab UI
- [x] Add LinkedIn Rewriter tab to ClientProfile.tsx

## Life History Age-Band Minimums (under-30s)

- [x] Add minSlots per phase to PHASES definition (5/6/6/4 for under-30s)
- [x] Dynamically initialise phaseActions with correct slot count per phase
- [x] Show per-phase progress indicator (X of Y completed)
- [x] Soft-gate Continue button with warning when minimum not met
- [x] Update reminder banner text to show phase-specific target

## Key Findings 5-paragraph minimum (all voices)

- [x] Audit all four viaSection contexts for paragraph minimums
- [x] Mark Brandon: add full 5-paragraph structure instruction
- [x] Clive James: update from 3 to 5 paragraphs minimum
- [x] Michael Lewis: add full 5-paragraph structure instruction
- [x] Oliver Sacks: add full 5-paragraph structure instruction

## William Zinsser WOW Report Voice

- [x] Add WILLIAM_ZINSSER_REWRITE_SYS constant and rewriteSectionsForZinsser function
- [x] Update WritingStyle type to include "william-zinsser"
- [x] Update z.enum in generate and rebuildPdf procedures
- [x] Update runGenerationJob dispatch chain
- [x] Add "William Zinsser" SelectItem to WowReportTab UI
- [x] Update all selectedWritingStyle type annotations and display strings in WowReportTab
- [x] Write tests for Zinsser voice

## Cross-section deduplication guard

- [x] Add deduplicateSections() utility to wowReport.ts
- [x] Wire deduplication into all five rewrite functions (Mark, Clive James, Michael Lewis, Oliver Sacks, William Zinsser)
- [x] Fix esbuild regex issue — use string split instead of regex literal
- [x] Fix TypeScript cast errors in deduplicateSections

## PDF Download Fix

- [x] Fix "Download Report PDF" button to use handleDownloadPdf (respects selected writing style via stored S3 URL)
- [x] Remove stale /api/report/pdf/:clientId route from the WOW report tab download button

## PDF Download — auto-download after rebuild

- [x] Fix rebuildPdfMutation onSuccess to auto-download the new branded PDF immediately after rebuild (no second click required)
- [x] Diagnose plain-HTML PDF issue: stored pdfUrl was pointing to old puppeteer PDF; rebuild now produces correct branded pdfmake version and downloads it automatically

## Zinsser intra-section duplicate fix

- [x] Fix Zinsser lifeHistoryPattern context: CRITICAL ANTI-DUPLICATION RULE requiring narrative and What the Pattern Reveals synthesis to be structurally distinct
- [x] Extend deduplicateSections guard to catch intra-section repeats (same paragraph appearing twice within one section, not just across sections)

## WOW Report Download Fix

- [x] Fix download button to produce the HTML-rendered branded PDF (cream/gold/navy, Lifework logo) matching the preview

## Annex B — Biographical Data

- [x] Add Annex B (family background, education history, career history) to WOW report PDF
- [x] Renumber existing Annex A sections to C1/C2/C3
- [x] Update annex cover page contents list

## Sage Gate — Explicit Stage with Hard Lock on Psychometrics

- [x] Make Sage an explicit, gated stage on the ClientDashboard: show a clear progress bar and counter (X of 20 events investigated) inside the Sage card
- [x] Hard-lock the Psychometrics card (step 4) until the Sage gate is met (20 enriched events), with an explanatory message visible on the card
- [x] Add a "locked" explanation to the Sage card itself when prerequisites (interview/background) are not yet started
- [x] Ensure the VIASurvey and IpipSurvey pages also enforce the gate server-side (already done) and show a friendly redirect/message if accessed directly while locked

## Sage Prompt — Interpretive Depth Rewrite

- [x] Rewrite PETER_SYSTEM_PROMPT: replace binary SUMMARY/QUESTION modes with INTERPRETIVE SUMMARY, NEXT QUESTION, and PATTERN MODE
- [x] Sharpen wrap-up to name specific activities and recurring themes rather than generic observations

## Blog Writing Machine

- [x] Add `blog.generate` tRPC procedure: takes postType, lifeworkAspect, voice; returns ~300-word LinkedIn post
- [x] Build BlogWriter page at /lifework/blog-writer with two-column selection (post type + lifework aspect) and voice selector
- [x] Wire up loading state and rendered output below the selection area
- [x] Add route /lifework/blog-writer to App.tsx
- [x] Write vitest for the blog writer taxonomy contract (6 tests pass)

## Safari / Mac compatibility fixes

- [x] Fix Alistair conversation download on Safari: append anchor to DOM before click, defer URL.revokeObjectURL by 1s
- [x] Fix Alistair conversation upload on Safari: switch FileReader from readAsText to readAsArrayBuffer to prevent base64 corruption

## Blog Writer — Companion Image Generation

- [x] Add `blog.generateImages` tRPC procedure: takes post text + postType + aspect, generates 3 image prompts and calls generateImage for each, returns 3 URLs
- [x] Add "Generate images" button below the post output in BlogWriter.tsx
- [x] Show 3 image options in a responsive row with individual download links

## QA Simulation Harness
- [x] End-to-end simulation test (server/e2e-simulation.test.ts): synthetic client "Margaret Holloway" exercises the full pipeline — DB setup, canonical Stage 1, WOW Report (all 8 sections), PDF export, router retrieval, Counsellor Sage briefing, and DB cleanup. 19/19 tests pass.
- [x] Screen-by-screen UI simulation (e2e/lifework-ui.spec.py): 91/91 checks pass across all 13 client screens, navigation dead-ends, wrong-button traps, and locked states

## Standalone Lifework Landing Page
- [x] Create /lifework-standalone — full landing page in WOW report cream/navy/gold aesthetic, independent of PH branding (apart from logo), same content as penningtonhennessy.com/lifework

## Bug Fixes
- [x] Fix VIA/IPIP gate: require minimum 5 achievements to exist before psychometrics unlock (previously min(0,20)=0 allowed bypass when client had no achievements yet)

## Security — Pseudonymisation
- [x] Raise psychometrics gate minimum to 20 achievements
- [x] Pseudonymise all LLM prompts: strip client real names before sending to Claude API and restore in generated output. Applied to: wowReport (buildClientContext + all 8 sections), canonicalStage1, VIA analysis, OCEAN analysis, closing annex, counsellorSage (chat + briefing). No PII sent to Anthropic.

## PDF Renderer Bug Fixes
- [x] Fix sectionBlock null guard: empty/null sections now render a visible placeholder instead of silently producing a blank page (root cause of Amanda Lord's missing Life History Pattern section — PDF was generated before canonical Stage 1 completed)
- [x] Amanda Lord's report rebuilt successfully (15:20 today) — all 8 sections present including Life History Pattern

## CH 2B — 4 Pillars of Fulfilment HTML Report Section
- [x] Fix claudeExport.ts syntax error: restore extractAllSections function signature (orphaned body removed)
- [x] Add parseFourPillars function to claudeExport.ts: parses fourPillars markdown into structured PILLARS/COMBINATION/CITATION payload
- [x] Update html-report.ts CH2B template: replace old PARAGRAPHS/SECTIONS guards with HAS_CONTENT/PILLARS/COMBINATION_SYNTHESIS/COMBINATION_QUESTION/CITATION
- [x] Add pillar-learning, pillar-synthesis, pillar-citation CSS styles to html-report.ts inlined CSS
- [x] Export parseFourPillars from claudeExport.ts and add 8 unit tests to claudeExport.test.ts (all 231 tests pass)

## CH 2B — 4 Pillars Format Rewrite
- [x] Rewrite CH2B LLM prompt: produce exactly 4 named pillars (PLACES, PEOPLE, PROBLEMS, PROCEDURES) each with Learning sentence + example paragraphs, followed by The Combination section (synthesis paragraph + practical question paragraph) + citation
- [x] Update parseFourPillars to recognise the exact 4-pillar headings and Combination section (headingAllcaps + headingSubtitle split, plain-paragraph synthesis)
- [x] Update html-report.ts CH2B template to match the docx layout (ALLCAPS heading + em-dash subtitle, Learning label, examples, then Combination section with ruled separator)
- [x] Update unit tests for parseFourPillars to reflect new format (10 tests, all pass)

## CH2B — Four Conditions of Fulfilment: Rewrite Exclusion Fix

- [x] Identified root cause: all 5 style rewrite functions (Mark, Clive James, Michael Lewis, Oliver Sacks, Zinsser) were overwriting the structured fourPillars markdown with free-prose narrative
- [x] Removed "fourPillars" from proseSections arrays in all 5 rewrite functions and the shared deduplicateSections PROSE_KEYS
- [x] fourPillars now passes through all style rewrites unchanged, preserving the PLACES/PEOPLE/PROBLEMS/PROCEDURES structure

## Blog Writer — Lifework Canon Integration

- [ ] Add LIFEWORK_BLOG_CANON constant to blogWriter.ts with the full canon text
- [ ] Inject canon into the generation system prompt so every post is grounded in Lifework methodology
- [ ] Add hard-constraint rules to the system prompt (no overclaiming, no AI-as-oracle, no invented testimonials)
- [ ] Add quality-control self-check step to the generation prompt
- [ ] Add Lifework-specific post archetypes to POST_TYPES taxonomy (process-explainer, myth-correction, report-insight, human-and-ai)
- [ ] Enhance ASPECT_CONTEXT entries with canon-accurate language for all 11 aspects
- [ ] Update blogWriter.test.ts to enforce canon knowledge is present and exported

## Blog Writer — External Source URL
- [x] Add fetchArticleText(url) server helper: fetch URL, strip HTML to plain text, truncate to ~3000 chars
- [x] Update generate procedure input schema to accept optional sourceUrl string
- [x] When sourceUrl provided: fetch article text server-side, inject into system prompt as "EXTERNAL SOURCE" block with instructions to weave a specific reference into the post
- [x] When sourceUrl absent: generation proceeds exactly as now
- [x] Add optional URL input field to blog writer UI (below voice selector, with placeholder and gold confirmation hint)
- [x] Update blogWriter.test.ts to cover the sourceUrl path (schema validation: valid without URL, valid with URL, invalid non-URL throws)

## Annex Page Overruns (Matthias report)

- [x] Fix Annex A (life history timeline) page overrun — cap items per page and paginate overflow entries
- [x] Fix Annex B (biographical data) page overrun — trim long career history text fields and cap education/career entry counts per page

## Jobs / Opportunities Module (feature/jobs-module branch)

- [x] Create feature/jobs-module git branch
- [x] Add 8 new tables to drizzle/schema.ts: company_universe, client_target_spec, client_constraints, client_monitor_list, job_listings, job_matches, latent_signals, saved_jobs, job_alerts
- [x] Generate and apply migration SQL for new tables
- [x] Seed company_universe from company_universe.csv (510 rows)
- [x] Seed company_universe ATS fields from ats_map.csv (367 rows)
- [x] Seed company_universe extras from watchlist_extra.csv (42 rows)
- [x] Build server/routers/jobs.ts with all tRPC procedures: getMonitorList, getMatches, getSignals, saveJob, updateSaved, getSaved, setConstraints, getConstraints, regenerate
- [x] Build Heartbeat stage 1: generateTargetSpec (WOW report → target spec, invokeLLM)
- [x] Build Heartbeat stage 2a: buildBucketWeights (target spec → bucket weights, invokeLLM)
- [x] Build Heartbeat stage 2b: buildMonitorList (bucket weights → company scores, invokeLLM)
- [x] Build Heartbeat stage 3: scanListings (VacancySource adapters: Greenhouse, Lever, Ashby, Workday, generic fetch)
- [x] Build Heartbeat stage 4: scanNewsSignals (NewsSource via Google News RSS, classify with invokeLLM)
- [x] Build Heartbeat stage 5: sendAlerts (new matches/signals → in-app notification via notifyOwner)
- [x] Register all Heartbeat handlers at /api/scheduled/* in server/_core/index.ts
- [x] Build client/src/pages/JobsExplorer.tsx (4 tabs: Companies to Watch, Open Roles, Early Signals, Saved)
- [x] Build intake form for client_constraints (exclude employers, salary floor, permanent-only, location)
- [x] Add Jobs Explorer route to App.tsx (under /coaching/lifework/jobs)
- [x] Add Jobs card/entry point to client dashboard
- [x] Add read-only Jobs tab to counsellor ClientProfile page
- [x] Register jobs router in server/routers.ts
- [x] Write vitest tests for jobs procedures
- [x] Save checkpoint on feature/jobs-module branch

## Open Roles UX — Pagination & Score Filter

- [x] Add limit + offset params to getMatches tRPC procedure
- [x] Default minScore to 7 (was 5) in getMatches
- [x] Add score filter slider (5–10) to Open Roles tab header
- [x] Add "Load more" / Previous/Next pagination to Open Roles tab (25 per page)
- [x] Show result count and current filter state above the list

## Stage 1 prompt + role intent field

- [x] Fix Stage 1 system prompt to focus on legal market roles (not current career)
- [x] Add roleIntent free-text field to client_constraints schema + migration
- [x] Add "What kind of role are you looking for?" field to client preferences panel (JobsExplorer)
- [x] Wire roleIntent into Stage 1 LLM call as a strong signal alongside WOW report

## Open Roles — Company Filter

- [ ] Add getMatchCompanies procedure: returns distinct companies with match counts for the current client + minScore
- [ ] Add companyIds filter param to getMatches procedure
- [ ] Build company filter panel in Open Roles tab (checkbox list, match count badge, select all / clear all)
- [ ] Wire company filter state into getMatches query

## Company Universe — Quality Tags (Option A)

- [x] Define quality taxonomy (8 qualities with descriptions)
- [x] Add qualities JSON column to company_universe schema + migration
- [x] Generate quality tags for all 552 companies (deterministic rule-based tagger)
- [x] Seed quality tags into database (552/552 companies tagged)
- [x] Update Stage 2 scoring prompt to weight quality-fit alongside sector-fit
- [x] Stage 1 now infers quality_preferences from WOW report and stores in target spec
- [x] Counsellor target spec panel shows Culture Fit Preferences badges (violet)
- [x] Save checkpoint

## Tailor Application Feature

- [x] Add client_cvs and tailor_applications tables to schema + migration applied
- [x] Add CV upload tRPC procedure (base64 → text extraction → S3 → DB record)
- [x] Add getClientCv tRPC query (returns latest CV metadata for client)
- [x] Add tailorApplication tRPC procedure (CV text + job listing + WOW profile → LLM rewrite + covering email)
- [x] Build TailorApplicationModal component (3-step: CV upload, generate, results with copy buttons)
- [x] Add "Tailor" button (gold-bordered) to each job match card in Open Roles tab
- [x] CV upload: file picker, PDF/DOCX accepted, stored to S3, text extracted via pdf-parse/mammoth
- [x] CV rewrite: LLM restructures existing CV for the specific firm/role, no fabrication
- [x] Covering email: opens with WOW report truths, connects to job spec
- [x] Copy-to-clipboard buttons for both CV and email outputs
- [x] Save checkpoint

## Tailor Application — Covering Letter Style Sample
- [x] Add covering_letter_text column to client_cvs table (optional, stores extracted text from sample covering letter)
- [x] Add uploadCoverLetter tRPC procedure (PDF/DOCX extraction, upserts covering_letter_text on client_cvs row)
- [x] Update tailorApplication LLM prompt to include covering letter style sample when available
- [x] Add covering letter upload UI step to TailorApplicationModal (optional Step 1b, between CV and Generate)

## Counsellor — View Client Portal (Jobs Explorer preview-as-client)
- [x] Refactor JobsExplorer sub-components (CompaniesTab, OpenRolesTab, SignalsTab, SavedTab, PreferencesPanel, LastRefreshedBanner, TailorApplicationModal) to accept optional clientId prop
- [x] Create /counselor/client/:id/portal route that renders full JobsExplorer with clientId passed through
- [x] Add counsellor preview banner (gold bar at top: "Viewing as [Client Name] — Return to profile") to portal view
- [x] Add "View client portal" button to ClientProfile header
- [x] Register new route in App.tsx

## Jobs Explorer — Client View Simplification
- [ ] Replace client-facing JobsExplorer (4-tab market monitor) with a clean Target Specification display
- [ ] Show: summary, role families (with rationale), functions, sectors (with weights), seniority, geography, differentiators
- [ ] Rename nav tab from "Jobs Explorer" to "Market Profile" on the client dashboard
- [ ] Keep all counsellor-side pipeline/market-monitor functionality intact (CounsellorJobsTab, CounsellorPortalPage)

## Lifework Colour System — Claude Design Brief

- [x] Replace Playfair Display with Cormorant Garamond (ital,wght@0,400;0,500;0,600;1,400;1,500;1,600) in index.html
- [x] Update CSS variables: navy #1A2744, navy-soft #2A3A5E, navy-mist #8A9BBF, gold #C9973A, gold-soft #E0B866, cream #F5F0E8, cream-warm #EFE6D6, ink #0E1628, ink-muted #5A6278
- [x] Add lw-eyebrow, lw-rule, lw-label, lw-accent-italic utility classes to global CSS
- [x] Replace all hardcoded hex constants in LifeworkStandalone.tsx, LifeworkPricing.tsx, DebriefChat.tsx, CoachingSessionTab.tsx, LifeworkDownloadModal.tsx, CounsellorPinGate.tsx, DataSecurity.tsx with CSS variables
- [x] Ensure all --lw-* legacy tokens map to new palette (backward compat)
- [x] Radius set to 0rem (sharp rectangular corners) per brief

## CV Upload — Alternative to Career History Form

- [x] Add cv_url and cv_text columns to client_profiles schema; run migration
- [x] Add cvUpload tRPC procedure: receive base64/multipart, upload to S3, extract text (PDF via pdf-parse, DOCX via mammoth), save cv_url + cv_text to DB
- [x] Add CV upload card to ClientDashboard career history step (shown as alternative alongside existing form link)
- [x] Inject cv_text into analysis LLM prompt (alongside career history rows)
- [x] Inject cv_text into career explorer system prompt
- [x] Inject cv_text into Sage system prompt
- [x] Counsellor view: show CV download link and extracted text preview in client profile Career tab
- [x] Write vitest tests for CV upload procedure

## Role Specification — Client Dashboard Step

- [ ] Schema: add roleSpecUnlocked boolean to client_profiles; migrate
- [ ] Server: add jobs.setRoleSpecUnlocked procedure (counsellor-only toggle)
- [ ] Counsellor: rename "Refresh spec & list" → "Refresh spec" (Stage 1 only, not Stage 2)
- [ ] Counsellor: add "Unlock Role Spec" toggle button to Jobs Explorer tab in client profile
- [ ] Client WOW dashboard: add locked "Role Specification" step after Ask Alistair
- [ ] Client: when unlocked and spec exists, show read-only TargetSpecDisplay on dashboard
- [ ] Client: when unlocked but spec not yet generated, show "being prepared" message

## Role Spec Client View — Summary + PDF Download

- [x] Simplify client WOW dashboard Role Specification step: show summary text only (not full detail grid)
- [x] Add gold-styled "Download full Role Specification (PDF)" button on client dashboard
- [x] Add /api/export/role-spec Express endpoint to pdf-export.ts (auth-gated, generates full-detail HTML/PDF)
- [x] PDF uses Lifework colour system (navy #1A2744, gold #C9973A, cream #F5F0E8, Cormorant Garamond headings)
- [x] PDF includes: summary, role families + why, functions, sectors with weights, seniority, geography, differentiators, organisation archetypes

## Bug Fix — Psychometrics step incorrectly locked for legacy clients

- [x] Fix: Psychometrics step on client dashboard showed as locked for clients (e.g. Neil Denny) who completed VIA/IPIP before the Sage gate was introduced — locking logic now bypasses the Sage gate if both viaStatus and ipipStatus are already "completed"

## Test Run Fixes — High Priority

- [x] Fix ordinal suffix bug on IPIP results: "72th" → "72nd", "81th" → "81st" (and any others)
- [x] Fix "all four steps" → "all six steps" on My Report holding page
- [x] Fix "Book Your Coaching Session" button — link to Jamie's contact/calendar page, not PH homepage

## Test Run Fixes — Medium Priority

- [ ] Add poster/thumbnail images to all intro videos so they don't show as black rectangles on load
- [ ] Update Manus OAuth app name from "Pennington Hennessy" to "Lifework"
- [x] Hide Sage chat button on dashboard until at least one of interview/background has been started
- [ ] Add a booking CTA (link to Jamie's contact) to Step 5 (Lifework Coaching) when it unlocks
- [x] Change "Father's occupation" / "Mother's occupation" to "Parent / Guardian 1" / "Parent / Guardian 2"
- [x] Add brief strength descriptions to VIA results page (one-line per strength or expandable)

## Test Run Fixes — Low Priority

- [x] Soften Sage time estimate: "up to two hours" → "typically 45–90 minutes, at your own pace"
- [x] Add note to interview form: "If you can only recall 2 or 3 memories for this phase, that is fine"
- [x] Soften Neuroticism domain description — replace clinical language about anxiety/depression
- [x] Reorder IPIP domains to start with Extraversion instead of Neuroticism (new order: E, O, A, C, N; N renamed to "Emotional Resilience")
- [x] Add "Your progress is automatically saved" note to interview form
- [x] Change "IPIP Survey" in nav to "Personality Survey"
- [ ] Add clearer message on locked Career Explorer: "Your counsellor will unlock this after your coaching session"
- [ ] Gate nav links so locked steps show a tooltip rather than navigating freely

## Remove Education History

- [ ] Remove Education tab from Background.tsx client form (keep Family Background and Career History tabs)
- [ ] Remove education from PreviewPages.tsx background preview
- [ ] Remove education section from WOW report analysis context (wowReport.ts)
- [ ] Remove education section from PDF/HTML export (pdf-export.ts)
- [ ] Remove education from counsellor ClientProfile view
- [ ] Remove education from Sage career_education chat context (routers.ts)
- [ ] Update Background page header/description to reflect two tabs only

## Lifework Custom-Domain Migration — lifeworkpath.com
- [x] Define canonical URLs for lifeworkpath.com and the legacy Pennington Hennessy Lifework path
- [x] Bind lifeworkpath.com and www.lifeworkpath.com to the Lifework application in the hosting settings
- [x] Add the required Cloudflare DNS records and verify SSL/TLS activation
- [x] Prepare standalone-domain application routing: Lifework root, sign-in return path, and no PH navigation
- [x] Configure permanent redirects from penningtonhennessy.com/coaching/lifework and legacy sub-routes
- [ ] Verify access-code, sign-in callback, client dashboard, PDF links, and logout on the new domain

## Lifework Logo Alternatives
- [x] Create three distinct 300 × 300 square logo directions for Lifework
- [x] Deliver the options for selection and subsequent brand use

## Lifework Webinar Squeeze Page
- [x] Create a public, responsive webinar landing-page route using the Lifework navy, gold and cream visual system
- [x] Write the first-draft webinar proposition, audience benefits, agenda, and September-event call to action
- [x] Add clearly marked testimonial-video placeholders suitable for four or five supplied videos
- [x] Add booking CTAs designed for a later Eventbrite or comparable booking-service link/embed
- [x] Add page-level interaction and rendering tests, verify the responsive preview, and save a checkpoint

## Lifework LinkedIn Profile Background
- [x] Create a 1584 × 396 LinkedIn background with the user’s coaching, training, and Lifework-founder positioning
- [x] Deliver the completed background for the user to upload to LinkedIn

## Lifeworkpath.com Cutover Verification
- [x] Confirm both lifeworkpath.com hostnames serve the standalone Lifework entry point after DNS connection
- [x] Confirm Cloudflare canonical redirect and safe legacy-route redirect behaviour before changing the Pennington Hennessy public links
- [x] Add an application-level redirect for the legacy Lifework route because the existing Pennington Hennessy DNS record is not Cloudflare-proxied
- [x] Add a server-side 301 redirect for the legacy Lifework route to avoid a client-side redirect delay
- [x] Read the original public hostname from the reverse-proxy headers for the server-side legacy redirect
- [x] Preserve legacy Lifework client sub-routes when transferring users to the standalone domain
- [x] Fix standalone Lifework root rendering when the hosted viewer exposes an internal preview hostname
- [x] Identify and map the management viewer's internal root hostname to Lifework without changing public Pennington Hennessy routing
- [x] Resolve the management viewer and Open Website control that still open the Pennington Hennessy internal preview
- [x] Route the management viewer's localhost/internal preview host to Lifework at the root path

## WOW Report Template Restoration
- [x] Inspect the supplied WOW report reference and document its reusable visual-template elements
- [x] Inspect and adapt the supplied Claude Design TypeScript report template as the authoritative visual source
- [x] Restore the selected WOW report branding in the active report renderer
- [x] Give a client secure access to their own Claude Design branded report view
- [x] Validate the restored template treatment and save a checkpoint

## Quiet Authority Report Template Restoration
- [x] Inspect the supplied Quiet Authority TypeScript renderer and compare its data bindings with the active report endpoint
- [x] Replace the Modern Counsel HTML/CSS template with Quiet Authority while retaining secure client and counsellor access
- [x] Add regression tests for Quiet Authority rendering and validate the report view before checkpointing

## Standard Counsellor Client-Profile View
- [x] Audit existing roles, client-profile tabs, and server-side client access before introducing standard counsellor access
- [x] Hide Parallel Clients, Analysis Report, Role Decoder, LinkedIn Rewriter, and Jobs Explorer from the standard counsellor client-profile view
- [x] Preserve all client-profile tabs and tools for the master administrator view
- [x] Create a safe standard-counsellor test mode without granting access to real clients
- [x] Add role-visibility tests and document the next client-ownership confidentiality controls

## Isolated Dummy Counsellor Audit
- [x] Add a dedicated counsellor role distinct from clients and master administrators
- [x] Ensure a counsellor with no assigned clients sees an empty state and cannot access any client profile by URL
- [x] Create a dummy counsellor audit workflow that requires a separate first-time login but no real client assignment
- [x] Add role-isolation tests and document how to promote the dummy account after its first sign-in

## Alistair Job-Specification Feedback
- [x] Audit existing CV/document upload, Alistair prompts, and client access controls
- [x] Add secure job-specification storage, extraction, and ownership-aware access
- [x] Generate structured Alistair feedback against Lifework evidence, CV, and Role Specification
- [x] Add client and counsellor review surfaces with clear upload limits and data-retention controls
- [x] Add security and analysis tests, validate the workflow, and save a checkpoint

## Ask Alistair Layout
- [x] Widen the desktop Ask Alistair conversation panel to a balanced 50/50 layout while retaining single-column mobile behaviour
- [x] Validate the layout and save a checkpoint

## Alistair Debrief Report Upload Compatibility
- [x] Audit the existing Debrief with Alistair PDF upload and extraction flow
- [x] Accept DOCX reports alongside PDFs and extract text safely from both formats
- [x] Add robust PDF extraction fallback and user-facing actionable error handling
- [x] Add format/extraction regression tests, validate the upload flow, and save a checkpoint

## Client-Facing Alistair Access
- [x] Audit Michael Phillips’s Alistair unlock state and the client-dashboard access conditions
- [x] Restore the client-facing Alistair route when a counsellor has authorised it
- [x] Validate the corrected route in counsellor preview and add regression coverage

## Dashboard Journey: Explore with Alistair
- [x] Move Alistair to a standalone Step 6 before Role Specification, with the requested client-facing copy and shared counsellor unlock
- [x] Move Role Specification to Step 7 and remove the embedded Alistair prompt
- [x] Validate the seven-step dashboard and save a publish-ready checkpoint

## Counsellor Access Control Clarity
- [x] Clearly label the existing counsellor overview control as the shared Alistair and Role Specification access gate
- [x] Update unlock, lock, and confirmation copy to describe the client access granted or removed
- [x] Add regression coverage, validate the control, and save a publish-ready checkpoint

## Counsellor Preview Access-State Mismatch
- [x] Trace why an unlocked counsellor profile can render Explore with Alistair as locked in the client portal preview
- [x] Correct the preview data or shared unlock-state handling without changing the client-access policy
- [x] Add regression coverage, verify Michael Phillips’s preview, and save a publish-ready checkpoint

## Client Journey: Complete with Alistair
- [x] Remove the client-facing Role Specification card and associated client-dashboard rendering
- [x] Retain Explore with Alistair as Step 6 and the final standard Lifework stage
- [x] Update regression coverage, validate the simplified client and counsellor preview journey, and save a publish-ready checkpoint

## Counsellor Portal Query Error
- [x] Trace the HTML response returned to the counsellor client-portal preview query
- [x] Correct the faulty client-portal route or data query without changing access controls
- [x] Add regression coverage, validate the repaired portal, and save a publish-ready checkpoint

## Live Client Portal Role Specification Removal
- [x] Trace why the live counsellor portal still displays Role Specification as Step 7
- [x] Remove the remaining client-facing Step 7 source or stale deployed output
- [x] Test every client-dashboard entry point has exactly six stages and save a publish-ready checkpoint

## Website Backup Restoration
- [ ] Confirm the relevant backup packages, affected-account status, and intended restoration point
- [ ] Obtain explicit confirmation of the one-time restoration scope before any restore action
- [ ] Verify the restored website, database, domain connection, and required integrations

## Managed Preview Blank Screen
- [x] Trace why the managed project preview root is blank while the webinar route renders in the development service
- [x] Correct the preview runtime or routing issue without changing public-page behaviour
- [x] Validate both the root preview and `/webinar`, then save a publish-ready checkpoint

## Webinar Copy Refinement
- [x] Review the applied webinar copy edits for accuracy, readability, and layout fit
- [x] Refine wording or punctuation where the visual edits require it
- [x] Validate the webinar page, add regression coverage, and save a publish-ready checkpoint

## Webinar Session Card Simplification
- [x] Update both cards to use the headline “An introduction to Lifework”
- [x] Set the 16 September 12:30 BST and 24 September 18:00 BST timings, removing supplementary detail
- [x] Retain only the Request a place links, validate the cards, and save a publish-ready checkpoint

## Sage and Webinar Revision Reconciliation
- [x] Preserve the approved webinar edits and merge the latest Sage prototype checkpoint without overwriting either revision
- [x] Validate the combined `/sage-lab` and `/webinar` experience after reconciliation
- [x] Save the reconciled website as a publish-ready checkpoint

## Sage Client Interview Redesign
- [x] Identify the current prompt mechanics that make the Sage interview repetitive
- [x] Draft a wider, coach-like Sage prompt that retains the E/S/F evidence-gathering purpose
- [ ] Present the proposed prompt for user testing with sample life-history achievements before implementation

## Shareable Sage Coaching Prototype
- [x] Create a public prototype page where a colleague can enter a childhood memory and receive Sage’s new-style coaching question
- [x] Add a server-side, prompt-bounded Sage conversation endpoint with transparent prototype framing
- [x] Provide reset and follow-up interaction, automated tests, and a publish-ready shareable route

## Sage Opening Response: Question Before Interpretation
- [x] Add an explicit first-turn rule that an embodied, experience-near question comes before interpretation
- [x] Add regression coverage and test the revised response against the colleague feedback scenario
- [x] Save a publish-ready checkpoint for the refined Sage prototype

## Sage Prototype: E/S/F Tags and Activity Limits
- [x] Add an Enjoyable, Satisfying or Fulfilling selection control when entering a memory
- [x] Limit Sage to a varied total of three to five questions per activity and provide a clear close-out state
- [x] Add regression coverage, validate the varied question flow, and save a publish-ready checkpoint

## Sage Prototype: Activity Transitions and Tenth-Memory Pause
- [x] Ask a varied, natural move-on question when Sage finishes each memory
- [x] Count completed memories and offer an optional break-or-continue choice after the tenth
- [x] Add regression coverage, validate both transitions, and save a publish-ready checkpoint

## Webinar: What People Value in Lifework
- [x] Replace all video placeholder cards with a four-theme non-testimonial value section
- [x] Add polished Lifework-focused content and visual hierarchy without quotes, ratings, or client attributions
- [x] Add regression coverage, validate the redesigned section, and save a publish-ready checkpoint

## Verified Testimonial Management
- [x] Define a permission- and source-backed testimonial record with explicit approval status
- [x] Build administrator-only controls to create, edit, approve, archive, and remove testimonial records
- [x] Display only approved, current testimonials in the public webinar page with appropriate empty states
- [x] Add regression coverage, validate authorization and public rendering, then save a publish-ready checkpoint

## Webinar Session Registration Links
- [x] Add the supplied Zoom registration URL to the 16 September 12:30 BST session only
- [x] Retain the existing destination for the 24 September session pending its supplied Zoom link
- [x] Update regression coverage, verify both session links, and save a publish-ready checkpoint

## Webinar Session Registration: 24 September
- [x] Add the supplied Zoom registration URL to the 24 September 18:00 BST session
- [x] Verify both session cards use their correct Zoom registration destinations
- [x] Save a publish-ready checkpoint for the completed webinar registration links

## Open Testimonial Draft Submissions
- [x] Create an open, colleague-facing testimonial form that mirrors the administrator submission form
- [x] Enforce draft-only public submissions with source, permission, validation, and abuse safeguards
- [x] Keep approval, publication, edit history, and testimonial management exclusive to administrators
- [x] Add regression coverage, validate the open submission page, and save a publish-ready checkpoint

## Webinar Testimonial Display Redesign
- [x] Review approved testimonial availability and the existing public checkerboard rendering
- [x] Replace the checkerboard with a refined approved-only testimonial presentation
- [x] Add regression coverage, visually validate the revised section, and save a publish-ready checkpoint

## Webinar Testimonial Format Consistency
- [x] Remove the navy lead-quote treatment from the webinar testimonial section
- [x] Present every approved testimonial in the same light-grey, editorial format
- [x] Validate the standardized presentation and save a publish-ready checkpoint

## Page-Specific Testimonial Placements
- [x] Define a separate placement record that links approved testimonials to named public pages with display order
- [x] Add administrator controls to select, reorder, and remove testimonial placements for each page
- [x] Update public page queries to render only their configured approved testimonials in the chosen order
- [x] Add regression coverage and publish-ready validation for page-specific placement management

## Lifework Testimonial Outreach Contacts
- [x] Define the completed-Lifework participation criteria for testimonial outreach
- [x] Extract eligible participants, identify usable email addresses, and remove duplicates
- [x] Create and verify an Excel outreach contact list with a concise data-quality summary

## Lifework LinkedIn Webinar Post Outlines
- [x] Adapt the City-and-Dragon storytelling framework to Lifework’s webinar audience and message
- [x] Draft six differentiated LinkedIn post outlines with story arc, core message, and registration call to action
- [x] Deliver the outlines in a reusable planning format for LinkedIn writing

## Lifework Simple Sales Stories LinkedIn Outlines
- [x] Adapt the Simple Sales Stories formats to Lifework’s webinar audience without inventing client evidence
- [x] Draft six differentiated post outlines using authorised real-example placeholders and webinar calls to action
- [x] Deliver the outlines in a reusable planning format for LinkedIn writing

## Webinar Registration Call-to-Action Placement
- [x] Add a registration link directly below the blue second-section headline
- [x] Add a repeated registration invitation as the final page block
- [x] Validate the revised registration path and layout, then save a publish-ready checkpoint

## Webinar Full Booking Module Placement
- [x] Move the complete two-session booking module before the A different starting point section
- [x] Repeat the complete two-session booking module as the final main page block
- [x] Remove the smaller standalone Request a place calls and validate the revised booking journey

## Home Page Configurable Testimonial Widget
- [x] Remove the home page’s hard-coded testimonial cards and placeholder attributions
- [x] Render up to four approved testimonials selected and ordered for the Lifework home page in the master Feedback page
- [x] Add regression coverage, validate the approved-only home widget, and save a publish-ready checkpoint
