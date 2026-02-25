import { NextRequest, NextResponse } from "next/server";
import {
  AccessToken,
  RoomConfiguration,
  RoomAgentDispatch,
} from "livekit-server-sdk";
import { getCandidateByInterviewToken } from "@/lib/services/candidate.service";
import { getLiveKitConfig } from "@/lib/env";

/**
 * Mints a LiveKit room access token for the interview session.
 * Only valid interview tokens can obtain a token.
 * Room name is deterministic per token for reconnect consistency.
 * Token includes RoomAgentDispatch so the interview agent joins when participant connects.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token?.trim()) {
    return NextResponse.json({ error: "Invalid token." }, { status: 400 });
  }

  const lk = getLiveKitConfig();
  if (!lk) {
    return NextResponse.json(
      { error: "LiveKit is not configured." },
      { status: 503 }
    );
  }

  const validation = await getCandidateByInterviewToken(token.trim());
  if (!validation.valid || !validation.candidate) {
    return NextResponse.json(
      { error: validation.error ?? "Invalid or expired link." },
      { status: 403 }
    );
  }

  try {
    const roomName = `interview-${token.trim()}`;
    const identity = `candidate-${validation.candidate.id}`;

    const at = new AccessToken(lk.apiKey, lk.apiSecret, {
      identity,
      name: validation.candidate.name ?? identity,
      ttl: "1h",
    });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });
    at.roomConfig = new RoomConfiguration({
      agents: [
        new RoomAgentDispatch({
          agentName: lk.agentName,
          metadata: JSON.stringify({ interviewToken: token.trim() }),
        }),
      ],
    });

    const jwt = await at.toJwt();

    return NextResponse.json({
      token: jwt,
      url: lk.url,
      roomName,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Token creation failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
