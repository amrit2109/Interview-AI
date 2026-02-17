import Link from "next/link";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getJobDescriptions } from "@/lib/mock-api";
import { ArrowLeftIcon } from "lucide-react";
import {
  JobDescriptionRowActions,
  OpeningsStepper,
} from "@/components/admin/JobDescriptionRowActions";

async function JobDescriptionsListContent() {
  const { data: jobDescriptions, error: fetchError } = await getJobDescriptions();
  const list = Array.isArray(jobDescriptions) ? jobDescriptions : [];
  const isEmpty = list.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Job Descriptions</h1>
          <p className="mt-1 text-muted-foreground">
            View roles and number of openings in your organization
          </p>
        </div>
      </div>

      {fetchError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {fetchError}
        </div>
      )}

      <div className="hidden md:block">
        <Card size="sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Role</th>
                    <th className="px-4 py-3 text-left font-medium">Description</th>
                    <th className="px-4 py-3 text-left font-medium">Openings</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isEmpty && !fetchError && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No job descriptions yet. Add one from the dashboard.
                      </td>
                    </tr>
                  )}
                  {list.map((jd) => (
                    <tr
                      key={jd.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{jd.jobName}</p>
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <p className="truncate text-muted-foreground">
                          {jd.description}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <OpeningsStepper id={jd.id} openings={jd.openings} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <JobDescriptionRowActions id={jd.id} jobName={jd.jobName} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 md:hidden">
        {isEmpty && !fetchError && (
          <p className="py-8 text-center text-muted-foreground">
            No job descriptions yet. Add one from the dashboard.
          </p>
        )}
        {list.map((jd) => (
          <Card key={jd.id} size="sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{jd.jobName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {jd.description}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Openings:</span>
                <OpeningsStepper id={jd.id} openings={jd.openings} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="pt-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function JobDescriptionsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <JobDescriptionsListContent />
    </div>
  );
}
