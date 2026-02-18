import { sql } from "@/lib/db";
import { getCandidateByInterviewToken } from "./candidate.service";

export interface PreScreenData {
  token: string;
  experienceYears: string | null;
  currentCtc: string | null;
  expectedCtc: string | null;
  relocateToMohali: string | null;
  submittedAt: Date | string;
}

export async function submitPreScreen(
  token: string,
  data: {
    experienceYears?: string;
    currentCtc?: string;
    expectedCtc?: string;
    relocateToMohali?: string;
  }
): Promise<{ data: PreScreenData | null; error: string | null }> {
  if (!sql) return { data: null, error: "Database not configured." };
  try {
    const { valid, error: tokenError } = await getCandidateByInterviewToken(token);
    if (!valid || tokenError) {
      return { data: null, error: tokenError ?? "Invalid or expired interview link." };
    }
    const { experienceYears, currentCtc, expectedCtc, relocateToMohali } = data ?? {};
    const result = await sql`
      INSERT INTO pre_screens (token, experience_years, current_ctc, expected_ctc, relocate_to_mohali)
      VALUES (${token}, ${experienceYears ?? null}, ${currentCtc ?? null}, ${expectedCtc ?? null}, ${relocateToMohali ?? null})
      RETURNING token, experience_years, current_ctc, expected_ctc, relocate_to_mohali, submitted_at
    `;
    const row = result[0] as {
      token: string;
      experience_years: string | null;
      current_ctc: string | null;
      expected_ctc: string | null;
      relocate_to_mohali: string | null;
      submitted_at: Date | string;
    };
    return {
      data: {
        token: row.token,
        experienceYears: row.experience_years,
        currentCtc: row.current_ctc,
        expectedCtc: row.expected_ctc,
        relocateToMohali: row.relocate_to_mohali,
        submittedAt: row.submitted_at,
      },
      error: null,
    };
  } catch (err) {
    console.error("submitPreScreen:", err);
    return { data: null, error: "Failed to submit pre-screening." };
  }
}

export async function getPreScreen(token: string): Promise<{ data: PreScreenData | null; error: string | null }> {
  if (!sql) return { data: null, error: "Database not configured." };
  try {
    const { valid } = await getCandidateByInterviewToken(token);
    if (!valid) {
      return { data: null, error: "Invalid or expired interview link." };
    }
    const rows = await sql`
      SELECT token, experience_years, current_ctc, expected_ctc, relocate_to_mohali, submitted_at
      FROM pre_screens WHERE token = ${token}
      ORDER BY submitted_at DESC LIMIT 1
    `;
    const row = rows[0] as {
      token: string;
      experience_years: string | null;
      current_ctc: string | null;
      expected_ctc: string | null;
      relocate_to_mohali: string | null;
      submitted_at: Date | string;
    } | undefined;
    if (!row) return { data: null, error: null };
    return {
      data: {
        token: row.token,
        experienceYears: row.experience_years,
        currentCtc: row.current_ctc,
        expectedCtc: row.expected_ctc,
        relocateToMohali: row.relocate_to_mohali,
        submittedAt: row.submitted_at,
      },
      error: null,
    };
  } catch (err) {
    console.error("getPreScreen:", err);
    return { data: null, error: "Failed to fetch pre-screening." };
  }
}
