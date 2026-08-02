import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogOut, Package, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/actions/auth";

export async function SiteHeader() {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "DRIP CLIENT";
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = !!data?.is_admin;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg drip-btn-gradient text-sm font-black text-black">
            D
          </span>
          <span className="text-sm font-semibold tracking-wide drip-gradient-text">
            {storeName}
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/orders"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Package className="h-4 w-4" /> Orders
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-primary hover:opacity-90"
            >
              <ShieldCheck className="h-4 w-4" /> Admin
            </Link>
          )}
          {user ? (
            <form action={signOutAction}>
              <Button size="sm" variant="ghost" type="submit">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <Link href="/login">
              <Button size="sm" variant="gradient">
                <User className="h-4 w-4" /> Sign in
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
