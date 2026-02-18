/**
 * Gemini-powered resume parsing. Extracts structured candidate data.
 * Uses GOOGLE_GEMINI_API_KEY from env.
 * Falls back to regex extraction when Gemini API fails (quota, etc.).
 */

import { GoogleGenAI } from "@google/genai";
import { getEnv } from "@/lib/env";

const MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are a resume parser. Extract structured data from the resume text.
Return ONLY valid JSON with no markdown, code fences, or commentary.
Use this exact structure (all fields required; use null or [] for unknown):
{
  "fullName": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "skills": ["string"],
  "experienceYears": number or null,
  "experienceSummary": "string or null",
  "education": ["string"],
  "currentOrLastRole": "string or null",
  "technicalStack": ["string"]
}
Normalize: trim whitespace, lowercase emails, extract years as number (e.g. "5 years" -> 5).`;

/**
 * @param {string} resumeText
 * @param {Array<{ id: string; jobName: string; description: string }>} [jobDescriptions]
 * @returns {Promise<{ candidate: object; error: string | null }>}
 */
export async function parseResumeWithGemini(resumeText, jobDescriptions = []) {
  const apiKey = getEnv().GOOGLE_GEMINI_API_KEY;
  if (!apiKey?.trim()) {
    return { candidate: null, error: "Gemini API key not configured." };
  }
  if (!resumeText?.trim()) {
    return { candidate: null, error: "No resume text to parse." };
  }

  const jdContext =
    jobDescriptions.length > 0
      ? `\n\nAvailable job roles for context:\n${jobDescriptions.map((j) => `- ${j.jobName}: ${j.description.slice(0, 200)}...`).join("\n")}`
      : "";

  const userPrompt = `Parse this resume and return the JSON structure.\n\nResume text:\n${resumeText.slice(0, 30000)}${jdContext}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
      },
    });

    const raw = response?.text ?? "";
    if (!raw.trim()) {
      console.error("resume_ai_parser: empty Gemini response");
      return { candidate: null, error: "AI returned no content." };
    }

    const parsed = JSON.parse(raw);
    const candidate = normalizeAndValidate(parsed);
    if (!candidate) {
      console.error("resume_ai_parser: invalid schema", raw?.slice?.(0, 200));
      return { candidate: null, error: "AI response did not match expected schema." };
    }

    return { candidate, error: null };
  } catch (err) {
    console.error("resume_ai_parser:", err);
    const isQuota =
      err?.status === 429 ||
      err?.message?.includes("429") ||
      err?.message?.includes("RESOURCE_EXHAUSTED") ||
      err?.message?.includes("quota");
    const fallback = basicFallbackParse(resumeText);
    if (fallback) {
      return { candidate: fallback, error: null };
    }
    if (isQuota) {
      return {
        candidate: null,
        error: "Gemini API quota exceeded. Please try again later or check your usage at https://ai.google.dev/gemini-api/docs/rate-limits.",
      };
    }
    if (err?.message?.includes("JSON")) {
      return { candidate: null, error: "Failed to parse AI response." };
    }
    const msg = err?.message ?? "Resume parsing failed.";
    const sanitized =
      msg.length > 200 || msg.includes('"code":') || msg.includes("RESOURCE_EXHAUSTED")
        ? "Resume parsing failed. Please try again."
        : msg;
    return { candidate: null, error: sanitized };
  }
}

/**
 * Basic regex-based extraction when Gemini is unavailable.
 * @param {string} text
 * @returns {object | null}
 */
function basicFallbackParse(text) {
  if (!text?.trim()) return null;
  const t = text.trim();
  const emailMatch = t.match(/[\w.+-]+@[\w.-]+\.\w+/);
  const phoneMatch = t.match(/(?:\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/);
  const lines = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const firstLine = lines[0] ?? "";
  const name = /^[A-Za-z\s.-]+$/.test(firstLine) && firstLine.length < 80 ? firstLine : null;
  const skills = [];
  const skillKeywords = ["javascript", "react", "node", "python", "java", "typescript", "aws", "sql", "html", "css", "api", "git"];
  for (const kw of skillKeywords) {
    if (t.toLowerCase().includes(kw)) skills.push(kw);
  }
  const expMatch = t.match(/(\d+)\s*(?:years?|yrs?|y\.?)/i);
  const experienceYears = expMatch ? parseInt(expMatch[1], 10) : null;
  const education = [];
  if (/\b(b\.?s\.?|bachelor|btech|m\.?s\.?|master|mba|phd|degree)\b/i.test(t)) {
    education.push("See resume");
  }
  return {
    fullName: name || "Candidate",
    email: emailMatch?.[0] || null,
    phone: phoneMatch?.[0] || null,
    location: null,
    skills,
    experienceYears,
    experienceSummary: expMatch ? `${expMatch[1]} years` : null,
    education: education.length ? education : ["See resume"],
    currentOrLastRole: null,
    technicalStack: [...skills],
  };
}

/**
 * @param {unknown} raw
 * @returns {object | null}
 */
function normalizeAndValidate(raw) {
  if (!raw || typeof raw !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (raw);

  const fullName = safeString(o.fullName);
  const email = safeString(o.email);
  const phone = safeString(o.phone);
  const location = safeString(o.location);
  const skills = Array.isArray(o.skills)
    ? o.skills.map((s) => String(s ?? "").trim().toLowerCase()).filter(Boolean)
    : [];
  const experienceYears =
    typeof o.experienceYears === "number" && !Number.isNaN(o.experienceYears)
      ? o.experienceYears
      : null;
  const experienceSummary = safeString(o.experienceSummary);
  const education = Array.isArray(o.education)
    ? o.education.map((e) => String(e ?? "").trim()).filter(Boolean)
    : [];
  const currentOrLastRole = safeString(o.currentOrLastRole);
  const technicalStack = Array.isArray(o.technicalStack)
    ? o.technicalStack.map((t) => String(t ?? "").trim().toLowerCase()).filter(Boolean)
    : [];

  return {
    fullName: fullName || null,
    email: email || null,
    phone: phone || null,
    location: location || null,
    skills,
    experienceYears,
    experienceSummary: experienceSummary || null,
    education,
    currentOrLastRole: currentOrLastRole || null,
    technicalStack,
  };
}

/**
 * @param {unknown} v
 * @returns {string}
 */
function safeString(v) {
  if (v == null) return "";
  return String(v).trim();
}
