-- Anonymous quiz submissions. No name, contact details or IP address are stored.
CREATE TABLE IF NOT EXISTS responses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answers       smallint[] NOT NULL,
  cat1_score    smallint NOT NULL,
  cat2_score    smallint NOT NULL,
  cat3_score    smallint NOT NULL,
  percent_score smallint NOT NULL,
  band          text NOT NULL CHECK (band IN ('critical', 'warning', 'safe')),
  safety_flag   boolean NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS responses_created_at_idx ON responses (created_at DESC);

-- One-time passwords that approve a settings change while TWO_FACTOR_AUTHEN is on.
-- payload is the pending change as JSON. Only a keyed hash of the code is stored.
CREATE TABLE IF NOT EXISTS otp_challenges (
  id          uuid PRIMARY KEY,
  payload     text NOT NULL,
  code_hash   text NOT NULL,
  attempts    smallint NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  consumed_at timestamptz
);

CREATE INDEX IF NOT EXISTS otp_challenges_created_at_idx ON otp_challenges (created_at DESC);

-- Application settings edited in the backoffice. A missing row means the built-in default is used.
CREATE TABLE IF NOT EXISTS settings (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Wrong administrator passwords typed on the settings forms. One row, so the count is shared by everyone.
-- Tries are counted before the password is compared, so a burst of parallel guesses cannot beat the limit.
CREATE TABLE IF NOT EXISTS password_failures (
  id                smallint PRIMARY KEY CHECK (id = 1),
  attempts          integer NOT NULL,
  window_started_at timestamptz NOT NULL,
  locked_until      timestamptz
);

-- Wrong logins at the backoffice prompt (HTTP Basic), counted the same way and kept in one row. The middleware asks
-- /api/auth/check, which counts each try before the password is compared and locks the login for a while.
CREATE TABLE IF NOT EXISTS login_failures (
  id                smallint PRIMARY KEY CHECK (id = 1),
  attempts          integer NOT NULL,
  window_started_at timestamptz NOT NULL,
  locked_until      timestamptz
);
