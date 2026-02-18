"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MonitorIcon, AlertCircleIcon, Loader2Icon } from "lucide-react";
import { isSupported, startRecording } from "@/lib/services/screen-recording.service";

/**
 * Blocking modal requiring screen share permission before Step 2.
 * Cannot proceed without granting permission.
 */
export function ScreenShareGate({ onGranted }) {
  const [status, setStatus] = useState("idle"); // idle | requesting | denied | unsupported
  const [error, setError] = useState("");

  const handleStart = async () => {
    if (!isSupported()) {
      setStatus("unsupported");
      setError("Screen recording is not supported in this browser. Please use Chrome, Edge, or Firefox.");
      return;
    }

    setStatus("requesting");
    setError("");

    const { ok, error: err } = await startRecording();
    if (ok) {
      onGranted?.();
      return;
    }
    setStatus("denied");
    setError(err ?? "Permission denied. Please try again.");
  };

  const handleRetry = () => {
    setStatus("idle");
    setError("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="screen-share-title"
      aria-describedby="screen-share-desc"
    >
      <div className="mx-4 w-full max-w-lg rounded-2xl border bg-background p-6 shadow-xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <MonitorIcon className="size-7 text-primary" aria-hidden />
          </div>
          <div>
            <h2 id="screen-share-title" className="text-xl font-semibold">
              Screen Sharing Required
            </h2>
            <p id="screen-share-desc" className="mt-2 text-sm text-muted-foreground">
              To continue with the interview, you must share your screen. This is
              required for monitoring and proctoring purposes. Your recording
              will be stored securely and only used for evaluation.
            </p>
          </div>

          {status === "unsupported" && (
            <div className="flex w-full items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-left text-sm text-destructive">
              <AlertCircleIcon className="size-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {status === "denied" && (
            <div className="flex w-full items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-left text-sm text-destructive">
              <AlertCircleIcon className="size-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            {status === "denied" ? (
              <Button onClick={handleRetry} variant="outline" data-icon="inline-start">
                Try Again
              </Button>
            ) : status === "unsupported" ? null : (
              <Button
                onClick={handleStart}
                disabled={status === "requesting"}
                data-icon="inline-start"
              >
                {status === "requesting" ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Requesting permission…
                  </>
                ) : (
                  <>
                    <MonitorIcon className="size-4" />
                    Start Screen Sharing
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
