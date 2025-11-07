// views/fe/Assigned.jsx
import React from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { useGetAssignedQuery } from '../../features/fe/feApi'

const LS_USER_KEY = 'vebops.user'
const selectUser = (state) => state?.auth?.user || null
const readUserFromLS = () => {
  try { return JSON.parse(localStorage.getItem(LS_USER_KEY) || 'null') } catch { return null }
}

export default function Assigned(){
  const reduxUser = useSelector(selectUser)
  const lsUser = !reduxUser ? readUserFromLS() : null
  const user = reduxUser || lsUser
  const feId = user?.feId ?? user?.id

  const { data = [], isFetching } = useGetAssignedQuery({ feId }, { skip: !feId })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Assigned Work Orders</h1>

      {!feId && (
        <div className="alert">Couldn’t determine Field Engineer ID from your session.</div>
      )}

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
                      <Link className="btn" to={`/fe/job/${w.id}`}>Open</Link>
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
