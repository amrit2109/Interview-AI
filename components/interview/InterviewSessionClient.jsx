"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScreenShareGate } from "@/components/interview/ScreenShareGate";
import { useRecording } from "@/context/RecordingContext";
import {
  MicIcon,
  ArrowRightIcon,
  CircleIcon,
  AlertTriangleIcon,
  MicOffIcon,
  RotateCcwIcon,
  CheckIcon,
} from "lucide-react";
import { createLiveKitVoiceSession } from "@/lib/livekit-voice.service";

const UPLOAD_TIMEOUT_MS = 120_000;
const UPLOAD_RETRIES = 2;
const MAX_RESPONSE_DURATION_MS = 120_000; // 2 min per question
const TIMER_WARNING_THRESHOLD_MS = 30_000; // 30s left
const ANSWER_SAVED_DISPLAY_MS = 1_500;

export function InterviewSessionClient({ token, interview, questions }) {
  const router = useRouter();
  const {
    subscribe,
    stopRecording,
    terminateRecording,
    isRecordingActive,
  } = useRecording();
  const [gatePassed, setGatePassed] = useState(false);
  const [violated, setViolated] = useState(false);
  const [violationReason, setViolationReason] = useState("");
  const [uploadFailedTerminal, setUploadFailedTerminal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [tabWarning, setTabWarning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerText, setAnswerText] = useState("");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const failSentRef = useRef(false);

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(true);
  const [liveState, setLiveState] = useState("idle");
  const [liveError, setLiveError] = useState("");
  const [voicePaused, setVoicePaused] = useState(false);
  const [answerSaved, setAnswerSaved] = useState(false);
  const [timeRemainingMs, setTimeRemainingMs] = useState(null);
  const liveSessionRef = useRef(null);
  const durationTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const questionList = Array.isArray(questions)
    ? questions.map((q) => ({
        id: q.id ?? String(q.id),
        text: typeof q.text === "string" ? q.text : q.question ?? "",
      }))
    : [];
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
    fetch(`/api/interview/${token}/live/config`)
      .then((r) => r.json())
      .then((d) => setVoiceEnabled(d?.enabled === true))
      .catch(() => setVoiceEnabled(true))
      .finally(() => setVoiceLoading(false));
  }, [token]);

  useEffect(() => {
    if (gatePassed && !sessionStarted && questionList.length > 0) {
      fetch(`/api/interview/${token}/session/start`, { method: "POST" })
        .then(() => setSessionStarted(true))
        .catch(() => {});
    }
  }, [gatePassed, sessionStarted, token, questionList.length]);

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
        const payload = JSON.stringify({ reason: "page_closed_or_refreshed" });
        navigator.sendBeacon(
          `/api/interview/${token}/recording/fail`,
          new Blob([payload], { type: "application/json" })
        );
        terminateRecording();
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [token]);

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setTimeRemainingMs(null);
  }, []);

  const cleanupLiveSession = useCallback(() => {
    if (durationTimerRef.current) {
      clearTimeout(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    clearCountdown();
    const session = liveSessionRef.current;
    liveSessionRef.current = null;
    if (session) {
      session.disconnect();
    }
    setLiveState("idle");
    setVoicePaused(false);
  }, [clearCountdown]);

  const stopVoiceCapture = useCallback(() => {
    if (durationTimerRef.current) {
      clearTimeout(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    clearCountdown();
    if (liveSessionRef.current) {
      liveSessionRef.current.endAudioStream();
    }
    setVoicePaused(true);
  }, [clearCountdown]);

  const startVoiceSession = useCallback(async () => {
    if (!currentQuestion || !voiceEnabled || liveState === "connecting") return;
    setLiveError("");
    setVoicePaused(false);
    cleanupLiveSession();

    try {
      const session = await createLiveKitVoiceSession(token, {
        onStateChange: (s) => setLiveState(s),
        onTranscriptChunk: (text) => {
          if (!text?.trim()) return;
          setAnswerText((prev) => (prev ? `${prev} ${text}`.trim() : text.trim()));
        },
        onError: (err) => setLiveError(err?.message ?? String(err)),
      });
      liveSessionRef.current = session;

      session.speakQuestion(currentQuestion.text);

      setTimeRemainingMs(MAX_RESPONSE_DURATION_MS);
      countdownIntervalRef.current = setInterval(() => {
        setTimeRemainingMs((prev) => {
          if (prev == null || prev <= 0) return null;
          const next = prev - 1000;
          if (next <= 0 && countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return next <= 0 ? null : next;
        });
      }, 1000);

      durationTimerRef.current = setTimeout(() => {
        stopVoiceCapture();
      }, MAX_RESPONSE_DURATION_MS);
    } catch (err) {
      setLiveError(err?.message ?? String(err));
      setLiveState("error");
      cleanupLiveSession();
    }
  }, [token, currentQuestion, voiceEnabled, liveState, cleanupLiveSession, stopVoiceCapture]);

  const handleStopVoice = useCallback(() => {
    stopVoiceCapture();
  }, [stopVoiceCapture]);

  const handleRetryVoice = useCallback(() => {
    cleanupLiveSession();
    setAnswerText("");
    setLiveError("");
    startVoiceSession();
  }, [cleanupLiveSession, startVoiceSession]);

  useEffect(() => {
    return () => cleanupLiveSession();
  }, [cleanupLiveSession]);

  const recordTurnAndAdvance = useCallback(
    async (isLast) => {
      if (!currentQuestion || isAdvancing) return;
      setIsAdvancing(true);
      setAnswerSaved(false);
      const finalAnswer = answerText.trim() || null;
      try {
        await fetch(`/api/interview/${token}/session/next`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: currentQuestion.id,
            questionText: currentQuestion.text,
            answer: finalAnswer,
            unanswered: !finalAnswer,
            totalQuestions: questionList.length,
          }),
        });
        setAnswerSaved(true);
        cleanupLiveSession();
        setAnswerText("");
        if (!isLast) {
          await new Promise((r) => setTimeout(r, ANSWER_SAVED_DISPLAY_MS));
          setAnswerSaved(false);
          setCurrentIndex((i) => i + 1);
        }
      } finally {
        setIsAdvancing(false);
      }
    },
    [
      token,
      currentQuestion,
      answerText,
      questionList.length,
      isAdvancing,
      cleanupLiveSession,
    ]
  );

  const handleNext = async () => {
    if (voiceEnabled && (liveState === "listening" || liveState === "speaking")) {
      handleStopVoice();
    }
    const isLast = currentIndex >= questionList.length - 1;
    await recordTurnAndAdvance(isLast);
  };

  const handleComplete = async () => {
    if (violated || isUploading) return;

    if (voiceEnabled && (liveState === "listening" || liveState === "speaking")) {
      handleStopVoice();
    }

    const isLast = currentIndex >= questionList.length - 1;
    if (isLast && currentQuestion) {
      await recordTurnAndAdvance(true);
    }

    setIsUploading(true);
    setUploadError("");
    cleanupLiveSession();

    const blob = await stopRecording();
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

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          throw new Error(err.error ?? "Upload failed.");
        }

        router.push(`/interview/${token}/complete`);
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed.";
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

  const showVoiceUI = voiceEnabled && !voiceLoading;
  const totalQuestions = questionList.length || 1;
  const currentQuestionNum = Math.min(currentIndex + 1, totalQuestions);
  const progressPercent = totalQuestions > 0 ? (currentQuestionNum / totalQuestions) * 100 : 0;

  const turnStatus =
    answerSaved
      ? "Saved"
      : liveState === "connecting"
        ? "Connecting…"
        : liveState === "speaking"
          ? "Agent speaking"
          : voicePaused || liveState === "ended"
            ? "Recording paused"
            : liveState === "listening"
              ? "Your turn"
              : liveState === "error"
                ? "Error"
                : "Ready";

  const isBusy = isUploading || isAdvancing;

  return (
    <div className="flex min-h-screen flex-col px-4 py-6 sm:py-8">
      {tabWarning && (
        <div className="fixed left-0 right-0 z-40 flex items-center justify-center gap-2 bg-amber-500/90 px-4 py-2 text-sm font-medium text-amber-950">
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
          Question {currentQuestionNum} of {totalQuestions}
        </p>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6">
        <div className="space-y-2">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={currentQuestionNum}
            aria-valuemin={1}
            aria-valuemax={totalQuestions}
            aria-label={`Question ${currentQuestionNum} of ${totalQuestions}`}
          >
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

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

            {showVoiceUI && (
              <div className="flex items-center gap-2 rounded-lg border border-input bg-muted/20 px-3 py-2">
                <span
                  className={`text-sm font-medium ${
                    turnStatus === "Your turn"
                      ? "text-primary"
                      : turnStatus === "Agent speaking"
                        ? "text-muted-foreground"
                        : turnStatus === "Saved"
                          ? "text-green-600 dark:text-green-400"
                          : turnStatus === "Recording paused"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                  }`}
                >
                  {turnStatus === "Saved" && <CheckIcon className="mr-1.5 inline size-4" />}
                  {turnStatus}
                </span>
                {timeRemainingMs != null && (
                  <span
                    className={`ml-auto text-sm tabular-nums ${
                      timeRemainingMs <= TIMER_WARNING_THRESHOLD_MS
                        ? "font-medium text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {Math.floor(timeRemainingMs / 60_000)}:
                    {String(Math.floor((timeRemainingMs % 60_000) / 1000)).padStart(2, "0")} left
                  </span>
                )}
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                {showVoiceUI
                  ? "Your answer (speak after the agent reads; you can edit below)"
                  : "Your answer (optional)"}
              </p>
              {showVoiceUI ? (
                <Textarea
                  className="min-h-[120px]"
                  placeholder={
                    liveState === "connecting"
                      ? "Connecting…"
                      : liveState === "speaking"
                        ? "Agent is reading the question…"
                        : liveState === "listening" && !voicePaused
                          ? "Speak now. Your words will appear here."
                          : liveState === "error"
                            ? "Something went wrong. Click Retry."
                            : "Click Start Question, then speak after the agent reads."
                  }
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  disabled={isBusy}
                />
              ) : (
                <Textarea
                  className="min-h-[120px]"
                  placeholder="Type your answer here..."
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  disabled={isBusy}
                />
              )}
            </div>

            {showVoiceUI && (
              <div className="flex flex-wrap gap-2">
                {(liveState === "idle" || liveState === "ended") && (
                  <Button
                    onClick={startVoiceSession}
                    disabled={isBusy}
                    variant="default"
                    size="sm"
                    data-icon="inline-start"
                  >
                    <MicIcon className="size-4" />
                    Start Question
                  </Button>
                )}
                {(liveState === "connecting" || liveState === "listening" || liveState === "speaking") &&
                  !voicePaused && (
                    <>
                      <Button
                        variant="outline"
                        onClick={handleStopVoice}
                        disabled={isBusy}
                        size="sm"
                        data-icon="inline-start"
                      >
                        <MicOffIcon className="size-4" />
                        Stop Recording
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleRetryVoice}
                        disabled={isBusy}
                        size="sm"
                        data-icon="inline-start"
                      >
                        <RotateCcwIcon className="size-4" />
                        Retry
                      </Button>
                    </>
                  )}
                {(voicePaused || liveState === "ended") && liveState !== "idle" && (
                  <Button
                    onClick={handleRetryVoice}
                    disabled={isBusy}
                    variant="outline"
                    size="sm"
                    data-icon="inline-start"
                  >
                    <RotateCcwIcon className="size-4" />
                    Start Again
                  </Button>
                )}
                {liveState === "error" && (
                  <Button
                    onClick={handleRetryVoice}
                    disabled={isBusy}
                    variant="default"
                    size="sm"
                    data-icon="inline-start"
                  >
                    <RotateCcwIcon className="size-4" />
                    Retry
                  </Button>
                )}
              </div>
            )}
            {liveError && <p className="text-sm text-destructive">{liveError}</p>}

            <Separator />
            <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Your screen is being recorded for proctoring purposes.
              </p>
            </div>
            {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button
                variant="outline"
                disabled={isBusy}
                onClick={() => {
                  terminateRecording();
                  sendFail("user_navigated_back");
                  router.push(`/interview/${token}`);
                }}
              >
                Back
              </Button>
              {questionList.length > 0 && currentIndex < questionList.length - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={isBusy}
                  data-icon="inline-end"
                >
                  {isAdvancing ? "Saving…" : "Next"}
                  <ArrowRightIcon className="size-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={isBusy}
                  data-icon="inline-end"
                >
                  {isUploading ? "Uploading…" : "Submit Interview"}
                  <ArrowRightIcon className="size-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
