import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "./checkout-form";
import { formatPKR } from "@/lib/utils";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/checkout/${slug}`);

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!product) notFound();

  const jc = process.env.NEXT_PUBLIC_JAZZCASH_NUMBER;
  const ep = process.env.NEXT_PUBLIC_EASYPAISA_NUMBER;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3 rounded-2xl border border-border bg-card/60 p-4">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
          <Image
            src={product.image_url || "/placeholder.png"}
            alt={product.title}
            fill
            className="object-cover"
          />
        </div>
        <h2 className="font-semibold">{product.title}</h2>
        <p className="text-xl font-bold drip-gradient-text">
          {formatPKR(product.price)}
        </p>

        <div className="space-y-2 pt-2 text-xs">
          <p className="font-semibold text-foreground">Payment instructions</p>
          <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
            <li>Send <b>{formatPKR(product.price)}</b> to one of the numbers below.</li>
            <li>Copy the <b>Transaction ID (TID)</b> from the confirmation SMS.</li>
            <li>Fill the form and submit — order confirmed after verification.</li>
          </ol>
          <div className="mt-2 space-y-1 rounded-lg border border-border/60 p-2">
            {jc && <p>JazzCash: <span className="font-mono text-foreground">{jc}</span></p>}
            {ep && <p>EasyPaisa: <span className="font-mono text-foreground">{ep}</span></p>}
          </div>
        </div>
      </div>

      <CheckoutForm productId={product.id} />
    </div>
  );
}
