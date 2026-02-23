"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EvaluationOverrideForm({ candidateId, currentScore }) {
  const router = useRouter();
  const [score, setScore] = useState(String(currentScore ?? 0));
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const num = parseFloat(score);
    if (!Number.isFinite(num) || num < 0 || num > 10) {
      setError("Score must be between 0 and 10.");
      return;
    }
    if (!reason.trim()) {
      setError("Reason is required for override.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/candidates/${candidateId}/evaluation-override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: num, reason: reason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Override failed.");
        return;
      }
      router.refresh();
      setReason("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-dashed p-4">
      <h3 className="text-sm font-medium">Manual Score Override</h3>
      <p className="text-xs text-muted-foreground">
        Override the AI-generated interview score. Requires a reason for audit.
      </p>
      <div className="flex flex-wrap gap-4">
        <div className="space-y-2">
          <Label htmlFor="override-score">Score (0-10)</Label>
          <Input
            id="override-score"
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div className="flex-1 min-w-[200px] space-y-2">
          <Label htmlFor="override-reason">Reason</Label>
          <Input
            id="override-reason"
            placeholder="e.g. Manual review found stronger technical depth"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Apply Override"}
      </Button>
    </form>
  );
}
