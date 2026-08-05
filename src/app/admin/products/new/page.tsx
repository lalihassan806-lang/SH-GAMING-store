import Link from "next/link";
import PageHead from "@/components/admin/PageHead";
import DemoBanner from "@/components/admin/DemoBanner";
import ProductForm from "@/components/admin/ProductForm";
import { isDemo } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default function NewProductPage() {
  return (
    <>
      <PageHead
        title="Add product"
        subtitle="Create a listing, then load keys into it from the Key Vault."
        action={
          <Link href="/admin/products" className="btn-ghost btn-sm">
            Back to products
          </Link>
        }
      />

      <div className="max-w-3xl space-y-5 p-5 sm:p-8">
        {isDemo && <DemoBanner />}
        <ProductForm />
      </div>
    </>
  );
}
