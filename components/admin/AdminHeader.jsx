"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { handleLogout } from "@/app/admin/actions";
import { LogOutIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminHeader() {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login" || pathname?.startsWith("/admin/login/");

  if (isLogin) {
    return null;
  }

  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <div className="flex h-14 items-center justify-between gap-6 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-semibold">
            Orion TalentIQ
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/admin"
              className={cn(
                "transition-colors hover:text-foreground",
                pathname === "/admin"
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Dashboard
            </Link>
            <Link
              href="/admin/candidates"
              className={cn(
                "transition-colors hover:text-foreground",
                pathname?.startsWith("/admin/candidates")
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Candidates
            </Link>
            <Link
              href="/admin/job-descriptions"
              className={cn(
                "transition-colors hover:text-foreground",
                pathname?.startsWith("/admin/job-descriptions")
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Job Descriptions
            </Link>
          </nav>
        </div>
        <form action={handleLogout}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Sign out"
          >
            <LogOutIcon className="mr-2 size-4" />
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
