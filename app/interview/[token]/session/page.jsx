import Link from "next/link";

export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getInterviewDisplayByToken } from "@/lib/services/interview-token-guard";
import { getInterviewQuestions } from "@/lib/mock-api";
import { MicIcon, ArrowRightIcon } from "lucide-react";

async function InterviewSessionContent({ token }) {
  const [interviewRes, questionsRes] = await Promise.all([
    getInterviewDisplayByToken(token),
    getInterviewQuestions(),
  ]);

  const { data: interview, error: interviewError } = interviewRes;
  const { data: questions } = questionsRes;

  if (interviewError || !interview) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
        <p className="text-muted-foreground">{interviewError ?? "Interview not found."}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    );
  }

  const questionList = questions ?? [];
  const currentIndex = 0;
  const currentQuestion = questionList[currentIndex];

  return (
    <div className="flex min-h-screen flex-col px-4 py-6 sm:py-8">
      <header className="mb-6 text-center sm:mb-8">
        <h1 className="text-xl font-bold sm:text-2xl">{interview.jobTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Question {currentIndex + 1} of {questionList.length}
        </p>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MicIcon className="size-5 text-primary" aria-hidden />
              Voice Interview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Question</p>
              <p className="mt-2 text-lg">{currentQuestion?.text ?? "No questions available."}</p>
            </div>
            <Separator />
            <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Voice recording will be integrated in a later phase.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                For now, this is a static mock of the interview flow.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button variant="outline" asChild>
                <Link href={`/interview/${token}`}>Back</Link>
              </Button>
              <Button asChild data-icon="inline-end">
                <Link href={`/interview/${token}/complete`}>
                  Next (mock)
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SessionSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="h-8 w-56 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-8 h-48 w-full max-w-2xl animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export default async function InterviewSessionPage({ params }) {
  const { token } = await params;

  return (
    <Suspense fallback={<SessionSkeleton />}>
      <InterviewSessionContent token={token} />
    </Suspense>
  );
}
