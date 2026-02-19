/**
 * Interview pack DB service. CRUD for packs and pack questions.
 */

import { getSql } from "@/lib/db";
import { logAuditEvent } from "@/lib/utils/audit-log";
import type { InterviewPack, InterviewPackQuestion } from "@/lib/types/interview-pack";

const DEFAULT_RUBRIC = {
  technical_depth: 0.45,
  correctness: 0.3,
  communication: 0.15,
  role_alignment: 0.1,
};

export interface CreatePackInput {
  id: string;
  candidateId: string;
  jobRoleId: string;
  jobRoleName: string;
  selectedSkills: string[];
  questions: Array<{
    id: string;
    skill: string;
    question: string;
    followUpQuestion?: string;
    expectedSignals?: string[];
    order: number;
  }>;
  modelName?: string;
  promptVersion?: string;
}

export async function createInterviewPack(
  input: CreatePackInput
): Promise<{ data: InterviewPack | null; error: string | null }> {
  const sql = getSql();
  if (!sql) return { data: null, error: "Database not configured." };

  try {
    await sql`
      INSERT INTO interview_packs (id, candidate_id, job_role_id, job_role_name, selected_skills, rubric_weights, model_name, prompt_version)
      VALUES (
        ${input.id},
        ${input.candidateId},
        ${input.jobRoleId},
        ${input.jobRoleName},
        ${JSON.stringify(input.selectedSkills)},
        ${JSON.stringify(DEFAULT_RUBRIC)},
        ${input.modelName ?? "gemini-2.5-flash"},
        ${input.promptVersion ?? "1"}
      )
    `;

    for (const q of input.questions) {
      await sql`
        INSERT INTO interview_pack_questions (id, pack_id, skill, question, follow_up_question, expected_signals, order_index)
        VALUES (
          ${q.id},
          ${input.id},
          ${q.skill},
          ${q.question},
          ${q.followUpQuestion ?? null},
          ${JSON.stringify(q.expectedSignals ?? [])},
          ${q.order}
        )
      `;
    }

    logAuditEvent({
      event: "pack_created",
      packId: input.id,
      candidateId: input.candidateId,
    });
    const pack: InterviewPack = {
      id: input.id,
      candidateId: input.candidateId,
      jobRoleId: input.jobRoleId,
      jobRoleName: input.jobRoleName,
      selectedSkills: input.selectedSkills,
      questions: input.questions.map((q) => ({
        id: q.id,
        skill: q.skill,
        question: q.question,
        followUpQuestion: q.followUpQuestion,
        expectedSignals: q.expectedSignals,
        order: q.order,
      })),
      rubricWeights: DEFAULT_RUBRIC,
      maxFollowUpsPerQuestion: 1,
      createdAt: new Date().toISOString(),
    };
    return { data: pack, error: null };
  } catch (err) {
    console.error("createInterviewPack:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to create interview pack.",
    };
  }
}

export async function getInterviewPackById(
  id: string
): Promise<{ data: InterviewPack | null; error: string | null }> {
  const sql = getSql();
  if (!sql) return { data: null, error: "Database not configured." };

  try {
    const packRows = await sql`
      SELECT id, candidate_id, job_role_id, job_role_name, selected_skills, rubric_weights, max_follow_ups_per_question, created_at
      FROM interview_packs WHERE id = ${id} LIMIT 1
    `;
    const packRow = packRows[0] as {
      id: string;
      candidate_id: string;
      job_role_id: string;
      job_role_name: string;
      selected_skills: unknown;
      rubric_weights: unknown;
      max_follow_ups_per_question: number;
      created_at: Date | string;
    } | undefined;
    if (!packRow) return { data: null, error: null };

    const questionRows = await sql`
      SELECT id, skill, question, follow_up_question, expected_signals, order_index
      FROM interview_pack_questions WHERE pack_id = ${id} ORDER BY order_index
    `;
    const questions: InterviewPackQuestion[] = (questionRows as Array<Record<string, unknown>>).map(
      (r) => ({
        id: String(r.id),
        skill: String(r.skill),
        question: String(r.question),
        followUpQuestion: r.follow_up_question != null ? String(r.follow_up_question) : undefined,
        expectedSignals: Array.isArray(r.expected_signals) ? r.expected_signals as string[] : [],
        order: Number(r.order_index),
      })
    );

    const pack: InterviewPack = {
      id: packRow.id,
      candidateId: packRow.candidate_id,
      jobRoleId: packRow.job_role_id,
      jobRoleName: packRow.job_role_name,
      selectedSkills: Array.isArray(packRow.selected_skills) ? packRow.selected_skills as string[] : [],
      rubricWeights:
        packRow.rubric_weights && typeof packRow.rubric_weights === "object"
          ? (packRow.rubric_weights as InterviewPack["rubricWeights"])
          : undefined,
      questions,
      maxFollowUpsPerQuestion: packRow.max_follow_ups_per_question ?? 1,
      createdAt:
        packRow.created_at instanceof Date
          ? packRow.created_at.toISOString()
          : String(packRow.created_at),
    };
    return { data: pack, error: null };
  } catch (err) {
    console.error("getInterviewPackById:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch interview pack.",
    };
  }
}

export async function getInterviewPackByToken(
  token: string
): Promise<{ data: InterviewPack | null; error: string | null }> {
  const sql = getSql();
  if (!sql) return { data: null, error: "Database not configured." };

  try {
    const rows = await sql`
      SELECT c.interview_pack_id FROM candidates c WHERE c.token = ${token} LIMIT 1
    `;
    const packId = (rows[0] as { interview_pack_id: string | null } | undefined)?.interview_pack_id;
    if (!packId) return { data: null, error: null };
    return getInterviewPackById(packId);
  } catch (err) {
    console.error("getInterviewPackByToken:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch interview pack.",
    };
  }
}
