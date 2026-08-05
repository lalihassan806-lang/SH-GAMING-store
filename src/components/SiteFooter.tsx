import Link from "next/link";
import Logo from "./Logo";

export default function SiteFooter() {
  const name = process.env.NEXT_PUBLIC_STORE_NAME || "SH GAMING STORE";

  return (
    <footer className="border-t border-white/8 bg-ink-950/60">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-white/45">
              Premium gaming keys with instant vault delivery. Trusted by
              thousands of players across Pakistan.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">
              Store
            </h4>
            <ul className="mt-4 space-y-2.5 text-[13px] font-semibold text-white/55">
              <li><Link href="/products" className="hover:text-white">Products</Link></li>
              <li><Link href="/wallet" className="hover:text-white">Wallet</Link></li>
              <li><Link href="/account" className="hover:text-white">My vault</Link></li>
              <li><Link href="/#faq" className="hover:text-white">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">
              Account
            </h4>
            <ul className="mt-4 space-y-2.5 text-[13px] font-semibold text-white/55">
              <li><Link href="/login" className="hover:text-white">Login</Link></li>
              <li><Link href="/signup" className="hover:text-white">Create account</Link></li>
              <li><Link href="/admin" className="hover:text-white">Admin panel</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/8 pt-6 text-[12px] text-white/35 sm:flex-row">
          <span>© {new Date().getFullYear()} {name}. All rights reserved.</span>
          <span>Keys are digital goods — delivery is instant and final.</span>
        </div>
      </div>
    </footer>
  );
}
