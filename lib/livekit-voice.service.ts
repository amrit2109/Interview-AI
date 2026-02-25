/**
 * LiveKit voice session for interview.
 * Strict turn-taking: mic disabled during agent speech, enabled only after user_turn_open.
 * Connects once, reuses session across questions.
 */

import { Room, RoomEvent, createLocalAudioTrack } from "livekit-client";
import {
  READ_QUESTION_PREFIX,
  SUBMIT_ANSWER_PREFIX,
} from "./interview-constants";
import {
  INTERVIEW_CONTROL_TOPIC,
  parseAgentControlEvent,
  type TurnState,
} from "./interview-turn-contract";
import { isEnglish } from "./language/english-only";

export type LiveSessionState = TurnState;

export interface LiveKitVoiceCallbacks {
  onStateChange?: (state: LiveSessionState) => void;
  onTranscriptChunk?: (text: string, isFinal?: boolean) => void;
  onLanguageWarning?: (reason: string) => void;
  onError?: (err: unknown) => void;
}

export interface LiveKitVoiceSession {
  speakQuestion: (questionText: string) => void;
  submitAnswer: () => void;
  endAudioStream: () => void;
  disconnect: () => void;
}

function normalizeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Connection failed. Please try again.";
}

async function fetchLiveKitToken(
  interviewToken: string
): Promise<{ token: string; url: string; roomName: string }> {
  const res = await fetch(`/api/interview/${interviewToken}/live/livekit-token`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Token request failed: ${res.status}`);
  }
  const data = await res.json();
  if (!data?.token || !data?.url)
    throw new Error("No token or url in response.");
  return {
    token: data.token,
    url: data.url,
    roomName: data.roomName ?? `interview-${interviewToken}`,
  };
}

export async function createLiveKitVoiceSession(
  interviewToken: string,
  callbacks: LiveKitVoiceCallbacks
): Promise<LiveKitVoiceSession> {
  let disconnected = false;

  const safeStateChange = (state: LiveSessionState) => {
    if (!disconnected) callbacks.onStateChange?.(state);
  };

  const safeError = (err: unknown) => {
    if (!disconnected) callbacks.onError?.(normalizeError(err));
  };

  safeStateChange("connecting");

  const { token, url } = await fetchLiveKitToken(interviewToken);
  const room = new Room();

  let localIdentity: string | null = null;
  const audioElements: HTMLAudioElement[] = [];
  let audioTrack: Awaited<ReturnType<typeof createLocalAudioTrack>> | null =
    null;
  let publishedAudioTrack: typeof audioTrack = null;
  let agentReady = false;
  let pendingQuestion: string | null = null;

  const doSendQuestion = (text: string) => {
    if (disconnected || room.state !== "connected") return;
    safeStateChange("agentSpeaking");
    sendToAgent(`${READ_QUESTION_PREFIX}${text}`);
  };

  const unpublishMic = () => {
    if (publishedAudioTrack) {
      room.localParticipant.unpublishTrack(publishedAudioTrack);
      publishedAudioTrack = null;
    }
  };

  const publishMic = async () => {
    if (disconnected || room.state !== "connected" || publishedAudioTrack)
      return;
    if (!audioTrack) {
      audioTrack = await createLocalAudioTrack();
    }
    await room.localParticipant.publishTrack(audioTrack, { name: "microphone" });
    publishedAudioTrack = audioTrack;
  };

  const sendToAgent = (text: string) => {
    if (disconnected || room.state !== "connected") return;
    room.localParticipant
      .sendText(text, { topic: "lk.chat" })
      .catch((err) => safeError(err));
  };

  room.on(RoomEvent.Connected, () => {
    if (disconnected) return;
    localIdentity = room.localParticipant.identity;
  });

  room.on(RoomEvent.Disconnected, () => {
    safeStateChange("completed");
  });

  room.on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
    if (disconnected || topic !== INTERVIEW_CONTROL_TOPIC) return;
    if (participant?.identity === localIdentity) return;
    const ev = parseAgentControlEvent(payload);
    if (!ev) return;
    if (ev.type === "agent_ready") {
      agentReady = true;
      if (pendingQuestion) {
        const q = pendingQuestion;
        pendingQuestion = null;
        doSendQuestion(q);
      }
      return;
    }
    if (ev.type === "agent_speaking_started") {
      safeStateChange("agentSpeaking");
      return;
    }
    if (ev.type === "agent_speaking_finished" || ev.type === "user_turn_open") {
      publishMic().catch(safeError);
      if (!disconnected) safeStateChange("userAnswering");
      return;
    }
  });

  room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
    if (track.kind === "audio" && participant.identity !== localIdentity) {
      const el = track.attach();
      if (el instanceof HTMLAudioElement) {
        el.autoplay = true;
        document.body.appendChild(el);
        audioElements.push(el);
      }
    }
  });

  room.registerTextStreamHandler("lk.transcription", async (reader, participantInfo) => {
    if (disconnected) return;
    try {
      const message = await reader.readAll();
      if (!message?.trim()) return;
      const isFinal =
        reader.info?.attributes?.["lk.transcription_final"] === "true";

      if (participantInfo.identity === localIdentity) {
        if (!disconnected) {
          if (isFinal) {
            const { isEnglish: ok, reason } = isEnglish(message);
            if (!ok && reason) {
              callbacks.onLanguageWarning?.(reason);
              return;
            }
          }
          callbacks.onTranscriptChunk?.(message, isFinal);
        }
      } else if (!agentReady) {
        agentReady = true;
      }
    } catch {
      /* ignore */
    }
  });

  try {
    await room.connect(url, token);
  } catch (err) {
    safeStateChange("error");
    safeError(err);
    throw err;
  }

  // Ensure microphone is published once the room is connected so the agent
  // can receive audio whenever its input is enabled. Turn-taking is still
  // enforced on the agent side via input gating.
  await publishMic();

  return {
    speakQuestion(questionText: string) {
      if (disconnected || room.state !== "connected") return;
      pendingQuestion = questionText;
      if (agentReady) {
        pendingQuestion = null;
        doSendQuestion(questionText);
      }
    },

    submitAnswer() {
      if (disconnected || room.state !== "connected") return;
      safeStateChange("savingTurn");
      sendToAgent(SUBMIT_ANSWER_PREFIX);
    },

    endAudioStream() {
      unpublishMic();
    },

    disconnect() {
      if (disconnected) return;
      disconnected = true;
      unpublishMic();
      audioElements.forEach((el) => {
        try {
          el.remove();
        } catch {
          /* ignore */
        }
      });
      room.disconnect();
    },
  };
}
