/**
 * Mock API layer. Use async-style functions to match real API shape.
 * Replace with fetch/axios calls when backend is ready.
 */

import { mockInterviews } from "@/data/interviews";
import { mockCandidates } from "@/data/candidates";
import { mockQuestions } from "@/data/questions";
import { mockReports } from "@/data/reports";
import { mockAdmins } from "@/data/admin";
import { mockJobDescriptions } from "@/data/job-descriptions";

/**
 * Simulate network delay.
 * @param {number} ms
 * @returns {Promise<void>}
 */
const delay = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Validate admin credentials against mock data.
 * @param {string} email
 * @param {string} password
 * @returns {{ valid: boolean; user?: object }}
 */
export function validateAdminCredentials(email, password) {
  const admin = mockAdmins.find(
    (a) => a.email === email && a.password === password
  );
  if (!admin) return { valid: false };
  const { password: _, ...user } = admin;
  return { valid: true, user };
}

/**
 * Mock admin login. Validates credentials and returns user or error.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function loginAdmin(email, password) {
  await delay(150);
  const result = validateAdminCredentials(email, password);
  if (!result.valid) {
    return { data: null, error: "Invalid email or password." };
  }
  return { data: result.user, error: null };
}

/**
 * Get interview details by token.
 * @param {string} token
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function getInterviewByToken(token) {
  await delay(150);
  const interview = mockInterviews[token] ?? null;
  if (!interview) {
    return { data: null, error: "Invalid or expired interview link." };
  }
  return { data: interview, error: null };
}

/**
 * Get all candidates for admin dashboard.
 * @returns {Promise<{ data: object[]; error: string | null }>}
 */
export async function getCandidates() {
  await delay(100);
  return { data: [...candidatesStore], error: null };
}

/**
 * Get single candidate by ID.
 * @param {string} id
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function getCandidateById(id) {
  await delay(100);
  const candidate = candidatesStore.find((c) => c.id === id) ?? null;
  return { data: candidate, error: null };
}

/**
 * Get interview questions for a session.
 * @returns {Promise<{ data: object[]; error: string | null }>}
 */
export async function getInterviewQuestions() {
  await delay(80);
  return { data: mockQuestions, error: null };
}

/**
 * Get candidate report by ID.
 * @param {string} id
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function getCandidateReport(id) {
  await delay(100);
  const report = mockReports[id] ?? null;
  return { data: report, error: null };
}

/** In-memory store for pre-screening responses. Replace with API call when backend is ready. */
const preScreenStore = new Map();

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
  await delay(150);
  const interview = mockInterviews[token] ?? null;
  if (!interview) {
    return { data: null, error: "Invalid or expired interview link." };
  }
  if (interview.status !== "valid") {
    return { data: null, error: "This interview link is no longer valid." };
  }
  preScreenStore.set(token, {
    token,
    ...data,
    submittedAt: new Date().toISOString(),
  });
  return { data: preScreenStore.get(token), error: null };
}

/**
 * Get pre-screening answers for an interview token.
 * @param {string} token
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function getPreScreen(token) {
  await delay(80);
  const data = preScreenStore.get(token) ?? null;
  return { data, error: null };
}

/** In-memory store for job descriptions. Merges initial mock data with newly created JDs. */
const jobDescriptionsStore = [...mockJobDescriptions];
let nextJobId = String(Math.max(...mockJobDescriptions.map((j) => Number(j.id)), 0) + 1);

/**
 * Get all job descriptions (roles and openings).
 * @returns {Promise<{ data: object[]; error: string | null }>}
 */
export async function getJobDescriptions() {
  await delay(100);
  return { data: [...jobDescriptionsStore], error: null };
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
  await delay(150);
  const { jobName, description, openings = 1 } = payload ?? {};
  if (!jobName?.trim()) {
    return { data: null, error: "Job name is required." };
  }
  if (!description?.trim()) {
    return { data: null, error: "Description is required." };
  }
  const id = String(nextJobId++);
  const item = {
    id,
    jobName: jobName.trim(),
    description: description.trim(),
    openings: Number(openings) || 1,
  };
  jobDescriptionsStore.push(item);
  return { data: item, error: null };
}

/** In-memory store for candidates. Merges initial mock data with newly created candidates. */
const candidatesStore = [...mockCandidates];
let nextCandidateId = String(
  Math.max(...mockCandidates.map((c) => Number(c.id)), 0) + 1
);

/**
 * Mock AI resume analysis. Simulates parsing a resume and returns prepopulated candidate data,
 * ATS score out of 10, and best matched role from job descriptions.
 * @param {File} file - Resume file (content not parsed; mock returns deterministic data)
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function analyzeCandidateResumeMock(file) {
  await delay(1200);
  if (!file) {
    return { data: null, error: "No file selected." };
  }
  const { data: jds } = await getJobDescriptions();
  const mockParsed = {
    name: "Alex Johnson",
    email: "alex.johnson@example.com",
    phone: "+1 (555) 123-4567",
    experience: "5 years",
    skills: "React, Node.js, TypeScript, AWS",
    education: "B.S. Computer Science",
  };
  const atsScore = 8.2;
  const skills = "React, Node.js, TypeScript, AWS".toLowerCase().split(/,\s*/);
  const scored = jds.map((jd) => {
    const text = `${jd.jobName} ${jd.description}`.toLowerCase();
    const matches = skills.filter((s) => text.includes(s)).length;
    return { jd, score: matches };
  });
  const best = scored.sort((a, b) => b.score - a.score)[0];
  const bestRole = best?.score > 0 ? best.jd : jds[0] ?? null;
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
 * Mock create candidate. Adds to in-memory store for demo.
 * @param {object} payload
 * @param {string} payload.name
 * @param {string} payload.email
 * @param {string} [payload.phone]
 * @param {string} [payload.position]
 * @param {number} [payload.atsScore]
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function createCandidateMock(payload) {
  await delay(150);
  const { name, email, phone, position, atsScore } = payload ?? {};
  if (!name?.trim()) {
    return { data: null, error: "Name is required." };
  }
  if (!email?.trim()) {
    return { data: null, error: "Email is required." };
  }
  const id = String(nextCandidateId++);
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
  candidatesStore.push(item);
  return { data: item, error: null };
}
