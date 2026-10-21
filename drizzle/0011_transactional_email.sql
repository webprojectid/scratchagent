CREATE TABLE IF NOT EXISTS email_login_challenges (
  session_id uuid PRIMARY KEY,
  auth_user_id uuid NOT NULL,
  code_hash text NOT NULL,
  nonce uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  verified_at timestamptz
);
CREATE INDEX IF NOT EXISTS email_login_challenges_owner ON email_login_challenges(auth_user_id, sent_at);
ALTER TABLE email_login_challenges ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL CONSTRAINT email_outbox_user_id_users_id_fk REFERENCES users(id) ON DELETE CASCADE,
  dedupe_key text NOT NULL CONSTRAINT email_outbox_dedupe_key_unique UNIQUE,
  kind text NOT NULL CHECK (kind IN ('pro_active','pro_expiry','unfinished_plans')),
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','cancelled','failed','uncertain')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  leased_at timestamptz,
  first_attempt_at timestamptz,
  ambiguous boolean NOT NULL DEFAULT false,
  sent_at timestamptz,
  provider_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_outbox_pending ON email_outbox(status, available_at);
ALTER TABLE email_outbox ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS email_daily_budget (
  day date PRIMARY KEY,
  total integer NOT NULL DEFAULT 0,
  reminders integer NOT NULL DEFAULT 0
);
ALTER TABLE email_daily_budget ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS email_otp_send_limits (
  auth_user_id uuid NOT NULL,
  hour timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  CONSTRAINT email_otp_send_limits_auth_user_id_hour_pk PRIMARY KEY (auth_user_id, hour)
);
ALTER TABLE email_otp_send_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON email_login_challenges, email_outbox, email_daily_budget, email_otp_send_limits FROM PUBLIC, anon, authenticated;
