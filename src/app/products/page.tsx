import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SupportFab from "@/components/SupportFab";
import ProductCard from "@/components/ProductCard";
import { getProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <>
      <div className="glow-field" />
      <div className="relative z-10">
        <SiteHeader />

        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <span className="pill">All Products</span>
          <h1 className="section-title mt-4">Browse the vault</h1>
          <p className="mt-2 max-w-xl text-sm text-white/50">
            Every listing is stocked with real keys. Stock counts update live as
            orders are delivered.
          </p>

          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>

          {products.length === 0 && (
            <div className="card mt-8 p-12 text-center text-sm text-white/45">
              No products yet.
            </div>
          )}
        </main>

        <SiteFooter />
      </div>
      <SupportFab />
    </>
  );
}
