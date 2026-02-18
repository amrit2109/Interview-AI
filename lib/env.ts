/**
 * Centralized env validation. Validates at first use (lazy).
 * Skip strict validation when NODE_ENV === "test".
 */

import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(1).optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  GOOGLE_GEMINI_API_KEY: z.string().optional(),
  APP_BASE_URL: z.string().optional(),
  VERCEL_URL: z.string().optional(),
});

let cached: z.infer<typeof schema> | null = null;

function validate(): z.infer<typeof schema> {
  if (cached) return cached;

  const isTest = process.env.NODE_ENV === "test";
  const parsed = schema.safeParse(process.env);

  if (parsed.success) {
    cached = parsed.data;
    if (!isTest) {
      if (!parsed.data.DATABASE_URL) {
        throw new Error("DATABASE_URL must be set. Database operations will fail.");
      }
      if (process.env.NODE_ENV === "production" && !parsed.data.SESSION_SECRET) {
        throw new Error("SESSION_SECRET must be set in production.");
      }
    }
    return cached;
  }

  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  throw new Error(`Env validation failed: ${issues}`);
}

export function getEnv(): z.infer<typeof schema> {
  return validate();
}
