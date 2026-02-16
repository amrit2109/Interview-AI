import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCandidateById } from "@/lib/mock-api";
import { ArrowLeftIcon, FileTextIcon } from "lucide-react";

const STATUS_VARIANTS = {
  completed: "default",
  in_progress: "secondary",
  pending: "outline",
};

function formatStatus(status) {
  return status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function CandidateDetailContent({ id }) {
  const { data: candidate } = await getCandidateById(id);

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
            <div>
              <p className="text-sm font-medium text-muted-foreground">Position</p>
              <p className="mt-1">{candidate.position}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">ATS Score</p>
              <p className="mt-1">{candidate.atsScore ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Interview Score</p>
              <p className="mt-1">{candidate.interviewScore ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Interview Date</p>
              <p className="mt-1">{candidate.interviewDate ?? "—"}</p>
            </div>
          </div>
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
