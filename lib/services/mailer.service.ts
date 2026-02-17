import nodemailer from "nodemailer";
import type { CandidateWithToken } from "./candidate.service";

function getBaseUrl(): string {
  const url = process.env.APP_BASE_URL ?? process.env.VERCEL_URL;
  if (url) {
    const base = url.startsWith("http") ? url : `https://${url}`;
    return base.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

function createTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true";

  if (!host || !user || !pass) {
    console.error(
      "Mailer: SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env"
    );
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

/**
 * Send interview invite email with link and 24-hour expiry notice.
 * Returns error message on failure, null on success.
 */
export async function sendInterviewInviteEmail(
  candidate: CandidateWithToken
): Promise<string | null> {
  const transporter = createTransporter();
  if (!transporter) {
    return "Email service is not configured.";
  }

  const from = process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? "amritpal2109@gmail.com";
  const baseUrl = getBaseUrl();
  const interviewUrl = `${baseUrl}/interview/${candidate.token}`;

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
        Hi ${candidate.name},
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

  try {
    await transporter.sendMail({
      from,
      to: candidate.email,
      subject: "Your Interview Invitation – Orion TalentIQ",
      text,
      html,
    });
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("sendInterviewInviteEmail:", err);
    return msg;
  }
}
