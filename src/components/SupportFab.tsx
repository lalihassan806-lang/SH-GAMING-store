import { IconChat } from "./Icons";

export default function SupportFab() {
  const url = process.env.NEXT_PUBLIC_SUPPORT_URL || "#";
  return (
    <a
      href={url}
      target={url === "#" ? undefined : "_blank"}
      rel="noreferrer"
      aria-label="Contact support"
      className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-glow-pink to-glow-purple text-white shadow-[0_12px_40px_-8px_rgba(236,72,153,0.7)] transition hover:scale-105 active:scale-95"
    >
      <IconChat className="h-6 w-6" />
      <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-ink-950 bg-emerald-400" />
    </a>
  );
}
