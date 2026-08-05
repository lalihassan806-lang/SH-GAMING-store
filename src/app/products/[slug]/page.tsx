import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SupportFab from "@/components/SupportFab";
import BuyPanel from "@/components/BuyPanel";
import { IconBolt, IconKey, IconShield } from "@/components/Icons";
import { getProductBySlug } from "@/lib/data";
import { getProfile } from "@/lib/auth";
import { isDemo } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const profile = isDemo ? null : await getProfile();
  const grad = `grad-${product.gradient || "orange"}`;

  return (
    <>
      <div className="glow-field" />
      <div className="relative z-10">
        <SiteHeader />

        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <nav className="mb-7 text-xs font-semibold text-white/35">
            <Link href="/" className="hover:text-white/70">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/products" className="hover:text-white/70">Products</Link>
            <span className="mx-2">/</span>
            <span className="text-white/60">{product.name}</span>
          </nav>

          <div className="grid gap-9 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Visual + description */}
            <div>
              <div className={`relative aspect-[16/9] overflow-hidden rounded-2xl ${grad}`}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_18%_18%,rgba(255,255,255,.6),transparent_45%)]" />
                {product.tag && (
                  <span className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/90 backdrop-blur">
                    {product.tag}
                  </span>
                )}
                <h1 className="absolute bottom-5 left-5 right-5 text-3xl font-extrabold tracking-tight text-white drop-shadow sm:text-4xl">
                  {product.name}
                </h1>
              </div>

              <div className="card mt-5 p-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white/40">
                  About this product
                </h2>
                <p className="mt-3 text-[14px] leading-relaxed text-white/60">
                  {product.description}
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: IconBolt, t: "Instant delivery" },
                    { icon: IconShield, t: "Secure checkout" },
                    { icon: IconKey, t: `${product.stock} keys ready` },
                  ].map(({ icon: Icon, t }) => (
                    <div
                      key={t}
                      className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3 text-[12.5px] font-bold text-white/65"
                    >
                      <Icon className="h-4 w-4 text-gold-400" />
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <BuyPanel
              product={product}
              walletBalance={profile?.wallet ?? null}
              loggedIn={!!profile}
              demo={isDemo}
            />
          </div>
        </main>

        <SiteFooter />
      </div>
      <SupportFab />
    </>
  );
}
