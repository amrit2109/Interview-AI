import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInterviewByToken } from "@/lib/mock-api";
import { CheckCircleIcon } from "lucide-react";

async function InterviewCompleteContent({ token }) {
  const { data: interview, error } = await getInterviewByToken(token);

  if (error || !interview) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
        <p className="text-muted-foreground">{error ?? "Interview not found."}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:py-12">
      <Card className="w-full max-w-md" size="sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircleIcon className="size-8 text-primary" aria-hidden />
          </div>
          <CardTitle className="text-xl sm:text-2xl">Interview Complete</CardTitle>
          <p className="text-muted-foreground">
            Thank you for completing your AI voice interview for {interview.jobTitle} at{" "}
            {interview.company}.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-sm text-muted-foreground">
            Your responses have been recorded. Results will be shared with the hiring
            team, and you will be contacted if selected for the next round.
          </p>
          <Button asChild className="w-full" size="lg">
            <Link href="/">Done</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CompleteSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />
      <div className="mt-6 h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-4 w-80 animate-pulse rounded bg-muted" />
    </div>
  );
}

export default async function InterviewCompletePage({ params }) {
  const { token } = await params;

  return (
    <Suspense fallback={<CompleteSkeleton />}>
      <InterviewCompleteContent token={token} />
    </Suspense>
  );
}
