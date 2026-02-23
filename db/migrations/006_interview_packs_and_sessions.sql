-- Migration: Interview packs, sessions, turns, and evaluations.
-- Backward compatible: candidates without pack_id use legacy global questions.

-- Interview packs (frozen per candidate, generated at admin resume analysis)
CREATE TABLE IF NOT EXISTS interview_packs (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_role_id TEXT NOT NULL REFERENCES job_descriptions(id),
  job_role_name TEXT NOT NULL,
  selected_skills JSONB NOT NULL DEFAULT '[]',
  rubric_weights JSONB,
  max_follow_ups_per_question INTEGER NOT NULL DEFAULT 1,
  model_name TEXT,
  prompt_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_packs_candidate_id ON interview_packs(candidate_id);

-- Pack questions (one per selected skill)
CREATE TABLE IF NOT EXISTS interview_pack_questions (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL REFERENCES interview_packs(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  question TEXT NOT NULL,
  follow_up_question TEXT,
  expected_signals JSONB DEFAULT '[]',
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_interview_pack_questions_pack_id ON interview_pack_questions(pack_id);

-- Link candidates to their pack (nullable for backward compatibility)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS interview_pack_id TEXT REFERENCES interview_packs(id);

-- Interview sessions (one per token/session)
CREATE TABLE IF NOT EXISTS interview_sessions (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  pack_id TEXT REFERENCES interview_packs(id) ON DELETE SET NULL,
  current_question_index INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  recording_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_token ON interview_sessions(token);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_pack_id ON interview_sessions(pack_id);

-- Interview turns (per-question answers)
CREATE TABLE IF NOT EXISTS interview_turns (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  is_follow_up BOOLEAN NOT NULL DEFAULT false,
  candidate_answer TEXT,
  transcript_chunk TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  unanswered BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_interview_turns_session_id ON interview_turns(session_id);

-- Interview evaluations (post-submit AI scoring)
CREATE TABLE IF NOT EXISTS interview_evaluations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  overall_score NUMERIC(3,1) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 10),
  per_question JSONB NOT NULL DEFAULT '[]',
  strengths JSONB NOT NULL DEFAULT '[]',
  risks JSONB NOT NULL DEFAULT '[]',
  recommendation TEXT,
  unanswered_count INTEGER NOT NULL DEFAULT 0,
  model_name TEXT,
  prompt_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id)
);

CREATE INDEX IF NOT EXISTS idx_interview_evaluations_candidate_id ON interview_evaluations(candidate_id);
