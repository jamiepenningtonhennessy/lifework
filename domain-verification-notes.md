# Lifeworkpath.com Cutover Verification

## 2026-08-13

- `https://lifeworkpath.com/` resolves successfully and serves the standalone Lifework landing page, rather than the Pennington Hennessy homepage.
- The standalone root presents the Lifework navigation, access-code sign-in entry point, and Lifework content as intended.
- `https://www.lifeworkpath.com/` successfully redirects to `https://lifeworkpath.com/`, establishing the non-www address as canonical.
- `https://penningtonhennessy.com/coaching/lifework` continues to display Lifework with Pennington Hennessy navigation, and has not yet been redirected.
- The standalone domain's “I Have an Access Code” control opens the expected access-code modal correctly.
- After publishing the hostname-aware fallback, `https://penningtonhennessy.com/coaching/lifework` now transfers successfully to `https://lifeworkpath.com/`.
- The transfer is currently applied by the published application fallback, because the legacy Pennington Hennessy record remains DNS-only and therefore does not pass through the Cloudflare redirect layer.
- Next check: confirm the sign-in callback returns users to the standalone Lifework domain.
