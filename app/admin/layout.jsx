import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader />
      <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
    </div>
  );
}
