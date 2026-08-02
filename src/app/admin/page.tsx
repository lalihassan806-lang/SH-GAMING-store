import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "./product-form";
import { deleteProductAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { formatPKR } from "@/lib/utils";
import type { Category, Product } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const supabase = await createClient();
  const [{ data: prods }, { data: cats }] = await Promise.all([
    supabase.from("products").select("*, category:categories(*)").order("created_at", { ascending: false }),
    supabase.from("categories").select("*").order("name")
  ]);
  const products = (prods || []) as Product[];
  const categories = (cats || []) as Category[];

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_360px]">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Products ({products.length})</h2>
        <div className="space-y-2">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/60 p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  {p.category?.name || "Uncategorized"} · {formatPKR(Number(p.price))} ·{" "}
                  {p.is_active ? "active" : "hidden"}
                </p>
              </div>
              <form action={deleteProductAction}>
                <input type="hidden" name="id" value={p.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </form>
            </div>
          ))}
          {products.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No products yet. Use the form to add one.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Add product</h2>
        <ProductForm categories={categories} />
      </section>
    </div>
  );
}
