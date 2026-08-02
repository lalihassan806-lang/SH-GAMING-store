import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product-card";
import { CategoryTabs } from "@/components/category-tabs";
import { Sparkles } from "lucide-react";
import type { Category, Product } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: cats } = await supabase
    .from("categories")
    .select("*")
    .order("name");
  const categories = (cats || []) as Category[];

  let query = supabase
    .from("products")
    .select("*, category:categories(*)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (sp.category) {
    const match = categories.find((c) => c.slug === sp.category);
    if (match) query = query.eq("category_id", match.id);
  }

  const { data: products } = await query;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card/50 p-6">
        <div className="flex items-center gap-2 text-xs text-primary">
          <Sparkles className="h-4 w-4" />
          <span className="uppercase tracking-widest">Premium Digital Store</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
          Fast. Stable. <span className="drip-gradient-text">Legit.</span>
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Premium digital products delivered instantly. Pay via JazzCash or
          EasyPaisa — order confirmed after payment verification.
        </p>
      </section>

      <section id="store" className="space-y-3 scroll-mt-20">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Store</h2>
        </div>
        <CategoryTabs categories={categories} active={sp.category} />

        {products && products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {(products as Product[]).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No products yet. Add some from the admin panel.
          </div>
        )}
      </section>
    </div>
  );
}
