"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ADMIN_SESSION_COOKIE, requireAdminSession } from "@/lib/auth";
import {
  getJobDescriptions,
  analyzeCandidateResumeMock,
  createCandidateMock,
  createJobDescription,
  deleteCandidateById,
  deleteJobDescriptionById,
  updateJobDescriptionOpeningsById,
} from "@/lib/api";

/**
 * Server action: clear admin session cookie and redirect to login.
 */
export async function handleLogout() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect("/admin/login");
}

/**
 * Server action: get job descriptions for dropdowns.
 * @returns {Promise<{ data: object[]; error: string | null }>}
 */
export async function getJobDescriptionsAction() {
  try {
    await requireAdminSession();
  } catch {
    return { data: [], error: "Unauthorized" };
  }
  return getJobDescriptions();
}

/**
 * Server action: analyze resume (mock) and return prefilled candidate data.
 * @param {FormData} formData - Must contain "file" key with File
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function analyzeCandidateResumeMockAction(formData) {
  try {
    await requireAdminSession();
  } catch {
    return { data: null, error: "Unauthorized" };
  }
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return { data: null, error: "No file selected." };
  }
  return analyzeCandidateResumeMock(file);
}

/**
 * Server action: create candidate.
 * @param {object} payload
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function createCandidateMockAction(payload) {
  try {
    await requireAdminSession();
  } catch {
    return { data: null, error: "Unauthorized" };
  }
  return createCandidateMock(payload);
}

/**
 * Server action: create job description.
 * @param {object} payload
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function createJobDescriptionAction(payload) {
  try {
    await requireAdminSession();
  } catch {
    return { data: null, error: "Unauthorized" };
  }
  const result = await createJobDescription(payload);
  if (result.data) {
    revalidatePath("/admin/job-descriptions");
    revalidatePath("/admin");
  }
  return result;
}

/**
 * Server action: update job description openings.
 * @param {{ job_description_id: string | number; openings: number }} params - RORO style
 * @returns {Promise<{ ok: boolean; data?: object; error?: string }>}
 */
export async function updateJobDescriptionOpeningsAction({ job_description_id, openings }) {
  try {
    await requireAdminSession();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }
  const result = await updateJobDescriptionOpeningsById({ job_description_id, openings });
  if (result.ok) {
    revalidatePath("/admin/job-descriptions");
    revalidatePath("/admin");
  }
  return result;
}

/**
 * Server action: delete job description.
 * @param {{ job_description_id: string | number }} params - RORO style
 * @returns {Promise<{ ok: boolean; deleted_id?: string; error?: string }>}
 */
export async function deleteJobDescriptionAction({ job_description_id }) {
  try {
    await requireAdminSession();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }
  const result = await deleteJobDescriptionById({ job_description_id });
  if (result.ok) {
    revalidatePath("/admin/job-descriptions");
    revalidatePath("/admin");
  }
  return result;
}

/**
 * Server action: delete candidate.
 * @param {{ candidate_id: string | number }} params - RORO style
 * @returns {Promise<{ ok: boolean; deleted_id?: string; error?: string }>}
 */
export async function deleteCandidateAction({ candidate_id }) {
  try {
    await requireAdminSession();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }
  const result = await deleteCandidateById({ candidate_id });
  if (result.ok) {
    revalidatePath("/admin/candidates");
    revalidatePath("/admin");
  }
  return result;
}
