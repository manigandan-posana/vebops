import React from "react";
import {
  useGetAdminSummaryQuery,
  useGetTenantSignupsQuery,
} from "../../features/admin/adminApi";
import { IndianRupeeIcon } from "lucide-react";

/* ------------------------------ UI atoms only ------------------------------ */
const Card = ({ className = "", children }) => (
  <div className={`bg-white border border-slate-200 rounded-xl shadow-sm ${className}`}>{children}</div>
);

const IconTile = ({ className = "", children }) => (
  <div className={`h-10 w-10 rounded-xl grid place-items-center ring-1 ring-black/[0.04] ${className}`}>
    {children}
  </div>
);

/* Compact icons */
const GroupIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const LoginIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <path d="M10 17l5-5l-5-5" />
    <path d="M15 12H3" />
  </svg>
);

/* Stat card */
const Stat = ({ label, value, icon, tintBg, tintFg }) => (
  <Card className="p-4">
    <div className="flex items-center gap-3">
      <IconTile className={`${tintBg} ${tintFg}`}>{icon}</IconTile>
      <div className="min-w-0">
        <div className="text-[11px] text-slate-500">{label}</div>
        <div className="text-xl font-semibold tracking-tight">{value}</div>
      </div>
    </div>
  </Card>
);

export default function AdminDashboard() {
  const { data: sum, isLoading: sumLoading } = useGetAdminSummaryQuery();
  const { data: signups30 } = useGetTenantSignupsQuery(30);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Welcome back, here&apos;s a summary of your application.
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat
          label="Total Tenants"
          value={sumLoading ? "—" : (sum?.totalTenants ?? 0)}
          icon={<GroupIcon />}
          tintBg="bg-indigo-50"
          tintFg="text-indigo-600"
        />
        <Stat
          label="Active Users"
          value={sumLoading ? "—" : (sum?.activeUsers ?? 0)}
          icon={<UserIcon />}
          tintBg="bg-emerald-50"
          tintFg="text-emerald-600"
        />
        <Stat
          label="Signups (30d)"
          value={sumLoading ? "—" : (sum?.signups30d ?? signups30 ?? 0)}
          icon={<LoginIcon />}
          tintBg="bg-indigo-50/70"
          tintFg="text-indigo-600"
        />
        <Stat
          label="Revenue (MTD)"
          value={sumLoading ? "—" : `${sum?.revenueMTD ?? 0}`}
          icon={<IndianRupeeIcon className="h-4 w-4" />}
          tintBg="bg-rose-50"
          tintFg="text-rose-600"
        />
      </div>
    </div>
  );
}
