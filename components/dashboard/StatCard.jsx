import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Reusable stat card for dashboard KPIs.
 * @param {object} props
 * @param {string} props.label
 * @param {string|number} props.value
 * @param {import("lucide-react").LucideIcon} [props.Icon]
 * @param {string} [props.subtext]
 * @param {string} [props.trend] - e.g. "+12%"
 * @param {string} [props.className]
 */
export function StatCard({ label, value, Icon, subtext, trend, className }) {
  return (
    <Card size="sm" className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        {Icon && <Icon className="size-4 text-muted-foreground" aria-hidden />}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {(subtext || trend) && (
          <p className="mt-1 text-xs text-muted-foreground">
            {trend && <span className="text-emerald-600">{trend}</span>}
            {trend && subtext && " · "}
            {subtext}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
