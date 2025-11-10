// views/fe/Assigned.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import { useGetAssignedQuery } from '../../features/fe/feApi'

export default function Assigned(){
  const { data = [], isFetching } = useGetAssignedQuery()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Assigned Work Orders</h1>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="th">WO No</th>
              <th className="th">Customer</th>
              <th className="th">Status</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isFetching && (
              <tr><td className="td" colSpan={4}>Loading…</td></tr>
            )}

            {!isFetching && data.length === 0 && (
              <tr><td className="td" colSpan={4}>No assigned work orders.</td></tr>
            )}

            {!isFetching && data.map((w) => {
              const woNo =
                w.wan || w.woNo || w.code || (w.id ? `WO-${w.id}` : '—')
              const customerName =
                (w.customer && (w.customer.name || w.customer.displayName)) ||
                w.customerName ||
                w.clientName ||
                '—'
              const status = w.status || w.currentStatus || '—'
              return (
                <tr key={w.id ?? woNo} className="border-t">
                  <td className="td">{woNo}</td>
                  <td className="td">{customerName}</td>
                  <td className="td">{status}</td>
                  <td className="td">
                    {w.id ? (
                      <Link className="btn-primary" to={`/fe/job/${w.id}`}>Open</Link>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
