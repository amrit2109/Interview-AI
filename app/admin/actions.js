"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth";
import {
  getJobDescriptions,
  analyzeCandidateResumeMock,
  createCandidateMock,
  createJobDescription,
} from "@/lib/mock-api";

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
  return getJobDescriptions();
}

/**
 * Server action: analyze resume (mock) and return prefilled candidate data.
 * @param {FormData} formData - Must contain "file" key with File
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function analyzeCandidateResumeMockAction(formData) {
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
  return createCandidateMock(payload);
}

/**
 * Server action: create job description.
 * @param {object} payload
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function createJobDescriptionAction(payload) {
  const result = await createJobDescription(payload);
  if (result.data) {
    revalidatePath("/admin/job-descriptions");
    revalidatePath("/admin");
  }
  return result;
}
