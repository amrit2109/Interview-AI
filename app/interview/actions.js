"use server";

import { submitPreScreen } from "@/lib/api";

/**
 * Server action: submit pre-screening answers for an interview token.
 * @param {string} token - Interview token
 * @param {object} data - Pre-screen form data
 * @returns {Promise<{ data: object | null; error: string | null }>}
 */
export async function submitPreScreenAction(token, data) {
  return submitPreScreen(token, data);
}
