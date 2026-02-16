import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { RecentCandidatesList } from "@/components/dashboard/RecentCandidatesList";
import { UpcomingInterviewsList } from "@/components/dashboard/UpcomingInterviewsList";
import { getCandidates } from "@/lib/mock-api";
import {
  UsersIcon,
  CheckCircleIcon,
  TrendingUpIcon,
  BarChart3Icon,
  ArrowRightIcon,
} from "lucide-react";
import { JobDescriptionManager } from "@/components/admin/JobDescriptionManager";

async function AdminDashboardPage() {
  const { data: candidates } = await getCandidates();

  const completed = candidates.filter((c) => c.status === "completed").length;
  const total = candidates.length;

  const completionRate =
    total > 0 ? Math.round((completed / total) * 100) : 0;

  const completedWithAts = candidates.filter(
    (c) => typeof c.atsScore === "number"
  );
  const avgAtsScore =
    completedWithAts.length > 0
      ? Math.round(
          completedWithAts.reduce((s, c) => s + c.atsScore, 0) /
            completedWithAts.length
        )
      : 0;

  const completedWithInterview = candidates.filter(
    (c) => typeof c.interviewScore === "number"
  );
  const avgInterviewScore =
    completedWithInterview.length > 0
      ? Math.round(
          completedWithInterview.reduce((s, c) => s + c.interviewScore, 0) /
            completedWithInterview.length
        )
      : 0;

  const recentCandidates = [...candidates].sort((a, b) => {
    const da = a.interviewDate || "";
    const db = b.interviewDate || "";
    return db.localeCompare(da);
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Admin Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            AI Voice Interview • First Round
          </p>
        </div>
        <JobDescriptionManager />
      </div>

      <section className="mb-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Candidates"
            value={total}
            Icon={UsersIcon}
            subtext="All applicants in pipeline"
          />
          <StatCard
            label="Completion Rate"
            value={`${completionRate}%`}
            Icon={CheckCircleIcon}
            subtext="Completed interviews"
          />
          <StatCard
            label="Avg ATS Score"
            value={avgAtsScore}
            Icon={BarChart3Icon}
            subtext="Across all candidates"
          />
          <StatCard
            label="Avg Interview Score"
            value={avgInterviewScore}
            Icon={TrendingUpIcon}
            subtext="Completed interviews only"
          />
        </div>
      </section>

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
