import Link from "next/link";
import Logo from "./Logo";
import { IconArrow, IconCart } from "./Icons";
import { getProfile } from "@/lib/auth";
import { isDemo } from "@/lib/demo";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/wallet", label: "Wallet" },
  { href: "/#faq", label: "FAQ" },
];

export default async function SiteHeader() {
  const profile = isDemo ? null : await getProfile();

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-sm font-semibold text-white/55 transition hover:text-white"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/cart"
            aria-label="Cart"
            className="relative grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-white/25 hover:text-white"
          >
            <IconCart className="h-[18px] w-[18px]" />
          </Link>

          {profile ? (
            <>
              {profile.role === "admin" && (
                <Link href="/admin" className="btn-ghost btn-sm hidden sm:inline-flex">
                  Admin
                </Link>
              )}
              <Link href="/account" className="btn-gold btn-sm">
                {profile.username || "Account"}
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost btn-sm hidden sm:inline-flex">
                Login
              </Link>
              <Link href="/products" className="btn-gold btn-sm">
                Login &amp; Buy
                <span className="grid h-5 w-5 place-items-center rounded-full bg-black/20">
                  <IconArrow className="h-3 w-3" />
                </span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
