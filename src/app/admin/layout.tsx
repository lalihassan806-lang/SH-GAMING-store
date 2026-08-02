import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Box, Package } from "lucide-react";

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!data?.is_admin) redirect("/");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card/60 p-2 text-sm">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:bg-muted"
        >
          <Box className="h-4 w-4" /> Products
        </Link>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:bg-muted"
        >
          <Package className="h-4 w-4" /> Orders
        </Link>
      </div>
      {children}
    </div>
  );
}
