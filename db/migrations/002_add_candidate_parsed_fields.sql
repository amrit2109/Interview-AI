-- Migration: Add parsed resume and match metadata to candidates
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS skills TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS experience_years INTEGER;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS ats_explanation TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS matched_role_id TEXT REFERENCES job_descriptions(id);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS match_percentage INTEGER;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS match_reasoning TEXT;
