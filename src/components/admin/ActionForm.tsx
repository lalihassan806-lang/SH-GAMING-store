"use client";

import { useState, useTransition } from "react";

type Result = { ok: boolean; error?: string };

/**
 * Wraps a server action in a form and surfaces the returned error inline.
 * Keeps admin mutations progressive-enhancement friendly.
 */
export default function ActionForm({
  action,
  children,
  className,
  confirm,
  successText,
  onDone,
}: {
  action: (fd: FormData) => Promise<Result>;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  successText?: string;
  onDone?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "err" | "ok"; text: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (confirm && !window.confirm(confirm)) return;

    const fd = new FormData(e.currentTarget);
    setMsg(null);

    startTransition(async () => {
      const res = await action(fd);
      if (res?.ok) {
        if (successText) setMsg({ type: "ok", text: successText });
        onDone?.();
      } else {
        setMsg({ type: "err", text: res?.error || "Action failed." });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>

      {msg && (
        <div
          role="alert"
          className={`mt-3 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-medium ${
            msg.type === "err"
              ? "border-rose-500/25 bg-rose-500/10 text-rose-200"
              : "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {msg.text}
        </div>
      )}
    </form>
  );
}
