/**
 * Strict turn-state machine and event contract between client and LiveKit agent.
 * Single source of truth for interview voice flow.
 */

/** Client-visible turn states (deterministic). */
export type TurnState =
  | "idle"
  | "connecting"
  | "agentSpeaking"
  | "userAnswering"
  | "savingTurn"
  | "completed"
  | "error";

/** Agent -> Client events (via DataReceived, topic: INTERVIEW_CONTROL_TOPIC). */
export type AgentControlEvent =
  | { type: "agent_speaking_started" }
  | { type: "agent_speaking_finished" }
  | { type: "user_turn_open" }
  | { type: "agent_ready" };

/** Topic for agent control messages (DataPacket). */
export const INTERVIEW_CONTROL_TOPIC = "interview-control";

/** Client -> Agent: submit answer before advancing (via lk.chat). */
export const SUBMIT_ANSWER_PREFIX = "SUBMIT_ANSWER:";

export function parseAgentControlEvent(payload: Uint8Array): AgentControlEvent | null {
  try {
    const str = new TextDecoder().decode(payload);
    const parsed = JSON.parse(str) as unknown;
    if (parsed && typeof parsed === "object" && "type" in parsed && typeof (parsed as { type: unknown }).type === "string") {
      const ev = parsed as AgentControlEvent;
      if (
        ev.type === "agent_speaking_started" ||
        ev.type === "agent_speaking_finished" ||
        ev.type === "user_turn_open" ||
        ev.type === "agent_ready"
      ) {
        return ev;
      }
    }
  } catch {
    /* ignore parse errors */
  }
  return null;
}

export function serializeAgentControlEvent(ev: AgentControlEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(ev));
}
