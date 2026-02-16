import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
import { Badge } from "@/components/ui/badge";
import { getCandidates } from "@/lib/mock-api";
import { CandidateRowActions } from "@/components/admin/CandidateRowActions";

const STATUS_VARIANTS = {
  completed: "default",
  in_progress: "secondary",
  pending: "outline",
};

function formatStatus(status) {
  return status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function CandidatesListContent() {
  const { data: candidates } = await getCandidates();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Candidates</h1>
          <p className="mt-1 text-muted-foreground">
            Manage and review interview candidates
          </p>
        </div>
      </div>

      <div className="hidden md:block">
        <Card size="sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Phone</th>
                    <th className="px-4 py-3 text-left font-medium">Position</th>
                    <th className="px-4 py-3 text-left font-medium">ATS</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                      <td className="px-4 py-3">{c.phone ?? "—"}</td>
                      <td className="px-4 py-3">{c.position}</td>
                      <td className="px-4 py-3">{c.atsScore ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANTS[c.status] ?? "outline"}>
                          {formatStatus(c.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <CandidateRowActions id={c.id} name={c.name} />
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
        {candidates.map((c) => (
          <Card key={c.id} size="sm">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </div>
                <Badge variant={STATUS_VARIANTS[c.status] ?? "outline"}>
                  {formatStatus(c.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">{c.position}</p>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>Phone: {c.phone ?? "—"}</span>
                <span>ATS: {c.atsScore ?? "—"}</span>
              </div>
              <CandidateRowActions id={c.id} name={c.name} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function CandidatesListPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <CandidatesListContent />
    </div>
  );
}
