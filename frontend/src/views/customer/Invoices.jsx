import React from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { useSelector } from 'react-redux'
import {
  useGetMyInvoicesQuery,
  useLazyGetInvoicePdfQuery,
} from '../../features/customer/customerApi'
import { downloadBlob } from '../../utils/file'
import { displayDocNumber, normalizeDocNumber } from '../../utils/docNumbers'

const selectAuth = (s) => s?.auth || {}

export default function Invoices(){
  const customerId = useSelector(s => s?.auth?.user?.customerId ?? null)
  const { data, error, isLoading } = useGetMyInvoicesQuery(customerId ? { customerId } : undefined)
  const [triggerPdf, pdfState] = useLazyGetInvoicePdfQuery()
  const invoices = Array.isArray(data?.content) ? data.content : (data?.items || data || [])

  const onDownload = async (inv) => {
  const res = await triggerPdf(inv.id)
  if ('error' in res) {
    toast.error(res.error?.data?.message || 'Download failed')
    return
  }
  const blob = res.data // ✅ now truly a Blob
  const code = normalizeDocNumber(inv.invoiceNo)
  const filename = `invoice-${code || inv.id}.pdf`
  downloadBlob(blob, filename)
  toast.success('Downloaded')
}

  return (
    <div className="space-y-6">
      <Toaster />
      <h1 className="text-2xl font-semibold">Customer Portal</h1>

      {!customerId && (
        <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
          Your account isn’t linked to a customer profile yet. Please log out and log in using the email on the customer record, or ask support to link your portal user.
        </div>
      )}

      {error && (
        <div className="alert error">
          {String(error?.data?.message || error?.error || 'Failed to load')}
        </div>
      )}

      <div className="card p-4 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-3">Invoice</th>
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Total</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Work Order</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td className="py-6 text-slate-500" colSpan={6}>Loading…</td></tr>
            )}

            {!isLoading && invoices.length === 0 && (
              <tr><td className="py-6 text-slate-500" colSpan={6}>No invoices yet.</td></tr>
            )}

            {!isLoading && invoices.map((inv) => {
              const id = inv.id
              const code = displayDocNumber(inv.invoiceNo, id ? `INV-${id}` : '—')
              const date = inv.invoiceDate || '—'
              const total = typeof inv.total === 'number' ? inv.total.toFixed(2) : inv.total ?? '—'
              const status = inv.status || '—'
              const wan = inv.workOrder?.wan || inv.woNo || '—'

              return (
                <tr key={id} className="border-b last:border-b-0">
                  <td className="py-2 pr-3">{code}</td>
                  <td className="py-2 pr-3">{date}</td>
                  <td className="py-2 pr-3">{total}</td>
                  <td className="py-2 pr-3">{status}</td>
                  <td className="py-2 pr-3">{wan}</td>
                  <td className="py-2 pr-3">
                    <button className="btn" onClick={()=>onDownload(inv)}>
                      Download PDF
                    </button>
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
