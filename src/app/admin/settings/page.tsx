import PageHead from "@/components/admin/PageHead";
import DemoBanner from "@/components/admin/DemoBanner";
import ActionForm from "@/components/admin/ActionForm";
import { createClient } from "@/lib/supabase/server";
import { isDemo } from "@/lib/demo";
import { saveSettings } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  let store: any = {
    name: process.env.NEXT_PUBLIC_STORE_NAME || "SH GAMING STORE",
    currency: "PKR",
    support_url: process.env.NEXT_PUBLIC_SUPPORT_URL || "",
    announcement: "",
  };

  if (!isDemo) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "store")
      .maybeSingle();
    if (data?.value) store = { ...store, ...data.value };
  }

  return (
    <>
      <PageHead title="Settings" subtitle="Store identity and support details." />

      <div className="max-w-2xl space-y-6 p-5 sm:p-8">
        {isDemo && <DemoBanner />}

        <ActionForm
          action={saveSettings}
          successText="Settings saved."
          className="card p-6 sm:p-7"
        >
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="name">Store name</label>
              <input
                id="name"
                name="name"
                className="input"
                defaultValue={store.name}
                maxLength={80}
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="currency">Currency code</label>
              <input
                id="currency"
                name="currency"
                className="input"
                defaultValue={store.currency}
                maxLength={10}
              />
              <p className="mt-1.5 text-[11.5px] text-white/35">
                Used for price formatting across the store.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="support_url">Support link</label>
              <input
                id="support_url"
                name="support_url"
                className="input"
                defaultValue={store.support_url}
                placeholder="https://wa.me/920000000000"
                maxLength={200}
              />
              <p className="mt-1.5 text-[11.5px] text-white/35">
                Powers the floating support button.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="announcement">Announcement banner</label>
              <textarea
                id="announcement"
                name="announcement"
                rows={2}
                className="input resize-y"
                defaultValue={store.announcement}
                placeholder="Optional message shown to all visitors."
                maxLength={300}
              />
            </div>
          </div>

          <button type="submit" className="btn-gold mt-6">
            Save settings
          </button>
        </ActionForm>

        {/* Setup reference */}
        <div className="card p-6 sm:p-7">
          <h2 className="text-[15px] font-bold text-white">Connection status</h2>
          <div className="mt-4 space-y-2.5">
            <Row
              label="Supabase"
              value={isDemo ? "Not connected (demo mode)" : "Connected"}
              ok={!isDemo}
            />
            <Row
              label="Service role key"
              value={process.env.SUPABASE_SERVICE_ROLE_KEY ? "Set" : "Missing"}
              ok={!!process.env.SUPABASE_SERVICE_ROLE_KEY}
            />
          </div>

          <p className="mt-5 text-[12px] leading-relaxed text-white/40">
            To go live: add your keys to <code className="text-gold-400">.env.local</code>,
            run <code className="text-gold-400">supabase/schema.sql</code> in the Supabase
            SQL editor, sign up, then promote yourself with{" "}
            <code className="text-gold-400">
              update public.profiles set role=&apos;admin&apos; where email=&apos;you@example.com&apos;;
            </code>
          </p>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
      <span className="text-[13px] font-bold text-white/70">{label}</span>
      <span
        className={`badge ${
          ok
            ? "border border-emerald-500/25 bg-emerald-500/12 text-emerald-300"
            : "border border-gold-500/25 bg-gold-500/12 text-gold-400"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
