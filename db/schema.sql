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
