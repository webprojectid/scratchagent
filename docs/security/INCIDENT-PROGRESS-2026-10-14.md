# Incident follow-up implementation

This follow-up preserves account tiers, project generation, task transitions, CLI scopes and the existing site design. It does not rotate or disclose credentials and does not claim that GitHub has purged retained objects.

## Implemented

- Source archives include the blank root .env.example while still excluding private env files. An actual Git archive regression verifies both inclusion and exclusion.
- Manual live simulations have a documented explicit runner, separate from offline CI. It refuses CI/production and never reuses the application's database; the database-writing mode requires a distinct test database setting. Existing direct script paths remain for compatibility and are documented as bypassing the runner safeguards.
- The two 8.4 MB creator GIF files were byte-identical. Only the original remains in HEAD, and a rewrite preserves the duplicate's old URL with the exact original animation. Two PNGs were recompressed only after verifying decoded pixels match. Original files are privately backed up; UI geometry, pixels, timing and animation remain unchanged. Total creator assets shrink by approximately 9 MB.
- The existing admin security endpoint supports view=credential-status after the owner-session gate and rate limiter. It returns only configuration booleans, uses private/no-store caching and does not query application tables for that view. It never returns credential values, hashes or length. AUTH_SECRET checks catch missing/short/obvious placeholder/repeated values; passing these basic checks is not a claim of cryptographic randomness or proof of rotation. The response explicitly cannot verify database password rotation.
- Regressions cover archive behavior, live-test consent/CI/database isolation, credential classification, owner-only diagnostic access and absence of secret values in the response.

## External steps

The owner confirmed revoking old TokenHarbor and CLI credentials. Current production AUTH_SECRET can now be checked safely through the authenticated owner diagnostic endpoint without revealing it. Database password rotation remains a separate question unless independently verified. Credential changes require the owner to enter and submit new values directly in the provider dashboard.

The secret-free GitHub Support request has rewrite metadata and retained-object evidence prepared. Submission and any ticket ID must be recorded only after the support UI confirms acceptance. Support can decline removal when credential rotation mitigates the risk; an accepted request is not proof that deletion has completed.

The full lint backlog is not erased or hidden by this patch. Its regression baseline remains enforced. Existing unrelated backend/CLI drafts are not part of the validated release.
