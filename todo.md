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
