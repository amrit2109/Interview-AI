import { getSql } from "@/lib/db";
import { getJobDescriptions } from "./jobs.service";

export interface CandidateAdmin {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  position: string;
  atsScore: number | null;
  interviewScore: number | null;
  status: string;
  interviewDate: Date | string | null;
  token: string | null;
  tokenCreatedAt: string | Date | null;
  tokenExpiresAt: string | Date | null;
  skills: string | null;
  experienceYears: number | null;
  education: string | null;
  atsExplanation: string | null;
  matchedRoleId: string | null;
  matchPercentage: number | null;
  matchReasoning: string | null;
}

export interface Report {
  candidateId: string;
  atsScore: number | null;
  interviewScore: number | null;
  strengths: string[];
  risks: string[];
  recommendation: string | null;
}

function toCandidate(row: Record<string, unknown> | null): CandidateAdmin | null {
  if (!row) return null;
  const tokenCreatedAt: string | Date | null =
    row.token_created_at instanceof Date
      ? row.token_created_at.toISOString()
      : (row.token_created_at as string | null) ?? null;
  const tokenExpiresAt: string | Date | null =
    row.token_expires_at instanceof Date
      ? row.token_expires_at.toISOString()
      : (row.token_expires_at as string | null) ?? null;
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    phone: row.phone != null ? String(row.phone) : null,
    position: String(row.position ?? "Unassigned"),
    atsScore: row.ats_score != null ? Number(row.ats_score) : null,
    interviewScore: row.interview_score != null ? Number(row.interview_score) : null,
    status: String(row.status ?? "pending"),
    interviewDate: (row.interview_date ?? null) as Date | string | null,
    token: row.token != null ? String(row.token) : null,
    tokenCreatedAt: tokenCreatedAt ?? null,
    tokenExpiresAt: tokenExpiresAt ?? null,
    skills: row.skills != null ? String(row.skills) : null,
    experienceYears: row.experience_years != null ? Number(row.experience_years) : null,
    education: row.education != null ? String(row.education) : null,
    atsExplanation: row.ats_explanation != null ? String(row.ats_explanation) : null,
    matchedRoleId: row.matched_role_id != null ? String(row.matched_role_id) : null,
    matchPercentage: row.match_percentage != null ? Number(row.match_percentage) : null,
    matchReasoning: row.match_reasoning != null ? String(row.match_reasoning) : null,
  };
}

function safeParseJson(val: unknown, fallback: string[] = []): string[] {
  if (Array.isArray(val)) return val as string[];
  if (typeof val !== "string") return fallback;
  try {
    const parsed = JSON.parse(val || "[]");
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function toReport(row: Record<string, unknown> | null): Report | null {
  if (!row) return null;
  const strengths = Array.isArray(row.strengths) ? row.strengths : row.strengths ?? [];
  const risks = Array.isArray(row.risks) ? row.risks : row.risks ?? [];
  return {
    candidateId: String(row.candidate_id),
    atsScore: row.ats_score != null ? Number(row.ats_score) : null,
    interviewScore: row.interview_score != null ? Number(row.interview_score) : null,
    strengths: strengths as string[],
    risks: risks as string[],
    recommendation: row.recommendation != null ? String(row.recommendation) : null,
  };
}

export async function getCandidates(): Promise<{ data: CandidateAdmin[]; error: string | null }> {
  const sql = getSql();
  if (!sql) return { data: [], error: "Database not configured." };
  try {
    const rows = await sql`SELECT * FROM candidates ORDER BY interview_date DESC NULLS LAST, id`;
    return { data: rows.map((r) => toCandidate(r)).filter(Boolean) as CandidateAdmin[], error: null };
  } catch (err) {
    console.error("getCandidates:", err);
    return { data: [], error: "Failed to fetch candidates." };
  }
}

export async function getCandidateById(id: string): Promise<{ data: CandidateAdmin | null; error: string | null }> {
  const sql = getSql();
  if (!sql) return { data: null, error: "Database not configured." };
  try {
    const rows = await sql`SELECT * FROM candidates WHERE id = ${id} LIMIT 1`;
    const row = rows[0];
    return { data: row ? toCandidate(row) : null, error: null };
  } catch (err) {
    console.error("getCandidateById:", err);
    return { data: null, error: "Failed to fetch candidate." };
  }
}

export async function deleteCandidateById({
  candidate_id,
}: {
  candidate_id: string | number;
}): Promise<{ ok: boolean; deleted_id?: string; error_message?: string }> {
  const sql = getSql();
  if (!sql) return { ok: false, error_message: "Database not configured." };
  const id = candidate_id == null ? null : String(candidate_id).trim();
  if (!id) return { ok: false, error_message: "Candidate ID is required." };
  try {
    const result = await sql`DELETE FROM candidates WHERE id = ${id} RETURNING id`;
    if (!result?.length) return { ok: false, error_message: "Candidate not found or already deleted." };
    return { ok: true, deleted_id: String(result[0]?.id) };
  } catch (err) {
    console.error("deleteCandidateById:", err);
    return { ok: false, error_message: "Failed to delete candidate." };
  }
}

export async function getCandidateReport(id: string): Promise<{ data: Report | null; error: string | null }> {
  const sql = getSql();
  if (!sql) return { data: null, error: "Database not configured." };
  try {
    const rows = await sql`SELECT * FROM reports WHERE candidate_id = ${id} LIMIT 1`;
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return { data: null, error: null };
    const strengths = safeParseJson(row.strengths, []);
    const risks = safeParseJson(row.risks, []);
    return { data: toReport({ ...row, strengths, risks }), error: null };
  } catch (err) {
    console.error("getCandidateReport:", err);
    return { data: null, error: "Failed to fetch report." };
  }
}

export async function createCandidateMock(payload: {
  name?: string;
  email?: string;
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
}): Promise<{ data: CandidateAdmin | null; error: string | null }> {
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
  } = payload ?? {};
  if (!name?.trim()) return { data: null, error: "Name is required." };
  if (!email?.trim()) return { data: null, error: "Email is required." };
  try {
    const atsVal = typeof atsScore === "number" ? Math.round(atsScore) : null;
    const result = await sql`
      INSERT INTO candidates (name, email, phone, position, ats_score, interview_score, status, interview_date, token, skills, experience_years, education, ats_explanation, matched_role_id, match_percentage, match_reasoning)
      VALUES (${name.trim()}, ${email.trim()}, ${phone?.trim() ?? null}, ${position?.trim() ?? "Unassigned"}, ${atsVal}, ${null}, ${"pending"}, ${null}, ${null}, ${skills?.trim() ?? null}, ${typeof experienceYears === "number" ? experienceYears : null}, ${education?.trim() ?? null}, ${atsExplanation?.trim() ?? null}, ${matchedRoleId?.trim() ?? null}, ${typeof matchPercentage === "number" ? matchPercentage : null}, ${matchReasoning?.trim() ?? null})
      RETURNING id
    `;
    const id = result[0]?.id ? String(result[0].id) : "";
    return {
      data: {
        id,
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() ?? null,
        position: position?.trim() ?? "Unassigned",
        atsScore: atsVal,
        interviewScore: null,
        status: "pending",
        interviewDate: null,
        token: null,
        tokenCreatedAt: null,
        tokenExpiresAt: null,
        skills: skills?.trim() ?? null,
        experienceYears: typeof experienceYears === "number" ? experienceYears : null,
        education: education?.trim() ?? null,
        atsExplanation: atsExplanation?.trim() ?? null,
        matchedRoleId: matchedRoleId?.trim() ?? null,
        matchPercentage: typeof matchPercentage === "number" ? matchPercentage : null,
        matchReasoning: matchReasoning?.trim() ?? null,
      },
      error: null,
    };
  } catch (err) {
    console.error("createCandidateMock:", err);
    return { data: null, error: "Failed to create candidate." };
  }
}

export async function analyzeCandidateResumeMock(
  file: File | null
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  if (!file) return { data: null, error: "No file selected." };
  const { data: jds } = await getJobDescriptions();
  const mockParsed = {
    name: "Alex Johnson",
    email: "alex.johnson@example.com",
    phone: "+91 98765 43210",
    experience: "5 years",
    skills: "React, Node.js, TypeScript, AWS",
    education: "B.S. Computer Science",
  };
  const atsScore = 8.2;
  const skills = "React, Node.js, TypeScript, AWS".toLowerCase().split(/,\s*/);
  const scored = (jds || []).map((jd) => {
    const text = `${jd.jobName} ${jd.description}`.toLowerCase();
    const matches = skills.filter((s) => text.includes(s)).length;
    return { jd, score: matches };
  });
  const best = scored.sort((a, b) => b.score - a.score)[0];
  const bestRole = best?.score > 0 ? best.jd : jds?.[0] ?? null;
  return {
    data: {
      ...mockParsed,
      atsScore,
      bestRole: bestRole ? { id: bestRole.id, jobName: bestRole.jobName } : null,
    },
    error: null,
  };
}
