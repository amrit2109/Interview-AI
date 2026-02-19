/**
 * Interview evaluation DB service. Persist and fetch evaluations.
 */

import { getSql } from "@/lib/db";
import type { EvaluationResult, PerQuestionEvaluation } from "@/lib/types/interview-evaluation";

export interface CreateEvaluationInput {
  id: string;
  sessionId: string;
  candidateId: string;
  overallScore: number;
  perQuestion: PerQuestionEvaluation[];
  strengths: string[];
  risks: string[];
  recommendation: string | null;
  unansweredCount: number;
  modelName?: string;
  promptVersion?: string;
  confidenceScore?: number;
}

export async function createEvaluation(
  input: CreateEvaluationInput
): Promise<{ data: EvaluationResult | null; error: string | null }> {
  const sql = getSql();
  if (!sql) return { data: null, error: "Database not configured." };

  try {
    await sql`
      INSERT INTO interview_evaluations (id, session_id, candidate_id, overall_score, per_question, strengths, risks, recommendation, unanswered_count, model_name, prompt_version, confidence_score)
      VALUES (
        ${input.id},
        ${input.sessionId},
        ${input.candidateId},
        ${input.overallScore},
        ${JSON.stringify(input.perQuestion)},
        ${JSON.stringify(input.strengths)},
        ${JSON.stringify(input.risks)},
        ${input.recommendation},
        ${input.unansweredCount},
        ${input.modelName ?? "gemini-2.5-flash"},
        ${input.promptVersion ?? "1"},
        ${input.confidenceScore ?? null}
      )
    `;

    const evalResult: EvaluationResult = {
      id: input.id,
      sessionId: input.sessionId,
      candidateId: input.candidateId,
      overallScore: input.overallScore,
      perQuestion: input.perQuestion,
      strengths: input.strengths,
      risks: input.risks,
      recommendation: input.recommendation,
      unansweredCount: input.unansweredCount,
      createdAt: new Date().toISOString(),
    };
    return { data: evalResult, error: null };
  } catch (err) {
    console.error("createEvaluation:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to create evaluation.",
    };
  }
}

export async function getEvaluationBySessionId(
  sessionId: string
): Promise<{ data: EvaluationResult | null; error: string | null }> {
  const sql = getSql();
  if (!sql) return { data: null, error: "Database not configured." };

  try {
    const rows = await sql`
      SELECT id, session_id, candidate_id, overall_score, per_question, strengths, risks, recommendation, unanswered_count, override_score, override_reason, override_at, confidence_score, created_at
      FROM interview_evaluations WHERE session_id = ${sessionId} LIMIT 1
    `;
    const r = rows[0] as Record<string, unknown> | undefined;
    if (!r) return { data: null, error: null };

    const effectiveScore =
      r.override_score != null ? Number(r.override_score) : Number(r.overall_score);
    const perQuestion = Array.isArray(r.per_question) ? (r.per_question as PerQuestionEvaluation[]) : [];

    const evalResult: EvaluationResult = {
      id: String(r.id),
      sessionId: String(r.session_id),
      candidateId: String(r.candidate_id),
      overallScore: effectiveScore,
      perQuestion,
      strengths: Array.isArray(r.strengths) ? (r.strengths as string[]) : [],
      risks: Array.isArray(r.risks) ? (r.risks as string[]) : [],
      recommendation: r.recommendation != null ? String(r.recommendation) : null,
      unansweredCount: Number(r.unanswered_count),
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    };
    return { data: evalResult, error: null };
  } catch (err) {
    console.error("getEvaluationBySessionId:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch evaluation.",
    };
  }
}

export async function getEvaluationByCandidateId(
  candidateId: string
): Promise<{ data: EvaluationResult | null; error: string | null }> {
  const sql = getSql();
  if (!sql) return { data: null, error: "Database not configured." };

  try {
    const rows = await sql`
      SELECT id, session_id, candidate_id, overall_score, per_question, strengths, risks, recommendation, unanswered_count, override_score, override_reason, override_at, confidence_score, created_at
      FROM interview_evaluations WHERE candidate_id = ${candidateId} ORDER BY created_at DESC LIMIT 1
    `;
    const r = rows[0] as Record<string, unknown> | undefined;
    if (!r) return { data: null, error: null };

    const effectiveScore =
      r.override_score != null ? Number(r.override_score) : Number(r.overall_score);
    const perQuestion = Array.isArray(r.per_question) ? (r.per_question as PerQuestionEvaluation[]) : [];

    const evalResult: EvaluationResult = {
      id: String(r.id),
      sessionId: String(r.session_id),
      candidateId: String(r.candidate_id),
      overallScore: effectiveScore,
      perQuestion,
      strengths: Array.isArray(r.strengths) ? (r.strengths as string[]) : [],
      risks: Array.isArray(r.risks) ? (r.risks as string[]) : [],
      recommendation: r.recommendation != null ? String(r.recommendation) : null,
      unansweredCount: Number(r.unanswered_count),
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    };
    return { data: evalResult, error: null };
  } catch (err) {
    console.error("getEvaluationByCandidateId:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch evaluation.",
    };
  }
}

export async function overrideEvaluationScore(
  evaluationId: string,
  overrideScore: number,
  overrideReason: string
): Promise<{ ok: boolean; error: string | null }> {
  const sql = getSql();
  if (!sql) return { ok: false, error: "Database not configured." };

  try {
    await sql`
      UPDATE interview_evaluations
      SET override_score = ${overrideScore}, override_reason = ${overrideReason}, override_at = NOW()
      WHERE id = ${evaluationId}
    `;
    return { ok: true, error: null };
  } catch (err) {
    console.error("overrideEvaluationScore:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to override score.",
    };
  }
}
