"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Row actions for a candidate: View (navigate to details).
 * Delete removed until backend supports it.
 */
export function CandidateRowActions({ id }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button asChild variant="ghost" size="icon-sm" aria-label="View candidate">
        <Link href={`/admin/candidates/${id}`}>
          <Eye className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
