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

## Branding — Replace Peter Daws with Bernard Haldane in public-facing copy

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
