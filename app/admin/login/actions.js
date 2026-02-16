"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loginAdmin } from "@/lib/mock-api";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth";

/**
 * Server action: validate credentials, set session cookie, redirect to dashboard.
 * @param {FormData} formData
 */
export async function handleLogin(formData) {
  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const { data, error } = await loginAdmin(email, password);

  if (error) {
    return { error };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, JSON.stringify(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  redirect("/admin");
}
