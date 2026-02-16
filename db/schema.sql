-- Orion TalentIQ Schema for Neon PostgreSQL
-- Run in Neon SQL Editor or via psql

-- Admins (for admin dashboard login)
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin'
);

-- Job descriptions (roles and openings)
CREATE TABLE IF NOT EXISTS job_descriptions (
  id TEXT PRIMARY KEY,
  job_name TEXT NOT NULL,
  description TEXT NOT NULL,
  openings INTEGER NOT NULL DEFAULT 1
);

-- Interview questions (global pool)
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL
);

-- Interviews (token-indexed, one per invite link)
CREATE TABLE IF NOT EXISTS interviews (
  token TEXT PRIMARY KEY,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  department TEXT NOT NULL,
  interview_type TEXT NOT NULL,
  estimated_duration TEXT NOT NULL,
  status TEXT NOT NULL,
  instructions JSONB NOT NULL DEFAULT '[]',
  expires_at TIMESTAMPTZ NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 5
);

CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);

-- Candidates
CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  position TEXT NOT NULL DEFAULT 'Unassigned',
  ats_score INTEGER,
  interview_score INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  interview_date DATE,
  token TEXT REFERENCES interviews(token)
);

CREATE INDEX IF NOT EXISTS idx_candidates_token ON candidates(token);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);

-- Reports (1:1 with candidates, created after interview)
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  ats_score INTEGER,
  interview_score INTEGER,
  strengths JSONB NOT NULL DEFAULT '[]',
  risks JSONB NOT NULL DEFAULT '[]',
  recommendation TEXT NOT NULL,
  UNIQUE(candidate_id)
);

-- Pre-screening responses (per interview token)
CREATE TABLE IF NOT EXISTS pre_screens (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL REFERENCES interviews(token),
  experience_years TEXT,
  current_ctc TEXT,
  expected_ctc TEXT,
  relocate_to_mohali TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pre_screens_token ON pre_screens(token);
