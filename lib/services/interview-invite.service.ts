import {
  createCandidateWithInvite,
  updateCandidateInterviewPackId,
  type CreateCandidateWithInvitePayload,
  type CandidateWithToken,
} from "./candidate.service";
import { logAuditEvent } from "@/lib/utils/audit-log";
import { sendInterviewInviteEmail } from "./mailer.service";
import { generateQuestionPack } from "./question-pack-generator.service";
import { createInterviewPack } from "./interview-pack.service";
import { getJobDescriptionById } from "./jobs.service";

export interface SendInterviewInvitePayload extends CreateCandidateWithInvitePayload {}

export interface SendInterviewInviteResult {
  data: CandidateWithToken | null;
  error: string | null;
  /** Raw email error when status is 207 (for debugging) */
  emailError?: string | null;
}

/**
 * Generate and attach interview pack for candidate when we have resume data.
 * Non-blocking: pack generation failure does not block invite.
 */
async function ensureInterviewPack(
  candidateId: string,
  payload: SendInterviewInvitePayload
): Promise<void> {
  const { skills, experienceYears, matchedRoleId, position } = payload;
  if (!matchedRoleId?.trim() || !position?.trim()) return;
  const skillsList = skills?.trim()
    ? skills.split(/[,;]/).map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [];
  if (skillsList.length === 0) return;

  const { data: jd } = await getJobDescriptionById(matchedRoleId);
  if (!jd) return;

  const candidate = {
    skills: skillsList,
    experienceYears: experienceYears ?? null,
    experienceSummary: experienceYears != null ? `${experienceYears} years` : null,
    education: [],
    technicalStack: skillsList,
  };

  const { data: packData, error: genError } = await generateQuestionPack({
    candidate,
    jobRoleId: jd.id,
    jobRoleName: jd.jobName,
    jobDescription: jd.description,
  });
  if (genError || !packData) {
    console.warn("ensureInterviewPack: pack generation failed", genError);
    return;
  }

  const packId = `pack-${candidateId}-${Date.now()}`;
  const questions = packData.questions.map((q, i) => ({
    id: `${packId}-q${i}`,
    skill: q.skill,
    question: q.question,
    followUpQuestion: q.followUpQuestion,
    expectedSignals: q.expectedSignals,
    order: i,
  }));

  const { error: createError } = await createInterviewPack({
    id: packId,
    candidateId,
    jobRoleId: jd.id,
    jobRoleName: jd.jobName,
    selectedSkills: packData.selectedSkills,
    questions,
  });
  if (createError) {
    console.warn("ensureInterviewPack: pack create failed", createError);
    return;
  }

  const { error: updateError } = await updateCandidateInterviewPackId(candidateId, packId);
  if (updateError) {
    console.warn("ensureInterviewPack: link pack failed", updateError);
  }
}

/**
 * Orchestrate candidate creation, pack generation, and email delivery.
 */
export async function sendInterviewInvite(
  payload: SendInterviewInvitePayload
): Promise<SendInterviewInviteResult> {
  const { data: candidate, error: createError } = await createCandidateWithInvite(payload);
  if (createError || !candidate) {
    return { data: null, error: createError ?? "Failed to create candidate." };
  }

  await ensureInterviewPack(candidate.id, payload);

  const emailError = await sendInterviewInviteEmail(candidate);
  if (emailError) {
    console.error("sendInterviewInvite: email failed after candidate created:", emailError);
    return {
      data: candidate,
      error: "Candidate created but email could not be sent. Please contact the candidate directly.",
      emailError,
    };
  }

  logAuditEvent({ event: "link_sent", token: candidate.token, candidateId: candidate.id });
  return { data: candidate, error: null };
}
