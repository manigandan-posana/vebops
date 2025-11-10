import React from 'react'
import { AlertTriangle, ClipboardList, Clock3, IndianRupee, KanbanSquare, ListTodo } from 'lucide-react'
import { useGetOfficeSummaryQuery } from '../../features/admin/adminApi'
import { useGetActivityQuery } from '../../features/office/officeApi'

const numberFormatter = new Intl.NumberFormat('en-IN')
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const formatNumber = (value) => numberFormatter.format(Number.isFinite(+value) ? +value : 0)
const formatCurrency = (value) => {
  const num = typeof value === 'number' ? value : Number(value ?? 0)
  return currencyFormatter.format(Number.isFinite(num) ? num : 0)
}

const MetricCard = ({ icon, label, hint, value, tone = 'text-slate-900', loading = false }) => (
  <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`mt-1 text-2xl font-semibold ${tone}`}>
          {loading ? <span className="inline-flex h-6 w-20 animate-pulse rounded bg-slate-200" /> : value}
        </p>
      </div>
    </div>
    {hint && <p className="mt-3 text-xs text-slate-500">{hint}</p>}
  </div>
)

const SectionCard = ({ title, action, children }) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
      <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      {action && <div className="text-xs text-slate-500">{action}</div>}
    </div>
    <div className="px-5 py-4">{children}</div>
  </div>
)

const StatusItem = ({ label, value, accent = 'bg-slate-100 text-slate-700', loading = false }) => (
  <div className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-sm font-semibold ${accent}`}>
      {loading ? <span className="inline-flex h-4 w-10 animate-pulse rounded bg-slate-200" /> : formatNumber(value)}
    </span>
  </div>
)

const ActivityStatus = ({ text }) => {
  if (!text) return <span className="text-slate-400">—</span>
  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-emerald-700">
      {text}
    </span>
  )
}

const formatTimestamp = (value) => {
  try {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return date.toLocaleString()
  } catch {
    return String(value ?? '—')
  }
}

export default function OfficeDashboard () {
  const { data: summary, isLoading: summaryLoading, isError: summaryError, error: summaryErrorData } = useGetOfficeSummaryQuery()
  const { data: activity = [], isLoading: activityLoading, isError: activityError, error: activityErrorData } = useGetActivityQuery(15)

  const activityRows = Array.isArray(activity) ? activity : []

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Operations dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Monitor today&apos;s workload, invoicing pipeline and recent account activity.</p>
      </header>

      {summaryError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Unable to load KPIs: {summaryErrorData?.data?.message || summaryErrorData?.error || 'Unknown error'}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<ClipboardList className="h-5 w-5" />}
          label="New service requests"
          hint="Awaiting triage or assignment"
          value={formatNumber(summary?.newServiceRequests)}
          loading={summaryLoading}
        />
        <MetricCard
          icon={<Clock3 className="h-5 w-5" />}
          label="In-progress SRs"
          hint="Technicians currently working"
          value={formatNumber(summary?.inProgressServiceRequests)}
          loading={summaryLoading}
        />
        <MetricCard
          icon={<KanbanSquare className="h-5 w-5" />}
          label="Assigned work orders"
          hint="Scheduled and ready for execution"
          value={formatNumber(summary?.assignedWorkOrders)}
          loading={summaryLoading}
        />
        <MetricCard
          icon={<IndianRupee className="h-5 w-5" />}
          label="Outstanding receivables"
          hint="Invoices sent but not yet paid"
          value={formatCurrency(summary?.outstandingReceivables)}
          tone="text-emerald-600"
          loading={summaryLoading}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Service request health" action="Last 30 days">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatusItem label="New" value={summary?.newServiceRequests} loading={summaryLoading} accent="bg-sky-50 text-sky-700" />
            <StatusItem label="In progress" value={summary?.inProgressServiceRequests} loading={summaryLoading} accent="bg-indigo-50 text-indigo-700" />
            <StatusItem label="Completed" value={summary?.completedServiceRequests} loading={summaryLoading} accent="bg-emerald-50 text-emerald-700" />
            <StatusItem label="Closed" value={summary?.closedServiceRequests} loading={summaryLoading} accent="bg-slate-100 text-slate-700" />
          </div>
        </SectionCard>

        <SectionCard title="Proposal pipeline">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatusItem label="Draft" value={summary?.draftProposals} loading={summaryLoading} accent="bg-slate-100 text-slate-700" />
            <StatusItem label="Sent" value={summary?.sentProposals} loading={summaryLoading} accent="bg-sky-50 text-sky-700" />
            <StatusItem label="Approved" value={summary?.approvedProposals} loading={summaryLoading} accent="bg-emerald-50 text-emerald-700" />
            <StatusItem label="Rejected" value={summary?.rejectedProposals} loading={summaryLoading} accent="bg-rose-50 text-rose-700" />
          </div>
        </SectionCard>

        <SectionCard title="Invoice status" action={`Revenue: ${formatCurrency(summary?.totalRevenue)}`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <StatusItem label="Draft" value={summary?.draftInvoices} loading={summaryLoading} accent="bg-slate-100 text-slate-700" />
            <StatusItem label="Sent" value={summary?.sentInvoices} loading={summaryLoading} accent="bg-sky-50 text-sky-700" />
            <StatusItem label="Paid" value={summary?.paidInvoices} loading={summaryLoading} accent="bg-emerald-50 text-emerald-700" />
            <StatusItem label="Overdue" value={summary?.overdueInvoices} loading={summaryLoading} accent="bg-amber-50 text-amber-700" />
          </div>
        </SectionCard>
      </section>

      <SectionCard
        title="Recent activity"
        action={<span className="inline-flex items-center gap-1 text-xs text-slate-500"><ListTodo className="h-4 w-4" /> Last 15 events</span>}
      >
        {activityError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Failed to load activity: {activityErrorData?.data?.message || activityErrorData?.error || 'Unknown error'}
          </div>
        )}

        <div className="max-h-[28rem] overflow-auto">
          <table className="min-w-full table-fixed border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Tenant</th>
                <th className="px-3 py-2 text-right">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activityLoading && (
                [...Array(5)].map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="bg-white">
                    <td className="px-3 py-3" colSpan={6}>
                      <div className="flex items-center gap-4">
                        <span className="inline-flex h-4 w-32 animate-pulse rounded bg-slate-200" />
                        <span className="inline-flex h-4 w-40 animate-pulse rounded bg-slate-200" />
                        <span className="inline-flex h-4 w-24 animate-pulse rounded bg-slate-200" />
                      </div>
                    </td>
                  </tr>
                ))
              )}

              {!activityLoading && activityRows.length === 0 && (
                <tr className="bg-white">
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">
                    Nothing yet. Complete a work order or send an invoice to start building your activity trail.
                  </td>
                </tr>
              )}

              {activityRows.map((row) => (
                <tr key={`${row?.entity}-${row?.id}-${row?.timestamp}`} className="bg-white hover:bg-slate-50">
                  <td className="px-3 py-2 text-sm text-slate-600">{formatTimestamp(row?.timestamp)}</td>
                  <td className="px-3 py-2 text-sm font-medium text-slate-900">{row?.entity || '—'}</td>
                  <td className="px-3 py-2 text-sm text-slate-600">{row?.event || '—'}</td>
                  <td className="px-3 py-2 text-sm"><ActivityStatus text={row?.status} /></td>
                  <td className="px-3 py-2 text-sm text-slate-600">{row?.tenantName || row?.tenantId || '—'}</td>
                  <td className="px-3 py-2 text-right text-sm text-slate-500">{row?.id ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {summary?.overdueInvoices > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5" />
          <div>
            <p className="font-semibold">Follow up on overdue invoices</p>
            <p className="mt-1 text-xs leading-relaxed">
              {formatNumber(summary?.overdueInvoices)} invoice{summary?.overdueInvoices === 1 ? '' : 's'} have been in <strong>Sent</strong> status for more than 30 days.
              Call the customer or resend the invoice with updated payment instructions.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
