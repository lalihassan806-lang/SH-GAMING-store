import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import { IconShield } from "@/components/Icons";

export const metadata = { title: "Account suspended" };

/**
 * requireUser() in src/lib/auth.ts redirects here when profiles.banned is true.
 * Without this route a banned user hit a 404 instead of an explanation.
 */
export default function BannedPage() {
  return (
    <AuthShell
      title="Account suspended"
      subtitle="This account cannot place orders right now."
      footer={
        <>
          Think this is a mistake?{" "}
          <Link href="/" className="font-bold text-gold-400 hover:text-gold-300">
            Contact support
          </Link>
        </>
      }
    >
      <div className="flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/10 p-4">
        <IconShield className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
        <div className="text-[13px] leading-relaxed text-white/70">
          <p className="font-bold text-rose-200">Access restricted</p>
          <p className="mt-1.5">
            Your wallet balance and delivered keys are safe. Our team can review
            the suspension if you reach out through the support channel.
          </p>
        </div>
      </div>

      {/* /logout is POST-only (src/app/logout/route.ts), so this must be a form. */}
      <form action="/logout" method="post" className="mt-5">
        <button type="submit" className="btn-ghost w-full justify-center">
          Sign out
        </button>
      </form>
    </AuthShell>
  );
}
