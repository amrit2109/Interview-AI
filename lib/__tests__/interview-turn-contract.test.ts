import { describe, it, expect } from "vitest";
import {
  parseAgentControlEvent,
  serializeAgentControlEvent,
  INTERVIEW_CONTROL_TOPIC,
} from "@/lib/interview-turn-contract";

describe("interview-turn-contract", () => {
  it("parses agent_speaking_started", () => {
    const ev = { type: "agent_speaking_started" };
    const payload = new TextEncoder().encode(JSON.stringify(ev));
    expect(parseAgentControlEvent(payload)).toEqual(ev);
  });

  it("parses user_turn_open", () => {
    const ev = { type: "user_turn_open" };
    const payload = new TextEncoder().encode(JSON.stringify(ev));
    expect(parseAgentControlEvent(payload)).toEqual(ev);
  });

  it("parses agent_ready", () => {
    const ev = { type: "agent_ready" };
    const payload = new TextEncoder().encode(JSON.stringify(ev));
    expect(parseAgentControlEvent(payload)).toEqual(ev);
  });

  it("returns null for invalid payload", () => {
    expect(parseAgentControlEvent(new Uint8Array())).toBeNull();
    expect(parseAgentControlEvent(new TextEncoder().encode("{}"))).toBeNull();
    expect(parseAgentControlEvent(new TextEncoder().encode('{"type":"unknown"}'))).toBeNull();
  });

  it("round-trips serialize and parse", () => {
    const ev = { type: "agent_speaking_finished" as const };
    const payload = serializeAgentControlEvent(ev);
    expect(parseAgentControlEvent(payload)).toEqual(ev);
  });

  it("INTERVIEW_CONTROL_TOPIC is defined", () => {
    expect(INTERVIEW_CONTROL_TOPIC).toBe("interview-control");
  });
});
