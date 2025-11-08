// src/views/office/ProposalHistory.jsx
//
// Read-only history of proposals shared with customers. Displays proposal
// status, customer details, totals and provides quick access to any
// documents uploaded by the customer (notably purchase orders). Office
// users can filter by status, search by customer or proposal code and
// download supporting documents directly from the table.

import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Toaster, toast } from 'react-hot-toast'
import {
  useListProposalsQuery,
  useListProposalDocumentsQuery,
  useDownloadProposalDocumentFileMutation
} from '../../features/office/officeApi'
import { FileDown, RefreshCcw } from 'lucide-react'

const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(Number.isFinite(+n) ? +n : 0)

const statusTone = (status) => {
  const map = {
    APPROVED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    REJECTED: 'bg-rose-100 text-rose-700 border border-rose-200',
    SENT: 'bg-blue-100 text-blue-700 border border-blue-200',
    DRAFT: 'bg-slate-100 text-slate-700 border border-slate-200'
  }
  return map[status] || 'bg-slate-100 text-slate-700 border border-slate-200'
}

const STATUSES = ['ALL', 'DRAFT', 'SENT', 'APPROVED', 'REJECTED']

export default function ProposalHistory () {
  const [searchParams, setSearchParams] = useSearchParams()
  const focusId = searchParams.get('focus')

  const [status, setStatus] = useState('ALL')
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(0)
  const { data: raw = [], isFetching, refetch } = useListProposalsQuery(
    status === 'ALL' ? {} : { status }
  )

  const proposals = Array.isArray(raw) ? raw : (Array.isArray(raw?.content) ? raw.content : [])

  useEffect(() => {
    setPage(0)
  }, [status, search, pageSize])

  const filtered = useMemo(() => {
    if (!search.trim()) return proposals
    const q = search.trim().toLowerCase()
    return proposals.filter((p) => {
      const code = `P-${p.id}`
      const customer = p?.customer?.name || p?.customerName || ''
      const po = p?.customerPoNumber || ''
      return (
        code.toLowerCase().includes(q) ||
        customer.toLowerCase().includes(q) ||
        String(p?.status || '').toLowerCase().includes(q) ||
        String(po).toLowerCase().includes(q)
      )
    })
  }, [proposals, search])

  const total = filtered.length
  const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize)
  const start = page * pageSize
  const current = filtered.slice(start, start + pageSize)

  const [selected, setSelected] = useState(null)
  const { data: docs = [], isFetching: docsLoading } = useListProposalDocumentsQuery(
    selected?.id,
    { skip: !selected?.id }
  )
  const [downloadDoc] = useDownloadProposalDocumentFileMutation()

  useEffect(() => {
    if (!focusId) return
    const found = proposals.find((p) => String(p.id) === focusId)
    if (found) {
      setSelected(found)
    }
  }, [focusId, proposals])

  const openDetails = (p) => {
    setSelected(p)
    const next = new URLSearchParams(searchParams)
    if (p?.id) next.set('focus', p.id)
    setSearchParams(next)
  }

  const closeDetails = () => {
    setSelected(null)
    if (!searchParams.has('focus')) return
    const next = new URLSearchParams(searchParams)
    next.delete('focus')
    setSearchParams(next)
  }

  const handleDownload = async (doc) => {
    if (!selected?.id || !doc?.id) return
    try {
      await downloadDoc({
        proposalId: selected.id,
        docId: doc.id,
        filename: doc.filename || doc.originalName || `proposal-${selected.id}-doc-${doc.id}.pdf`
      }).unwrap()
    } catch (e) {
      toast.error(String(e?.data?.message || e?.error || e?.message || 'Download failed'))
    }
  }

  const poDocs = Array.isArray(docs)
    ? docs.filter((d) => {
        const name = (d.filename || d.originalName || '').toLowerCase()
        const kind = String(d.kind || d.docType || '')
        return name.includes('po') || kind.includes('PO')
      })
    : []

  return (
    <div className='min-h-screen bg-slate-50 p-6 lg:p-10'>
      <Toaster />
      <div className='mx-auto max-w-6xl space-y-6'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <h1 className='text-2xl font-semibold text-slate-900'>Proposal History</h1>
          <button
            className='inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black'
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCcw size={16} /> {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className='flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='flex flex-col gap-1'>
            <label className='text-xs font-semibold uppercase text-slate-500'>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className='h-11 rounded-lg border border-slate-200 px-3'
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className='flex flex-col gap-1 flex-1 min-w-[220px]'>
            <label className='text-xs font-semibold uppercase text-slate-500'>Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search by proposal, customer or PO number'
              className='h-11 rounded-lg border border-slate-200 px-3'
            />
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-xs font-semibold uppercase text-slate-500'>Rows</label>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className='h-11 rounded-lg border border-slate-200 px-3'>
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <div className='overflow-hidden rounded-2xl border border-slate-200'>
          <table className='min-w-full divide-y divide-slate-200'>
            <thead className='bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500'>
              <tr>
                <th className='px-3 py-2 text-left'>Proposal</th>
                <th className='px-3 py-2 text-left'>Customer</th>
                <th className='px-3 py-2 text-left'>Status</th>
                <th className='px-3 py-2 text-right'>Total</th>
                <th className='px-3 py-2 text-left'>Created</th>
                <th className='px-3 py-2 text-left'>Customer PO</th>
                <th className='px-3 py-2 text-center'>Details</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100 bg-white text-sm'>
              {isFetching && current.length === 0 && (
                <tr>
                  <td colSpan={7} className='px-3 py-6 text-center text-slate-500'>Loading…</td>
                </tr>
              )}
              {!isFetching && current.length === 0 && (
                <tr>
                  <td colSpan={7} className='px-3 py-6 text-center text-slate-500'>No proposals found.</td>
                </tr>
              )}
              {current.map((p) => {
                const code = `P-${p.id}`
                const customer = p?.customer?.name || p?.customerName || '—'
                const statusBadge = p?.status || 'UNKNOWN'
                const total = p?.total || p?.grandTotal
                const created = p?.createdAt ? new Date(p.createdAt) : null
                const createdLabel = created ? created.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
                const poNumber = p?.customerPoNumber || p?.customerPO?.poNumber || '—'
                const isFocused = selected?.id === p.id
                return (
                  <tr key={p.id} className={isFocused ? 'bg-indigo-50/60' : undefined}>
                    <td className='px-3 py-2 text-slate-900 font-medium'>{code}</td>
                    <td className='px-3 py-2 text-slate-700'>{customer}</td>
                    <td className='px-3 py-2'>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone(statusBadge)}`}>
                        {statusBadge}
                      </span>
                    </td>
                    <td className='px-3 py-2 text-right font-semibold text-slate-900'>{fmtINR(total)}</td>
                    <td className='px-3 py-2 text-slate-700'>{createdLabel}</td>
                    <td className='px-3 py-2 text-slate-700'>{poNumber || '—'}</td>
                    <td className='px-3 py-2 text-center'>
                      <button
                        className='rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black'
                        onClick={() => openDetails(p)}
                      >
                        {isFocused ? 'Viewing' : 'View'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className='flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600'>
          <span>
            Showing <span className='font-semibold text-slate-900'>{total === 0 ? 0 : start + 1}</span>–
            <span className='font-semibold text-slate-900'>{total === 0 ? 0 : Math.min(start + pageSize, total)}</span> of{' '}
            <span className='font-semibold text-slate-900'>{total}</span>
          </span>
          <div className='inline-flex items-center gap-2'>
            <button onClick={() => setPage(0)} disabled={page === 0} className='rounded-md border px-3 py-1.5 disabled:opacity-50'>« First</button>
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className='rounded-md border px-3 py-1.5 disabled:opacity-50'>‹ Prev</button>
            <span className='px-2'>Page {total === 0 ? 0 : page + 1} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className='rounded-md border px-3 py-1.5 disabled:opacity-50'>Next ›</button>
            <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} className='rounded-md border px-3 py-1.5 disabled:opacity-50'>Last »</button>
          </div>
        </div>

        {selected && (
          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <h2 className='text-lg font-semibold text-slate-900'>Proposal {`P-${selected.id}`}</h2>
                <p className='text-sm text-slate-600'>Customer: {selected?.customer?.name || selected?.customerName || '—'}</p>
              </div>
              <button className='text-sm text-blue-600 hover:underline' onClick={closeDetails}>Close</button>
            </div>
            <div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <Detail label='Status' value={selected?.status || '—'} />
              <Detail label='Total Amount' value={fmtINR(selected?.total || selected?.grandTotal)} />
              <Detail label='Customer PO Number' value={selected?.customerPoNumber || selected?.customerPO?.poNumber || '—'} />
              <Detail label='Last Updated'
                value={selected?.updatedAt ? new Date(selected.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
              />
            </div>

            <div className='mt-6'>
              <h3 className='text-sm font-semibold uppercase tracking-wide text-slate-500'>Documents</h3>
              {docsLoading && <p className='mt-2 text-sm text-slate-600'>Loading documents…</p>}
              {!docsLoading && (!docs || docs.length === 0) && (
                <p className='mt-2 text-sm text-slate-600'>No documents uploaded yet.</p>
              )}
              {!docsLoading && Array.isArray(docs) && docs.length > 0 && (
                <ul className='mt-3 space-y-2'>
                  {docs.map((doc) => {
                    const isPO = poDocs.some((po) => po.id === doc.id)
                    return (
                      <li key={doc.id} className='flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2'>
                        <div>
                          <p className='text-sm font-medium text-slate-800'>{doc.originalName || doc.filename || `Document #${doc.id}`}</p>
                          <p className='text-xs text-slate-500'>Uploaded {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString('en-IN') : '—'}{isPO ? ' • Customer PO' : ''}</p>
                        </div>
                        <button
                          className='inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700'
                          onClick={() => handleDownload(doc)}
                        >
                          <FileDown size={14} /> Download
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Detail ({ label, value }) {
  return (
    <div>
      <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>{label}</div>
      <div className='text-sm text-slate-900'>{value || '—'}</div>
    </div>
  )
}

