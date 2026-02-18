-- Migration: Add interview recording URL and status columns to candidates.
-- Stores uploaded screen recording URL and audit fields for recording lifecycle.

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS "Interview_Link" TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS interview_recording_status TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS interview_recording_failed_reason TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS interview_recording_uploaded_at TIMESTAMPTZ;
