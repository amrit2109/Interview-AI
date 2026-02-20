/**
 * LiveKit voice session for interview.
 * Connects to room, sends questions via lk.chat, collects transcript from lk.transcription.
 */

import { Room, RoomEvent, createLocalAudioTrack } from "livekit-client";

export type LiveSessionState =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "error"
  | "ended";

export interface LiveKitVoiceCallbacks {
  onStateChange?: (state: LiveSessionState) => void;
  onTranscriptChunk?: (text: string, isFinal?: boolean) => void;
  onError?: (err: unknown) => void;
}

export interface LiveKitVoiceSession {
  speakQuestion: (questionText: string) => void;
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

  room.on(RoomEvent.Connected, () => {
    if (disconnected) return;
    localIdentity = room.localParticipant.identity;
    safeStateChange("listening");
  });

  room.on(RoomEvent.Disconnected, () => {
    safeStateChange("ended");
  });

  room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
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
    if (disconnected || participantInfo.identity !== localIdentity) return;
    try {
      const message = await reader.readAll();
      if (!message?.trim()) return;
      const isFinal =
        reader.info?.attributes?.["lk.transcription_final"] === "true";
      if (!disconnected) callbacks.onTranscriptChunk?.(message, isFinal);
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

  const audioTrack = await createLocalAudioTrack();
  await room.localParticipant.publishTrack(audioTrack, { name: "microphone" });

  let publishedAudioTrack: typeof audioTrack | null = audioTrack;

  return {
    speakQuestion(questionText: string) {
      if (disconnected || room.state !== "connected") return;
      safeStateChange("speaking");
      room.localParticipant
        .sendText(
          `Please read this interview question aloud exactly as written: ${questionText}`,
          { topic: "lk.chat" }
        )
        .then(() => {
          if (!disconnected) safeStateChange("listening");
        })
        .catch((err) => {
          safeError(err);
        });
    },

    endAudioStream() {
      if (publishedAudioTrack) {
        room.localParticipant.unpublishTrack(publishedAudioTrack);
        publishedAudioTrack = null;
      }
    },

    disconnect() {
      if (disconnected) return;
      disconnected = true;
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
