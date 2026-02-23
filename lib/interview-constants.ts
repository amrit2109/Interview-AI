/**
 * Shared constants for the interview client–agent contract.
 * Used by lib/livekit-voice.service.ts (client) and livekit-agent/main.ts (agent).
 * Both must use the same prefix for "read this question aloud" messages on lk.chat.
 */
export const READ_QUESTION_PREFIX =
  "Please read this interview question aloud exactly as written: ";
