import nodemailer from "nodemailer";
import { Resend } from "resend";
import type { CandidateWithToken } from "./candidate.service";
import { getEnv } from "@/lib/env";

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getBaseUrl(): string {
  const env = getEnv();
  const url = env.APP_BASE_URL ?? env.VERCEL_URL;
  if (url) {
    const base = url.startsWith("http") ? url : `https://${url}`;
    return base.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

function createTransporter(): nodemailer.Transporter | null {
  const env = getEnv();
  const host = env.SMTP_HOST;
  const port = env.SMTP_PORT;
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  const secure = env.SMTP_SECURE === "true";

  if (!host || !user || !pass) {
    return null;
  }

  const portNum = port ? parseInt(port, 10) : secure ? 465 : 587;
  return nodemailer.createTransport({
    host,
    port: Number.isNaN(portNum) ? (secure ? 465 : 587) : portNum,
    secure,
    auth: { user, pass },
  });
}

function buildEmailContent(candidate: CandidateWithToken): {
  html: string;
  text: string;
  subject: string;
} {
  const baseUrl = getBaseUrl();
  const interviewUrl = `${baseUrl}/interview/${candidate.token}`;
  const safeName = escapeHtml(candidate.name);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Interview Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; color: #18181b;">
  <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
    <div style="background: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
      <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600;">Your Interview Invitation</h1>
      <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #52525b;">
        Hi ${safeName},
      </p>
      <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #52525b;">
        You have been invited to complete an AI voice interview. Click the button below to get started.
      </p>
      <p style="margin: 0 0 24px;">
        <a href="${interviewUrl}" style="display: inline-block; padding: 12px 24px; background: #f97316; color: white; text-decoration: none; font-weight: 600; border-radius: 6px; font-size: 16px;">Start Interview</a>
      </p>
      <p style="margin: 0 0 8px; font-size: 14px; line-height: 1.6; color: #71717a;">
        Or copy this link:
      </p>
      <p style="margin: 0 0 24px; font-size: 14px; word-break: break-all; color: #3b82f6;">
        <a href="${interviewUrl}" style="color: #3b82f6;">${interviewUrl}</a>
      </p>
      <div style="padding: 16px; background: #fef3c7; border-radius: 6px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>Important:</strong> This link is valid for 24 hours. Please complete your interview before it expires.
        </p>
      </div>
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #71717a;">
        If you did not expect this invitation, you can safely ignore this email.
      </p>
    </div>
    <p style="margin: 24px 0 0; font-size: 12px; color: #a1a1aa; text-align: center;">
      Orion TalentIQ
    </p>
  </div>
</body>
</html>
`;

  const text = `
Hi ${candidate.name},

You have been invited to complete an AI voice interview. Use the link below to get started:

${interviewUrl}

Important: This link is valid for 24 hours. Please complete your interview before it expires.

If you did not expect this invitation, you can safely ignore this email.

Orion TalentIQ
`;

  return {
    html,
    text,
    subject: "Your Interview Invitation – Orion TalentIQ",
  };
}

/**
 * Send via Resend (HTTP API) - reliable on Vercel serverless.
 * Uses onboarding@resend.dev for testing; set RESEND_FROM for verified domain.
 */
async function sendViaResend(
  candidate: CandidateWithToken,
  content: { html: string; text: string; subject: string }
): Promise<string | null> {
  const env = getEnv();
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;

  const fromRaw = env.RESEND_FROM?.trim() ?? env.EMAIL_FROM?.trim();
  const from = fromRaw?.includes("<")
    ? fromRaw
    : fromRaw
      ? `Orion TalentIQ <${fromRaw}>`
      : "Orion TalentIQ <onboarding@resend.dev>";

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: candidate.email,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
    if (error) {
      console.error("sendInterviewInviteEmail (Resend):", error);
      return error.message ?? JSON.stringify(error);
    }
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("sendInterviewInviteEmail (Resend):", err);
    return msg;
  }
}

/**
 * Send via SMTP (nodemailer) - works locally; can fail on Vercel with EBUSY.
 */
async function sendViaSmtp(
  candidate: CandidateWithToken,
  content: { html: string; text: string; subject: string }
): Promise<string | null> {
  const transporter = createTransporter();
  if (!transporter) {
    return "Email service is not configured. Set RESEND_API_KEY (recommended for Vercel) or SMTP_HOST, SMTP_USER, SMTP_PASS.";
  }

  const env = getEnv();
  const from = env.EMAIL_FROM ?? env.SMTP_USER;
  if (!from) return "Email configuration error: EMAIL_FROM or SMTP_USER must be set.";

  try {
    await transporter.sendMail({
      from,
      to: candidate.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("sendInterviewInviteEmail (SMTP):", err);
    return msg;
  }
}

/**
 * Send interview invite email with link and 24-hour expiry notice.
 * Prefers Resend (HTTP) on Vercel; falls back to SMTP for local dev.
 * Returns error message on failure, null on success.
 */
export async function sendInterviewInviteEmail(
  candidate: CandidateWithToken
): Promise<string | null> {
  const content = buildEmailContent(candidate);
  const env = getEnv();

  // Prefer Resend on Vercel (avoids getaddrinfo EBUSY with SMTP)
  if (env.RESEND_API_KEY?.trim()) {
    return await sendViaResend(candidate, content);
  }

  // Fall back to SMTP (local dev)
  return await sendViaSmtp(candidate, content);
}
