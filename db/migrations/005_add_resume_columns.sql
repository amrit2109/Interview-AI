-- Migration: Add resume URL and upload timestamp columns to candidates.
-- Stores admin-uploaded resume link (R2) and audit field.

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_link TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_uploaded_at TIMESTAMPTZ;
