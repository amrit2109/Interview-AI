import Link from "next/link";

export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCandidateById, getCandidatePreScreensById } from "@/lib/api";
import { format } from "@/lib/date-utils";
import { ArrowLeftIcon, FileTextIcon, ExternalLinkIcon } from "lucide-react";

const STATUS_VARIANTS = {
  completed: "default",
  in_progress: "secondary",
  pending: "outline",
};

function formatStatus(status) {
  return status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1">{value ?? "—"}</p>
    </div>
  );
}

async function CandidateDetailContent({ id }) {
  const [candidateRes, preScreensRes] = await Promise.all([
    getCandidateById(id),
    getCandidatePreScreensById(id),
  ]);

  const candidate = candidateRes.data;
  const preScreens = preScreensRes.data ?? [];

  if (!candidate) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/candidates">
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to candidates
          </Link>
        </Button>
      </div>

      <Card size="sm">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-xl">{candidate.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{candidate.email}</p>
            </div>
            <Badge variant={STATUS_VARIANTS[candidate.status] ?? "outline"}>
              {formatStatus(candidate.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Position" value={candidate.position} />
            <Field label="Phone" value={candidate.phone} />
            <Field label="ATS Score" value={candidate.atsScore} />
            <Field label="Interview Score" value={candidate.interviewScore} />
            <Field label="Interview Date" value={format(candidate.interviewDate)} />
            <Field label="Skills" value={candidate.skills} />
            <Field label="Experience (years)" value={candidate.experienceYears} />
            <Field label="Education" value={candidate.education} />
            <Field label="Match %" value={candidate.matchPercentage} />
            <Field label="Matched Role ID" value={candidate.matchedRoleId} />
            <Field label="Match Reasoning" value={candidate.matchReasoning} />
            <Field label="ATS Explanation" value={candidate.atsExplanation} />
            <Field label="Token Created" value={format(candidate.tokenCreatedAt)} />
            <Field label="Token Expires" value={format(candidate.tokenExpiresAt)} />
          </div>
          {candidate.resumeLink && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Resume</p>
              <a
                href={candidate.resumeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-2 text-sm font-medium text-primary hover:bg-muted/50"
              >
                <FileTextIcon className="size-4" />
                View / Download Resume
              </a>
            </div>
          )}
          {candidate.interviewLink && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Watch Recording</p>
              <video
                src={candidate.interviewLink}
                controls
                className="w-full max-w-2xl rounded-lg border bg-muted"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}
          {candidate.status === "completed" && (
            <Button asChild>
              <Link href={`/admin/candidates/${id}/report`}>
                <FileTextIcon className="mr-2 size-4" />
                View full report
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-lg">Pre-screening Responses</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pre-screening data submitted by the candidate before the interview.
          </p>
        </CardHeader>
        <CardContent>
          {preScreens.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pre-screening data available for this candidate.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Submitted At</th>
                    <th className="px-4 py-3 text-left font-medium">Experience</th>
                    <th className="px-4 py-3 text-left font-medium">Current CTC</th>
                    <th className="px-4 py-3 text-left font-medium">Expected CTC</th>
                    <th className="px-4 py-3 text-left font-medium">Relocate to Mohali</th>
                    <th className="px-4 py-3 text-left font-medium">Recording</th>
                  </tr>
                </thead>
                <tbody>
                  {preScreens.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-4 py-3">{format(row.submittedAt)}</td>
                      <td className="px-4 py-3">{row.experienceYears ?? "—"}</td>
                      <td className="px-4 py-3">{row.currentCtc ?? "—"}</td>
                      <td className="px-4 py-3">{row.expectedCtc ?? "—"}</td>
                      <td className="px-4 py-3">{row.relocateToMohali ?? "—"}</td>
                      <td className="px-4 py-3">
                        {row.recordingUrl ? (
                          <a
                            href={row.recordingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLinkIcon className="size-3.5" />
                            Open
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function CandidateDetailPage({ params }) {
  const { id } = await params;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <CandidateDetailContent id={id} />
    </div>
  );
}
