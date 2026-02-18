import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function validateAdminCredentials(
  email: string,
  password: string
): Promise<{ valid: boolean; user?: AdminUser }> {
  if (!sql) return { valid: false };
  try {
    const rows = await sql`SELECT id, email, password_hash, name, role FROM admins WHERE email = ${email} LIMIT 1`;
    const admin = rows[0] as { id: string; email: string; password_hash: string; name: string; role: string } | undefined;
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      return { valid: false };
    }
    return {
      valid: true,
      user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    };
  } catch (err) {
    console.error("validateAdminCredentials:", err);
    return { valid: false };
  }
}

export async function loginAdmin(
  email: string,
  password: string
): Promise<{ data: AdminUser | null; error: string | null }> {
  if (!sql) return { data: null, error: "Database not configured." };
  try {
    const result = await validateAdminCredentials(email, password);
    if (!result.valid) {
      return { data: null, error: "Invalid email or password." };
    }
    return { data: result.user ?? null, error: null };
  } catch (err) {
    console.error("loginAdmin:", err);
    return { data: null, error: "Login failed." };
  }
}
