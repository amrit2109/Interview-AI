/**
 * Client-side screen recording service.
 * Uses getDisplayMedia + MediaRecorder. Must only be imported from client components.
 */

export type RecordingState =
  | "idle"
  | "requesting_permission"
  | "recording"
  | "stopping"
  | "terminated"
  | "uploading"
  | "completed"
  | "failed";

export interface RecordingStateChange {
  state: RecordingState;
  error?: string;
}

type StateListener = (ev: RecordingStateChange) => void;

const CHUNK_MS = 30_000; // 30s chunks for long sessions

let activeStream: MediaStream | null = null;
let activeRecorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let stateListeners: Set<StateListener> = new Set();
let currentState: RecordingState = "idle";

function setState(state: RecordingState, error?: string): void {
  currentState = state;
  const ev: RecordingStateChange = { state, ...(error && { error }) };
  stateListeners.forEach((fn) => fn(ev));
}

function cleanup(): void {
  if (activeRecorder && activeRecorder.state !== "inactive") {
    try {
      activeRecorder.stop();
    } catch {
      /* already stopped */
    }
    activeRecorder = null;
  }
  chunks = [];
  if (activeStream) {
    activeStream.getTracks().forEach((t) => t.stop());
    activeStream = null;
  }
}

export function getRecordingState(): RecordingState {
  return currentState;
}

export function subscribe(listener: StateListener): () => void {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

export function isRecordingActive(): boolean {
  return currentState === "recording" || currentState === "uploading";
}

export function isSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    navigator.mediaDevices?.getDisplayMedia &&
    typeof MediaRecorder !== "undefined"
  );
}

export async function startRecording(): Promise<{ ok: boolean; error?: string }> {
  if (currentState !== "idle" && currentState !== "terminated" && currentState !== "failed") {
    return { ok: false, error: "Recording already in progress." };
  }
  if (!isSupported()) {
    return { ok: false, error: "Screen recording is not supported in this browser." };
  }

  cleanup();
  setState("requesting_permission");

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
    activeStream = stream;

    const track = stream.getVideoTracks()[0];
    if (!track) {
      cleanup();
      setState("failed", "No video track from screen share.");
      return { ok: false, error: "No video track from screen share." };
    }

    track.onended = () => {
      if (currentState === "recording") {
        setState("terminated", "Screen sharing was stopped.");
        cleanup();
      }
    };

    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 2_500_000,
      audioBitsPerSecond: 128_000,
    });
    activeRecorder = recorder;
    chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      activeRecorder = null;
    };

    recorder.onerror = (e) => {
      setState("failed", (e as ErrorEvent).message ?? "Recording error.");
      cleanup();
    };

    recorder.start(CHUNK_MS);
    setState("recording");
    return { ok: true };
  } catch (err) {
    cleanup();
    const msg = err instanceof Error ? err.message : "Permission denied or failed to start.";
    setState("failed", msg);
    return { ok: false, error: msg };
  }
}

/**
 * Stops recording and returns a Promise that resolves with the final blob once
 * MediaRecorder has flushed the last data (ondataavailable runs after stop()).
 */
export function stopRecording(): Promise<Blob | null> {
  if (currentState !== "recording") return Promise.resolve(null);
  setState("stopping");

  const recorder = activeRecorder;
  const stream = activeStream;
  if (!recorder || recorder.state === "inactive") {
    cleanup();
    setState("terminated");
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const onStop = () => {
      activeRecorder = null;
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
        activeStream = null;
      }
      if (chunks.length === 0) {
        setState("terminated");
        resolve(null);
        return;
      }
      const blob = new Blob(chunks, { type: "video/webm" });
      chunks = [];
      setState("terminated");
      resolve(blob);
    };

    recorder.onstop = onStop;
    recorder.stop();
  });
}

export function terminateRecording(): void {
  if (currentState === "recording") {
    stopRecording();
  } else {
    cleanup();
    setState("terminated");
  }
}
