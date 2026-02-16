import Link from "next/link";
import { Suspense } from "react";
import { InterviewEntryCard } from "@/components/interview/InterviewEntryCard";
import { Button } from "@/components/ui/button";
import { getInterviewByToken } from "@/lib/mock-api";
import { AlertCircleIcon } from "lucide-react";

async function InterviewEntryContent({ token }) {
  const { data, error } = await getInterviewByToken(token);

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
        <div className="mx-auto max-w-md space-y-4 text-center">
          <div className="flex justify-center">
            <AlertCircleIcon className="size-12 text-destructive" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold">Invalid or Expired Link</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button asChild variant="outline">
            <Link href="/">Return home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:py-12">
      <header className="mb-6 sm:mb-8 text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">Orion TalentIQ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI Voice Interview • First Round
        </p>
      </header>
      <InterviewEntryCard interview={data} token={token} />
    </div>
  );
}

function InterviewEntrySkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-4 w-64 animate-pulse rounded bg-muted" />
      <div className="mt-8 h-64 w-full max-w-xl animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export default async function InterviewEntryPage({ params }) {
  const { token } = await params;

  return (
    <Suspense fallback={<InterviewEntrySkeleton />}>
      <InterviewEntryContent token={token} />
    </Suspense>
  );
}
