# Scratch Agent

Scratch Agent turns product briefs into reviewed PRDs, roadmaps, architecture, database schemas and ordered implementation tasks. Coding agents work through those tasks using the CLI, with dependencies, progress and checkpoints managed by the server.

## Local setup

Use Node.js 24.x and npm. package-lock.json is the canonical web lockfile; the CLI has its own package and lockfile.

```sh
npm ci
cp .env.example .env
npm run hooks:install
npm run dev
```

Open http://localhost:3000. Without database or authentication configuration, /project/demo provides a public, read-only sample. In-memory storage is for local development and resets when the process restarts. Never use that fallback as production storage.

For a configured environment:

- Set DATABASE_URL to the PostgreSQL connection, keeping its password out of tracked files. Remote connections verify TLS certificates. The Supabase public CA is bundled; other private CAs can use DATABASE_SSL_CA as PEM text, including escaped newlines.
- Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Supabase Auth is the application's browser identity provider. The anonymous key is public; service-role credentials must never be placed in NEXT_PUBLIC_* variables.
- Enable CAPTCHA in Supabase Auth and set NEXT_PUBLIC_TURNSTILE_SITE_KEY. Sign-in and sign-up send the CAPTCHA token to Supabase, which validates it server-side.
- Configure LLM providers in **Developer Setting**, available only to the designated owner browser session. Saved providers take priority; LLM_BASE_URL, LLM_API_KEY and LLM_MODEL remain optional fallbacks. Provider destinations must resolve to public addresses and use HTTPS in production.
- AUTH_SECRET and Google OAuth values configure the retained Auth.js compatibility route. Auth.js does not grant the application's Supabase/CLI permissions.

English US is the default interface language. Indonesian can be selected in Settings. User-authored plan content keeps its original language.

## Database changes

Drizzle configuration includes both core and account schemas. Review generated SQL before applying it, and back up the database first.

```sh
npx drizzle-kit generate
node --env-file=.env scripts/run-migrate.mjs
```

Generation compares against committed snapshots; an unchanged schema must produce an empty diff. Do not use drizzle-kit push to repair production migration history. Security regression tests run offline and do not apply migrations or call paid LLMs.

## Validation

```sh
npm run typecheck
npm test
npm run lint
npm run secrets:check
npm run secrets:history
npm audit --omit=dev
npm run build
```

npm run lint rejects new findings against a fingerprinted baseline of unchanged existing code. npm run lint:full reports the entire backlog. The baseline is not a claim of lint-clean source and must not be regenerated to hide new errors. CI runs these checks without production credentials.

The credential gate reads both staged Git blobs and tracked working files, including large text files. It rejects private env/key files and ignored files that remain tracked. The only env template allowed is the root .env.example, with blank values except the documented quota default. Never put real credentials in a test fixture or report.

npm run hooks:install enables local checks before commits and pushes, without replacing existing hooks. Each new clone needs this explicit setup. If a hook already exists, integrate the two scanner commands there. CI repeats these checks; CI runs after a push and cannot prevent the initial publication by itself. Hooks can be bypassed, so they are an extra guard rather than a guarantee.

The history scanner checks all local reachable commit trees for known credential patterns and private filenames. It cannot inspect unreachable objects retained by GitHub, external clones or hosting caches. Passing it does not prove every secret format is clean. An old SHA that remains accessible requires credential revocation and, when appropriate, GitHub Support review. See [the October 14 follow-up](docs/security/ENV-FOLLOWUP-2026-10-14.md) for the current boundary between code remediation and external actions.

## Coding-agent handoff

Start with [the project handoff](docs/PROJECT-HANDOFF.md) and [safe publishing rules](docs/security/SAFE-PUBLISHING.md). The latter defines which files belong in GitHub and how to keep credentials and private audit material out of releases.

Standalone provider/plan simulations have a separate, explicitly opted-in runner. See [manual test instructions](tests/MANUAL.md). They are excluded from offline CI and do not reuse the application's database through that runner.

Build the CLI separately:

```sh
cd cli
npm ci
npm run build
node dist/index.js login --token <your-token>
node dist/index.js init --agent opencode
node dist/index.js plan get <plan-id>
node dist/index.js task next --plan <plan-id> --json
node dist/index.js task start <task-ref>
# Implement and verify the task.
node dist/index.js task complete <task-ref>
```

Create scoped tokens in **Settings → CLI & API**. A read-only token cannot write, and project-scoped tokens cannot access another plan. Failed tasks pause the sequence; use task retry after resolving the failure. Starting, completing, failing and retrying tasks follow server-enforced state transitions. Banned accounts cannot write; their permitted read-only access remains available.

## Stack

Next.js App Router, React, TypeScript, Tailwind CSS, React Flow, Motion/GSAP, PostgreSQL with Drizzle, Supabase Auth, and OpenAI-compatible LLM providers. The site preserves its charcoal surfaces and Scratch Agent green identity.
