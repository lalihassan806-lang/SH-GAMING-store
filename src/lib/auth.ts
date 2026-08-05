import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string | null;
  username: string | null;
  phone: string | null;
  role: "user" | "admin";
  wallet: number;
  banned: boolean;
  created_at: string;
};

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}

/** Gate a page behind login. */
export async function requireUser(next = "/account") {
  const profile = await getProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (profile.banned) redirect("/banned");
  return profile;
}

/** Gate a page behind the admin role. Verified server-side against the DB. */
export async function requireAdmin() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/admin");
  if (profile.role !== "admin") redirect("/?error=forbidden");
  return profile;
}

export function money(n: number, currency = "PKR") {
  const v = Number(n || 0);
  return `${currency === "PKR" ? "Rs " : "$"}${v.toLocaleString("en-PK", {
    minimumFractionDigits: currency === "PKR" ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
