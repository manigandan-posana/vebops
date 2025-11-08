// src/views/office/ServiceDetail.jsx
//
// Detailed view for a single service record. This page fetches the
// service using its ID, then parses the JSON fields (metaJson,
// itemsJson, totalsJson) to present a read‑only summary. Buyers and
// consignees are displayed, followed by invoice meta details and a
// table of individual line items with totals. The component offers a
// back link to return to the history list.

import React, { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { IndianRupee, Send, Share2, FileDown } from 'lucide-react'
import { Toaster, toast } from 'react-hot-toast'
import { displayDocNumber } from '../../utils/docNumbers'
// Import the getService hook rather than the paginated getServices hook. This
// endpoint fetches a single service by ID and returns the raw Service
// object (with metaJson/itemsJson/totalsJson strings). See officeApi.js.
import { useGetServiceQuery, useDownloadServiceInvoiceMutation, useSendServiceInvoiceMutation, useShareServiceProposalMutation } from '../../features/office/officeApi'

// Local helper to format currency in Indian Rupees.
const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(Number.isFinite(+n) ? +n : 0)

// Simple container for labelled rows
const LabeledRow = ({ label, value }) => (
  <div className='flex flex-col gap-0.5'>
    <span className='text-xs font-medium uppercase tracking-wider text-slate-500'>{label}</span>
    <span className='text-sm text-slate-900'>{value || '—'}</span>
  </div>
)

export default function ServiceDetail () {
  const { id } = useParams()
  const navigate = useNavigate()
  // Fetch a single service using the getService endpoint. The
  // paginated getServices endpoint expects query parameters and will not
  // return a single record when provided an ID. Using getService
  // ensures we fetch the correct Service entity.
  const { data: service, isFetching, error } = useGetServiceQuery(id)
  const [downloadInvoice] = useDownloadServiceInvoiceMutation()
  const [sendServiceInvoice, sendState] = useSendServiceInvoiceMutation()
  const [shareServiceProposal] = useShareServiceProposalMutation()
  const [modal, setModal] = useState({ open: false, serviceId: null, method: 'email', contact: '', docType: 'INVOICE' })
  const [sharingDocType, setSharingDocType] = useState(null)

  const openSendModal = (docType = 'INVOICE') => {
    const contact = service?.buyerContact || service?.buyerEmail || ''
    setModal({ open: true, serviceId: service?.id || Number(id), method: 'email', contact, docType })
  }

  const closeModal = () => setModal((m) => ({ ...m, open: false }))

  const handleSend = async () => {
    if (!modal.serviceId) {
      toast.error('Service not ready yet')
      return
    }
    const contact = modal.contact?.trim()
    if (!contact) {
      toast.error('Please enter an email or mobile number')
      return
    }
    const payload = { id: modal.serviceId, type: modal.docType || 'INVOICE' }
    if (modal.method === 'email') payload.toEmail = contact
    else payload.toWhatsapp = contact
    const res = await sendServiceInvoice(payload)
    if ('error' in res) {
      toast.error(res.error?.data?.message || 'Failed to send document')
    } else {
      toast.success(`${modal.docType === 'PROFORMA' ? 'Proforma' : 'Invoice'} sent`)
      closeModal()
    }
  }

  const handleDownload = async (docType = 'INVOICE') => {
    if (!service?.id) return
    try {
      const trigger = downloadInvoice({ id: service.id, type: docType })
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

  const handleShare = async (docType = 'PROFORMA') => {
    if (!service?.id) return
    try {
      setSharingDocType(docType)
      const res = await shareServiceProposal({ id: service.id, docType }).unwrap()
      const pid = res?.proposalId ? `P-${res.proposalId}` : 'Proposal'
      toast.success(`${pid} shared to portal`)
    } catch (e) {
      toast.error(String(e?.data?.message || e?.error || e?.message || 'Failed to share'))
    } finally {
      setSharingDocType(null)
    }
  }

  if (isFetching) {
    return (
      <div className='min-h-screen bg-slate-50 p-6 lg:p-10'>
        <Toaster />
        <div className='mx-auto max-w-4xl'>Loading…</div>
      </div>
    )
  }
  if (error || !service) {
    return (
      <div className='min-h-screen bg-slate-50 p-6 lg:p-10'>
        <Toaster />
        <div className='mx-auto max-w-4xl space-y-4'>
          <div className='text-xl font-semibold text-red-600'>Service not found</div>
          <button onClick={() => navigate(-1)} className='rounded-md bg-blue-600 px-4 py-2 text-white'>Go Back</button>
        </div>
      </div>
    )
  }

  // Parse JSON fields
  let meta = {}
  let items = []
  let totals = {}
  try { meta = service.metaJson ? JSON.parse(service.metaJson) : {} } catch (e) { meta = {} }
  try { items = service.itemsJson ? JSON.parse(service.itemsJson) : [] } catch (e) { items = [] }
  try { totals = service.totalsJson ? JSON.parse(service.totalsJson) : {} } catch (e) { totals = {} }
  const proposalId = meta?.proposalId || meta?.proposalID || null
  const proposalStatus = meta?.proposalStatus || null
  const proposalLink = proposalId
    ? (
        <span className='inline-flex items-center gap-2'>
          <Link to={`/office/proposal-history?focus=${proposalId}`} className='text-blue-600 hover:underline'>P-{proposalId}</Link>
          {proposalStatus && (
            <span className='rounded-full bg-slate-100 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-600'>{String(proposalStatus)}</span>
          )}
        </span>
      )
    : '—'

  return (
    <div className='min-h-screen bg-slate-50 p-6 lg:p-10'>
      <Toaster />
      <div className='mx-auto max-w-4xl space-y-6'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-semibold text-slate-900'>Service Detail</h1>
          <Link to='/office/service-history' className='rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black'>
            Back to History
          </Link>
        </div>
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <h2 className='mb-3 text-base font-semibold text-slate-900'>Actions</h2>
          <div className='flex flex-wrap gap-2'>
            <button
              className='inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60'
              onClick={() => handleDownload('INVOICE')}
              disabled={!service?.id}
            >
              <FileDown size={16} /> Invoice PDF
            </button>
            <button
              className='inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60'
              onClick={() => handleDownload('PROFORMA')}
              disabled={!service?.id}
            >
              <FileDown size={16} /> Proforma PDF
            </button>
            <button
              className='inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60'
              onClick={() => openSendModal('INVOICE')}
              disabled={!service?.id}
            >
              <Send size={16} /> Send Invoice
            </button>
            <button
              className='inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60'
              onClick={() => openSendModal('PROFORMA')}
              disabled={!service?.id}
            >
              <Send size={16} /> Send Proforma
            </button>
            <button
              className='inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60'
              onClick={() => handleShare('PROFORMA')}
              disabled={!service?.id || sharingDocType === 'PROFORMA'}
            >
              <Share2 size={16} /> {sharingDocType === 'PROFORMA' ? 'Sharing…' : 'Share Proforma to Portal'}
            </button>
            <button
              className='inline-flex items-center gap-1 rounded-lg bg-fuchsia-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-60'
              onClick={() => handleShare('INVOICE')}
              disabled={!service?.id || sharingDocType === 'INVOICE'}
            >
              <Share2 size={16} /> {sharingDocType === 'INVOICE' ? 'Sharing…' : 'Share Invoice to Portal'}
            </button>
          </div>
        </div>
        {/* Buyer & Consignee */}
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <h2 className='mb-4 text-lg font-semibold text-slate-900'>Buyer & Consignee</h2>
          <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
            <div className='space-y-2'>
              <div className='font-semibold text-slate-800'>Buyer (Bill To)</div>
              <LabeledRow label='Name' value={service.buyerName} />
              <LabeledRow label='GSTIN' value={service.buyerGst} />
              <LabeledRow label='Contact' value={service.buyerContact} />
              <LabeledRow label='Address' value={service.buyerAddress} />
              <LabeledRow label='PIN' value={service.buyerPin} />
              <LabeledRow label='State' value={service.buyerState} />
            </div>
            <div className='space-y-2'>
              <div className='font-semibold text-slate-800'>Consignee (Ship To)</div>
              <LabeledRow label='Name' value={service.consigneeName} />
              <LabeledRow label='GSTIN' value={service.consigneeGst} />
              <LabeledRow label='Address' value={service.consigneeAddress} />
              <LabeledRow label='PIN' value={service.consigneePin} />
              <LabeledRow label='State' value={service.consigneeState} />
            </div>
          </div>
        </div>
        {/* Invoice Meta */}
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <h2 className='mb-4 text-lg font-semibold text-slate-900'>Invoice & Service Info</h2>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <LabeledRow label='Invoice No.' value={displayDocNumber(meta.invoiceNo)} />
            <LabeledRow label='Invoice Date' value={meta.invoiceDate} />
            <LabeledRow label='PINV No.' value={displayDocNumber(meta.pinvNo)} />
            <LabeledRow label='PINV Date' value={meta.pinvDate} />
            <LabeledRow label='Linked Proposal' value={proposalLink} />
            <LabeledRow label='Buyer Order No.' value={meta.buyerOrderNo} />
            <LabeledRow label='Order Date' value={meta.orderDate} />
            <LabeledRow label='Delivery Challan No.' value={meta.dcNo} />
            <LabeledRow label='Work Completion Certificate No.' value={meta.wcNo} />
            <LabeledRow label='Service Type' value={meta.serviceType} />
          </div>
          {meta.terms && (
            <div className='mt-4'>
              <div className='text-xs font-medium uppercase tracking-wider text-slate-500'>Terms & Conditions</div>
              <ul className='mt-1 list-inside list-decimal space-y-1 text-sm text-slate-900'>
                {String(meta.terms)
                  .split(/\r?\n/)
                  .filter((l) => l.trim())
                  .map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
              </ul>
            </div>
          )}
          {meta.narration && (
            <div className='mt-4'>
              <div className='text-xs font-medium uppercase tracking-wider text-slate-500'>Narration / Remarks</div>
              <p className='mt-1 text-sm text-slate-900'>{meta.narration}</p>
            </div>
          )}
        </div>
        {/* Items & Totals */}
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <h2 className='mb-4 text-lg font-semibold text-slate-900'>Items / Services</h2>
          <div className='overflow-x-auto rounded-lg border border-slate-200'>
            <table className='min-w-full divide-y divide-slate-200'>
              <thead className='bg-slate-50'>
                <tr>
                  <th className='px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>Description</th>
                  <th className='px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>HSN/SAC</th>
                  <th className='px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500'>Base</th>
                  <th className='px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500'>Qty</th>
                  <th className='px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500'>Disc %</th>
                  <th className='px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500'>Line</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100 bg-white'>
                {(!items || items.length === 0) && (
                  <tr>
                    <td colSpan={6} className='px-3 py-6 text-center text-sm text-slate-500'>No items recorded.</td>
                  </tr>
                )}
                {items && items.map((it, idx) => {
                  const qty = Number(it.qty) || 0
                  const base = Number(it.basePrice) || 0
                  const disc = Number(it.discount) || 0
                  const line = Math.round(base * qty * (1 - disc / 100))
                  return (
                    <tr key={idx} className='hover:bg-slate-50'>
                      <td className='px-3 py-2 text-sm text-slate-900'>
                        {it.name || '—'}
                        {it.code && <div className='mt-1 text-xs text-slate-500'>{it.code}</div>}
                      </td>
                      <td className='px-3 py-2 text-sm text-slate-700'>{it.hsnSac}</td>
                      <td className='px-3 py-2 text-right text-sm font-medium text-slate-900'>{fmtINR(base)}</td>
                      <td className='px-3 py-2 text-right text-sm text-slate-700'>{qty}</td>
                      <td className='px-3 py-2 text-right text-sm text-slate-700'>{disc || '—'}</td>
                      <td className='px-3 py-2 text-right text-sm font-semibold text-slate-900'>{fmtINR(line)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Totals summary */}
          <div className='mt-4 flex flex-col gap-2 text-sm text-slate-700'>
            <div className='flex justify-between'>
              <span>Subtotal</span>
              <span className='font-semibold text-slate-900'>{fmtINR(totals.subtotal)}</span>
            </div>
            <div className='flex justify-between'>
              <span>Discount savings</span>
              <span className='font-semibold text-slate-900'>{fmtINR(totals.discountSavings)}</span>
            </div>
            <div className='flex justify-between'>
              <span>Transport</span>
              <span className='font-semibold text-slate-900'>{fmtINR(totals.transport)}</span>
            </div>
            {totals.cgstRate ? (
              <>
                <div className='flex justify-between'>
                  <span>CGST {totals.cgstRate}%</span>
                  <span className='font-semibold text-slate-900'>{fmtINR(totals.cgst)}</span>
                </div>
                <div className='flex justify-between'>
                  <span>SGST {totals.sgstRate}%</span>
                  <span className='font-semibold text-slate-900'>{fmtINR(totals.sgst)}</span>
                </div>
              </>
            ) : (
              <div className='flex justify-between'>
                <span>IGST {totals.igstRate}%</span>
                <span className='font-semibold text-slate-900'>{fmtINR(totals.igst)}</span>
              </div>
            )}
            <div className='flex justify-between text-lg font-bold text-slate-900 mt-2'>
              <span>Total</span>
              <span className='inline-flex items-center gap-1'><IndianRupee size={18}/> {fmtINR(totals.grand)}</span>
            </div>
          </div>
        </div>
      </div>
      {modal.open && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
          <div className='w-[90vw] max-w-md rounded-lg bg-white p-5 shadow-lg'>
            <h2 className='mb-4 text-lg font-semibold text-slate-900'>Send Document</h2>
            <div className='mb-4 flex flex-wrap gap-4'>
              <label className='inline-flex items-center gap-1'>
                <input
                  type='radio'
                  name='sendMethod'
                  value='email'
                  checked={modal.method === 'email'}
                  onChange={() => setModal((m) => ({ ...m, method: 'email' }))}
                />
                <span>Email</span>
              </label>
              <label className='inline-flex items-center gap-1'>
                <input
                  type='radio'
                  name='sendMethod'
                  value='whatsapp'
                  checked={modal.method === 'whatsapp'}
                  onChange={() => setModal((m) => ({ ...m, method: 'whatsapp' }))}
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