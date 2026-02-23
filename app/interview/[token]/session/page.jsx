import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { getInterviewDisplayByToken } from "@/lib/services/interview-token-guard";
import { getQuestionsForSession } from "@/lib/services/interview-questions.service";
import { getPreScreen } from "@/lib/api";
import { InterviewSessionClient } from "@/components/interview/InterviewSessionClient";
import { RecordingProvider } from "@/context/RecordingContext";

export const dynamic = "force-dynamic";

async function InterviewSessionContent({ token }) {
  const [interviewRes, questionsRes, preScreenRes] = await Promise.all([
    getInterviewDisplayByToken(token),
    getQuestionsForSession(token),
    getPreScreen(token),
  ]);

  const { data: interview, error: interviewError } = interviewRes;
  const { data: questions } = questionsRes;
  const { data: preScreen } = preScreenRes ?? {};

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

  if (!preScreen?.submittedAt) {
    redirect(`/interview/${token}/prescreen`);
  }

  return (
    <RecordingProvider>
      <InterviewSessionClient
        token={token}
        interview={interview}
        questions={questions ?? []}
      />
    </RecordingProvider>
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
