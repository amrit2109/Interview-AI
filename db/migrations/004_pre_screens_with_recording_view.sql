-- Migration: Create view joining pre_screens with candidates for recording URL.
-- Single source of truth: candidates."Interview_Link" stores R2 video URL.

CREATE OR REPLACE VIEW pre_screens_with_recording AS
SELECT
  ps.id,
  ps.token,
  ps.experience_years,
  ps.current_ctc,
  ps.expected_ctc,
  ps.relocate_to_mohali,
  ps.submitted_at,
  c."Interview_Link" AS recording_url,
  c.id AS candidate_id,
  c.name AS candidate_name,
  c.email AS candidate_email
FROM pre_screens ps
LEFT JOIN candidates c ON c.token = ps.token;
