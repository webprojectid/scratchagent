# Database egress controls

Plan progress uses a server-computed revision token. Postgres hashes the feature, subfeature and task rows internally and returns metadata plus the token, rather than transmitting every row for an unchanged poll. Ownership and token scope are checked before an ETag match can return HTTP 304. Responses are private and no-store; they are not shared between users or cached at the CDN.

The browser polls generating plans every 3 seconds, implementing plans every 10 seconds, ready plans every 30 seconds and completed plans every 120 seconds. Hidden tabs pause and abort requests; returning to the tab triggers a refresh. Requests do not overlap and failures back off up to 120 seconds. Generating plans retain the recovery watchdog.

Full plan hydration uses five bounded query stages (plan, features, subfeatures, tasks and generation settings) instead of one query per feature and subfeature. Project lists select stack metadata without transferring PRD, architecture or generation input. Account data export retains the complete stored project settings. CLI next-task selection reuses its authorized plan snapshot instead of fetching the same plan twice. Progress reads are rate limited per server instance using the existing limiter.

No database migration, authentication cache or background data deletion is required. The SQL fingerprint still scans related rows inside Postgres; monitor query duration as projects grow. Per-instance rate limiting is not a distributed DDoS protection service.

## Verification

Run the test suite and production build. Exercise a first GET to `/api/plans/demo/progress`, then repeat with its `If-None-Match` value: expect 304 with an empty body. Private plans must still return 401/404 for invalid access even when a known ETag is sent. After deployment, compare project-filtered Shared Pooler egress per day in Supabase. Usage already consumed is not refunded by this change, and dashboards may update with a delay.
