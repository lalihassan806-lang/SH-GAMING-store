import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPKR } from "@/lib/utils";
import { ExternalLink, ShoppingBag, Star } from "lucide-react";
import type { Product } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, category:categories(*)")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) notFound();
  const product = data as Product;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-muted">
        <Image
          src={product.image_url || "/placeholder.png"}
          alt={product.title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {product.category && <Badge>{product.category.name}</Badge>}
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <Star className="h-3 w-3 fill-amber-400" />
            {Number(product.rating || 5).toFixed(1)}
            <span className="text-muted-foreground">
              ({product.review_count || 0} reviews)
            </span>
          </div>
        </div>

        <h1 className="text-2xl font-bold sm:text-3xl">{product.title}</h1>
        <p className="text-2xl font-black drip-gradient-text">
          {formatPKR(product.price)}
        </p>

        <p className="whitespace-pre-line text-sm text-muted-foreground">
          {product.description}
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
          <Link href={`/checkout/${product.slug}`}>
            <Button variant="gradient" size="lg">
              <ShoppingBag className="h-4 w-4" /> Buy now
            </Button>
          </Link>
          {product.demo_url && (
            <a href={product.demo_url} target="_blank" rel="noreferrer">
              <Button variant="outline" size="lg">
                <ExternalLink className="h-4 w-4" /> Demo
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
