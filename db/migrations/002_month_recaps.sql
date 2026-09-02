CREATE TABLE IF NOT EXISTS month_recaps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  month TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  CONSTRAINT month_recaps_user_month_key UNIQUE (user_id, month),
  CONSTRAINT month_recaps_month_format CHECK (month ~ '^\d{4}-\d{2}$')
);

CREATE INDEX IF NOT EXISTS month_recaps_user_updated_idx
  ON month_recaps (user_id, updated_at);

ALTER TABLE month_recaps ENABLE ROW LEVEL SECURITY;
