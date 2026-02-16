"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { createJobDescription } from "@/lib/mock-api";

/**
 * Add Job Description modal.
 * @param {object} props
 * @param {boolean} props.open
 * @param {function} props.onOpenChange
 * @param {function} [props.onSuccess] - Called after successful create (e.g. to refresh list or navigate)
 */
export function AddJobDescriptionModal({ open, onOpenChange, onSuccess }) {
  const [jobName, setJobName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmedJobName = jobName?.trim();
    const trimmedDescription = description?.trim();

    if (!trimmedJobName) {
      setError("Job name is required.");
      return;
    }
    if (!trimmedDescription) {
      setError("Description is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error: apiError } = await createJobDescription({
        jobName: trimmedJobName,
        description: trimmedDescription,
      });
      if (apiError) {
        setError(apiError);
        return;
      }
      setJobName("");
      setDescription("");
      onOpenChange(false);
      onSuccess?.(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (next) => {
    if (!next) {
      setJobName("");
      setDescription("");
      setError(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        size="default"
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>Add Job Description (JD)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel>
                <Label htmlFor="jd-job-name">Job Name</Label>
              </FieldLabel>
              <Input
                id="jd-job-name"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                placeholder="e.g. Frontend Developer"
                disabled={isSubmitting}
                aria-invalid={!!error}
                aria-describedby={error ? "jd-form-error" : undefined}
              />
            </Field>
            <Field>
              <FieldLabel>
                <Label htmlFor="jd-description">Description</Label>
              </FieldLabel>
              <Textarea
                id="jd-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the role, responsibilities, and requirements..."
                rows={4}
                disabled={isSubmitting}
                aria-invalid={!!error}
                aria-describedby={error ? "jd-form-error" : undefined}
              />
            </Field>
          </FieldGroup>

          {error && (
            <div
              id="jd-form-error"
              role="alert"
              className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add JD"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
