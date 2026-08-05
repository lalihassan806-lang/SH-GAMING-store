import PageHead from "@/components/admin/PageHead";
import DemoBanner from "@/components/admin/DemoBanner";
import ActionForm from "@/components/admin/ActionForm";
import StatusBadge from "@/components/StatusBadge";
import { adminUsers } from "@/lib/admin-data";
import { money } from "@/lib/auth";
import { isDemo } from "@/lib/demo";
import { adjustWallet, setUserRole, setUserBanned } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await adminUsers();
  const admins = users.filter((u: any) => u.role === "admin").length;
  const totalWallet = users.reduce((s: number, u: any) => s + Number(u.wallet || 0), 0);

  return (
    <>
      <PageHead
        title="Users"
        subtitle={`${users.length} members · ${admins} admin${admins === 1 ? "" : "s"} · ${money(totalWallet)} held in wallets`}
      />

      <div className="space-y-5 p-5 sm:p-8">
        {isDemo && <DemoBanner />}

        <div className="card overflow-x-auto">
          <table className="w-full min-w-[940px]">
            <thead className="border-b border-white/8">
              <tr>
                <th className="th">User</th>
                <th className="th">Wallet</th>
                <th className="th">Role</th>
                <th className="th">Status</th>
                <th className="th">Adjust balance</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {users.map((u: any) => (
                <tr key={u.id} className="hover:bg-white/[0.02]">
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/8 text-[12px] font-extrabold text-white/70">
                        {(u.username || u.email || "?").slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-bold text-white">
                          {u.username || "—"}
                        </div>
                        <div className="truncate text-[11.5px] text-white/35">
                          {u.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="td text-[15px] font-extrabold text-gold-400">
                    {money(u.wallet)}
                  </td>

                  <td className="td">
                    <ActionForm action={setUserRole} className="flex items-center gap-2">
                      <input type="hidden" name="user_id" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="rounded-lg border border-white/10 bg-ink-900 px-2.5 py-1.5 text-[12px] font-bold text-white outline-none focus:border-gold-500/60"
                      >
                        <option value="user" className="bg-ink-900">user</option>
                        <option value="admin" className="bg-ink-900">admin</option>
                      </select>
                      <button type="submit" className="btn-ghost btn-sm">Set</button>
                    </ActionForm>
                  </td>

                  <td className="td">
                    <StatusBadge status={u.banned ? "banned" : "active"} />
                  </td>

                  <td className="td">
                    <ActionForm action={adjustWallet} className="flex items-center gap-2">
                      <input type="hidden" name="user_id" value={u.id} />
                      <input
                        name="amount"
                        type="number"
                        step="1"
                        placeholder="+/− PKR"
                        required
                        className="w-28 rounded-lg border border-white/10 bg-ink-900 px-2.5 py-1.5 text-[12px] font-bold text-white outline-none placeholder-white/30 focus:border-gold-500/60"
                      />
                      <button type="submit" className="btn-ghost btn-sm">Apply</button>
                    </ActionForm>
                  </td>

                  <td className="td">
                    <div className="flex justify-end">
                      <ActionForm
                        action={setUserBanned}
                        confirm={u.banned ? "Unban this user?" : "Ban this user?"}
                      >
                        <input type="hidden" name="user_id" value={u.id} />
                        <input type="hidden" name="banned" value={String(!!u.banned)} />
                        <button
                          type="submit"
                          className={`rounded-lg border px-3 py-1.5 text-[12px] font-bold transition ${
                            u.banned
                              ? "border-emerald-500/25 bg-emerald-500/12 text-emerald-300 hover:bg-emerald-500/20"
                              : "border-rose-500/25 bg-rose-500/12 text-rose-300 hover:bg-rose-500/20"
                          }`}
                        >
                          {u.banned ? "Unban" : "Ban"}
                        </button>
                      </ActionForm>
                    </div>
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td className="td py-12 text-center text-white/45" colSpan={6}>
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
