"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { submitPreScreenAction } from "@/app/interview/actions";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MicIcon,
  MicOffIcon,
  PlayIcon,
} from "lucide-react";

const WORD_TO_NUMBER = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
};

function parseExperienceFromSpeech(text) {
  const trimmed = String(text || "").trim().toLowerCase();
  const num = parseFloat(trimmed);
  if (!Number.isNaN(num) && num >= 0 && num <= 50) return String(num);
  const words = trimmed.split(/\s+/);
  for (const w of words) {
    const val = WORD_TO_NUMBER[w];
    if (val !== undefined) return String(val);
  }
  const digitMatch = trimmed.match(/[\d.]+/);
  if (digitMatch) return digitMatch[0];
  return trimmed;
}

const SPOKEN_YES = ["yes", "yeah", "yep", "yup", "sure", "ok", "okay"];
const SPOKEN_NO = ["no", "nope", "nah", "nay"];

function parseRelocateFromSpeech(text) {
  const t = String(text || "").trim().toLowerCase();
  if (SPOKEN_YES.includes(t)) return "Yes";
  if (SPOKEN_NO.includes(t)) return "No";
  if (SPOKEN_YES.some((y) => t.includes(y))) return "Yes";
  if (SPOKEN_NO.some((n) => t.includes(n))) return "No";
  return null;
}

const STEPS = [
  { id: "experience", label: "Experience", key: "experienceYears" },
  { id: "current-ctc", label: "Current CTC", key: "currentCtc" },
  { id: "expected-ctc", label: "Expected CTC", key: "expectedCtc" },
  { id: "relocate", label: "Relocate to Mohali", key: "relocateToMohali" },
  { id: "summary", label: "Summary", key: null },
];

/**
 * @param {object} props
 * @param {object} props.interview
 * @param {string} props.token
 */
export function PreScreeningSteps({ interview, token }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    experienceYears: "",
    currentCtc: "",
    expectedCtc: "",
    relocateToMohali: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  const canUseSpeech =
    hasMounted &&
    browserSupportsSpeechRecognition &&
    isMicrophoneAvailable;

  const updateField = useCallback((key, value) => {
    setFormData((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }, []);

  const currentStepId = STEPS[step]?.id;
  const isSummary = currentStepId === "summary";

  useEffect(() => {
    if (!transcript.trim()) return;
    if (currentStepId === "experience") {
      updateField("experienceYears", parseExperienceFromSpeech(transcript));
    } else if (currentStepId === "current-ctc") {
      updateField("currentCtc", transcript.trim());
    } else if (currentStepId === "expected-ctc") {
      updateField("expectedCtc", transcript.trim());
    } else if (currentStepId === "relocate") {
      const parsed = parseRelocateFromSpeech(transcript);
      if (parsed) {
        updateField("relocateToMohali", parsed);
        resetTranscript();
      }
    }
  }, [transcript, currentStepId, resetTranscript, updateField]);

  const validateStep = (stepIndex) => {
    const stepConfig = STEPS[stepIndex];
    const key = stepConfig?.key;
    if (!key) return true;
    const value = formData[key]?.trim();
    let error = "";
    if (key === "experienceYears") {
      const num = parseFloat(value);
      if (!value) error = "Please enter your years of experience.";
      else if (Number.isNaN(num) || num < 0 || num > 50) {
        error = "Please enter a valid number (0–50).";
      }
    } else if (key === "currentCtc" || key === "expectedCtc") {
      if (!value) error = `Please enter your ${key === "currentCtc" ? "current" : "expected"} CTC.`;
    } else if (key === "relocateToMohali") {
      if (!value) error = "Please select an option.";
    }
    setErrors((e) => ({ ...e, [key]: error }));
    return !error;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    if (step < STEPS.length - 1) {
      resetTranscript();
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setErrors({});
    resetTranscript();
    if (step > 0) setStep((s) => s - 1);
  };

  const handleStartRound2 = async () => {
    setIsSubmitting(true);
    setErrors({});
    try {
      const { error } = await submitPreScreenAction(token, formData);
      if (error) {
        setErrors({ submit: error });
        return;
      }
      router.push(`/interview/${token}/session`);
    } catch (err) {
      setErrors({ submit: "Something went wrong. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-xl" size="sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl sm:text-2xl">
            {interview.jobTitle}
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isSummary && (
          <div className="flex gap-2">
            {STEPS.filter((s) => s.id !== "summary").map((s, i) => (
              <div
                key={s.id}
                className={`h-1.5 flex-1 rounded-full ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
                aria-hidden
              />
            ))}
          </div>
        )}

        {currentStepId === "experience" && (
          <FieldGroup>
            <Field>
              <FieldLabel>Years of experience</FieldLabel>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  placeholder="e.g. 3"
                  value={formData.experienceYears}
                  onChange={(e) =>
                    updateField("experienceYears", e.target.value)
                  }
                  aria-invalid={!!errors.experienceYears}
                  className="flex-1"
                />
                {canUseSpeech && (
                  <Button
                    type="button"
                    variant={listening ? "default" : "outline"}
                    size="icon"
                    onClick={() =>
                      listening
                        ? SpeechRecognition.stopListening()
                        : SpeechRecognition.startListening()
                    }
                    aria-pressed={listening}
                    aria-label={
                      listening ? "Stop listening" : "Start voice input"
                    }
                    title={listening ? "Stop listening" : "Speak your answer"}
                  >
                    {listening ? (
                      <MicOffIcon className="size-4" aria-hidden />
                    ) : (
                      <MicIcon className="size-4" aria-hidden />
                    )}
                  </Button>
                )}
              </div>
              <FieldError>{errors.experienceYears}</FieldError>
            </Field>
          </FieldGroup>
        )}

        {currentStepId === "current-ctc" && (
          <FieldGroup>
            <Field>
              <FieldLabel>Current CTC (in LPA)</FieldLabel>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="e.g. 8"
                  value={formData.currentCtc}
                  onChange={(e) => updateField("currentCtc", e.target.value)}
                  aria-invalid={!!errors.currentCtc}
                  className="flex-1"
                />
                {canUseSpeech && (
                  <Button
                    type="button"
                    variant={listening ? "default" : "outline"}
                    size="icon"
                    onClick={() =>
                      listening
                        ? SpeechRecognition.stopListening()
                        : SpeechRecognition.startListening()
                    }
                    aria-pressed={listening}
                    aria-label={
                      listening ? "Stop listening" : "Start voice input"
                    }
                    title={listening ? "Stop listening" : "Speak your answer"}
                  >
                    {listening ? (
                      <MicOffIcon className="size-4" aria-hidden />
                    ) : (
                      <MicIcon className="size-4" aria-hidden />
                    )}
                  </Button>
                )}
              </div>
              <FieldError>{errors.currentCtc}</FieldError>
            </Field>
          </FieldGroup>
        )}

        {currentStepId === "expected-ctc" && (
          <FieldGroup>
            <Field>
              <FieldLabel>Expected CTC (in LPA)</FieldLabel>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="e.g. 12"
                  value={formData.expectedCtc}
                  onChange={(e) => updateField("expectedCtc", e.target.value)}
                  aria-invalid={!!errors.expectedCtc}
                  className="flex-1"
                />
                {canUseSpeech && (
                  <Button
                    type="button"
                    variant={listening ? "default" : "outline"}
                    size="icon"
                    onClick={() =>
                      listening
                        ? SpeechRecognition.stopListening()
                        : SpeechRecognition.startListening()
                    }
                    aria-pressed={listening}
                    aria-label={
                      listening ? "Stop listening" : "Start voice input"
                    }
                    title={listening ? "Stop listening" : "Speak your answer"}
                  >
                    {listening ? (
                      <MicOffIcon className="size-4" aria-hidden />
                    ) : (
                      <MicIcon className="size-4" aria-hidden />
                    )}
                  </Button>
                )}
              </div>
              <FieldError>{errors.expectedCtc}</FieldError>
            </Field>
          </FieldGroup>
        )}

        {currentStepId === "relocate" && (
          <FieldGroup>
            <Field>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel>Are you willing to relocate to Mohali?</FieldLabel>
                {canUseSpeech && (
                  <Button
                    type="button"
                    variant={listening ? "default" : "outline"}
                    size="icon"
                    onClick={() =>
                      listening
                        ? SpeechRecognition.stopListening()
                        : SpeechRecognition.startListening()
                    }
                    aria-pressed={listening}
                    aria-label={
                      listening ? "Stop listening" : "Say yes or no"
                    }
                    title={
                      listening
                        ? "Stop listening"
                        : "Say yes or no for your answer"
                    }
                  >
                    {listening ? (
                      <MicOffIcon className="size-4" aria-hidden />
                    ) : (
                      <MicIcon className="size-4" aria-hidden />
                    )}
                  </Button>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                {["Yes", "No"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => updateField("relocateToMohali", opt)}
                    className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                      formData.relocateToMohali === opt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input bg-input/30 hover:bg-input/50"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <FieldError>{errors.relocateToMohali}</FieldError>
            </Field>
          </FieldGroup>
        )}

        {isSummary && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please review your answers before starting Round 2.
            </p>
            <Separator />
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Experience</dt>
                <dd className="font-medium">{formData.experienceYears} years</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Current CTC</dt>
                <dd className="font-medium">{formData.currentCtc} LPA</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Expected CTC</dt>
                <dd className="font-medium">{formData.expectedCtc} LPA</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Relocate to Mohali</dt>
                <dd className="font-medium">{formData.relocateToMohali}</dd>
              </div>
            </dl>
            <FieldError>{errors.submit}</FieldError>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {step > 0 ? (
          <Button
            variant="outline"
            onClick={handleBack}
            className="w-full sm:w-auto"
            data-icon="inline-start"
          >
            <ArrowLeftIcon className="size-4" />
            Back
          </Button>
        ) : (
          <Button variant="outline" asChild className="w-full sm:w-auto" data-icon="inline-start">
            <Link href={`/interview/${token}`}>
              <ArrowLeftIcon className="size-4" />
              Back
            </Link>
          </Button>
        )}
        <div className="flex-1" />
        {!isSummary ? (
          <Button onClick={handleNext} className="w-full sm:w-auto" data-icon="inline-end">
            Next
            <ArrowRightIcon className="size-4" />
          </Button>
        ) : (
          <Button
            onClick={handleStartRound2}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
            data-icon="inline-start"
          >
            <PlayIcon className="size-4" />
            {isSubmitting ? "Starting…" : "Start Round 2"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
