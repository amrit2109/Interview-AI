import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusVariant = {
  completed: "default",
  in_progress: "secondary",
  pending: "outline",
};

/**
 * Compact list of recent candidates for dashboard.
 * @param {object} props
 * @param {Array<{ id: string; name: string; position: string; status: string; interviewDate?: string | null }>} props.candidates
 * @param {number} [props.limit]
 */
export function RecentCandidatesList({ candidates, limit = 5 }) {
  const items = candidates.slice(0, limit);

  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No candidates yet
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((c) => (
        <li key={c.id}>
          <Link
            href={`/admin/candidates/${c.id}`}
            className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-muted/50"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{c.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {c.position}
              </p>
            </div>
            <Badge
              variant={statusVariant[c.status] ?? "outline"}
              className={cn("shrink-0 capitalize")}
            >
              {c.status.replace("_", " ")}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
