import Link from "next/link";
import { Suspense } from "react";
import { PreScreeningSteps } from "@/components/interview/PreScreeningSteps";
import { Button } from "@/components/ui/button";
import { getInterviewByToken } from "@/lib/mock-api";
import { AlertCircleIcon } from "lucide-react";

async function PreScreenContent({ token }) {
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

  if (data.status !== "valid") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
        <p className="text-muted-foreground">This interview link is no longer valid.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:py-12">
      <header className="mb-6 sm:mb-8 text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">Orion TalentIQ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pre-screening • Round 1
        </p>
      </header>
      <PreScreeningSteps interview={data} token={token} />
    </div>
  );
}

function PreScreenSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-4 w-64 animate-pulse rounded bg-muted" />
      <div className="mt-8 h-96 w-full max-w-xl animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export default async function PreScreenPage({ params }) {
  const { token } = await params;

  return (
    <Suspense fallback={<PreScreenSkeleton />}>
      <PreScreenContent token={token} />
    </Suspense>
  );
}
