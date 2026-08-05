"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";
import {
  IconChart, IconBox, IconCart, IconUsers, IconKey, IconWallet,
  IconCard, IconHelp, IconGear, IconLogout, IconMenu, IconX, IconArrow,
} from "@/components/Icons";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: IconChart },
  { href: "/admin/products", label: "Products", icon: IconBox },
  { href: "/admin/orders", label: "Orders", icon: IconCart },
  { href: "/admin/keys", label: "Key Vault", icon: IconKey },
  { href: "/admin/topups", label: "Top-ups", icon: IconWallet },
  { href: "/admin/users", label: "Users", icon: IconUsers },
  { href: "/admin/payments", label: "Payments", icon: IconCard },
  { href: "/admin/faqs", label: "FAQ", icon: IconHelp },
  { href: "/admin/settings", label: "Settings", icon: IconGear },
];

export default function AdminSidebar({
  username,
  pendingTopups = 0,
}: {
  username: string;
  pendingTopups?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="space-y-1">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-bold transition ${
              active
                ? "bg-gold-500/12 text-gold-400 ring-1 ring-gold-500/25"
                : "text-white/50 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />
            <span className="flex-1">{label}</span>
            {label === "Top-ups" && pendingTopups > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gold-grad px-1.5 text-[10px] font-extrabold text-black">
                {pendingTopups}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile bar */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/8 bg-ink-950/85 px-4 backdrop-blur-xl lg:hidden">
        <Logo />
        <button
          onClick={() => setOpen(true)}
          aria-label="Open admin menu"
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/70"
        >
          <IconMenu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-white/8 bg-ink-900 p-5">
            <div className="flex items-center justify-between">
              <Logo />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-white/60"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-7">{nav}</div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-white/8 bg-ink-950/60 lg:flex lg:h-screen lg:flex-col lg:sticky lg:top-0">
        <div className="flex h-16 items-center border-b border-white/8 px-5">
          <Logo />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/25">
            Management
          </div>
          {nav}
        </div>

        <div className="border-t border-white/8 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-grad text-[13px] font-extrabold text-black">
              {username.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold text-white">
                {username}
              </div>
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-gold-400">
                Administrator
              </div>
            </div>
          </div>

          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-bold text-white/45 transition hover:bg-white/5 hover:text-white"
          >
            <IconArrow className="h-4 w-4" />
            View storefront
          </Link>
          <form action="/logout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-bold text-white/45 transition hover:bg-rose-500/10 hover:text-rose-300"
            >
              <IconLogout className="h-4 w-4" />
              Log out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
