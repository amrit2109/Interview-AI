/**
 * Answer evaluator. Uses Gemini to score candidate answers from transcript.
 * No penalty for unanswered questions; mark as unanswered and exclude from negative scoring.
 * RORO: receive object, return object.
 */

import { GoogleGenAI } from "@google/genai";
import { getEnv } from "@/lib/env";
import {
  evaluationResultSchema,
  perQuestionEvaluationSchema,
} from "@/lib/types/interview-evaluation";
import { createAiMetadata } from "@/lib/types/ai-metadata";

const MODEL = "gemini-2.5-flash";
const PROMPT_VERSION = "1";

const DEFAULT_WEIGHTS = {
  technical_depth: 0.45,
  correctness: 0.3,
  communication: 0.15,
  role_alignment: 0.1,
};

export interface EvaluateAnswersInput {
  sessionId: string;
  candidateId: string;
  questions: Array<{
    id: string;
    skill: string;
    question: string;
  }>;
  turns: Array<{
    questionId: string;
    questionText: string;
    candidateAnswer: string | null;
    unanswered: boolean;
  }>;
  jobRoleName: string;
}

export interface EvaluateAnswersOutput {
  data: {
    overallScore: number;
    perQuestion: Array<{
      questionId: string;
      skill: string;
      technical_depth: number;
      correctness: number;
      communication: number;
      role_alignment: number;
      unanswered: boolean;
      evidenceSpans?: string[];
      notes?: string;
    }>;
    strengths: string[];
    risks: string[];
    recommendation: string | null;
    unansweredCount: number;
  } | null;
  error: string | null;
}

function buildTurnMap(turns: EvaluateAnswersInput["turns"]): Map<string, { answer: string | null; unanswered: boolean }> {
  const map = new Map<string, { answer: string | null; unanswered: boolean }>();
  for (const t of turns) {
    map.set(t.questionId, {
      answer: t.candidateAnswer,
      unanswered: t.unanswered,
    });
  }
  return map;
}

export async function evaluateAnswers(
  input: EvaluateAnswersInput
): Promise<EvaluateAnswersOutput> {
  const { sessionId, candidateId, questions, turns, jobRoleName } = input;
  const apiKey = getEnv().GOOGLE_GEMINI_API_KEY;
  if (!apiKey?.trim()) {
    return { data: null, error: "Gemini API key not configured." };
  }

  const turnMap = buildTurnMap(turns);
  const unansweredCount = turns.filter((t) => t.unanswered).length;

  const systemPrompt = `You are an interview evaluator. Score each answer on four dimensions (0-10 each): technical_depth, correctness, communication, role_alignment.
CRITICAL: If a question was UNANSWERED (candidate gave no answer), set unanswered: true and give 0 for all dimensions WITHOUT penalizing - treat as missing evidence, not negative.
Return ONLY valid JSON:
{
  "perQuestion": [
    {
      "questionId": "string",
      "skill": "string",
      "technical_depth": number 0-10,
      "correctness": number 0-10,
      "communication": number 0-10,
      "role_alignment": number 0-10,
      "unanswered": boolean,
      "evidenceSpans": ["string (transcript snippets)"],
      "notes": "string"
    }
  ],
  "strengths": ["string"],
  "risks": ["string"],
  "recommendation": "string or null"
}
For unanswered questions: set unanswered: true, all scores 0, evidenceSpans: [], notes: "No answer provided."`;

  const qaPairs = questions.map((q) => {
    const turn = turnMap.get(q.id);
    const unanswered = turn?.unanswered ?? !turn?.answer?.trim();
    return {
      questionId: q.id,
      skill: q.skill,
      question: q.question,
      answer: turn?.answer ?? "(no answer)",
      unanswered,
    };
  });

  const userPrompt = `Job role: ${jobRoleName}

Questions and answers:
${qaPairs
  .map(
    (qa) =>
      `Q (${qa.skill}): ${qa.question}\nA: ${qa.answer}${qa.unanswered ? " [UNANSWERED]" : ""}`
  )
  .join("\n\n")}

Score each answer. For UNANSWERED, set unanswered: true and scores to 0. Return JSON only.`;

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
    const perQuestionRaw = Array.isArray(parsed.perQuestion) ? parsed.perQuestion : [];
    const perQuestion: Array<{
      questionId: string;
      skill: string;
      technical_depth: number;
      correctness: number;
      communication: number;
      role_alignment: number;
      unanswered: boolean;
      evidenceSpans?: string[];
      notes?: string;
    }> = [];

    for (const pq of perQuestionRaw) {
      const qa = qaPairs.find((q) => q.questionId === pq.questionId || q.skill === pq.skill);
      const unanswered = qa?.unanswered ?? false;
      const result = perQuestionEvaluationSchema.safeParse({
        questionId: pq.questionId ?? qa?.questionId ?? "",
        skill: pq.skill ?? qa?.skill ?? "",
        technical_depth: unanswered ? 0 : Math.min(10, Math.max(0, Number(pq.technical_depth) ?? 5)),
        correctness: unanswered ? 0 : Math.min(10, Math.max(0, Number(pq.correctness) ?? 5)),
        communication: unanswered ? 0 : Math.min(10, Math.max(0, Number(pq.communication) ?? 5)),
        role_alignment: unanswered ? 0 : Math.min(10, Math.max(0, Number(pq.role_alignment) ?? 5)),
        unanswered,
        evidenceSpans: Array.isArray(pq.evidenceSpans) ? pq.evidenceSpans : [],
        notes: pq.notes,
      });
      if (result.success) perQuestion.push(result.data);
    }

    const answeredScores = perQuestion.filter((p) => !p.unanswered);
    let overallScore = 0;
    if (answeredScores.length > 0) {
      const weighted =
        answeredScores.reduce((sum, p) => {
          return (
            sum +
            p.technical_depth * DEFAULT_WEIGHTS.technical_depth +
            p.correctness * DEFAULT_WEIGHTS.correctness +
            p.communication * DEFAULT_WEIGHTS.communication +
            p.role_alignment * DEFAULT_WEIGHTS.role_alignment
          );
        }, 0) / answeredScores.length;
      overallScore = Math.round(weighted * 10) / 10;
      overallScore = Math.min(10, Math.max(0, overallScore));
    }

    const strengths = Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [];
    const risks = Array.isArray(parsed.risks) ? parsed.risks.map(String) : [];
    const recommendation =
      parsed.recommendation != null ? String(parsed.recommendation) : null;

    return {
      data: {
        overallScore,
        perQuestion,
        strengths,
        risks,
        recommendation,
        unansweredCount,
      },
      error: null,
    };
  } catch (err) {
    console.error("answer-evaluator:", err);
    const msg = err instanceof Error ? err.message : "Evaluation failed.";
    return { data: null, error: msg };
  }
}
