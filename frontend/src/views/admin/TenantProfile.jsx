// src/pages/admin/TenantProfile.jsx
import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useGetTenantCustomersQuery,
  useGetTenantFieldEngineersQuery,
  useResetPasswordMutation,
} from "../../features/admin/adminApi";

/* ---------------- UI atoms (visual only; logic unchanged) --------------- */
const Card = ({ title, subtitle, tabs, toolbar, children }) => (
  <div className="bg-white rounded-2xl border border-sky-200/60 shadow-sm overflow-hidden">
    <div className="px-5 pt-5 pb-4">
      {title ? (
        <>
          <h1 className="text-2xl font-bold leading-tight text-slate-900">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </>
      ) : null}

      {/* Tabs row */}
      {tabs ? <div className="mt-4 border-b border-slate-200">{tabs}</div> : null}

      {/* Toolbar row */}
      {toolbar ? <div className="mt-3">{toolbar}</div> : null}
    </div>

    <div className="px-5 pb-5">{children}</div>
  </div>
);

const Input = (props) => (
  <input
    {...props}
    className={
      "w-full h-11 rounded-full border border-slate-200 bg-white px-4 text-sm outline-none " +
      "focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder:text-slate-400 " +
      (props.className || "")
    }
  />
);

/* ----------------------------- Page ------------------------------------- */
export default function TenantProfile() {
  const { id } = useParams();
  const tid = Number(id);
  const navigate = useNavigate();

  const [resetPassword] = useResetPasswordMutation();

  // Members state (UNCHANGED)
  const [tab, setTab] = useState("FE"); // FE | CUSTOMER
  const [q, setQ] = useState("");
  const [mPage, setMPage] = useState(0);
  const [mSize, setMSize] = useState(10);
  const [feStatus, setFeStatus] = useState("ALL");

  const {
    data: feData,
    isFetching: loadingFE,
  } = useGetTenantFieldEngineersQuery(
    { tenantId: tid, page: mPage, size: mSize, q, status: feStatus, sort: "id,desc" },
    { skip: tab !== "FE" }
  );

  const {
    data: custData,
    isFetching: loadingCust,
  } = useGetTenantCustomersQuery(
    { tenantId: tid, page: mPage, size: mSize, q, sort: "id,desc" },
    { skip: tab !== "CUSTOMER" }
  );

  async function onResetMemberPassword(uid) {
    try {
      await resetPassword({ id: uid, sendEmail: true }).unwrap();
      alert("Temporary password generated & emailed.");
    } catch (e) {
      alert(e?.data?.message || "Failed to reset password.");
    }
  }

  /* ---------------- Tabs (exact look: underline active, blue text) ------- */
  const Tabs = (
    <div className="flex items-center gap-6 -mb-px">
      <button
        role="tab"
        aria-selected={tab === "FE"}
        onClick={() => {
          setTab("FE");
          setMPage(0);
          setQ("");
        }}
        className={
          "relative py-2 text-sm font-medium " +
          (tab === "FE" ? "text-blue-600" : "text-slate-600 hover:text-slate-900")
        }
      >
        Field Engineers
        <span
          className={
            "absolute left-0 right-0 -bottom-[1px] h-[2px] " +
            (tab === "FE" ? "bg-blue-600" : "bg-transparent")
          }
        />
      </button>

      <button
        role="tab"
        aria-selected={tab === "CUSTOMER"}
        onClick={() => {
          setTab("CUSTOMER");
          setMPage(0);
          setQ("");
        }}
        className={
          "relative py-2 text-sm font-medium " +
          (tab === "CUSTOMER" ? "text-blue-600" : "text-slate-600 hover:text-slate-900")
        }
      >
        Customers
        <span
          className={
            "absolute left-0 right-0 -bottom-[1px] h-[2px] " +
            (tab === "CUSTOMER" ? "bg-blue-600" : "bg-transparent")
          }
        />
      </button>
    </div>
  );

  /* ---------------- Toolbar (search left, status on right) ---------------- */
  const Toolbar = (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="relative w-full sm:w-96">
        <span className="absolute left-3 top-2.5 text-slate-400">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <Input
          className="pl-10"
          placeholder="Search members..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setMPage(0);
          }}
          aria-label="Search members"
        />
      </div>

      <div className="sm:ml-auto">
        {tab === "FE" && (
          <div className="relative">
            {/* Styled native select to look like pill “Status: All ▾” */}
            <label className="sr-only">Status</label>
            <select
              className="appearance-none h-11 rounded-full border border-slate-200 bg-white pl-4 pr-9 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              value={feStatus}
              onChange={(e) => {
                setFeStatus(e.target.value);
                setMPage(0);
              }}
              title="Filter by FE status"
            >
              <option value="ALL">Status: All</option>
              <option value="AVAILABLE">Status: Available</option>
              <option value="BUSY">Status: Busy</option>
              <option value="INACTIVE">Status: Inactive</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
          </div>
        )}
      </div>
    </div>
  );

  /* ---------------- Page numbers for the pager (visual only) -------------- */
  const data = tab === "FE" ? feData : custData;
  const totalPages = data?.totalPages ?? 0;
  const pagesToShow = useMemo(() => {
    const last = Math.max(0, totalPages - 1);
    if (last <= 6) return Array.from({ length: totalPages }, (_, i) => i);
    const arr = [0, 1, 2, -1, last - 1, last];
    // Ensure current and neighbors are visible
    const neighbor = [mPage - 1, mPage, mPage + 1].filter((p) => p >= 0 && p <= last);
    return Array.from(new Set([...arr, ...neighbor])).sort((a, b) => a - b);
  }, [totalPages, mPage]);

  /* ------------------------------ Render -------------------------------- */
  return (
    <div className="space-y-6">
      {/* Back Button (top) */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="inline-flex items-center gap-2 h-9 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Back
        </button>
      </div>

      <Card
        title="Members"
        subtitle="Manage your field engineers and customers."
        tabs={Tabs}
        toolbar={Toolbar}
      >
        {(() => {
          const data = tab === "FE" ? feData : custData;
          const loading = tab === "FE" ? loadingFE : loadingCust;
          const items = data?.items ?? [];
          const total = data?.total ?? 0;
          const totalPages = data?.totalPages ?? 0;

          const mStart = total ? mPage * mSize + 1 : 0;
          const mEnd = Math.min(total, mPage * mSize + (items?.length || 0));

          const statusLabel = (s) => {
            // display-only mapping; DOES NOT change logic
            if (!s) return "Active";
            if (s === "AVAILABLE" || s === "ACTIVE") return "Active";
            if (s === "INACTIVE") return "Inactive";
            return "Active"; // BUSY or others -> treat as active pill visually
          };

          const statusClass = (s) =>
            statusLabel(s) === "Active"
              ? "text-blue-700 bg-blue-50 ring-blue-600/20"
              : "text-slate-700 bg-slate-100 ring-slate-400/30";

          return (
            <>
              {/* Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-white">
                    <tr className="border-b border-slate-200/80 text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="text-left font-semibold px-5 py-3 w-[55%]">Member</th>
                      <th className="text-left font-semibold px-5 py-3 w-[20%]">Status</th>
                      <th className="text-left font-semibold px-5 py-3 w-[25%]">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200/70">
                    {loading && (
                      <tr>
                        <td colSpan={3} className="px-5 py-6">
                          <div className="h-7 w-3/4 animate-pulse rounded bg-slate-100" />
                          <div className="mt-3 h-7 w-2/3 animate-pulse rounded bg-slate-100" />
                          <div className="mt-3 h-7 w-1/2 animate-pulse rounded bg-slate-100" />
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      items.map((row) => {
                        const isFE = tab === "FE";
                        const name = isFE ? row.userName || "—" : row.name || "—";
                        const email = isFE ? row.userEmail || "—" : row.email || "—";
                        const resetUserId = isFE ? row.userId : row.portalUserId;

                        return (
                          <tr key={row.id} className="bg-white hover:bg-slate-50/60">
                            {/* MEMBER (name + email) */}
                            <td className="px-5 py-4 align-middle">
                              <div className="font-medium text-slate-900">{name}</div>
                              <div className="text-[13px] text-slate-500">{email}</div>
                            </td>

                            {/* STATUS (pill) */}
                            <td className="px-5 py-4 align-middle">
                              <span
                                className={
                                  "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 " +
                                  statusClass(isFE ? row.status : row.portalUserId ? "ACTIVE" : "INACTIVE")
                                }
                              >
                                {isFE ? statusLabel(row.status) : row.portalUserId ? "Active" : "Inactive"}
                              </span>
                            </td>

                            {/* ACTIONS */}
                            <td className="px-5 py-4 align-middle">
                              <div className="flex items-center gap-4">
                                <button
                                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                  onClick={() => onResetMemberPassword(resetUserId)}
                                  disabled={!resetUserId}
                                  title={
                                    resetUserId
                                      ? "Reset password & email to member"
                                      : "No linked user"
                                  }
                                >
                                  Reset Password
                                </button>

                                {/* If you later add delete logic, place it here:
                                <button className="text-red-500 hover:text-red-600 text-sm font-medium">
                                  Delete
                                </button>
                                */}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                    {!loading && items.length === 0 && (
                      <tr>
                        <td className="px-5 py-6 text-slate-500" colSpan={3}>
                          No {tab === "FE" ? "field engineers" : "customers"} found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pager */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm text-slate-600">
                  {total ? `Showing ${mStart} to ${mEnd} of ${total} results` : "Showing 0 results"}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    className="h-9 w-9 rounded-full hover:bg-slate-100 disabled:opacity-40 grid place-items-center"
                    aria-label="Previous page"
                    disabled={mPage <= 0}
                    onClick={() => setMPage((p) => Math.max(0, p - 1))}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>

                  {pagesToShow.map((p, idx) =>
                    p === -1 ? (
                      <span key={`el-${idx}`} className="px-2 text-slate-500">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setMPage(p)}
                        className={
                          "min-w-9 h-9 px-3 rounded-full text-sm font-medium " +
                          (p === mPage ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100")
                        }
                      >
                        {p + 1}
                      </button>
                    )
                  )}

                  <button
                    className="h-9 w-9 rounded-full hover:bg-slate-100 disabled:opacity-40 grid place-items-center"
                    aria-label="Next page"
                    disabled={mPage + 1 >= totalPages}
                    onClick={() => setMPage((p) => p + 1)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          );
        })()}
      </Card>
    </div>
  );
}
