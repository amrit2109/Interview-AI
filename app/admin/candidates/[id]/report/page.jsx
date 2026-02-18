import Link from "next/link";

export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getCandidateById, getCandidateReport } from "@/lib/api";
import { ArrowLeftIcon, ThumbsUpIcon, AlertTriangleIcon } from "lucide-react";

async function CandidateReportContent({ id }) {
  const [candidateRes, reportRes] = await Promise.all([
    getCandidateById(id),
    getCandidateReport(id),
  ]);

  const candidate = candidateRes.data;
  const report = reportRes.data;

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
                  <p className="mt-1 text-2xl font-bold">{report.atsScore}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Interview Score</p>
                  <p className="mt-1 text-2xl font-bold">{report.interviewScore}%</p>
                </div>
              </div>

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
