-- Migration: Use DB-managed sequences for candidates.id and job_descriptions.id.
-- Eliminates race conditions from MAX(id)+1 pattern.
-- Run before deploying app code that relies on DEFAULT id.

-- Candidates sequence
CREATE SEQUENCE IF NOT EXISTS candidates_id_seq;

-- Initialize from current max (only numeric IDs)
DO $$
DECLARE
  max_val INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) INTO max_val
  FROM candidates
  WHERE id ~ '^[0-9]+$';
  PERFORM setval('candidates_id_seq', max_val);
END $$;

ALTER TABLE candidates
  ALTER COLUMN id SET DEFAULT nextval('candidates_id_seq')::text;

-- Job descriptions sequence
CREATE SEQUENCE IF NOT EXISTS job_descriptions_id_seq;

DO $$
DECLARE
  max_val INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) INTO max_val
  FROM job_descriptions
  WHERE id ~ '^[0-9]+$';
  PERFORM setval('job_descriptions_id_seq', max_val);
END $$;

ALTER TABLE job_descriptions
  ALTER COLUMN id SET DEFAULT nextval('job_descriptions_id_seq')::text;
