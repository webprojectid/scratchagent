# Security hardening — 16 October 2026

This release implements findings 1, 3 and 4 from the security patch review. Finding 2 (requiring verified email before generation) is deliberately excluded. Signup, email confirmation settings, model selection, plan limits and quota refunds retain their existing behavior.

## Administrator configuration

Set `ADMIN_EMAILS` in the server environment before deploying. It accepts comma-separated email addresses, ignores case and surrounding whitespace, and rejects malformed entries. An empty list grants no administrator privileges. Subscription tier never grants administrator access.

Browser components use the role returned by `/api/me`. Protected server pages and API routes continue to validate the authenticated session and server allowlist independently. Access tokens and development identities cannot use administrator endpoints.

Vercel environment changes require a new deployment. Configure each environment that needs administrator access separately; a Production variable does not configure Preview. The Production value was saved before this release. No credential values belong in this document or Git.

## Generation requests

Production resolves the session or access token before reading the request body. Origin and blocked-IP checks still run first. The configuration-free local development mode retains its existing body identity fallback.

| Condition | Status | Code |
| --- | --- | --- |
| Missing or invalid identity | 401 | `AUTH_REQUIRED` |
| Authenticated request with malformed JSON | 400 | `INVALID_JSON` |
| Authenticated request with invalid fields | 400 | `INVALID_INPUT` |
| Authenticated request larger than 65,536 UTF-8 bytes | 413 | `PAYLOAD_TOO_LARGE` |

The body limit checks both declared size and actual streamed bytes. These failures happen before quota consumption, project creation or model scheduling. Existing valid Free and Pro requests, including sessions whose email verification flag is false, remain allowed.

## Content Security Policy

The default header is enforced. Supabase connections are pinned to the configured project origin and matching WebSocket origin. Other external sources are listed explicitly in `src/lib/content-security-policy.ts` for existing images, Turnstile and Spline assets.

Production disallows JavaScript `eval`, plugins, external form submissions and cross-origin framing. WASM compilation and blob workers remain enabled for the existing 3D scene. Inline scripts and styles remain allowed for the current static Next.js delivery; this policy is defense in depth and does not fully prevent inline-script injection.

Local development additionally permits the tooling's JavaScript evaluation and local WebSocket connections. `CSP_REPORT_ONLY=1` changes the header to observation mode; it requires a new build/deployment and does not block violations. Remove that override to restore enforcement. No reporting endpoint is configured.

When adding an integration, inspect actual blocked requests and update only its required origins. Do not replace source lists with unrestricted `https:` or `wss:` permissions.

## Validation

- 263 automated tests passed, including multi-admin configuration, missing identity, malformed/oversized bodies, quota/refund behavior and unverified Free/Pro compatibility.
- Production build passed. Lint reported zero new findings; its existing baseline was not changed.
- Local production HTTP checks confirmed enforcement and consistent anonymous 401 responses.
- Browser checks covered the public home, loaded Spline scene, login page and demo roadmap without observed CSP violations.

Live authenticated administrator and OAuth sign-in flows still require a real user session; unit coverage and anonymous browser checks do not substitute for that confirmation.
