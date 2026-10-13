# Scratch Agent self-audit remediation

Date: October 13, 2026. Baseline: published GitHub main d13f7bfb96a02cd4046f7ddc11b0c7df59f56d8b. Fixes were developed and tested in an isolated checkout so unrelated unfinished backend/CLI work was not included. The approved site layout and charcoal/green palette were preserved.

## Findings and fixes

| # | Original finding | Remediation |
| --- | --- | --- |
| 1 | Next.js and runtime dependency advisories | Updated Next.js/ESLint config to 16.4.0, Mermaid to 12.2.0 and compatible transitive patches. Runtime npm audit reports zero advisories. Drizzle's legacy esbuild is overridden to a patched version, with schema generation verified. |
| 2 | Concurrent requests could overbook Free quota | Per-account PostgreSQL advisory transaction lock precedes the rolling-window count and reservation. Pro unlimited, admin bypass, usage accounting and refunds remain. |
| 3 | Task transitions ignored dependencies/status and returned stale snapshots | Server enforces next-task order, dependencies, a single active task and valid transitions. Per-plan serialization plus conditional updates prevent conflicting writes. Repeat requests to the target state are idempotent; responses contain the new status. Fail/retry/checkpoint behavior remains. |
| 4 | Banned accounts could still write/generate | Central plan write gate checks account ban state. Progress watchdog also checks write access before recovery. Existing authorized read-only access remains. |
| 5 | Generation duplication across instances | Persistent, expiring per-plan/stage leases replace instance-only coordination. Stale workers cannot release or write over a newer lease. Structure permits four attempts including the initial job; a shared per-account 200-attempt/10-minute budget bounds retries while accommodating ten full fifteen-phase Pro builds plus retry margin. Successful daily entitlement is unchanged. Coordinator stops on rate limiting. |
| 6 | Ready could be set before task persistence | Plan/features/subfeatures/tasks save atomically; finalization reads persisted tasks and changes Ready within the same transaction. Lease ownership is checked with the plan row locked through commit. Task insertion failure leaves the plan unready. |
| 7 | Saved providers were blocked by an env-only check | Generation validates the same effective provider resolver as the adapter. Saved providers work without LLM_* env values; fallback and failover remain. Scheduling/setup failure refunds its reservation and removes only its unused skeleton. |
| 8 | Admin Pro controls disagreed with API capabilities | Shared capability resolver used by project UI and export/idea/delete/structure APIs. The designated owner's browser session has the same controls on both sides. A Free CLI token does not gain developer privilege from the email. |
| 9 | DB TLS did not validate the server certificate | Remote app connections now use rejectUnauthorized=true with the bundled official Supabase CA or a custom PEM CA. Connection-string TLS overrides cannot silently disable verification. The certificate is traced into server deployment bundles. Live connectivity passed. |
| 10 | Task panel keyboard/mobile/language/contrast/motion defects | Focus moves to the right panel, Escape closes that panel and restores trigger focus. Left phase remains open. Desktop expands 430→600 px; ineffective mobile expand is hidden. Labels/statuses use English US/Indonesian catalog entries; user plan content is unchanged. Metadata gray is #999999 on #282828. Motion respects system reduced-motion preference. |
| 11 | No automatic regression gate; full lint backlog | Added read-only, pinned-action GitHub workflow for typecheck, tests, runtime audit, build and tracked/history secret checks. Lint rejects new fingerprints while exposing 149 existing errors and 81 warnings. Tests remain included in lint. npm is the canonical package manager; obsolete root pnpm lock/workspace files are removed. |
| 12 | Contradictory audit/setup documentation | Rewrote the prior security report and README with current auth/setup, publication corrections and explicit evidence limits. Historical August reports remain marked as archives. |

Additional compatible protections: same-origin browser write guards preserve authenticated Bearer CLI/internal calls; public provider URLs are checked on save/test/generation, with validated DNS addresses pinned for the actual connection and redirects rejected. Unexpected admin/generation errors return generic client messages; detailed errors stay server-side. Admin account-detail requests use the existing rate limiter.

## Validation

- 144 automated tests pass, including quota race, detached DB responses, task state/dependency/order, duplicate/stale worker claims, ban/watchdog gates, saved-provider entry, refund cleanup, scoped tiers, DNS rebinding and SSE preservation.
- TypeScript and a fresh independent Next.js 16.4.0 production build pass (38 generated pages). The Supabase CA is present in generated API traces. No paid LLM calls were made.
- A live PostgreSQL fixture transaction verifies lease ownership/duplicate claim, locked task finalization, current task responses, attempt accounting and Free quota. The transaction is rolled back; a separate query confirms the fixture account/plan did not remain. Existing user data is untouched.
- Drizzle generation produces no schema diff. This release requires no new database migration or table.
- Runtime npm audit reports zero vulnerabilities. Full tooling audit retains five affected package entries in the same braces dependency chain; see the limitation below.
- Full lint baseline is 149 errors and 81 warnings, all unchanged pre-existing fingerprints. The regression gate reports zero new findings; this is not a full-lint-clean claim.
- Browser checks verify desktop panel sizing, focus/Escape behavior, a narrow viewport without horizontal overflow, hidden mobile expand, and translated panel labels through the Language settings preview.
- Reachable-history credential scanning passes for the inspected patterns. Values are never emitted by the scanner.

## Remaining limits

The braces stack-exhaustion advisory currently has no patched release. It is in development ESLint glob tooling, not installed production runtime dependencies. Only repository-controlled glob patterns are used here. We did not downgrade the framework or remove lint to silence this report. [Upstream advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

The lint backlog remains visible and gated against new findings. Generic request rate limiting is still per-instance; generation cost budgeting and quota locks are persistent. This is not a guarantee against every attack or a complete manual review of every component. Tests do not exercise a paid purchase or paid LLM generation in production. Production account credentials, external clones/caches and upstream services remain outside the test fixture scope.

The isolated release is the tested source. Unrelated local backend modules and CLI drafts were preserved separately and must not be mistaken for this validated release.
