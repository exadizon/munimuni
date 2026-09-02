CREATE TABLE IF NOT EXISTS year_reflections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  year TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  CONSTRAINT year_reflections_user_year_key UNIQUE (user_id, year),
  CONSTRAINT year_reflections_year_format CHECK (year ~ '^\d{4}$')
);

CREATE INDEX IF NOT EXISTS year_reflections_user_updated_idx
  ON year_reflections (user_id, updated_at);

ALTER TABLE year_reflections ENABLE ROW LEVEL SECURITY;
