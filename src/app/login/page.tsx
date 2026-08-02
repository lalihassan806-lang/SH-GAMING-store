"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction } from "@/app/actions/auth";

export default function LoginPage() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });

  return (
    <div className="mx-auto w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card/60 p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Sign in</h1>
        <p className="text-xs text-muted-foreground">
          Welcome back — enter your credentials.
        </p>
      </div>

      <form
        action={(fd) =>
          start(async () => {
            const res = await signInAction(fd);
            if (res && "error" in res && res.error) toast.error(res.error);
            else router.refresh();
          })
        }
        className="space-y-3"
      >
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <Button type="submit" variant="gradient" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        No account?{" "}
        <Link href="/signup" className="text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
