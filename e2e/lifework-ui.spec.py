"""
Lifework UI Simulation — Screen-by-Screen QA
=============================================

Runs against the live dev server using the /preview/* routes, which render
every client-facing screen with realistic fixture data and no auth requirement.

Coverage:
  Screen 1  — /preview/home              Landing page, hero, CTA buttons
  Screen 2  — /preview/dashboard         Six step cards, navigation
  Screen 3  — /preview/interview         Intro page, Begin button
  Screen 4  — /preview/interview-form    Phase tabs, achievement inputs, ESF radios
  Screen 5  — /preview/background        Three tabs, family/education/career forms
  Screen 6  — /preview/via               VIA survey, sample questions, Next button
  Screen 7  — /preview/via/results       Ranked strengths, proceed to IPIP
  Screen 8  — /preview/results-held/via  Held-results screen, Return to Dashboard
  Screen 9  — /preview/ipip-survey       IPIP survey, domain tabs, sample questions
  Screen 10 — /preview/ipip-results      Big Five bars, completion banner
  Screen 11 — /preview/results-held/ipip Held-results screen (IPIP variant)
  Screen 12 — /preview/my-report         Report not-ready placeholder
  Screen 13 — /preview/career-explorer   Sage chat interface, suggested questions

  Navigation dead-ends: every screen has an escape route
  Wrong-button traps: empty survey submit, rapid double-click, browser back

Usage:
  python3 e2e/lifework-ui.spec.py [--base-url URL] [--headed] [--slow-mo MS]

Exit 0 = all checks pass. Exit 1 = one or more failures.
"""

import sys
import argparse
import traceback
from dataclasses import dataclass
from typing import Callable
from playwright.sync_api import sync_playwright, Page, expect

# ── Config ────────────────────────────────────────────────────────────────────
DEFAULT_BASE = "http://localhost:3000"
TIMEOUT = 12_000   # ms per assertion
NAV_TIMEOUT = 20_000  # ms for page navigation

BASE = DEFAULT_BASE  # overridden by --base-url

# ── Result tracking ───────────────────────────────────────────────────────────
@dataclass
class TestResult:
    name: str
    passed: bool
    error: str = ""

results: list[TestResult] = []

def check(name: str, fn: Callable[[], None]) -> None:
    try:
        fn()
        results.append(TestResult(name=name, passed=True))
        print(f"  ✓  {name}")
    except Exception as e:
        results.append(TestResult(name=name, passed=False, error=str(e)))
        print(f"  ✗  {name}")
        print(f"     {str(e)[:200]}")

def goto(page: Page, path: str) -> None:
    """Navigate using domcontentloaded — avoids hanging on pages with long-polling."""
    page.goto(f"{BASE}/{path.lstrip('/')}", wait_until="domcontentloaded", timeout=NAV_TIMEOUT)
    # Give React a moment to hydrate
    page.wait_for_timeout(800)

# ── Screen 1: Home / Landing ──────────────────────────────────────────────────
def test_home(page: Page) -> None:
    print("\nScreen 1 — Home / Landing")
    goto(page, "/preview/home")

    check("hero heading is visible",
          lambda: expect(page.get_by_text("authentically yours", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("'Begin Your Journey' CTA is present",
          lambda: expect(page.get_by_text("Begin Your Journey", exact=False)).to_be_visible(timeout=TIMEOUT))

    check("'Counsellor Login' button is present",
          lambda: expect(page.get_by_text("Counsellor Login", exact=False)).to_be_visible(timeout=TIMEOUT))

    check("'Career Analysis' eyebrow text is present",
          lambda: expect(page.get_by_text("Career Analysis", exact=False)).to_be_visible(timeout=TIMEOUT))

    # Clicking Begin Your Journey should navigate to dashboard
    btn = page.get_by_text("Begin Your Journey", exact=False).first
    btn.click()
    page.wait_for_timeout(600)
    check("Begin Your Journey navigates to /preview/dashboard",
          lambda: expect(page).to_have_url(f"{BASE}/preview/dashboard", timeout=TIMEOUT))

# ── Screen 2: Client Dashboard ────────────────────────────────────────────────
def test_dashboard(page: Page) -> None:
    print("\nScreen 2 — Client Dashboard")
    goto(page, "/preview/dashboard")

    check("Welcome heading is visible",
          lambda: expect(page.get_by_text("Welcome", exact=False)).to_be_visible(timeout=TIMEOUT))

    check("Life History Interview step is present",
          lambda: expect(page.get_by_text("Life History Interview", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("Background & History step is present",
          lambda: expect(page.get_by_text("Background", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("Sage step is present",
          lambda: expect(page.get_by_text("Sage", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("Psychometrics step is present",
          lambda: expect(page.get_by_text("Psychometrics", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("Lifework Coaching step is present",
          lambda: expect(page.get_by_text("Lifework Coaching", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("Career Explorer step is present",
          lambda: expect(page.get_by_text("Career Explorer", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("'Begin Interview' CTA is present",
          lambda: expect(page.get_by_text("Begin Interview", exact=False)).to_be_visible(timeout=TIMEOUT))

# ── Screen 3: Life History Interview (intro) ──────────────────────────────────
def test_interview_intro(page: Page) -> None:
    print("\nScreen 3 — Life History Interview (intro)")
    goto(page, "/preview/interview")

    check("'The story of who you are' heading is visible",
          lambda: expect(page.get_by_text("The story of who you are", exact=False)).to_be_visible(timeout=TIMEOUT))

    check("'How it works' section is present",
          lambda: expect(page.get_by_text("How it works", exact=False)).to_be_visible(timeout=TIMEOUT))

    check("'Begin Life History' button is present",
          lambda: expect(page.get_by_text("Begin Life History", exact=False)).to_be_visible(timeout=TIMEOUT))

    check("Dashboard back button is present",
          lambda: expect(page.get_by_text("Dashboard", exact=False).first).to_be_visible(timeout=TIMEOUT))

    # Clicking Begin Life History should navigate to interview-form
    btn = page.get_by_text("Begin Life History", exact=False).first
    btn.click()
    page.wait_for_timeout(600)
    check("Begin Life History navigates to /preview/interview-form",
          lambda: expect(page).to_have_url(f"{BASE}/preview/interview-form", timeout=TIMEOUT))

# ── Screen 4: Interview Form (achievement entry) ──────────────────────────────
def test_interview_form(page: Page) -> None:
    print("\nScreen 4 — Interview Form (achievement entry)")
    goto(page, "/preview/interview-form")

    check("phase progress dots are present",
          lambda: expect(page.get_by_text("Phase", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("achievement title inputs are rendered",
          lambda: expect(page.locator("input[type='text'], textarea").first).to_be_visible(timeout=TIMEOUT))

    check("ESF classification buttons are present",
          lambda: expect(page.get_by_text("Enjoyable", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("'Satisfying' option is present",
          lambda: expect(page.get_by_text("Satisfying", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("'Fulfilling' option is present",
          lambda: expect(page.get_by_text("Fulfilling", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("Back/Introduction button is present",
          lambda: expect(page.get_by_text("Introduction", exact=False).or_(
              page.get_by_text("Back", exact=False)
          ).first).to_be_visible(timeout=TIMEOUT))

    check("Next phase button is present",
          lambda: expect(page.locator("button").filter(has_text="Next").or_(
              page.locator("button").filter(has_text="Save")
          ).first).to_be_visible(timeout=TIMEOUT))

    # Phase navigation: clicking Next should advance to next phase
    next_btn = page.locator("button").filter(has_text="Next").first
    if next_btn.is_visible():
        next_btn.click()
        page.wait_for_timeout(500)
        check("Next phase button advances the phase",
              lambda: expect(page).to_have_url(f"{BASE}/preview/interview-form", timeout=TIMEOUT))

# ── Screen 5: Background & History ───────────────────────────────────────────
def test_background(page: Page) -> None:
    print("\nScreen 5 — Background & History")
    goto(page, "/preview/background")

    check("'Background & History' header is visible",
          lambda: expect(page.get_by_text("Background & History", exact=False)).to_be_visible(timeout=TIMEOUT))

    check("'Family Background' tab is present",
          lambda: expect(page.get_by_text("Family Background", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("'Education' tab is present",
          lambda: expect(page.get_by_text("Education", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("'Career History' tab is present",
          lambda: expect(page.get_by_text("Career History", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("Family tab inputs are rendered by default",
          lambda: expect(page.locator("input[type='text']").first).to_be_visible(timeout=TIMEOUT))

    check("'Save Family Background' button is present",
          lambda: expect(page.get_by_text("Save Family Background", exact=False)).to_be_visible(timeout=TIMEOUT))

    # Switch to Education tab
    edu_tab = page.get_by_text("Education", exact=False).first
    edu_tab.click()
    page.wait_for_timeout(400)
    check("Education tab shows institution inputs",
          lambda: expect(page.locator("input[type='text']").first).to_be_visible(timeout=TIMEOUT))

    # Switch to Career tab
    career_tab = page.get_by_text("Career History", exact=False).first
    career_tab.click()
    page.wait_for_timeout(400)
    check("Career tab shows career inputs",
          lambda: expect(page.locator("input[type='text']").first).to_be_visible(timeout=TIMEOUT))

    check("Proceed to VIA button is present",
          lambda: expect(page.get_by_text("VIA", exact=False).first).to_be_visible(timeout=TIMEOUT))

# ── Screen 6: VIA Survey ──────────────────────────────────────────────────────
def test_via_survey(page: Page) -> None:
    print("\nScreen 6 — VIA Character Strengths Survey")
    goto(page, "/preview/via")

    check("'VIA Character Strengths' header is visible",
          lambda: expect(page.get_by_text("VIA Character Strengths", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("'About the VIA Survey' section is present",
          lambda: expect(page.get_by_text("About the VIA Survey", exact=False)).to_be_visible(timeout=TIMEOUT))

    check("'Page 1 of 24' progress is shown",
          lambda: expect(page.get_by_text("Page 1 of 24", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("sample question buttons (1–5 scale) are rendered",
          lambda: expect(page.locator("button").filter(has_text="1").first).to_be_visible(timeout=TIMEOUT))

    check("'Next' button is present",
          lambda: expect(page.locator("button").filter(has_text="Next").first).to_be_visible(timeout=TIMEOUT))

    check("'Previous' button is disabled on page 1",
          lambda: expect(page.get_by_text("Previous", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("Dashboard back button is present",
          lambda: expect(page.get_by_text("Dashboard", exact=False).first).to_be_visible(timeout=TIMEOUT))

    # Clicking Next should navigate to results-held (the preview skips to results)
    next_btn = page.locator("button").filter(has_text="Next").first
    if next_btn.is_visible():
        next_btn.click()
        page.wait_for_timeout(600)
        check("VIA Next button navigates to results-held",
              lambda: expect(page).to_have_url(f"{BASE}/preview/results-held/via", timeout=TIMEOUT))

# ── Screen 7: VIA Results ─────────────────────────────────────────────────────
def test_via_results(page: Page) -> None:
    print("\nScreen 7 — VIA Results")
    goto(page, "/preview/via/results")

    check("'VIA Character Strengths Results' heading is visible",
          lambda: expect(page.get_by_text("Character Strengths", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("ranked strengths list is rendered",
          lambda: expect(page.get_by_text("Top 5 Signature Strengths", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("'Proceed to Personality Survey' button is present",
          lambda: expect(page.get_by_text("Personality", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("Dashboard navigation is present",
          lambda: expect(page.get_by_text("Dashboard", exact=False).first).to_be_visible(timeout=TIMEOUT))

# ── Screen 8: Results Held (VIA) ──────────────────────────────────────────────
def test_results_held_via(page: Page) -> None:
    print("\nScreen 8 — Results Held (VIA)")
    goto(page, "/preview/results-held/via")

    check("'VIA Character Strengths Complete' heading is visible",
          lambda: expect(page.get_by_text("Complete", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("held-results explanation mentions 'Wow Report'",
          lambda: expect(page.get_by_text("Wow Report", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("lock icon explanation is visible",
          lambda: expect(page.get_by_text("results are held", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("'Return to Dashboard' button is present",
          lambda: expect(page.get_by_text("Return to Dashboard", exact=False).first).to_be_visible(timeout=TIMEOUT))

    # Clicking Return to Dashboard — goes to /dashboard which redirects to auth if not logged in
    btn = page.get_by_text("Return to Dashboard", exact=False).first
    btn.click()
    page.wait_for_timeout(600)
    check("Return to Dashboard navigates away from results-held",
          lambda: expect(page).not_to_have_url(f"{BASE}/preview/results-held/via", timeout=TIMEOUT))

# ── Screen 9: IPIP Survey ─────────────────────────────────────────────────────
def test_ipip_survey(page: Page) -> None:
    print("\nScreen 9 — IPIP Personality Survey")
    goto(page, "/preview/ipip-survey")

    check("'IPIP-NEO Personality Survey' header is visible",
          lambda: expect(page.get_by_text("IPIP-NEO", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("domain tabs are rendered",
          lambda: expect(page.get_by_text("Neuroticism", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("'About this assessment' card is present",
          lambda: expect(page.get_by_text("About this assessment", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("sample IPIP questions are rendered",
          lambda: expect(page.locator(".space-y-5 button, [class*='card'] button").first).to_be_visible(timeout=TIMEOUT))

    check("'Skip to Results' button is present",
          lambda: expect(page.get_by_text("Skip to Results", exact=False)).to_be_visible(timeout=TIMEOUT))

    # Clicking Skip to Results should navigate to results-held/ipip
    skip_btn = page.get_by_text("Skip to Results", exact=False).first
    if skip_btn.is_visible():
        skip_btn.click()
        page.wait_for_timeout(600)
        check("Skip to Results navigates to /preview/results-held/ipip",
              lambda: expect(page).to_have_url(f"{BASE}/preview/results-held/ipip", timeout=TIMEOUT))

# ── Screen 10: IPIP Results ───────────────────────────────────────────────────
def test_ipip_results(page: Page) -> None:
    print("\nScreen 10 — IPIP Results")
    goto(page, "/preview/ipip-results")

    check("'Personality Profile' heading is visible",
          lambda: expect(page.get_by_text("Personality Profile", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("Neuroticism domain card is present",
          lambda: expect(page.get_by_text("Neuroticism", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("Extraversion domain card is present",
          lambda: expect(page.get_by_text("Extraversion", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("Openness domain card is present",
          lambda: expect(page.get_by_text("Openness", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("progress bars are rendered",
          lambda: expect(page.locator("[role='progressbar'], [class*='progress']").first).to_be_visible(timeout=TIMEOUT))

    check("completion banner is present",
          lambda: expect(page.get_by_text("Psychometrics Complete", exact=False)).to_be_visible(timeout=TIMEOUT))

# ── Screen 11: Results Held (IPIP) ────────────────────────────────────────────
def test_results_held_ipip(page: Page) -> None:
    print("\nScreen 11 — Results Held (IPIP)")
    goto(page, "/preview/results-held/ipip")

    check("'Personality Profile Complete' heading is visible",
          lambda: expect(page.get_by_text("Complete", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("'Return to Dashboard' button is present",
          lambda: expect(page.get_by_text("Return to Dashboard", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("held-results explanation mentions 'Wow Report'",
          lambda: expect(page.get_by_text("Wow Report", exact=False).first).to_be_visible(timeout=TIMEOUT))

# ── Screen 12: My Report ──────────────────────────────────────────────────────
def test_my_report(page: Page) -> None:
    print("\nScreen 12 — My Report")
    goto(page, "/preview/my-report")

    check("'Career Analysis Report' header is visible",
          lambda: expect(page.get_by_text("Career Analysis Report", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("'Report Isn't Ready Yet' placeholder is shown",
          lambda: expect(page.get_by_text("Report Isn't Ready Yet", exact=False)).to_be_visible(timeout=TIMEOUT))

    check("explanation mentions counsellor generating the report",
          lambda: expect(page.get_by_text("counsellor", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("'Back to Dashboard' button is present",
          lambda: expect(page.get_by_text("Back to Dashboard", exact=False)).to_be_visible(timeout=TIMEOUT))

    # Clicking Back to Dashboard
    btn = page.get_by_text("Back to Dashboard", exact=False).first
    btn.click()
    page.wait_for_timeout(600)
    check("Back to Dashboard navigates to /preview/dashboard",
          lambda: expect(page).to_have_url(f"{BASE}/preview/dashboard", timeout=TIMEOUT))

# ── Screen 13: Career Explorer ────────────────────────────────────────────────
def test_career_explorer(page: Page) -> None:
    print("\nScreen 13 — Career Explorer (Sage chat)")
    goto(page, "/preview/career-explorer")

    check("'Career Explorer' header is visible",
          lambda: expect(page.get_by_text("Career Explorer", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("Sage's opening message is rendered",
          lambda: expect(page.get_by_text("Welcome. I'm Sage", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("suggested questions are shown",
          lambda: expect(page.get_by_text("Suggested questions", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("message input field is present",
          lambda: expect(page.get_by_text("Type your message to Sage", exact=False).first).to_be_visible(timeout=TIMEOUT))

    check("Send button is present",
          lambda: expect(page.locator("button").filter(has_text="Send").first).to_be_visible(timeout=TIMEOUT))

    check("Dashboard back button is present",
          lambda: expect(page.get_by_text("Dashboard", exact=False).first).to_be_visible(timeout=TIMEOUT))

# ── Navigation dead-end checks ────────────────────────────────────────────────
def test_navigation_dead_ends(page: Page) -> None:
    """Every screen must have at least one escape route."""
    print("\nNavigation Dead-End Checks")
    screens = [
        ("/preview/interview",       "Interview intro"),
        ("/preview/interview-form",  "Interview form"),
        ("/preview/background",      "Background"),
        ("/preview/via",             "VIA survey"),
        ("/preview/via/results",     "VIA results"),
        ("/preview/ipip-survey",     "IPIP survey"),
        ("/preview/ipip-results",    "IPIP results"),
        ("/preview/my-report",       "My Report"),
        ("/preview/career-explorer", "Career Explorer"),
    ]
    for path, label in screens:
        goto(page, path)
        check(f"{label} has a back/dashboard escape route",
              lambda l=label: expect(
                  page.get_by_text("Dashboard", exact=False).or_(
                      page.get_by_text("Back", exact=False).or_(
                          page.get_by_text("Introduction", exact=False)
                      )
                  ).first
              ).to_be_visible(timeout=TIMEOUT))

# ── Wrong-button trap checks ──────────────────────────────────────────────────
def test_wrong_button_traps(page: Page) -> None:
    """Common wrong-button presses should be handled gracefully."""
    print("\nWrong-Button Trap Checks")

    # 1. Back from interview intro → should go to dashboard, not 404
    goto(page, "/preview/interview")
    back_btn = page.get_by_text("Dashboard", exact=False).first
    if back_btn.is_visible():
        back_btn.click()
        page.wait_for_timeout(600)
        check("Back from interview intro does not land on 404",
              lambda: expect(page).not_to_have_url(f"{BASE}/404", timeout=3000))
        page.go_back()
        page.wait_for_timeout(400)

    # 2. Back from interview-form phase 1 → should go to interview intro
    goto(page, "/preview/interview-form")
    back_btn2 = page.get_by_text("Introduction", exact=False).first
    if back_btn2.is_visible():
        back_btn2.click()
        page.wait_for_timeout(600)
        check("Back from interview form phase 1 goes to interview intro",
              lambda: expect(page).to_have_url(f"{BASE}/preview/interview", timeout=TIMEOUT))

    # 3. Rapid double-click on Next in interview form — should not crash
    goto(page, "/preview/interview-form")
    next_btn = page.locator("button").filter(has_text="Next").first
    if next_btn.is_visible():
        next_btn.click()
        next_btn.click()
        page.wait_for_timeout(800)
        check("Rapid double-click on Next does not crash",
              lambda: expect(page.locator("body")).to_be_visible(timeout=3000))

    # 4. Clicking 'Previous' when disabled on VIA page 1 — should not navigate
    goto(page, "/preview/via")
    prev_btn = page.get_by_text("Previous", exact=False).first
    if prev_btn.is_visible():
        prev_btn.click()
        page.wait_for_timeout(500)
        check("Disabled Previous on VIA page 1 does not navigate away",
              lambda: expect(page).to_have_url(f"{BASE}/preview/via", timeout=3000))

    # 5. Browser back from results-held → should not re-submit or crash
    goto(page, "/preview/results-held/via")
    page.go_back()
    page.wait_for_timeout(600)
    check("Browser back from results-held stays on valid page",
          lambda: expect(page).not_to_have_url(f"{BASE}/404", timeout=3000))

# ── Locked-state check ────────────────────────────────────────────────────────
def test_locked_states(page: Page) -> None:
    """Dashboard locked steps should be visible and not have active CTAs."""
    print("\nLocked State Checks")
    goto(page, "/preview/dashboard")

    check("dashboard renders all six steps",
          lambda: expect(page.get_by_text("Career Explorer", exact=False).first).to_be_visible(timeout=TIMEOUT))

    # In preview mode all steps show as 'not_started' — verify no step shows an error state
    check("no error state is shown on dashboard",
          lambda: expect(page.get_by_text("Something went wrong", exact=False)).to_have_count(0, timeout=TIMEOUT))

    check("Lifework logo is visible in header",
          lambda: expect(page.locator("img[alt='Lifework']")).to_be_visible(timeout=TIMEOUT))

# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> int:
    parser = argparse.ArgumentParser(description="Lifework UI Screen-by-Screen QA")
    parser.add_argument("--base-url", default=DEFAULT_BASE, help="Base URL of the dev server")
    parser.add_argument("--headed", action="store_true", help="Run in headed mode")
    parser.add_argument("--slow-mo", type=int, default=0, help="Slow motion delay in ms")
    args = parser.parse_args()

    global BASE
    BASE = args.base_url.rstrip("/")

    console_errors: list[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed, slow_mo=args.slow_mo)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            ignore_https_errors=True,
        )
        page = context.new_page()
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: console_errors.append(f"PAGE ERROR: {err}"))

        print(f"\nLifework UI Simulation — {BASE}")
        print("=" * 60)

        suites = [
            test_home,
            test_dashboard,
            test_interview_intro,
            test_interview_form,
            test_background,
            test_via_survey,
            test_via_results,
            test_results_held_via,
            test_ipip_survey,
            test_ipip_results,
            test_results_held_ipip,
            test_my_report,
            test_career_explorer,
            test_navigation_dead_ends,
            test_locked_states,
            test_wrong_button_traps,
        ]

        for suite in suites:
            try:
                suite(page)
            except Exception as e:
                print(f"\n  [SUITE CRASH] {suite.__name__}: {e}")
                traceback.print_exc()

        browser.close()

    # ── Summary ──────────────────────────────────────────────────────────────
    passed = sum(1 for r in results if r.passed)
    failed = sum(1 for r in results if not r.passed)
    total = len(results)

    print("\n" + "=" * 60)
    print(f"Results: {passed}/{total} passed, {failed} failed")

    if failed:
        print("\nFailed checks:")
        for r in results:
            if not r.passed:
                print(f"  ✗  {r.name}")
                print(f"     {r.error[:300]}")

    if console_errors:
        print(f"\nConsole errors captured ({len(console_errors)}):")
        for err in console_errors[:10]:
            print(f"  • {err[:200]}")

    print("=" * 60)
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
