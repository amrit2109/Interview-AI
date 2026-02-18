/**
 * Next.js instrumentation. Runs at server startup.
 * Validates env so missing/invalid vars fail fast with clear errors.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getEnv } = await import("./lib/env");
    getEnv();
  }
}
