"use client";

import { Button } from "@/components/ui/button";

export default function Error({ error, reset }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        {error?.message ?? "An unexpected error occurred."}
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
