/**
 * Centralized env validation. Validates at first use (lazy).
 * Skip strict validation when NODE_ENV === "test".
 * Skip DATABASE_URL during Next.js build phase (Vercel build may not have it).
 */

import { z } from "zod";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters").optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  GOOGLE_GEMINI_API_KEY: z.string().optional(),
  LIVEKIT_URL: z.string().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  LIVEKIT_AGENT_NAME: z.string().optional(),
  APP_BASE_URL: z.string().optional(),
  VERCEL_URL: z.string().optional(),
  USE_LEGACY_INTERVIEW_QUESTIONS: z.string().optional(),
});

let cached: z.infer<typeof schema> | null = null;

function validate(): z.infer<typeof schema> {
  if (cached) return cached;

  const isTest = process.env.NODE_ENV === "test";
  const parsed = schema.safeParse(process.env);

  if (parsed.success) {
    cached = parsed.data;
    const isBuildPhase = process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;
    if (!isTest && !isBuildPhase) {
      if (!parsed.data.DATABASE_URL) {
        throw new Error("DATABASE_URL must be set. Database operations will fail.");
      }
      if (process.env.NODE_ENV === "production" && !isBuildPhase) {
        if (!parsed.data.SESSION_SECRET || parsed.data.SESSION_SECRET.length < 32) {
          throw new Error("SESSION_SECRET must be set and at least 32 characters in production.");
        }
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

export function getLiveKitConfig(): {
  enabled: boolean;
  url: string;
  apiKey: string;
  apiSecret: string;
  agentName: string;
} | null {
  const env = getEnv();
  const url = env.LIVEKIT_URL?.trim();
  const apiKey = env.LIVEKIT_API_KEY?.trim();
  const apiSecret = env.LIVEKIT_API_SECRET?.trim();
  if (!url || !apiKey || !apiSecret) return null;
  const agentName = env.LIVEKIT_AGENT_NAME?.trim() || "interview-agent";
  return {
    enabled: true,
    url,
    apiKey,
    apiSecret,
    agentName,
  };
}
