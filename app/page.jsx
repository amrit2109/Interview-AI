import Link from "next/link";
import { Button } from "../components/ui/button";

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">Orion TalentIQ</h1>
        <p className="text-muted-foreground">
          AI Voice Interview • First Round Prescreening
        </p>
        <p className="text-sm text-muted-foreground">
          Use the secure link sent to you by email to access your interview.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="outline" size="sm">
            <Link href="/interview/demo123">Try demo interview</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin">Admin dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
