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

-- One-time passwords that approve a settings change. Only a keyed hash of the code is stored.
CREATE TABLE IF NOT EXISTS otp_challenges (
  id          uuid PRIMARY KEY,
  action      text NOT NULL CHECK (action IN ('set_line_url', 'reset_line_url')),
  payload     text,
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
