# Environment credential audit follow-up

Date: October 14, 2026. Baseline: GitHub main 99932eaf3c6eff8a6c3de81c4007564379f6eadc.

## Confirmed cause and external boundary

The current main tree and its reachable history have no findings for the inspected credential formats. However, a pre-rewrite commit is still retrievable anonymously from GitHub by its SHA. Its old environment file returned HTTP 200, and an isolated by-SHA fetch also succeeded. These are separate facts: a clean main history does not prove that GitHub has removed unreachable objects or cached views.

The owner confirmed revocation of the old TokenHarbor and CLI keys. We did not independently call those services with revoked credentials. The old database value in the inspected snapshot is already a removal marker. Database password rotation and current production AUTH_SECRET must not be inferred from local settings. The historical AUTH_SECRET is a placeholder instruction; it is not literally the value claimed in the external report.

Application identity comes from verified Supabase sessions or scoped CLI tokens. The retained Auth.js compatibility route does not grant application/admin permissions. Rotating its AUTH_SECRET does not revoke Supabase sessions. No authentication route, account entitlement or plan workflow is changed by this remediation.

GitHub documents that rotation is the first response, and that Support can review retained objects/cached views when risk cannot be mitigated through credential rotation. Support acceptance and deletion are not guaranteed. A secret-free request draft is prepared in the ignored local incident bundle; it has not been sent. [GitHub sensitive-data removal guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

## Prevention implemented

- Removed scripts/simulasi-production.ts from Git tracking. The existing local file and a verified identical backup remain private. Its existing ignore rule is retained.
- The scanner reads the index blobs as well as tracked working files. Cleaning an unstaged working copy cannot hide a credential queued for commit.
- Private env/key filenames fail even when their content uses an unfamiliar credential format. Only the root .env.example is allowed, with blank values except QUOTA_GENERATE_DAILY=3. Ignored-but-tracked files also fail.
- Text above the old two-megabyte cutoff and UTF-16 reports are inspected. Known key formats, private-key headers and quoted credential assignments are checked. Findings contain filenames/line numbers, never the matched values.
- Historical scanning inspects every reachable commit tree, including private aliases of identical blobs. The push hook also inspects explicit outgoing SHAs that have no branch reference.
- Added local pre-commit and pre-push hooks, with LF line endings and executable Git modes. Installation is explicit for each clone and refuses to replace existing hooks. CI repeats the checks after publication; hooks provide an earlier guard but can be bypassed.
- Removed partial API-key logging from manual live-test scripts. Corrected the manual generation script's quoted environment-reference placeholder to use its already-loaded local environment. These paid/live scripts remain outside npm test and were not executed.

## Validation and limits

Offline regression coverage checks unknown-format env files, safe templates, index/working-tree divergence, large text, UTF-16, deleted historical files, blob aliases, no-value output, existing hook preservation, rejected commits and rejected pushes to an offline local remote. No production data or paid provider calls are required for these tests.

All 156 automated tests pass, including 11 new credential/hook regressions. Typecheck passes; lint reports zero new findings against the unchanged existing baseline. A Next.js 16.4.0 production build succeeds with 38 generated pages. Runtime npm audit reports zero vulnerabilities. The tracked/index and reachable-history scanners report zero findings. The actual hook was tested rejecting a commit and a push to an offline remote without changing its HEAD.

This release adds no schema migration and changes no browser UI or application runtime source. Existing unrelated backend/CLI drafts are preserved outside the tested release. The lint backlog is still present; passing its regression gate is not a full-lint-clean claim.

Production credential verification and GitHub server-side purge remain external steps until there is direct evidence. A passing scanner is not a guarantee against every credential format, retained remote object, external clone or third-party cache. Do not mark this incident fully closed until the remaining credential/access questions and retained-object status are resolved.
