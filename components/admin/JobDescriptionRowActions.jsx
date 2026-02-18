"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteJobDescriptionAction, updateJobDescriptionOpeningsAction } from "@/app/admin/actions";

export function OpeningsStepper({ id, openings }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);
  const value = Number(openings) || 0;

  async function handleChange(delta) {
    const next = Math.max(0, value + delta);
    if (next === value) return;
    setIsPending(true);
    setError(null);
    const result = await updateJobDescriptionOpeningsAction({ job_description_id: id, openings: next });
    setIsPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error ?? "Update failed.");
    }
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Decrease openings"
          disabled={isPending || value <= 0}
          onClick={() => handleChange(-1)}
        >
          <Minus className="size-3" />
        </Button>
        <span className="min-w-6 text-center text-sm tabular-nums">{value}</span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Increase openings"
          disabled={isPending}
          onClick={() => handleChange(1)}
        >
          <Plus className="size-3" />
        </Button>
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

export function JobDescriptionRowActions({ id, jobName }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleConfirmDelete(e) {
    e.preventDefault();
    setIsPending(true);
    const result = await deleteJobDescriptionAction({ job_description_id: id });
    setIsPending(false);
    if (result.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete job description"
            disabled={isPending}
          >
            <Trash2 className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete job description?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {jobName ?? "this job description"}
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isPending}
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
