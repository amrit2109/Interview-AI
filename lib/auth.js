/**
 * Admin auth utilities for session handling.
 * Uses signed opaque tokens (HMAC-SHA256) - no raw user JSON in cookie.
 */

import { getEnv } from "@/lib/env";

export const ADMIN_SESSION_COOKIE = "orion_admin_session";

const TOKEN_TTL_SEC = 60 * 60 * 24; // 24 hours
const ALG = "HS256";

function getSecret() {
  const env = getEnv();
  const s = env.SESSION_SECRET;
  if (!s && env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production");
  }
  return new TextEncoder().encode(s || "orion-dev-secret");
}

function base64UrlEncode(buf) {
  const b64 = typeof buf === "string" ? btoa(buf) : btoa(String.fromCharCode(...new Uint8Array(buf)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  const padded = pad ? b64 + "=".repeat(4 - pad) : b64;
  return atob(padded);
}

/**
 * Create a signed session token. Server-only (Node).
 * @param {{ sub: string }} payload - sub = admin id
 * @returns {Promise<string>}
 */
export async function signToken(payload) {
  const secret = getSecret();
  const header = { alg: ALG, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = {
    sub: String(payload.sub),
    iat: now,
    exp: now + TOKEN_TTL_SEC,
  };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const bodyB64 = base64UrlEncode(JSON.stringify(body));
  const message = `${headerB64}.${bodyB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  const sigB64 = base64UrlEncode(sig);
  return `${message}.${sigB64}`;
}

/**
 * Verify a signed session token. Works in Edge (middleware) and Node.
 * @param {string} token
 * @returns {Promise<{ sub: string } | null>}
 */
export async function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, bodyB64, sigB64] = parts;
  const message = `${headerB64}.${bodyB64}`;

  try {
    const secret = getSecret();
    const key = await crypto.subtle.importKey(
      "raw",
      secret,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigStr = base64UrlDecode(sigB64);
    const sig = new Uint8Array(sigStr.length);
    for (let i = 0; i < sigStr.length; i++) sig[i] = sigStr.charCodeAt(i);

    const valid = await crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(message));
    if (!valid) return null;

    const bodyJson = JSON.parse(base64UrlDecode(bodyB64));
    if (bodyJson.exp && bodyJson.exp < Math.floor(Date.now() / 1000)) return null;
    if (!bodyJson.sub) return null;

    return { sub: bodyJson.sub };
  } catch {
    return null;
  }
}
