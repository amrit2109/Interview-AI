/**
 * Question pack generator. Uses Gemini to create interview questions from resume + job role.
 * Selects top_k_core_skills (5-7), one question per skill, tailored to experience.
 * RORO: receive object, return object.
 */

import { GoogleGenAI } from "@google/genai";
import { getEnv } from "@/lib/env";
import type { ResumeAnalysis } from "@/lib/types/resume-analysis";
import { interviewPackQuestionSchema } from "@/lib/types/interview-pack";
import { createAiMetadata } from "@/lib/types/ai-metadata";

const MODEL = "gemini-2.5-flash";
const TOP_K_SKILLS = 6;
const PROMPT_VERSION = "1";

export interface GenerateQuestionPackInput {
  candidate: ResumeAnalysis;
  jobRoleId: string;
  jobRoleName: string;
  jobDescription: string;
}

export interface GenerateQuestionPackOutput {
  data: {
    selectedSkills: string[];
    questions: Array<{
      id: string;
      skill: string;
      question: string;
      followUpQuestion?: string;
      expectedSignals?: string[];
      order: number;
    }>;
  } | null;
  error: string | null;
}

function selectTopSkills(
  candidate: ResumeAnalysis,
  jobRoleName: string,
  jobDescription: string,
  k: number
): string[] {
  const skills = [...(candidate.skills ?? []), ...(candidate.technicalStack ?? [])];
  const unique = [...new Set(skills.map((s) => s.toLowerCase().trim()))].filter(Boolean);
  if (unique.length === 0) return [];

  const jdText = `${jobRoleName} ${jobDescription}`.toLowerCase();
  const scored = unique.map((skill) => {
    const jdRelevance = jdText.includes(skill) ? 1 : 0;
    const exp = candidate.experienceYears ?? 0;
    const expWeight = exp >= 3 ? 0.3 : exp >= 1 ? 0.2 : 0.1;
    return { skill, score: jdRelevance + expWeight };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((s) => s.skill);
}

export async function generateQuestionPack(
  input: GenerateQuestionPackInput
): Promise<GenerateQuestionPackOutput> {
  const { candidate, jobRoleId, jobRoleName, jobDescription } = input;
  const apiKey = getEnv().GOOGLE_GEMINI_API_KEY;
  if (!apiKey?.trim()) {
    return { data: null, error: "Gemini API key not configured." };
  }

  const selectedSkills = selectTopSkills(
    candidate,
    jobRoleName,
    jobDescription,
    TOP_K_SKILLS
  );
  if (selectedSkills.length === 0) {
    return {
      data: null,
      error: "No skills found in resume to generate questions.",
    };
  }

  const systemPrompt = `You are an interview question generator. For each skill provided, generate exactly ONE technical question tailored to the candidate's experience level.
Return ONLY valid JSON with no markdown, code fences, or commentary.
Use this exact structure:
{
  "questions": [
    {
      "skill": "string (exact skill from input)",
      "question": "string (one technical question per skill, appropriate for candidate experience)",
      "followUpQuestion": "string (optional deeper follow-up question)",
      "expectedSignals": ["string (2-3 key signals a good answer would mention)"]
    }
  ]
}
Order questions by skill relevance to the job. Keep questions concise (1-2 sentences).`;

  const userPrompt = `Job role: ${jobRoleName}
Job description: ${jobDescription.slice(0, 500)}

Candidate skills to use: ${selectedSkills.join(", ")}
Candidate experience: ${candidate.experienceYears ?? "unknown"} years
${candidate.experienceSummary ? `Experience summary: ${candidate.experienceSummary}` : ""}

Generate one question per skill. Return JSON only.`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const raw = response?.text ?? "";
    if (!raw.trim()) {
      return { data: null, error: "AI returned no content." };
    }

    const parsed = JSON.parse(raw);
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    const validated: Array<{
      id: string;
      skill: string;
      question: string;
      followUpQuestion?: string;
      expectedSignals?: string[];
      order: number;
    }> = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const skill = String(q?.skill ?? selectedSkills[i] ?? "general").trim();
      const question = String(q?.question ?? "").trim();
      if (!question) continue;

      const result = interviewPackQuestionSchema.safeParse({
        id: `q-${Date.now()}-${i}`,
        skill,
        question,
        followUpQuestion: q?.followUpQuestion ? String(q.followUpQuestion).trim() : undefined,
        expectedSignals: Array.isArray(q?.expectedSignals)
          ? q.expectedSignals.map((s: unknown) => String(s)).filter(Boolean)
          : [],
        order: i,
      });
      if (result.success) validated.push(result.data);
    }

    if (validated.length === 0) {
      return { data: null, error: "AI returned no valid questions." };
    }

    return {
      data: {
        selectedSkills,
        questions: validated,
      },
      error: null,
    };
  } catch (err) {
    console.error("question-pack-generator:", err);
    const msg = err instanceof Error ? err.message : "Question generation failed.";
    return { data: null, error: msg };
  }
}
