# Account and Developer Setting release

- [x] 1. Consolidate LLM Engine, Users and admin Security into Developer Setting.
- [x] 2. Require an authenticated browser session for teguhends@gmail.com on the page and all admin APIs; remove alternate admin identities.
- [x] 3. Audit Profile and Settings for Free, Pro and admin, including ownership, saves, errors, tokens, sessions, exports and subscription expiry.
- [x] 4. Audit landing page English US and Indonesian, including the interactive project demo. Preserve user-written project content.
- [x] 5. Remove language switches from the landing page; retain account Language settings.
- [x] 6. Run focused regression checks, production build and final antislop audit.
- [ ] 7. Commit scoped changes, push and verify the production deployment.

2FA remains deferred. Never run destructive account deletion, paid LLM requests or changes to real users as audit fixtures.

Audit details and practical verification limits: [audit-013](../anti-slop/audit-013-2026-10-11.md).
