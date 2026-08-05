import AdminSidebar from "@/components/admin/AdminSidebar";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isDemo, demoTopups } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let username = "Demo Admin";
  let pending = demoTopups.filter((t) => t.status === "pending").length;

  if (!isDemo) {
    // Server-side role check against the database on every admin request.
    const profile = await requireAdmin();
    username = profile.username || profile.email || "Admin";

    const supabase = await createClient();
    const { count } = await supabase
      .from("topups")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    pending = count ?? 0;
  }

  return (
    <>
      <div className="glow-field" />
      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <AdminSidebar username={username} pendingTopups={pending} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}
