"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScreenShareGate } from "@/components/interview/ScreenShareGate";
import {
  subscribe,
  stopRecording,
  terminateRecording,
  getRecordingState,
  isRecordingActive,
} from "@/lib/services/screen-recording.service";
import { MicIcon, ArrowRightIcon, CircleIcon, AlertTriangleIcon } from "lucide-react";

const UPLOAD_TIMEOUT_MS = 120_000;
const UPLOAD_RETRIES = 2;

export function InterviewSessionClient({ token, interview, questions }) {
  const router = useRouter();
  const [gatePassed, setGatePassed] = useState(false);
  const [violated, setViolated] = useState(false);
  const [violationReason, setViolationReason] = useState("");
  const [uploadFailedTerminal, setUploadFailedTerminal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [tabWarning, setTabWarning] = useState(false);
  const failSentRef = useRef(false);

  const questionList = questions ?? [];
  const currentIndex = 0;
  const currentQuestion = questionList[currentIndex];

  const sendFail = useCallback(
    async (reason) => {
      if (failSentRef.current) return;
      failSentRef.current = true;
      try {
        await fetch(`/api/interview/${token}/recording/fail`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason ?? "Recording terminated" }),
        });
      } catch {
        /* best effort */
      }
    },
    [token]
  );

  useEffect(() => {
    const unsub = subscribe((ev) => {
      if (ev.state === "terminated" && ev.error) {
        setViolated(true);
        setViolationReason(ev.error ?? "Screen sharing was stopped.");
        sendFail(ev.error);
      }
    });
    return unsub;
  }, [sendFail]);

  useEffect(() => {
    const handleVisibility = () => {
      setTabWarning(document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    const handleUnload = () => {
      if (isRecordingActive()) {
        terminateRecording();
        const payload = JSON.stringify({ reason: "page_closed_or_refreshed" });
        navigator.sendBeacon(
          `/api/interview/${token}/recording/fail`,
          new Blob([payload], { type: "application/json" })
        );
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [token]);

  const handleComplete = async () => {
    if (violated || isUploading) return;

    setIsUploading(true);
    setUploadError("");

    const blob = await stopRecording();
    // #region agent log
    fetch("http://127.0.0.1:7245/ingest/a062950e-dd39-4c19-986f-667c51ac69a7", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "InterviewSessionClient.jsx:handleComplete",
        message: "handleComplete blob",
        data: { hasBlob: !!blob, blobSize: blob?.size ?? 0 },
        timestamp: Date.now(),
        hypothesisId: "H2",
      }),
    }).catch(() => {});
    // #endregion
    if (!blob) {
      setUploadError("No recording data. Please try again.");
      setIsUploading(false);
      return;
    }

    for (let attempt = 0; attempt <= UPLOAD_RETRIES; attempt++) {
      try {
        const uploadRes = await Promise.race([
          fetch(`/api/interview/${token}/recording/upload`, {
            method: "POST",
            body: blob,
            headers: { "Content-Type": "video/webm" },
          }),
          new Promise((_, rej) =>
            setTimeout(() => rej(new Error("Upload timeout")), UPLOAD_TIMEOUT_MS)
          ),
        ]);

        // #region agent log
        fetch("http://127.0.0.1:7245/ingest/a062950e-dd39-4c19-986f-667c51ac69a7", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "InterviewSessionClient.jsx:handleComplete",
            message: "upload response",
            data: { ok: uploadRes.ok, status: uploadRes.status, attempt },
            timestamp: Date.now(),
            hypothesisId: "H3,H4",
          }),
        }).catch(() => {});
        // #endregion
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          throw new Error(err.error ?? "Upload failed.");
        }

        router.push(`/interview/${token}/complete`);
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed.";
        // #region agent log
        fetch("http://127.0.0.1:7245/ingest/a062950e-dd39-4c19-986f-667c51ac69a7", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "InterviewSessionClient.jsx:handleComplete",
            message: "upload catch",
            data: {
              attempt,
              errMessage: err instanceof Error ? err.message : String(err),
              errName: err instanceof Error ? err.name : undefined,
            },
            timestamp: Date.now(),
            hypothesisId: "H3,H4",
          }),
        }).catch(() => {});
        // #endregion
        if (attempt === UPLOAD_RETRIES) {
          setUploadError(msg);
          setUploadFailedTerminal(true);
          await sendFail(`upload_failed: ${msg}`);
          setIsUploading(false);
          return;
        }
      }
    }
    setIsUploading(false);
  };

  if (!gatePassed) {
    return (
      <ScreenShareGate
        onGranted={() => setGatePassed(true)}
      />
    );
  }

  if (violated || uploadFailedTerminal) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <Card className="w-full max-w-md" size="sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangleIcon className="size-8 text-destructive" aria-hidden />
            </div>
            <CardTitle className="text-xl">
              {uploadFailedTerminal ? "Interview Failed" : "Interview Terminated"}
            </CardTitle>
            <p className="text-muted-foreground">
              {uploadFailedTerminal ? uploadError : violationReason}
            </p>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              {uploadFailedTerminal
                ? "Recording could not be uploaded. Please contact support."
                : "Screen sharing was stopped. This interview cannot be continued."}
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Return home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col px-4 py-6 sm:py-8">
      {tabWarning && (
        <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-center gap-2 bg-amber-500/90 px-4 py-2 text-sm font-medium text-amber-950">
          <AlertTriangleIcon className="size-4" />
          Please return to this tab. Switching away may affect your recording.
        </div>
      )}

      <header className="mb-6 text-center sm:mb-8">
        <div className="flex items-center justify-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
            <CircleIcon className="size-2 fill-current" />
            Recording
          </span>
        </div>
        <h1 className="mt-2 text-xl font-bold sm:text-2xl">{interview.jobTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Question {currentIndex + 1} of {questionList.length}
        </p>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MicIcon className="size-5 text-primary" aria-hidden />
              Voice Interview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Question</p>
              <p className="mt-2 text-lg">{currentQuestion?.text ?? "No questions available."}</p>
            </div>
            <Separator />
            <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Voice recording will be integrated in a later phase.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Your screen is being recorded for proctoring purposes.
              </p>
            </div>
            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button
                variant="outline"
                disabled={isUploading}
                onClick={() => {
                  terminateRecording();
                  sendFail("user_navigated_back");
                  router.push(`/interview/${token}`);
                }}
              >
                Back
              </Button>
              <Button
                onClick={handleComplete}
                disabled={isUploading}
                data-icon="inline-end"
              >
                {isUploading ? "Uploading…" : "Submit Interview"}
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
