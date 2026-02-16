/**
 * Data API layer. Uses Neon PostgreSQL.
 * Preserves API shape for compatibility with existing consumers.
 */

import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";

function toInterview(row) {
  if (!row) return null;
  const expiresAt = row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at;
  const instructions = Array.isArray(row.instructions) ? row.instructions : (typeof row.instructions === "string" ? JSON.parse(row.instructions || "[]") : (row.instructions ?? []));
  return {
    token: row.token,
    jobTitle: row.job_title,
    company: row.company,
    department: row.department,
    interviewType: row.interview_type,
    estimatedDuration: row.estimated_duration,
    status: row.status,
    instructions,
    expiresAt,
    questionCount: row.question_count,
  };
}

function toCandidate(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    position: row.position,
    atsScore: row.ats_score,
    interviewScore: row.interview_score,
    status: row.status,
    interviewDate: row.interview_date,
    token: row.token,
  };
}

function toJobDescription(row) {
  if (!row) return null;
  return {
    id: row.id,
    jobName: row.job_name,
    description: row.description,
    openings: row.openings,
  };
}

function toReport(row) {
  if (!row) return null;
  return {
    candidateId: row.candidate_id,
    atsScore: row.ats_score,
    interviewScore: row.interview_score,
    strengths: Array.isArray(row.strengths) ? row.strengths : (row.strengths ?? []),
    risks: Array.isArray(row.risks) ? row.risks : (row.risks ?? []),
    recommendation: row.recommendation,
  };
}

/**
 * Validate admin credentials against database.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ valid: boolean; user?: object }>}
 */
export async function validateAdminCredentials(email, password) {
  if (!sql) return { valid: false };
  try {
    const rows = await sql`SELECT id, email, password_hash, name, role FROM admins WHERE email = ${email} LIMIT 1`;
    const admin = rows[0];
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      return { valid: false };
    }
    return {
      valid: true,
      user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    };
  } catch (err) {
    console.error("validateAdminCredentials:", err);
    return { valid: false };
  }
}

/**
 * Admin login. Validates credentials and returns user or error.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function loginAdmin(email, password) {
  if (!sql) return { data: null, error: "Database not configured." };
  try {
    const result = await validateAdminCredentials(email, password);
    if (!result.valid) {
      return { data: null, error: "Invalid email or password." };
    }
    return { data: result.user, error: null };
  } catch (err) {
    console.error("loginAdmin:", err);
    return { data: null, error: "Login failed." };
  }
}

/**
 * Get interview details by token.
 * @param {string} token
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function getInterviewByToken(token) {
  if (!sql) return { data: null, error: "Database not configured." };
  try {
    const rows = await sql`
      SELECT token, job_title, company, department, interview_type, estimated_duration, status, instructions, expires_at, question_count
      FROM interviews WHERE token = ${token} LIMIT 1
    `;
    const row = rows[0];
    if (!row) {
      return { data: null, error: "Invalid or expired interview link." };
    }
    const instructions = typeof row.instructions === "string" ? JSON.parse(row.instructions || "[]") : (row.instructions ?? []);
    return { data: toInterview({ ...row, instructions }), error: null };
  } catch (err) {
    console.error("getInterviewByToken:", err);
    return { data: null, error: "Invalid or expired interview link." };
  }
}

/**
 * Get all candidates for admin dashboard.
 * @returns {Promise<{ data: object[]; error: string | null }>}
 */
export async function getCandidates() {
  if (!sql) return { data: [], error: "Database not configured." };
  try {
    const rows = await sql`SELECT * FROM candidates ORDER BY interview_date DESC NULLS LAST, id`;
    return { data: rows.map(toCandidate), error: null };
  } catch (err) {
    console.error("getCandidates:", err);
    return { data: [], error: "Failed to fetch candidates." };
  }
}

/**
 * Delete candidate by ID.
 * @param {{ candidate_id: string | number }} params - RORO style
 * @returns {Promise<{ ok: boolean; deleted_id?: string; error_message?: string }>}
 */
export async function deleteCandidateById({ candidate_id }) {
  if (!sql) return { ok: false, error_message: "Database not configured." };
  const id = candidate_id == null ? null : String(candidate_id).trim();
  if (!id) return { ok: false, error_message: "Candidate ID is required." };
  try {
    const result = await sql`DELETE FROM candidates WHERE id = ${id} RETURNING id`;
    if (!result?.length) return { ok: false, error_message: "Candidate not found or already deleted." };
    return { ok: true, deleted_id: result[0]?.id };
  } catch (err) {
    console.error("deleteCandidateById:", err);
    return { ok: false, error_message: "Failed to delete candidate." };
  }
}

/**
 * Get single candidate by ID.
 * @param {string} id
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function getCandidateById(id) {
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

/**
 * Get interview questions for a session.
 * @returns {Promise<{ data: object[]; error: string | null }>}
 */
export async function getInterviewQuestions() {
  if (!sql) return { data: [], error: "Database not configured." };
  try {
    const rows = await sql`SELECT id, text FROM questions ORDER BY id`;
    return { data: rows.map((r) => ({ id: r.id, text: r.text })), error: null };
  } catch (err) {
    console.error("getInterviewQuestions:", err);
    return { data: [], error: "Failed to fetch questions." };
  }
}

/**
 * Get candidate report by candidate ID.
 * @param {string} id - Candidate ID
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function getCandidateReport(id) {
  if (!sql) return { data: null, error: "Database not configured." };
  try {
    const rows = await sql`SELECT * FROM reports WHERE candidate_id = ${id} LIMIT 1`;
    const row = rows[0];
    if (!row) return { data: null, error: null };
    const strengths = typeof row.strengths === "string" ? JSON.parse(row.strengths || "[]") : (row.strengths ?? []);
    const risks = typeof row.risks === "string" ? JSON.parse(row.risks || "[]") : (row.risks ?? []);
    return { data: toReport({ ...row, strengths, risks }), error: null };
  } catch (err) {
    console.error("getCandidateReport:", err);
    return { data: null, error: "Failed to fetch report." };
  }
}

/**
 * Submit pre-screening answers for an interview token.
 * @param {string} token
 * @param {object} data
 * @param {string} data.experienceYears
 * @param {string} data.currentCtc
 * @param {string} data.expectedCtc
 * @param {string} data.relocateToMohali
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function submitPreScreen(token, data) {
  if (!sql) return { data: null, error: "Database not configured." };
  try {
    const interviewRows = await sql`SELECT status FROM interviews WHERE token = ${token} LIMIT 1`;
    const interview = interviewRows[0];
    if (!interview) {
      return { data: null, error: "Invalid or expired interview link." };
    }
    if (interview.status !== "valid") {
      return { data: null, error: "This interview link is no longer valid." };
    }
    const { experienceYears, currentCtc, expectedCtc, relocateToMohali } = data ?? {};
    const result = await sql`
      INSERT INTO pre_screens (token, experience_years, current_ctc, expected_ctc, relocate_to_mohali)
      VALUES (${token}, ${experienceYears ?? null}, ${currentCtc ?? null}, ${expectedCtc ?? null}, ${relocateToMohali ?? null})
      RETURNING token, experience_years, current_ctc, expected_ctc, relocate_to_mohali, submitted_at
    `;
    const row = result[0];
    const item = {
      token: row.token,
      experienceYears: row.experience_years,
      currentCtc: row.current_ctc,
      expectedCtc: row.expected_ctc,
      relocateToMohali: row.relocate_to_mohali,
      submittedAt: row.submitted_at,
    };
    return { data: item, error: null };
  } catch (err) {
    console.error("submitPreScreen:", err);
    return { data: null, error: "Failed to submit pre-screening." };
  }
}

/**
 * Get pre-screening answers for an interview token.
 * @param {string} token
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function getPreScreen(token) {
  if (!sql) return { data: null, error: "Database not configured." };
  try {
    const rows = await sql`
      SELECT token, experience_years, current_ctc, expected_ctc, relocate_to_mohali, submitted_at
      FROM pre_screens WHERE token = ${token}
      ORDER BY submitted_at DESC LIMIT 1
    `;
    const row = rows[0];
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

/**
 * Get all job descriptions (roles and openings).
 * @returns {Promise<{ data: object[]; error: string | null }>}
 */
export async function getJobDescriptions() {
  if (!sql) return { data: [], error: "Database not configured." };
  try {
    const rows = await sql`SELECT * FROM job_descriptions ORDER BY id`;
    return { data: rows.map(toJobDescription), error: null };
  } catch (err) {
    console.error("getJobDescriptions:", err);
    return { data: [], error: "Failed to fetch job descriptions." };
  }
}

/**
 * Create a new job description.
 * @param {object} payload
 * @param {string} payload.jobName
 * @param {string} payload.description
 * @param {number} [payload.openings=1]
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function createJobDescription(payload) {
  if (!sql) return { data: null, error: "Database not configured." };
  const { jobName, description, openings } = payload ?? {};
  if (!jobName?.trim()) {
    return { data: null, error: "Job name is required." };
  }
  if (!description?.trim()) {
    return { data: null, error: "Description is required." };
  }
  let validOpenings = 1;
  if (openings !== undefined && openings !== null) {
    const parsed = Number(openings);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return { data: null, error: "Number of openings must be an integer at least 1." };
    }
    validOpenings = parsed;
  }
  try {
    const idResult = await sql`SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 AS next_id FROM job_descriptions`;
    const nextId = String(idResult[0]?.next_id ?? 1);
    const sanitizedJobName = jobName.trim();
    const sanitizedDescription = description.trim();
    await sql`
      INSERT INTO job_descriptions (id, job_name, description, openings)
      VALUES (${nextId}, ${sanitizedJobName}, ${sanitizedDescription}, ${validOpenings})
    `;
    const item = {
      id: nextId,
      jobName: sanitizedJobName,
      description: sanitizedDescription,
      openings: validOpenings,
    };
    return { data: item, error: null };
  } catch (err) {
    console.error("createJobDescription:", err);
    return { data: null, error: "Failed to create job description." };
  }
}

/**
 * Delete job description by ID.
 * @param {{ job_description_id: string | number }} params - RORO style
 * @returns {Promise<{ ok: boolean; deleted_id?: string; error_message?: string }>}
 */
/**
 * Update job description openings by ID.
 * @param {{ job_description_id: string | number; openings: number }} params - RORO style
 * @returns {Promise<{ ok: boolean; data?: object; error_message?: string }>}
 */
export async function updateJobDescriptionOpeningsById({ job_description_id, openings }) {
  if (!sql) return { ok: false, error_message: "Database not configured." };
  const id = job_description_id == null ? null : String(job_description_id).trim();
  if (!id) return { ok: false, error_message: "Job description ID is required." };
  const parsed = Number(openings);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return { ok: false, error_message: "Openings must be a non-negative integer." };
  }
  try {
    const result = await sql`
      UPDATE job_descriptions SET openings = ${parsed}
      WHERE id = ${id}
      RETURNING id, job_name, description, openings
    `;
    if (!result?.length) return { ok: false, error_message: "Job description not found." };
    const row = result[0];
    return {
      ok: true,
      data: toJobDescription(row),
    };
  } catch (err) {
    console.error("updateJobDescriptionOpeningsById:", err);
    return { ok: false, error_message: "Failed to update openings." };
  }
}

export async function deleteJobDescriptionById({ job_description_id }) {
  if (!sql) return { ok: false, error_message: "Database not configured." };
  const id = job_description_id == null ? null : String(job_description_id).trim();
  if (!id) return { ok: false, error_message: "Job description ID is required." };
  try {
    const result = await sql`DELETE FROM job_descriptions WHERE id = ${id} RETURNING id`;
    if (!result?.length) return { ok: false, error_message: "Job description not found or already deleted." };
    return { ok: true, deleted_id: result[0]?.id };
  } catch (err) {
    console.error("deleteJobDescriptionById:", err);
    return { ok: false, error_message: "Failed to delete job description." };
  }
}

/**
 * Mock AI resume analysis. Simulates parsing a resume and returns prepopulated candidate data.
 * Does not persist to DB - remains mock behavior.
 * @param {File} file - Resume file (content not parsed; mock returns deterministic data)
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function analyzeCandidateResumeMock(file) {
  if (!file) {
    return { data: null, error: "No file selected." };
  }
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

/**
 * Create candidate.
 * @param {object} payload
 * @param {string} payload.name
 * @param {string} payload.email
 * @param {string} [payload.phone]
 * @param {string} [payload.position]
 * @param {number} [payload.atsScore]
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function createCandidateMock(payload) {
  if (!sql) return { data: null, error: "Database not configured." };
  const { name, email, phone, position, atsScore } = payload ?? {};
  if (!name?.trim()) {
    return { data: null, error: "Name is required." };
  }
  if (!email?.trim()) {
    return { data: null, error: "Email is required." };
  }
  try {
    const idResult = await sql`SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 AS next_id FROM candidates`;
    const id = String(idResult[0]?.next_id ?? 1);
    await sql`
      INSERT INTO candidates (id, name, email, phone, position, ats_score, interview_score, status, interview_date, token)
      VALUES (${id}, ${name.trim()}, ${email.trim()}, ${phone?.trim() ?? null}, ${position?.trim() ?? "Unassigned"}, ${typeof atsScore === "number" ? atsScore : null}, ${null}, ${"pending"}, ${null}, ${null})
    `;
    const item = {
      id,
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() ?? null,
      position: position?.trim() ?? "Unassigned",
      atsScore: typeof atsScore === "number" ? atsScore : null,
      interviewScore: null,
      status: "pending",
      interviewDate: null,
      token: null,
    };
    return { data: item, error: null };
  } catch (err) {
    console.error("createCandidateMock:", err);
    return { data: null, error: "Failed to create candidate." };
  }
}
