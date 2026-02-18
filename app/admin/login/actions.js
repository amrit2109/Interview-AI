"use server";

import { cookies } from "next/headers";
import { loginAdmin } from "@/lib/api";
import { ADMIN_SESSION_COOKIE, signToken } from "@/lib/auth";
import { getEnv } from "@/lib/env";

/**
 * Server action: validate credentials, set signed session cookie.
 * Returns success/error; client navigates to /admin on success to avoid
 * Next.js 303 redirect cookie override (issue #61611).
 * @param {FormData} formData
 */
export async function handleLogin(formData) {
  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const { data, error } = await loginAdmin(email, password);

  if (error || !data) {
    return { error: error ?? "Invalid credentials." };
  }

  const token = await signToken({ sub: String(data.id) });
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: getEnv().NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  return { success: true };
}
