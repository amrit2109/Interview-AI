import crypto from "crypto";

const TOKEN_BYTES = 32;
const EXPIRY_HOURS = 24;

/**
 * Generate a cryptographically secure random token for interview links.
 * Uses URL-safe base64 encoding (no padding).
 */
export function generateInterviewToken(): string {
  const bytes = crypto.randomBytes(TOKEN_BYTES);
  return bytes.toString("base64url");
}

/**
 * Compute token creation and expiration timestamps.
 * Expiration is 24 hours from now.
 */
export function getTokenTimestamps(): {
  tokenCreatedAt: Date;
  tokenExpiresAt: Date;
} {
  const tokenCreatedAt = new Date();
  const tokenExpiresAt = new Date(tokenCreatedAt.getTime() + EXPIRY_HOURS * 60 * 60 * 1000);
  return { tokenCreatedAt, tokenExpiresAt };
}

/**
 * Check if a token has expired based on tokenExpiresAt.
 * Null/undefined is treated as not expired (legacy tokens without expiry metadata).
 */
export function isTokenExpired(tokenExpiresAt: Date | string | null | undefined): boolean {
  if (tokenExpiresAt == null) return false;
  const expiry = typeof tokenExpiresAt === "string" ? new Date(tokenExpiresAt) : tokenExpiresAt;
  return new Date() > expiry;
}
