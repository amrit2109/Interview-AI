-- Migration: Evaluation override and audit fields.
-- Supports manual score override and retention metadata.

ALTER TABLE interview_evaluations ADD COLUMN IF NOT EXISTS override_score NUMERIC(3,1) CHECK (override_score IS NULL OR (override_score >= 0 AND override_score <= 10));
ALTER TABLE interview_evaluations ADD COLUMN IF NOT EXISTS override_reason TEXT;
ALTER TABLE interview_evaluations ADD COLUMN IF NOT EXISTS override_at TIMESTAMPTZ;
ALTER TABLE interview_evaluations ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1));
