import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import AuthForm from "@/components/AuthForm";
import { isDemo } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to access your wallet and key vault."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-bold text-gold-400 hover:text-gold-500">
            Create one free
          </Link>
        </>
      }
    >
      <AuthForm mode="login" demo={isDemo} next={next || "/account"} />
    </AuthShell>
  );
}
