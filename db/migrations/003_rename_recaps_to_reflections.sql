-- Rename month_recaps to month_reflections for consistency with UI naming
ALTER TABLE IF EXISTS month_recaps RENAME TO month_reflections;
ALTER INDEX IF EXISTS month_recaps_user_updated_idx RENAME TO month_reflections_user_updated_idx;
ALTER TABLE IF EXISTS month_reflections DROP CONSTRAINT IF EXISTS month_recaps_user_month_key;
ALTER TABLE IF EXISTS month_reflections ADD CONSTRAINT month_reflections_user_month_key UNIQUE (user_id, month);
ALTER TABLE IF EXISTS month_reflections DROP CONSTRAINT IF EXISTS month_recaps_month_format;
ALTER TABLE IF EXISTS month_reflections ADD CONSTRAINT month_reflections_month_format CHECK (month ~ '^\d{4}-\d{2}$');
