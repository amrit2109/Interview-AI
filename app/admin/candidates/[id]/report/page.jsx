import Link from "next/link";

export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getCandidateById, getCandidateReport, getEvaluationByCandidateId } from "@/lib/api";
import { ArrowLeftIcon, ThumbsUpIcon, AlertTriangleIcon } from "lucide-react";
import { EvaluationOverrideForm } from "@/components/admin/EvaluationOverrideForm";

async function CandidateReportContent({ id }) {
  const [candidateRes, reportRes, evaluationRes] = await Promise.all([
    getCandidateById(id),
    getCandidateReport(id),
    getEvaluationByCandidateId(id),
  ]);

  const candidate = candidateRes.data;
  const report = reportRes.data;
  const evaluation = evaluationRes.data;

  if (!candidate) {
    notFound();
  }

  const hasReport = report && candidate.status === "completed";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/candidates/${id}`}>
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to candidate
          </Link>
        </Button>
      </div>

      {candidate.interviewLink && (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-lg">Interview Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <video
              src={candidate.interviewLink}
              controls
              className="w-full max-w-2xl rounded-lg border bg-muted"
            >
              Your browser does not support the video tag.
            </video>
          </CardContent>
        </Card>
      )}

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-xl">Hiring Report</CardTitle>
          <p className="text-sm text-muted-foreground">
            {candidate.name} • {candidate.position}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {!hasReport ? (
            <p className="text-muted-foreground">
              No report available yet. Complete the interview to generate a report.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ATS Score</p>
                  <p className="mt-1 text-2xl font-bold">{report.atsScore ?? "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Interview Score</p>
                  <p className="mt-1 text-2xl font-bold">{report.interviewScore ?? "—"}/10</p>
                </div>
              </div>

              {evaluation && evaluation.perQuestion?.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-2 font-medium">Per-Question Breakdown</h3>
                    <div className="space-y-3">
                      {evaluation.perQuestion.map((pq, i) => (
                        <div
                          key={pq.questionId}
                          className="rounded-lg border bg-muted/30 p-3 text-sm"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">
                              {pq.skill} {pq.unanswered && "(unanswered)"}
                            </p>
                            {pq.transcriptQuality && (
                              <Badge
                                variant={
                                  pq.transcriptQuality === "missing"
                                    ? "destructive"
                                    : pq.transcriptQuality === "partial"
                                      ? "secondary"
                                      : "outline"
                                }
                                className="text-xs"
                              >
                                transcript: {pq.transcriptQuality}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex gap-4 text-muted-foreground">
                            <span>Depth: {pq.technical_depth}/10</span>
                            <span>Correct: {pq.correctness}/10</span>
                            <span>Comm: {pq.communication}/10</span>
                            <span>Role: {pq.role_alignment}/10</span>
                          </div>
                          {pq.evidenceSpans?.length > 0 && (
                            <p className="mt-2 text-xs italic">{pq.evidenceSpans[0]}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    {evaluation.unansweredCount > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {evaluation.unansweredCount} question(s) unanswered (no penalty applied).
                      </p>
                    )}
                  </div>
                </>
              )}

              <Separator />

              <div>
                <h3 className="mb-2 flex items-center gap-2 font-medium">
                  <ThumbsUpIcon className="size-4 text-primary" />
                  Key Strengths
                </h3>
                {report.strengths?.length > 0 ? (
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {report.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">None noted</p>
                )}
              </div>

              <div>
                <h3 className="mb-2 flex items-center gap-2 font-medium">
                  <AlertTriangleIcon className="size-4 text-destructive" />
                  Risks
                </h3>
                {report.risks?.length > 0 ? (
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {report.risks.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">None noted</p>
                )}
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                  Hiring Recommendation
                </h3>
                <Badge
                  variant={
                    report.recommendation === "Proceed to next round"
                      ? "default"
                      : report.recommendation === "Reject"
                        ? "destructive"
                        : "secondary"
                  }
                  className="text-sm"
                >
                  {report.recommendation}
                </Badge>
              </div>

              {evaluation && (
                <EvaluationOverrideForm
                  candidateId={id}
                  currentScore={report.interviewScore ?? evaluation.overallScore}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function CandidateReportPage({ params }) {
  const { id } = await params;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <CandidateReportContent id={id} />
    </div>
  );
}
