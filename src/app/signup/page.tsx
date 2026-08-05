import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import AuthForm from "@/components/AuthForm";
import { isDemo } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Free to join. Top up and buy in under two minutes."
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="font-bold text-gold-400 hover:text-gold-500">
            Log in
          </Link>
        </>
      }
    >
      <AuthForm mode="signup" demo={isDemo} />
    </AuthShell>
  );
}
