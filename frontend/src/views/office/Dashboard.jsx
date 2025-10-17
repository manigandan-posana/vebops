import React from 'react'
import { useGetActivityQuery } from '../../features/office/officeApi'

function Badge ({ text }) {
  if (!text) return '—'
  // fixed classes so Tailwind doesn’t purge
  return <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800">{text}</span>
}

function fmt (v) {
  try {
    if (!v) return '—'
    // if ISO string or epoch -> readable local string
    const d = typeof v === 'string' ? new Date(v) : new Date(v)
    if (Number.isNaN(d.getTime())) return String(v)
    return d.toLocaleString()
  } catch {
    return String(v)
  }
}

export default function OfficeDashboard () {
  const { data = [], isLoading, isError, error } = useGetActivityQuery(15)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Recent Activity</h1>

      {isLoading && <div>Loading…</div>}
      {isError && <div className="text-red-600">Failed to load: {error?.data?.message || 'error'}</div>}

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="th">When</th>
              <th className="th">Entity</th>
              <th className="th">Event</th>
              <th className="th">Status</th>
              <th className="th">Tenant</th>
              <th className="th">ID</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map(row => (
              <tr key={`${row.entity}-${row.id}`} className="border-t">
                <td className="td">{fmt(row.timestamp)}</td>
                <td className="td">{row.entity}</td>
                <td className="td">{row.event}</td>
                <td className="td"><Badge text={row.status} /></td>
                <td className="td">{row.tenantName || row.tenantId || '—'}</td>
                <td className="td">{row.id}</td>
              </tr>
            ))}
            {!isLoading && (!data || data.length === 0) && (
              <tr><td className="td" colSpan={6}>No recent activity.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
