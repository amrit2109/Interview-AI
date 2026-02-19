/**
 * Fetch questions for interview session.
 * Uses pack if candidate has one, else legacy global questions.
 */

import { getEnv } from "@/lib/env";
import { getInterviewPackByToken } from "./interview-pack.service";
import { getInterviewQuestions } from "./questions.service";

export interface SessionQuestion {
  id: string;
  text: string;
  skill?: string;
}

export async function getQuestionsForSession(
  token: string
): Promise<{ data: SessionQuestion[]; usePack: boolean; error: string | null }> {
  const useLegacy = getEnv().USE_LEGACY_INTERVIEW_QUESTIONS === "true";

  if (useLegacy) {
    const { data } = await getInterviewQuestions();
    return {
      data: (data ?? []).map((q) => ({ id: String(q.id), text: q.text })),
      usePack: false,
      error: null,
    };
  }

  const { data: pack, error } = await getInterviewPackByToken(token);
  if (error) {
    const { data } = await getInterviewQuestions();
    return {
      data: (data ?? []).map((q) => ({ id: String(q.id), text: q.text })),
      usePack: false,
      error: null,
    };
  }

  if (pack?.questions?.length) {
    return {
      data: pack.questions.map((q) => ({
        id: q.id,
        text: q.question,
        skill: q.skill,
      })),
      usePack: true,
      error: null,
    };
  }

  const { data } = await getInterviewQuestions();
  return {
    data: (data ?? []).map((q) => ({ id: String(q.id), text: q.text })),
    usePack: false,
    error: null,
  };
}
