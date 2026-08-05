"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconArrow } from "./Icons";

type Mode = "login" | "signup";

export default function AuthForm({
  mode,
  demo,
  next = "/account",
}: {
  mode: Mode;
  demo: boolean;
  next?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "err" | "ok"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (demo) {
      setMsg({
        type: "err",
        text: "Demo mode: connect Supabase to enable real accounts. Browse /admin to preview the panel.",
      });
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        });
        if (error) throw error;
        setMsg({
          type: "ok",
          text: "Account created. Check your inbox if email confirmation is enabled, then log in.",
        });
        setBusy(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      router.replace(next);
      router.refresh();
    } catch (err: any) {
      setMsg({ type: "err", text: err?.message || "Something went wrong." });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="username">Username</label>
          <input
            id="username"
            className="input"
            placeholder="your_gamer_tag"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={24}
            autoComplete="username"
          />
        </div>
      )}

      <div>
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          className="input"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          className="input"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </div>

      {msg && (
        <div
          role="alert"
          className={`rounded-xl border px-4 py-3 text-[13px] font-medium ${
            msg.type === "err"
              ? "border-rose-500/25 bg-rose-500/10 text-rose-200"
              : "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      <button type="submit" disabled={busy} className="btn-gold w-full justify-center">
        {busy ? "Please wait…" : mode === "login" ? "Login & Buy" : "Create account"}
        {!busy && (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-black/20">
            <IconArrow className="h-3 w-3" />
          </span>
        )}
      </button>
    </form>
  );
}
