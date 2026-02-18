import { getSql } from "@/lib/db";
import {
  generateInterviewToken,
  getTokenTimestamps,
  isTokenExpired,
} from "@/lib/utils/interview-token";

export interface CreateCandidateWithInvitePayload {
  name: string;
  email: string;
  phone?: string;
  position?: string;
  atsScore?: number;
  skills?: string;
  experienceYears?: number;
  education?: string;
  atsExplanation?: string;
  matchedRoleId?: string;
  matchPercentage?: number;
  matchReasoning?: string;
  resumeLink?: string;
}

export interface CandidateWithToken {
  id: string;
  name: string;
  email: string;
  token: string;
  tokenCreatedAt: Date;
  tokenExpiresAt: Date;
  phone?: string | null;
  position?: string | null;
  atsScore?: number | null;
  skills?: string | null;
  experienceYears?: number | null;
  education?: string | null;
}

export interface TokenValidationResult {
  valid: boolean;
  expired?: boolean;
  candidate?: CandidateWithToken;
  error?: string;
}

function toCandidateWithToken(row: {
  id: string;
  name: string;
  email: string;
  token: string | null;
  token_created_at: Date | string | null;
  token_expires_at: Date | string | null;
  phone?: string | null;
  position?: string | null;
  ats_score?: number | null;
  skills?: string | null;
  experience_years?: number | null;
  education?: string | null;
}): CandidateWithToken | null {
  if (!row || !row.token) return null;
  const tokenCreatedAt =
    row.token_created_at instanceof Date
      ? row.token_created_at
      : row.token_created_at
        ? new Date(row.token_created_at)
        : new Date(0);
  const tokenExpiresAt =
    row.token_expires_at instanceof Date
      ? row.token_expires_at
      : row.token_expires_at
        ? new Date(row.token_expires_at)
        : new Date(0);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    token: row.token,
    tokenCreatedAt,
    tokenExpiresAt,
    phone: row.phone ?? null,
    position: row.position ?? null,
    atsScore: row.ats_score ?? null,
    skills: row.skills ?? null,
    experienceYears: row.experience_years ?? null,
    education: row.education ?? null,
  };
}

/**
 * Create a candidate with a generated interview token and timestamps.
 * Retries token generation if uniqueness collision (unlikely).
 */
export async function createCandidateWithInvite(
  payload: CreateCandidateWithInvitePayload
): Promise<{ data: CandidateWithToken | null; error: string | null }> {
  const sql = getSql();
  if (!sql) return { data: null, error: "Database not configured." };

  const {
    name,
    email,
    phone,
    position,
    atsScore,
    skills,
    experienceYears,
    education,
    atsExplanation,
    matchedRoleId,
    matchPercentage,
    matchReasoning,
    resumeLink,
  } = payload;

  if (!name?.trim()) return { data: null, error: "Name is required." };
  if (!email?.trim()) return { data: null, error: "Email is required." };

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await sql`SELECT id, token, token_expires_at FROM candidates WHERE LOWER(email) = ${normalizedEmail} AND token IS NOT NULL ORDER BY token_created_at DESC NULLS LAST LIMIT 1`;
  if (existing.length > 0) {
    const row = existing[0] as { token: string | null; token_expires_at: Date | string | null };
    if (row.token && !isTokenExpired(row.token_expires_at)) {
      return { data: null, error: "An active interview link already exists for this email." };
    }
  }

  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const token = generateInterviewToken();
    const { tokenCreatedAt, tokenExpiresAt } = getTokenTimestamps();

    try {
      const existing = await sql`SELECT 1 FROM candidates WHERE token = ${token} LIMIT 1`;
      if (existing.length > 0) continue;

      const atsVal = typeof atsScore === "number" ? Math.round(atsScore) : null;

      const resumeLinkVal = resumeLink?.trim() || null;
      const inserted = await sql`
        INSERT INTO candidates (
          name, email, phone, position, ats_score, interview_score, status,
          interview_date, token, token_created_at, token_expires_at,
          skills, experience_years, education, ats_explanation,
          matched_role_id, match_percentage, match_reasoning,
          resume_link, resume_uploaded_at
        )
        VALUES (
          ${name.trim()}, ${email.trim().toLowerCase()}, ${phone?.trim() ?? null},
          ${position?.trim() ?? "Unassigned"}, ${atsVal}, ${null}, ${"pending"},
          ${null}, ${token}, ${tokenCreatedAt}, ${tokenExpiresAt},
          ${skills?.trim() ?? null}, ${typeof experienceYears === "number" ? experienceYears : null},
          ${education?.trim() ?? null}, ${atsExplanation?.trim() ?? null},
          ${matchedRoleId?.trim() ?? null}, ${typeof matchPercentage === "number" ? matchPercentage : null},
          ${matchReasoning?.trim() ?? null},
          ${resumeLinkVal}, ${resumeLinkVal ? new Date() : null}
        )
        RETURNING id
      `;
      const id = inserted[0]?.id ? String(inserted[0].id) : "";

      const candidate: CandidateWithToken = {
        id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        token,
        tokenCreatedAt,
        tokenExpiresAt,
        phone: phone?.trim() ?? null,
        position: position?.trim() ?? "Unassigned",
        atsScore: atsVal,
        skills: skills?.trim() ?? null,
        experienceYears: typeof experienceYears === "number" ? experienceYears : null,
        education: education?.trim() ?? null,
      };
      return { data: candidate, error: null };
    } catch (err) {
      console.error("createCandidateWithInvite:", err);
      if (attempt === maxRetries - 1) {
        return { data: null, error: "Failed to create candidate." };
      }
    }
  }
  return { data: null, error: "Failed to generate unique token." };
}

/**
 * Get candidate by interview token and validate expiry.
 */
export async function getCandidateByInterviewToken(
  token: string
): Promise<TokenValidationResult> {
  const sql = getSql();
  if (!sql) return { valid: false, error: "Database not configured." };
  if (!token?.trim()) return { valid: false, error: "Invalid or expired interview link." };

  try {
    const rows = await sql`
      SELECT id, name, email, token, token_created_at, token_expires_at,
             phone, position, ats_score, skills, experience_years, education
      FROM candidates
      WHERE token = ${token.trim()}
      LIMIT 1
    `;
    const row = rows[0] as {
      id: string;
      name: string;
      email: string;
      token: string | null;
      token_created_at: Date | string | null;
      token_expires_at: Date | string | null;
      phone?: string | null;
      position?: string | null;
      ats_score?: number | null;
      skills?: string | null;
      experience_years?: number | null;
      education?: string | null;
    } | undefined;
    if (!row) return { valid: false, error: "Invalid or expired interview link." };

    const candidate = toCandidateWithToken(row);
    if (!candidate) return { valid: false, error: "Invalid or expired interview link." };

    if (isTokenExpired(candidate.tokenExpiresAt)) {
      return { valid: false, expired: true, error: "This interview link has expired." };
    }

    return { valid: true, candidate };
  } catch (err) {
    console.error("getCandidateByInterviewToken:", err);
    return { valid: false, error: "Invalid or expired interview link." };
  }
}

/**
 * Check if a candidate already has a completed recording (for idempotent upload retries).
 */
export async function isRecordingAlreadyCompleted(token: string): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  if (!token?.trim()) return false;
  try {
    const rows = await sql`
      SELECT 1 FROM candidates
      WHERE token = ${token.trim()} AND interview_recording_status = 'completed'
      LIMIT 1
    `;
    return rows.length > 0;
  } catch {
    return false;
  }
}

export interface MarkRecordingFailedParams {
  token: string;
  reason: string;
}

export interface CompleteRecordingParams {
  token: string;
  interviewLink: string;
}

export interface RecordingUpdateResult {
  ok: boolean;
  error?: string;
}

/**
 * Mark interview recording as failed. Updates exactly one candidate by token.
 */
export async function markInterviewRecordingFailed({
  token,
  reason,
}: MarkRecordingFailedParams): Promise<RecordingUpdateResult> {
  const sql = getSql();
  if (!sql) return { ok: false, error: "Database not configured." };
  if (!token?.trim()) return { ok: false, error: "Invalid token." };

  const validation = await getCandidateByInterviewToken(token.trim());
  if (!validation.valid || !validation.candidate) {
    return { ok: false, error: validation.error ?? "Invalid or expired interview link." };
  }

  try {
    const result = await sql`
      UPDATE candidates
      SET interview_recording_status = 'failed',
          interview_recording_failed_reason = ${reason ?? "Unknown"}
      WHERE token = ${token.trim()}
      RETURNING id
    `;
    if (!result?.length) return { ok: false, error: "Candidate not found." };
    return { ok: true };
  } catch (err) {
    console.error("markInterviewRecordingFailed:", err);
    return { ok: false, error: "Failed to update recording status." };
  }
}

/**
 * Complete interview recording and persist uploaded video URL.
 * Updates exactly one candidate by token. Only updates if upload succeeded.
 */
export async function completeInterviewRecording({
  token,
  interviewLink,
}: CompleteRecordingParams): Promise<RecordingUpdateResult> {
  const sql = getSql();
  if (!sql) return { ok: false, error: "Database not configured." };
  if (!token?.trim()) return { ok: false, error: "Invalid token." };
  if (!interviewLink?.trim()) return { ok: false, error: "Interview link URL is required." };

  const validation = await getCandidateByInterviewToken(token.trim());
  if (!validation.valid || !validation.candidate) {
    return { ok: false, error: validation.error ?? "Invalid or expired interview link." };
  }

  try {
    const result = await sql`
      UPDATE candidates
      SET "Interview_Link" = ${interviewLink.trim()},
          interview_recording_status = 'completed',
          interview_recording_failed_reason = NULL,
          interview_recording_uploaded_at = NOW(),
          status = 'completed'
      WHERE token = ${token.trim()}
      RETURNING id
    `;
    if (!result?.length) return { ok: false, error: "Candidate not found." };
    return { ok: true };
  } catch (err) {
    console.error("completeInterviewRecording:", err);
    const message = err instanceof Error ? err.message : "Failed to save recording URL.";
    return { ok: false, error: message };
  }
}

/**
 * Complete interview without recording (bypass for testing).
 * Updates status and recording fields; Interview_Link remains null.
 */
export async function completeInterviewWithoutRecording(
  token: string
): Promise<RecordingUpdateResult> {
  const sql = getSql();
  if (!sql) return { ok: false, error: "Database not configured." };
  if (!token?.trim()) return { ok: false, error: "Invalid token." };

  const validation = await getCandidateByInterviewToken(token.trim());
  if (!validation.valid || !validation.candidate) {
    return { ok: false, error: validation.error ?? "Invalid or expired interview link." };
  }

  try {
    const result = await sql`
      UPDATE candidates
      SET "Interview_Link" = NULL,
          interview_recording_status = 'completed',
          interview_recording_failed_reason = NULL,
          interview_recording_uploaded_at = NOW(),
          status = 'completed'
      WHERE token = ${token.trim()}
      RETURNING id
    `;
    if (!result?.length) return { ok: false, error: "Candidate not found." };
    return { ok: true };
  } catch (err) {
    console.error("completeInterviewWithoutRecording:", err);
    return { ok: false, error: "Failed to complete interview." };
  }
}
