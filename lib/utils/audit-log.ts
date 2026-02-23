/**
 * Structured audit logging for key interview transitions.
 */

export type AuditEvent =
  | "pack_created"
  | "link_sent"
  | "session_started"
  | "session_submitted"
  | "evaluation_completed";

export interface AuditPayload {
  event: AuditEvent;
  token?: string;
  candidateId?: string;
  sessionId?: string;
  packId?: string;
  evaluationId?: string;
  timestamp: string;
}

export function logAuditEvent(payload: Omit<AuditPayload, "timestamp">): void {
  const full: AuditPayload = {
    ...payload,
    timestamp: new Date().toISOString(),
  };
  console.info("[audit]", JSON.stringify(full));
}
