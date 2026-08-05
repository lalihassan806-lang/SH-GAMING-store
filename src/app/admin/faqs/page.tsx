import PageHead from "@/components/admin/PageHead";
import DemoBanner from "@/components/admin/DemoBanner";
import ActionForm from "@/components/admin/ActionForm";
import { IconTrash, IconPlus } from "@/components/Icons";
import { adminFaqs } from "@/lib/admin-data";
import { isDemo } from "@/lib/demo";
import { saveFaq, deleteFaq } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminFaqsPage() {
  const faqs = await adminFaqs();

  return (
    <>
      <PageHead
        title="FAQ"
        subtitle="Questions shown in the FAQ accordion on the home page."
      />

      <div className="max-w-3xl space-y-6 p-5 sm:p-8">
        {isDemo && <DemoBanner />}

        <ActionForm action={saveFaq} successText="Question added." className="card p-6 sm:p-7">
          <h2 className="text-[15px] font-bold text-white">Add a question</h2>

          <div className="mt-5 space-y-4">
            <div>
              <label className="label" htmlFor="question">Question</label>
              <input
                id="question"
                name="question"
                className="input"
                placeholder="How fast is delivery?"
                required
                maxLength={200}
              />
            </div>
            <div>
              <label className="label" htmlFor="answer">Answer</label>
              <textarea
                id="answer"
                name="answer"
                rows={3}
                className="input resize-y"
                placeholder="Instant — your key appears in your vault right away."
                required
                maxLength={1000}
              />
            </div>
            <div className="flex flex-wrap items-end gap-5">
              <div className="w-32">
                <label className="label" htmlFor="sort">Sort order</label>
                <input id="sort" name="sort" type="number" className="input" defaultValue={faqs.length + 1} />
              </div>
              <label className="flex cursor-pointer items-center gap-2.5 pb-2.5">
                <input type="checkbox" name="active" defaultChecked className="h-4 w-4 accent-gold-500" />
                <span className="text-[13px] font-bold text-white/75">Visible</span>
              </label>
            </div>
          </div>

          <button type="submit" className="btn-gold mt-5">
            <IconPlus className="h-3.5 w-3.5" />
            Add question
          </button>
        </ActionForm>

        <div className="card divide-y divide-white/8">
          <div className="px-5 py-4">
            <h2 className="text-[15px] font-bold text-white">
              Current questions ({faqs.length})
            </h2>
          </div>

          {faqs.map((f: any) => (
            <div key={f.id} className="flex items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="text-[14px] font-bold text-white">{f.question}</div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/50">
                  {f.answer}
                </p>
              </div>
              <ActionForm action={deleteFaq} confirm="Delete this question?">
                <input type="hidden" name="id" value={f.id} />
                <button
                  type="submit"
                  aria-label="Delete question"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20"
                >
                  <IconTrash className="h-3.5 w-3.5" />
                </button>
              </ActionForm>
            </div>
          ))}

          {faqs.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-white/45">
              No questions yet.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
