"use client";

import { useState } from "react";
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
import { submitPreScreen } from "@/lib/mock-api";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PlayIcon,
} from "lucide-react";

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

  const currentStepId = STEPS[step]?.id;
  const isSummary = currentStepId === "summary";

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
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  };

  const handleBack = () => {
    setErrors({});
    if (step > 0) setStep((s) => s - 1);
  };

  const handleStartRound2 = async () => {
    setIsSubmitting(true);
    setErrors({});
    try {
      const { error } = await submitPreScreen(token, formData);
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

  const updateField = (key, value) => {
    setFormData((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
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
              <Input
                type="number"
                min={0}
                max={50}
                step={0.5}
                placeholder="e.g. 3"
                value={formData.experienceYears}
                onChange={(e) => updateField("experienceYears", e.target.value)}
                aria-invalid={!!errors.experienceYears}
              />
              <FieldError>{errors.experienceYears}</FieldError>
            </Field>
          </FieldGroup>
        )}

        {currentStepId === "current-ctc" && (
          <FieldGroup>
            <Field>
              <FieldLabel>Current CTC (in LPA)</FieldLabel>
              <Input
                type="text"
                placeholder="e.g. 8"
                value={formData.currentCtc}
                onChange={(e) => updateField("currentCtc", e.target.value)}
                aria-invalid={!!errors.currentCtc}
              />
              <FieldError>{errors.currentCtc}</FieldError>
            </Field>
          </FieldGroup>
        )}

        {currentStepId === "expected-ctc" && (
          <FieldGroup>
            <Field>
              <FieldLabel>Expected CTC (in LPA)</FieldLabel>
              <Input
                type="text"
                placeholder="e.g. 12"
                value={formData.expectedCtc}
                onChange={(e) => updateField("expectedCtc", e.target.value)}
                aria-invalid={!!errors.expectedCtc}
              />
              <FieldError>{errors.expectedCtc}</FieldError>
            </Field>
          </FieldGroup>
        )}

        {currentStepId === "relocate" && (
          <FieldGroup>
            <Field>
              <FieldLabel>Are you willing to relocate to Mohali?</FieldLabel>
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
