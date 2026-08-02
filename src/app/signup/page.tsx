"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction } from "@/app/actions/auth";

export default function SignupPage() {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  if (done) {
    return (
      <div className="mx-auto max-w-sm rounded-2xl border border-border bg-card/60 p-6 text-center">
        <h1 className="text-xl font-bold">Check your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a confirmation link to <b>{form.email}</b>. Click it to
          activate your account.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card/60 p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Create account</h1>
        <p className="text-xs text-muted-foreground">
          Sign up to start ordering premium products.
        </p>
      </div>

      <form
        action={(fd) =>
          start(async () => {
            const res = await signUpAction(fd);
            if (res && "error" in res && res.error) toast.error(res.error);
            else setDone(true);
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
          <Label htmlFor="password">Password (min 6)</Label>
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
          {pending ? "Creating…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
