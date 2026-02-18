/**
 * API barrel. Re-exports from services with normalized return shapes.
 * All implementation lives in lib/services/*.
 */

import {
  deleteCandidateById as deleteCandidateByIdRaw,
} from "@/lib/services/candidates-admin.service";
import {
  updateJobDescriptionOpeningsById as updateJobDescriptionOpeningsByIdRaw,
  deleteJobDescriptionById as deleteJobDescriptionByIdRaw,
} from "@/lib/services/jobs.service";

export {
  validateAdminCredentials,
  loginAdmin,
} from "@/lib/services/admin.service";

export {
  getCandidates,
  getCandidateById,
  getCandidateReport,
  createCandidateMock,
  analyzeCandidateResumeMock,
} from "@/lib/services/candidates-admin.service";

export {
  getJobDescriptions,
  getActiveJobDescriptions,
  createJobDescription,
} from "@/lib/services/jobs.service";

export { getInterviewQuestions } from "@/lib/services/questions.service";

export { submitPreScreen, getPreScreen } from "@/lib/services/pre-screen.service";

/** Normalized write result: { ok, error } instead of { ok, error_message } */
function toWriteResult<T extends { ok: boolean; error_message?: string }>(
  result: T
): Omit<T, "error_message"> & { error?: string } {
  const { error_message, ...rest } = result;
  return { ...rest, error: error_message } as Omit<T, "error_message"> & {
    error?: string;
  };
}

export async function deleteCandidateById(params: {
  candidate_id: string | number;
}) {
  return toWriteResult(await deleteCandidateByIdRaw(params));
}

export async function updateJobDescriptionOpeningsById(params: {
  job_description_id: string | number;
  openings: number;
}) {
  return toWriteResult(await updateJobDescriptionOpeningsByIdRaw(params));
}

export async function deleteJobDescriptionById(params: {
  job_description_id: string | number;
}) {
  return toWriteResult(await deleteJobDescriptionByIdRaw(params));
}
