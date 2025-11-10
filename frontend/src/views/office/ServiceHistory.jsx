// src/views/office/ServiceHistory.jsx
//
// A paginated listing of previously created services. Users can search
// across buyer name/GST/contact using a simple keyword. The table
// displays high level metadata including the invoice number, buyer,
// service type and total amount. Clicking a row navigates to the
// detailed view. Pagination controls allow navigating through the
// dataset and adjusting the number of rows per page. This component
// consumes the `getServices` endpoint defined in officeApi.

import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, Send, Share2, FileDown } from 'lucide-react'
import {
  useGetServicesQuery,
  useDownloadServiceInvoiceMutation,
  useSendServiceInvoiceMutation,
  useShareServiceProposalMutation
} from '../../features/office/officeApi'
import { Toaster, toast } from 'react-hot-toast'
import { displayDocNumber } from '../../utils/docNumbers'

// Format currency in Indian Rupees. Falls back to 0 when the input is
// undefined or NaN. This replicates the helper used on the service
// creation page.
const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(Number.isFinite(+n) ? +n : 0)

const FILTER_STORAGE_KEY = 'vebops.serviceHistory.filters'

export default function ServiceHistory () {
  // Search keyword. This is sent to the backend via the `q` parameter.
  const [q, setQ] = useState('')
  // Pagination state: page is zero-based. Changing size or search resets to page 0.
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)

  // Restore the last used filters on mount to give back-office users continuity
  // when they revisit the history screen multiple times per day.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(FILTER_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.q === 'string') setQ(parsed.q)
        const storedSize = Number(parsed.size)
        if (Number.isFinite(storedSize) && storedSize > 0) setSize(storedSize)
      }
    } catch {
      // ignore malformed entries and continue with defaults
    }
  }, [])

  // Fetch services from backend. The query object merges the current
  // state. When q is empty it's omitted to allow the backend to return
  // all services. Sorting defaults to descending by creation time.
  const { data = { content: [], page: 0, size: 0, totalPages: 0, totalElements: 0 }, isFetching } =
    useGetServicesQuery({ q: q?.trim() || undefined, page, size, sort: 'createdAt,desc' })

  // ----- Send invoice modal state -----
  // This component allows back‑office users to email or WhatsApp the invoice
  // PDF directly to a customer from the service history page. When the user
  // clicks “Send”, we simply open a modal prompting the user to choose
  // the delivery method and enter the email or mobile number. On submit we
  // call the `sendServiceInvoice` mutation. There is no need to fetch
  // the invoice up front because services generate and store the invoice
  // automatically on creation. See useSendServiceInvoiceMutation definition
  // in officeApi for details.
  const [modal, setModal] = useState({ open: false, serviceId: null, method: 'email', contact: '', docType: 'INVOICE' })
  const [downloadInvoice] = useDownloadServiceInvoiceMutation()
  const [sendServiceInvoice, sendState] = useSendServiceInvoiceMutation()
  const [shareServiceProposal] = useShareServiceProposalMutation()
  const [sharingId, setSharingId] = useState(null)

  const openSendModal = (srv, docType = 'INVOICE') => {
    // Prefill contact using buyerContact field if available. The buyerContact
    // may contain either an email or a phone number provided during service
    // creation. Users can override or enter a new contact in the modal.
    const contact = srv?.buyerContact || ''
    setModal({ open: true, serviceId: srv.id, method: 'email', contact, docType })
  }

  const closeModal = () => setModal((m) => ({ ...m, open: false }))

  const handleSend = async () => {
    if (!modal.contact || !modal.serviceId) {
      toast.error('Please enter a valid email or mobile number')
      return
    }
    const payload = { id: modal.serviceId }
    if (modal.method === 'email') {
      payload.toEmail = modal.contact
    } else {
      payload.toWhatsapp = modal.contact
    }
    const res = await sendServiceInvoice({ ...payload, type: modal.docType || 'INVOICE' })
    if ('error' in res) {
      toast.error(res.error?.data?.message || 'Failed to send invoice')
    } else {
      toast.success('Invoice sent to customer')
      closeModal()
    }
  }

  const handleDownload = async (serviceId, docType) => {
    try {
      const trigger = downloadInvoice({ id: serviceId, type: docType })
      if (trigger && typeof trigger.unwrap === 'function') {
        await trigger.unwrap()
      } else if (trigger && typeof trigger.then === 'function') {
        await trigger
      }
    } catch (e) {
      const msg = e?.data?.message || e?.error || e?.message || 'Download failed'
      toast.error(String(msg))
    }
  }

  const handleShare = async (srv, docType = 'PROFORMA') => {
    if (!srv?.id) return
    try {
      setSharingId(srv.id)
      const res = await shareServiceProposal({ id: srv.id, docType }).unwrap()
      const pid = res?.proposalId ? `P-${res.proposalId}` : 'proposal'
      toast.success(`${pid} shared to portal`)
    } catch (e) {
      toast.error(String(e?.data?.message || e?.error || e?.message || 'Failed to share proposal'))
    } finally {
      setSharingId(null)
    }
  }

  // Reset page to 0 when the search term or page size changes. This
  // prevents requesting pages beyond the new result set.
  useEffect(() => {
    setPage(0)
  }, [q, size])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const payload = { q, size }
    try {
      window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // ignore storage quota or private browsing issues
    }
  }, [q, size])

  // Extract fields from the response. Even when undefined we default
  // gracefully to avoid crashing the UI during loading states.
  const { content, totalPages, totalElements } = data

  // Compute first and last index shown on the current page. The
  // returned page number is zero-based so we add 1 for display.
  const firstRow = useMemo(() => (totalElements === 0 ? 0 : page * size + 1), [page, size, totalElements])
  const lastRow = useMemo(() => {
    if (!content || content.length === 0) return 0
    return page * size + content.length
  }, [content, page, size])

  // Pagination helpers
  const goFirst = () => setPage(0)
  const goPrev = () => setPage((p) => Math.max(0, p - 1))
  const goNext = () => setPage((p) => Math.min(totalPages - 1, p + 1))
  const goLast = () => setPage(totalPages - 1)

  return (
    <div className='min-h-screen bg-slate-50 p-6 lg:p-10'>
      <Toaster />
      <div className='mx-auto max-w-7xl space-y-6'>
        <h1 className='text-2xl font-semibold text-slate-900'>Service History</h1>
        {/* Search and controls */}
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='relative w-full sm:max-w-md'>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Search by buyer name, GSTIN or contact…'
              className='h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
            />
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-500' size={18} />
          </div>
          <div className='flex flex-wrap items-center gap-2 text-sm text-slate-600'>
            <span>Rows per page:</span>
            <select
              className='h-9 rounded-md border border-slate-200 bg-white px-2'
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className='hidden sm:inline'>•</span>
            <span>
              Showing <span className='font-medium text-slate-900'>{firstRow}</span>–<span className='font-medium text-slate-900'>{lastRow}</span> of{' '}
              <span className='font-medium text-slate-900'>{totalElements}</span>
            </span>
          </div>
        </div>
        {/* Table */}
        <div className='overflow-hidden rounded-xl border border-slate-200'>
          <table className='min-w-full divide-y divide-slate-200'>
            <thead className='bg-slate-50'>
              <tr>
                <th className='px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>Invoice</th>
                <th className='px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>Buyer</th>
                <th className='px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>Service Type</th>
                <th className='px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500'>Total</th>
                <th className='px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>Date</th>
                <th className='px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>Proposal</th>
                <th className='px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500'>Actions</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100 bg-white'>
              {(!content || content.length === 0) && (
                <tr>
                  <td colSpan={6} className='px-3 py-6 text-center text-sm text-slate-500'>
                    {isFetching ? 'Loading…' : 'No services found.'}
                  </td>
                </tr>
              )}
              {content && content.map((srv) => {
                // Parse JSON fields to extract invoice number, service type and totals
                let meta = {}
                let totals = {}
                try { meta = srv.metaJson ? JSON.parse(srv.metaJson) : {} } catch (e) { meta = {} }
                try { totals = srv.totalsJson ? JSON.parse(srv.totalsJson) : {} } catch (e) { totals = {} }
                const proposalId = meta?.proposalId || meta?.proposalID || null
                const proposalLabel = proposalId ? `P-${proposalId}` : '—'
                const invoiceNo = displayDocNumber(
                  meta?.invoiceNo,
                  displayDocNumber(meta?.pinvNo, srv.id ? `INV-${srv.id}` : '—')
                )
                const serviceType = meta?.serviceType || ''
                const grandTotal = totals?.grand
                const createdAt = srv.createdAt ? new Date(srv.createdAt) : null
                const dateStr = createdAt ? createdAt.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : ''
                return (
                  <tr key={srv.id} className='hover:bg-slate-50'>
                    <td className='px-3 py-2 text-sm font-medium text-blue-600'>
                      <Link to={`/office/service-history/${srv.id}`}>{invoiceNo}</Link>
                    </td>
                    <td className='px-3 py-2 text-sm text-slate-900'>
                      {srv.buyerName || '--'}<br/>
                      <span className='text-xs text-slate-500'>{srv.buyerContact}</span>
                    </td>
                    <td className='px-3 py-2 text-sm text-slate-700'>{serviceType || '—'}</td>
                    <td className='px-3 py-2 text-right text-sm font-semibold text-slate-900'>{fmtINR(grandTotal)}</td>
                    <td className='px-3 py-2 text-sm text-slate-700'>{dateStr}</td>
                    <td className='px-3 py-2 text-sm text-slate-700'>
                      <div className='flex flex-col text-xs text-slate-500'>
                        <span className='font-medium text-slate-800'>{proposalLabel}</span>
                        {meta?.proposalStatus && (
                          <span className='mt-1 inline-flex w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-600'>
                            {String(meta.proposalStatus)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className='px-3 py-2 text-center'>
                      <div className='flex flex-wrap items-center justify-center gap-2'>
                        <button
                          className='inline-flex items-center gap-1 rounded-lg bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs'
                          onClick={() => handleDownload(srv.id, 'INVOICE')}
                        >
                          <FileDown size={14} /> Invoice
                        </button>
                        <button
                          className='inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-xs'
                          onClick={() => handleDownload(srv.id, 'PROFORMA')}
                        >
                          <FileDown size={14} /> Proforma
                        </button>
                        <button
                          className='inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-xs'
                          onClick={() => openSendModal(srv, 'INVOICE')}
                        >
                          <Send size={14} /> Invoice
                        </button>
                        <button
                          className='inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 text-xs'
                          onClick={() => openSendModal(srv, 'PROFORMA')}
                        >
                          <Send size={14} /> Proforma
                        </button>
                        <button
                          className='inline-flex items-center gap-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 text-xs disabled:opacity-60'
                          disabled={sharingId === srv.id}
                          onClick={() => handleShare(srv, 'PROFORMA')}
                        >
                          <Share2 size={14} /> {sharingId === srv.id ? 'Sharing…' : 'Send to Portal'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination buttons */}
        <div className='flex flex-col items-center justify-between gap-3 sm:flex-row'>
          <div className='text-sm text-slate-600'>
            Page <span className='font-medium text-slate-900'>{totalPages === 0 ? 0 : page + 1}</span> of{' '}
            <span className='font-medium text-slate-900'>{totalPages}</span>
          </div>
          <div className='inline-flex items-center gap-2'>
            <button onClick={goFirst} disabled={page === 0} className='rounded-md border px-3 py-1.5 text-sm disabled:opacity-50'>« First</button>
            <button onClick={goPrev} disabled={page === 0} className='rounded-md border px-3 py-1.5 text-sm disabled:opacity-50'>‹ Prev</button>
            <button onClick={goNext} disabled={page >= totalPages - 1} className='rounded-md border px-3 py-1.5 text-sm disabled:opacity-50'>Next ›</button>
            <button onClick={goLast} disabled={page >= totalPages - 1} className='rounded-md border px-3 py-1.5 text-sm disabled:opacity-50'>Last »</button>
          </div>
        </div>
      </div>
      {/* Send Invoice Modal */}
      {modal.open && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
          <div className='w-[90vw] max-w-md rounded-lg bg-white p-5 shadow-lg'>
            <h2 className='mb-4 text-lg font-semibold text-slate-900'>Send Invoice</h2>
            <div className='mb-4 flex flex-wrap gap-4'>
              <label className='inline-flex items-center gap-1'>
                <input
                  type='radio'
                  name='sendMethod'
                  value='email'
                  checked={modal.method === 'email'}
                  onChange={() =>
                    // When switching to email, clear any existing contact or leave blank
                    setModal((m) => ({ ...m, method: 'email', contact: '' }))
                  }
                />
                <span>Email</span>
              </label>
              <label className='inline-flex items-center gap-1'>
                <input
                  type='radio'
                  name='sendMethod'
                  value='whatsapp'
                  checked={modal.method === 'whatsapp'}
                  onChange={() =>
                    // When switching to WhatsApp, clear any existing contact or leave blank
                    setModal((m) => ({ ...m, method: 'whatsapp', contact: '' }))
                  }
                />
                <span>WhatsApp</span>
              </label>
              <label className='inline-flex items-center gap-1'>
                <input
                  type='radio'
                  name='docType'
                  value='INVOICE'
                  checked={(modal.docType || 'INVOICE') === 'INVOICE'}
                  onChange={() => setModal((m) => ({ ...m, docType: 'INVOICE' }))}
                />
                <span>Invoice</span>
              </label>
              <label className='inline-flex items-center gap-1'>
                <input
                  type='radio'
                  name='docType'
                  value='PROFORMA'
                  checked={(modal.docType || 'INVOICE') === 'PROFORMA'}
                  onChange={() => setModal((m) => ({ ...m, docType: 'PROFORMA' }))}
                />
                <span>Proforma</span>
              </label>
            </div>
            <input
              type='text'
              className='mb-4 w-full rounded-md border border-slate-300 p-2 text-sm'
              placeholder={modal.method === 'email' ? 'Customer email' : 'Customer mobile'}
              value={modal.contact}
              onChange={(e) => setModal((m) => ({ ...m, contact: e.target.value }))}
            />
            <div className='flex justify-end gap-2'>
              <button
                className='rounded-md bg-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-300'
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className='rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60'
                disabled={sendState.isLoading}
                onClick={handleSend}
              >
                {sendState.isLoading ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}