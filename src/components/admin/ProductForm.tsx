import ActionForm from "./ActionForm";
import { saveProduct } from "@/app/admin/actions";

const GRADIENTS = ["orange", "purple", "cyan", "green", "pink"];

export default function ProductForm({ product }: { product?: any }) {
  const p = product ?? {};

  return (
    <ActionForm
      action={saveProduct}
      successText="Product saved."
      className="card p-6 sm:p-7"
    >
      {p.id && <input type="hidden" name="id" value={p.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="name">Product name</label>
          <input
            id="name"
            name="name"
            className="input"
            defaultValue={p.name ?? ""}
            placeholder="DRIP CLIENT"
            required
            maxLength={120}
          />
        </div>

        <div>
          <label className="label" htmlFor="slug">URL slug</label>
          <input
            id="slug"
            name="slug"
            className="input"
            defaultValue={p.slug ?? ""}
            placeholder="drip-client (auto if blank)"
            maxLength={60}
          />
        </div>

        <div>
          <label className="label" htmlFor="tag">Badge / tag</label>
          <input
            id="tag"
            name="tag"
            className="input"
            defaultValue={p.tag ?? ""}
            placeholder="FREE FIRE APKMOD"
            maxLength={60}
          />
        </div>

        <div>
          <label className="label" htmlFor="price">Price (PKR)</label>
          <input
            id="price"
            name="price"
            type="number"
            min={0}
            step="1"
            className="input"
            defaultValue={p.price ?? 0}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="old_price">Compare-at price</label>
          <input
            id="old_price"
            name="old_price"
            type="number"
            min={0}
            step="1"
            className="input"
            defaultValue={p.old_price ?? ""}
            placeholder="Optional"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            rows={4}
            className="input resize-y"
            defaultValue={p.description ?? ""}
            placeholder="What the buyer gets, supported devices, update cadence…"
            maxLength={2000}
          />
        </div>

        <div>
          <label className="label" htmlFor="gradient">Cover colour</label>
          <select
            id="gradient"
            name="gradient"
            className="input"
            defaultValue={p.gradient ?? "orange"}
          >
            {GRADIENTS.map((g) => (
              <option key={g} value={g} className="bg-ink-900 capitalize">
                {g}
              </option>
            ))}
          </select>
          <div className="mt-2.5 flex gap-2">
            {GRADIENTS.map((g) => (
              <span key={g} className={`h-6 w-9 rounded-md grad-${g}`} title={g} />
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="sort">Sort order</label>
          <input
            id="sort"
            name="sort"
            type="number"
            className="input"
            defaultValue={p.sort ?? 0}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-5 border-t border-white/8 pt-5">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            name="active"
            defaultChecked={p.id ? !!p.active : true}
            className="h-4 w-4 accent-gold-500"
          />
          <span className="text-[13px] font-bold text-white/75">
            Visible in store
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={!!p.featured}
            className="h-4 w-4 accent-gold-500"
          />
          <span className="text-[13px] font-bold text-white/75">
            Feature on home page
          </span>
        </label>
      </div>

      <button type="submit" className="btn-gold mt-6">
        {p.id ? "Save changes" : "Create product"}
      </button>
    </ActionForm>
  );
}
