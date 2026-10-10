BEGIN;
CREATE TABLE IF NOT EXISTS account_settings (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 profile jsonb NOT NULL DEFAULT '{}', display jsonb NOT NULL DEFAULT '{}',
 handoff jsonb NOT NULL DEFAULT '{}', notifications jsonb NOT NULL DEFAULT '{}',
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE account_settings ADD COLUMN IF NOT EXISTS sessions_revoked_before timestamptz;
ALTER TABLE account_settings ADD COLUMN IF NOT EXISTS retained_session_id uuid;
CREATE TABLE IF NOT EXISTS account_project_state (
 plan_id uuid PRIMARY KEY REFERENCES plans(id) ON DELETE CASCADE,
 favorite boolean NOT NULL DEFAULT false, archived boolean NOT NULL DEFAULT false,
 last_opened_at timestamptz, generation_settings jsonb, generation_input jsonb
);
CREATE TABLE IF NOT EXISTS account_library (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('brief','template','reference')), title text NOT NULL,
 content text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_library_owner ON account_library(user_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS account_activity (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 plan_id uuid REFERENCES plans(id) ON DELETE SET NULL, kind text NOT NULL, title text NOT NULL,
 notification boolean NOT NULL DEFAULT false, read_at timestamptz, dedupe_key text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_activity_owner ON account_activity(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS account_token_policy (
 token_hash text PRIMARY KEY REFERENCES tokens(token_hash) ON DELETE CASCADE,
 expires_at timestamptz, last_used_at timestamptz, access text NOT NULL DEFAULT 'write' CHECK(access IN ('read','write')),
 project_ids jsonb NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS account_sessions (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 device text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS account_sessions_owner ON account_sessions(user_id, last_seen_at DESC);
ALTER TABLE account_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_project_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_token_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_sessions ENABLE ROW LEVEL SECURITY;
COMMIT;
