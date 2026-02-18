import Link from "next/link";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { RecentCandidatesList } from "@/components/dashboard/RecentCandidatesList";
import { UpcomingInterviewsList } from "@/components/dashboard/UpcomingInterviewsList";
import { getCandidates, getJobDescriptions } from "@/lib/api";
import {
  UsersIcon,
  FileTextIcon,
  VideoIcon,
  LinkIcon,
  ArrowRightIcon,
} from "lucide-react";
import { JobDescriptionManager } from "@/components/admin/JobDescriptionManager";

async function AdminDashboardPage() {
  const [{ data: candidates }, { data: jobDescriptions }] = await Promise.all([
    getCandidates(),
    getJobDescriptions(),
  ]);

  const totalCandidates = candidates.length;
  const totalJDs = jobDescriptions.length;
  const totalInterviewsTaken = candidates.filter(
    (c) => c.status === "completed"
  ).length;
  const totalLinkSent = candidates.filter((c) => c.token != null).length;

  const recentCandidates = [...candidates].sort((a, b) => {
    const da = a.interviewDate != null ? String(a.interviewDate) : "";
    const db = b.interviewDate != null ? String(b.interviewDate) : "";
    return db.localeCompare(da);
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <section className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Candidates"
            value={totalCandidates}
            Icon={UsersIcon}
            subtext="All applicants in pipeline"
          />
          <StatCard
            label="Total JDs"
            value={totalJDs}
            Icon={FileTextIcon}
            subtext="Job descriptions"
          />
          <StatCard
            label="Total Interviews Taken"
            value={totalInterviewsTaken}
            Icon={VideoIcon}
            subtext="Completed interviews"
          />
          <StatCard
            label="Total Link Sent"
            value={totalLinkSent}
            Icon={LinkIcon}
            subtext="Interview links sent"
          />
        </div>
      </section>

      <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Admin Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            AI Voice Interview • First Round
          </p>
        </div>
        <JobDescriptionManager />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <Card size="sm">
            <CardHeader>
              <SectionHeader
                title="Recent Candidates"
                description="Latest activity in the pipeline"
                action={
                  <Link href="/admin/candidates">
                    <Button variant="ghost" size="sm">
                      View all
                      <ArrowRightIcon className="ml-1 size-4" />
                    </Button>
                  </Link>
                }
              />
            </CardHeader>
            <CardContent>
              <RecentCandidatesList candidates={recentCandidates} limit={5} />
            </CardContent>
          </Card>
        </section>

        <section>
          <Card size="sm">
            <CardHeader>
              <SectionHeader
                title="Upcoming Interviews"
                description="Scheduled interview sessions"
              />
            </CardHeader>
            <CardContent>
              <UpcomingInterviewsList candidates={candidates} limit={4} />
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
