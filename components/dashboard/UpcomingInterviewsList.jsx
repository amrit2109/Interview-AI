import Link from "next/link";
import { format } from "@/lib/date-utils";

function toSortableDate(value) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number") return new Date(value).toISOString();
  return "";
}

/**
 * Compact list of upcoming interviews for dashboard.
 * @param {object} props
 * @param {Array<{ id: string; name: string; position: string; interviewDate: string | Date | number | null; status: string }>} props.candidates
 * @param {number} [props.limit]
 */
export function UpcomingInterviewsList({ candidates, limit = 4 }) {
  const upcoming = candidates
    .filter((c) => c.status !== "completed" && c.interviewDate)
    .sort((a, b) =>
      toSortableDate(a.interviewDate).localeCompare(
        toSortableDate(b.interviewDate)
      )
    )
    .slice(0, limit);

  if (upcoming.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No upcoming interviews
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {upcoming.map((c) => (
        <li key={c.id}>
          <Link
            href={`/admin/candidates/${c.id}`}
            className="flex flex-col gap-0.5 py-3 transition-colors hover:bg-muted/50"
          >
            <p className="font-medium">{c.name}</p>
            <p className="text-sm text-muted-foreground">
              {c.position} · {format(c.interviewDate)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
