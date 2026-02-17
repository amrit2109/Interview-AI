-- Migration: Add token_created_at and token_expires_at to candidates for interview link expiry.
-- Run this if your candidates table was created with the old schema (token REFERENCES interviews).

-- Drop FK constraint on candidates.token (candidates are now source of truth for interview tokens)
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_token_fkey;

-- Drop FK constraint on pre_screens.token (pre_screens now stores candidate tokens, not interview tokens)
ALTER TABLE pre_screens DROP CONSTRAINT IF EXISTS pre_screens_token_fkey;

-- Add token lifecycle columns if not present
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS token_created_at TIMESTAMPTZ;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Index for expiry checks
CREATE INDEX IF NOT EXISTS idx_candidates_token_expires_at ON candidates(token_expires_at);
