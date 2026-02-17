import {
  createCandidateWithInvite,
  type CreateCandidateWithInvitePayload,
  type CandidateWithToken,
} from "./candidate.service";
import { sendInterviewInviteEmail } from "./mailer.service";

export interface SendInterviewInvitePayload extends CreateCandidateWithInvitePayload {}

export interface SendInterviewInviteResult {
  data: CandidateWithToken | null;
  error: string | null;
}

/**
 * Orchestrate candidate creation with token, persistence, and email delivery.
 */
export async function sendInterviewInvite(
  payload: SendInterviewInvitePayload
): Promise<SendInterviewInviteResult> {
  const { data: candidate, error: createError } = await createCandidateWithInvite(payload);
  if (createError || !candidate) {
    return { data: null, error: createError ?? "Failed to create candidate." };
  }

  const emailError = await sendInterviewInviteEmail(candidate);
  if (emailError) {
    console.error("sendInterviewInvite: email failed after candidate created:", emailError);
    return {
      data: candidate,
      error: "Candidate created but email could not be sent. Please contact the candidate directly.",
    };
  }

  return { data: candidate, error: null };
}
