import Link from "next/link";
import Logo from "./Logo";

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <>
      <div className="glow-field" />
      <main className="relative z-10 grid min-h-screen place-items-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>

          <div className="card p-7 shadow-card sm:p-8">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              {title}
            </h1>
            <p className="mt-1.5 text-sm text-white/50">{subtitle}</p>

            <div className="mt-7">{children}</div>
          </div>

          <p className="mt-6 text-center text-[13px] text-white/45">{footer}</p>

          <p className="mt-8 text-center">
            <Link href="/" className="text-xs font-semibold text-white/35 hover:text-white/70">
              ← Back to store
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
