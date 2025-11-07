// src/views/admin/Subscriptions.jsx
import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  useGetTenantsQuery,
  useGetTenantQuery,
  useGetSubscriptionBreakdownQuery,
  useUpsertSubscriptionMutation,
  useExtendSubscriptionMutation,
} from "../../features/admin/adminApi";

/* ---------------- Small UI atoms (self-contained) ---------------- */
const Card = ({ title, subtitle, toolbar, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="px-5 pt-5 pb-3">
      {title ? <h2 className="text-xl font-semibold text-slate-900">{title}</h2> : null}
      {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
      {toolbar ? <div className="mt-3">{toolbar}</div> : null}
    </div>
    <div className="px-5 pb-5">{children}</div>
  </div>
);

const Input = (props) => (
  <input
    {...props}
    className={
      "w-full h-11 px-4 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 " +
      (props.className || "")
    }
  />
);

const Select = (props) => (
  <select
    {...props}
    className={
      "w-full h-11 px-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 " +
      (props.className || "")
    }
  />
);

const Label = ({ children }) => (
  <label className="text-xs font-medium text-slate-600">{children}</label>
);

const Badge = ({ children, tone = "emerald" }) => (
  <span
    className={
      "inline-flex items-center gap-1 rounded-full px-2.5 h-7 text-xs border " +
      (tone === "red"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : tone === "amber"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-emerald-50 text-emerald-700 border-emerald-200")
    }
  >
    {children}
  </span>
);

/* ----------------------- Main Page ----------------------- */
export default function Subscriptions() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [subFilter, setSubFilter] = useState("ALL"); // ACTIVE | INACTIVE | EXPIRED | ALL
  const [selectedTenantId, setSelectedTenantId] = useState(null);

  // Bulk stats
  const { data: breakdown } = useGetSubscriptionBreakdownQuery();

  // Tenants list (uses AdminController /admin/tenants with sub filter)
  const { data: tlist, isFetching } = useGetTenantsQuery(
    { page, size, q, status: "ALL", sub: subFilter, sort: "name,asc" },
    { refetchOnMountOrArgChange: true }
  );

  // Selected tenant profile (has latestSubscription)
  const { data: tenant } = useGetTenantQuery(selectedTenantId, { skip: !selectedTenantId });

  const pages = useMemo(() => {
    const total = tlist?.total ?? 0;
    return Math.max(1, Math.ceil(total / size));
  }, [tlist?.total, size]);

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left: list */}
      <div className="col-span-12 lg:col-span-7 xl:col-span-8">
        <Card
          title="Subscriptions"
          subtitle="Activate, extend, or pause tenant subscriptions"
          toolbar={
            <div className="flex flex-wrap items-center gap-3">
              <Input
                placeholder="Search tenants by name/code/email…"
                value={q}
                onChange={(e) => {
                  setPage(0);
                  setQ(e.target.value);
                }}
              />
              <Select value={subFilter} onChange={(e) => { setPage(0); setSubFilter(e.target.value); }}>
                {["ALL", "ACTIVE", "INACTIVE", "EXPIRED"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
              <Select value={size} onChange={(e) => setSize(Number(e.target.value))}>
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}/page
                  </option>
                ))}
              </Select>
            </div>
          }
        >
          {/* Stats */}
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <Badge>Active: {breakdown?.active ?? 0}</Badge>
            <Badge tone="red">Inactive: {breakdown?.inactive ?? 0}</Badge>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="py-2 pr-4">Tenant</th>
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Window</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(tlist?.items ?? []).map((t) => {
                  const starts = t.latestStartsAt ? dayjs(t.latestStartsAt).format("YYYY-MM-DD") : "—";
                  const ends = t.latestEndsAt ? dayjs(t.latestEndsAt).format("YYYY-MM-DD") : "—";
                  const st = (t.latestStatus || "").toUpperCase();
                  const tone = st === "ACTIVE" ? "emerald" : st === "EXPIRED" ? "amber" : "red";
                  return (
                    <tr
                      key={t.id}
                      className={
                        "border-t border-slate-100 hover:bg-emerald-50/30 cursor-pointer " +
                        (selectedTenantId === t.id ? "bg-emerald-50/50" : "")
                      }
                      onClick={() => setSelectedTenantId(t.id)}
                    >
                      <td className="py-2 pr-4">{t.name}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{t.code}</td>
                      <td className="py-2 pr-4">{`${starts} → ${ends}`}</td>
                      <td className="py-2 pr-4"><Badge tone={tone}>{st || "—"}</Badge></td>
                      <td className="py-2 pr-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedTenantId(t.id); }}
                          className="px-3 h-8 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-700"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
            <span>Page {page + 1} / {pages}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className={"px-3 h-8 rounded-lg border " + (page === 0 ? "opacity-50" : "hover:bg-slate-50")}
              >
                Prev
              </button>
              <button
                disabled={page + 1 >= pages}
                onClick={() => setPage((p) => p + 1)}
                className={"px-3 h-8 rounded-lg border " + (page + 1 >= pages ? "opacity-50" : "hover:bg-slate-50")}
              >
                Next
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Right: editor */}
      <div className="col-span-12 lg:col-span-5 xl:col-span-4">
        <SubscriptionEditor tenantId={selectedTenantId} />
      </div>
    </div>
  );
}

/* -------------------- Editor Panel -------------------- */
function SubscriptionEditor({ tenantId }) {
  const { data: tenant } = useGetTenantQuery(tenantId, { skip: !tenantId });
  const latest = tenant?.latestSubscription || null;

  const [form, setForm] = useState(() => {
    const today = dayjs().format("YYYY-MM-DD");
    return {
      startsAt: latest?.startsAt ? dayjs(latest.startsAt).format("YYYY-MM-DD") : today,
      endsAt: latest?.endsAt ? dayjs(latest.endsAt).format("YYYY-MM-DD") : today,
      status: latest?.status || "ACTIVE", // ACTIVE | INACTIVE
    };
  });

  React.useEffect(() => {
    if (latest) {
      setForm({
        startsAt: latest.startsAt ? dayjs(latest.startsAt).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
        endsAt: latest.endsAt ? dayjs(latest.endsAt).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
        status: latest.status || "ACTIVE",
      });
    }
  }, [latest?.id]);

  const [saveSub, saveResult] = useUpsertSubscriptionMutation();
  const [extendSub, extendResult] = useExtendSubscriptionMutation();
  const disabled = !tenantId || saveResult.isLoading || extendResult.isLoading;

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSave = async () => {
    if (!tenantId) return;
    await saveSub({
      tenantId,
      startsAt: form.startsAt,
      endsAt: form.endsAt,
      status: form.status, // "ACTIVE" | "INACTIVE"
    });
  };

  const onExtend = async (days) => {
    if (!tenantId) return;
    await extendSub({ tenantId, days });
  };

  const quickActivate30 = () => {
    const starts = dayjs().format("YYYY-MM-DD");
    const ends = dayjs().add(30, "day").format("YYYY-MM-DD");
    setForm((f) => ({ ...f, startsAt: starts, endsAt: ends, status: "ACTIVE" }));
  };

  if (!tenantId) {
    return (
      <Card title="Edit Subscription" subtitle="Select a tenant to manage its subscription">
        <p className="text-sm text-slate-600">Tip: Use search and filters to find a tenant quickly.</p>
      </Card>
    );
  }

  return (
    <Card
      title={`Edit Subscription — ${tenant?.name ?? ""}`}
      subtitle={tenant?.code ? <span className="text-slate-600">Code: <span className="font-mono">{tenant.code}</span></span> : null}
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <button className="px-3 h-9 rounded-lg border hover:bg-slate-50 text-sm" onClick={quickActivate30} disabled={disabled}>Quick: Activate 30 days</button>
          <button className="px-3 h-9 rounded-lg border hover:bg-slate-50 text-sm" onClick={() => onExtend(30)} disabled={disabled}>Extend +30</button>
          <button className="px-3 h-9 rounded-lg border hover:bg-slate-50 text-sm" onClick={() => onExtend(90)} disabled={disabled}>Extend +90</button>
          <button className="px-3 h-9 rounded-lg border hover:bg-slate-50 text-sm" onClick={() => onExtend(365)} disabled={disabled}>Extend +365</button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Starts At</Label>
          <Input type="date" name="startsAt" value={form.startsAt} onChange={onChange} />
        </div>
        <div>
          <Label>Ends At</Label>
          <Input type="date" name="endsAt" value={form.endsAt} onChange={onChange} />
        </div>
        <div>
          <Label>Status</Label>
          <Select name="status" value={form.status} onChange={onChange}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </Select>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={onSave}
            disabled={disabled}
            className="px-4 h-10 rounded-xl bg-emerald-600 text-white text-sm hover:bg-emerald-700"
          >
            Save Subscription
          </button>
          {(saveResult.isLoading || extendResult.isLoading) && (
            <span className="text-xs text-slate-500">Working…</span>
          )}
          {(saveResult.isSuccess || extendResult.isSuccess) && (
            <span className="text-xs text-emerald-700">Saved.</span>
          )}
          {(saveResult.isError || extendResult.isError) && (
            <span className="text-xs text-rose-600">
              {(saveResult.error?.data?.message || extendResult.error?.data?.message || "Error while saving") + ""}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
