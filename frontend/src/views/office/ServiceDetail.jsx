// src/views/office/ServiceDetail.jsx
//
// Detailed view for a single service record. This page fetches the
// service using its ID, then parses the JSON fields (metaJson,
// itemsJson, totalsJson) to present a read‑only summary. Buyers and
// consignees are displayed, followed by invoice meta details and a
// table of individual line items with totals. The component offers a
// back link to return to the history list.

import React, { useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { IndianRupee, Send, Share2, FileDown } from 'lucide-react'
import { Toaster, toast } from 'react-hot-toast'
import { displayDocNumber } from '../../utils/docNumbers'
import { buildServiceLineDescriptions } from '../../utils/serviceLineDescriptions'
// Import the getService hook rather than the paginated getServices hook. This
// endpoint fetches a single service by ID and returns the raw Service
// object (with metaJson/itemsJson/totalsJson strings). See officeApi.js.
import { useGetServiceQuery, useDownloadServiceInvoiceMutation, useSendServiceInvoiceMutation, useShareServiceProposalMutation } from '../../features/office/officeApi'

const parseJson = (value, fallback) => {
  if (!value) return fallback
  if (Array.isArray(value) || typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch (err) {
    return fallback
  }
}

const firstNonEmpty = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue
    const str = String(value).trim()
    if (str) return value
  }
  return null
}

const formatServiceType = (value) => {
  if (!value) return '—'
  const str = String(value)
  if (!str.trim()) return '—'
  return str
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\w/g, (match) => match.toUpperCase())
}

const safeNumber = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

// Local helper to format currency in Indian Rupees.
const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(Number.isFinite(+n) ? +n : 0)

const describeLineItem = (serviceType, item) => {
  if (!item) return ''
  const explicit = firstNonEmpty(item.description, item.details, item.itemDescription)
  const explicitStr = String(explicit || '').trim()
  if (explicitStr) return explicitStr
  const name = String(firstNonEmpty(item.name, item.itemName) || '').trim()
  if (!name) return ''
  const st = String(serviceType || '').toLowerCase()
  if (st.includes('installation only')) return `Installation charges for ${name}`
  if (st.includes('supply with installation')) {
    if (/installation/i.test(name)) return `Installation charges for ${name}`
    return `Supply charges for ${name}`
  }
  if (st.includes('supply')) return `Supply charges for ${name}`
  return ''
}

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

  const meta = useMemo(() => parseJson(service?.metaJson, {}), [service?.metaJson])
  const items = useMemo(() => {
    const parsed = parseJson(service?.itemsJson, [])
    return Array.isArray(parsed) ? parsed : []
  }, [service?.itemsJson])
  const totals = useMemo(() => parseJson(service?.totalsJson, {}), [service?.totalsJson])

  const invoiceNumber = displayDocNumber(firstNonEmpty(
    meta.invoiceNo,
    meta.invoiceNumber,
    meta.invoice,
    meta.invNo,
    service?.invoiceNo,
    service?.invoiceNumber
  ))
  const proformaNumber = displayDocNumber(firstNonEmpty(
    meta.pinvNo,
    meta.proformaNo,
    meta.proforma,
    meta.pinv,
    service?.pinvNo,
    service?.pinvNumber
  ))
  const invoiceDate = firstNonEmpty(meta.invoiceDate, meta.invoice_date, service?.invoiceDate)
  const proformaDate = firstNonEmpty(meta.pinvDate, meta.proformaDate, meta.pinv_date)
  const serviceType = formatServiceType(firstNonEmpty(meta.serviceType, meta.service_type, meta.serviceTypeCode))

  const subtotalValue = firstNonEmpty(totals.subtotal, totals.subTotal, totals.beforeTax, totals.totalBeforeTax)
  const discountValue = firstNonEmpty(totals.discountSavings, totals.discount, totals.discountAmount, totals.discountValue)
  const transportValue = firstNonEmpty(totals.transport, totals.transportation, totals.freight, totals.deliveryCharge)
  const cgstRateValue = firstNonEmpty(totals.cgstRate, totals.cgst_percent)
  const sgstRateValue = firstNonEmpty(totals.sgstRate, totals.sgst_percent)
  const igstRateValue = firstNonEmpty(totals.igstRate, totals.igst_percent)
  const cgstAmountValue = firstNonEmpty(totals.cgst, totals.cgstAmount)
  const sgstAmountValue = firstNonEmpty(totals.sgst, totals.sgstAmount)
  const igstAmountValue = firstNonEmpty(totals.igst, totals.igstAmount)
  const grandTotalValue = firstNonEmpty(totals.grand, totals.total, totals.grandTotal, totals.netTotal)
  const hasSplitTax = cgstRateValue !== null && cgstRateValue !== undefined

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
            <LabeledRow label='Invoice No.' value={invoiceNumber} />
            <LabeledRow label='Invoice Date' value={invoiceDate} />
            <LabeledRow label='PINV No.' value={proformaNumber} />
            <LabeledRow label='PINV Date' value={proformaDate} />
            <LabeledRow label='Linked Proposal' value={proposalLink} />
            <LabeledRow label='Buyer Order No.' value={meta.buyerOrderNo} />
            <LabeledRow label='Order Date' value={meta.orderDate} />
            <LabeledRow label='Delivery Challan No.' value={meta.dcNo} />
            <LabeledRow label='Work Completion Certificate No.' value={meta.wcNo} />
            <LabeledRow label='Service Type' value={serviceType} />
            <LabeledRow label='Created At' value={service.createdAt ? new Date(service.createdAt).toLocaleString() : '—'} />
          </div>
          {meta.terms && (
            <div className='mt-4'>
              <div className='text-xs font-medium uppercase tracking-wider text-slate-500'>Terms & Conditions</div>
              {Array.isArray(meta.terms) ? (
                <ul className='mt-1 list-inside list-decimal space-y-1 text-sm text-slate-900'>
                  {meta.terms.filter((line) => String(line || '').trim()).map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
              ) : (
                <ul className='mt-1 list-inside list-decimal space-y-1 text-sm text-slate-900'>
                  {String(meta.terms)
                    .split(/\r?\n/)
                    .filter((l) => l.trim())
                    .map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                </ul>
              )}
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
                  <th className='px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500'>#</th>
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
                    <td colSpan={7} className='px-3 py-6 text-center text-sm text-slate-500'>No items recorded.</td>
                  </tr>
                )}
                {items && items.map((it, idx) => {
                  const qty = safeNumber(firstNonEmpty(it.qty, it.quantity, it.qtyOrdered), 0)
                  const base = safeNumber(firstNonEmpty(it.basePrice, it.unitPrice, it.price, it.rate), 0)
                  const disc = safeNumber(firstNonEmpty(it.discount, it.discountPercent), 0)
                  const explicitLine = safeNumber(firstNonEmpty(it.lineTotal, it.total, it.amount), null)
                  const line = explicitLine !== null ? explicitLine : Math.round(base * qty * (1 - disc / 100))
                  const itemName = firstNonEmpty(it.name, it.itemName) || '—'
                  const itemCode = firstNonEmpty(it.code, it.itemCode)
                  const descriptionLines = buildServiceLineDescriptions(meta.serviceType, it)
                  return (
                    <tr key={idx} className='hover:bg-slate-50'>
                      <td className='px-3 py-2 text-sm font-semibold text-slate-700 text-center align-top'>{idx + 1}</td>
                      <td className='px-3 py-2 text-sm text-slate-900'>
                        <div>{itemName}</div>
                        {itemCode && (
                          <div className='mt-1 text-xs text-slate-500'>{itemCode}</div>
                        )}
                        {descriptionLines.length > 0 && (
                          <div className='mt-1 space-y-1 text-xs text-slate-500'>
                            {descriptionLines.map((line, lineIdx) => (
                              <div key={lineIdx}>{line}</div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className='px-3 py-2 text-sm text-slate-700'>{firstNonEmpty(it.hsnSac, it.hsn, it.sac)}</td>
                      <td className='px-3 py-2 text-right text-sm font-medium text-slate-900'>{fmtINR(base)}</td>
                      <td className='px-3 py-2 text-right text-sm text-slate-700'>{qty || '—'}</td>
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
              <span className='font-semibold text-slate-900'>
                {fmtINR(subtotalValue)}
              </span>
            </div>
            <div className='flex justify-between'>
              <span>Discount savings</span>
              <span className='font-semibold text-slate-900'>
                {fmtINR(discountValue)}
              </span>
            </div>
            <div className='flex justify-between'>
              <span>Transport</span>
              <span className='font-semibold text-slate-900'>
                {fmtINR(transportValue)}
              </span>
            </div>
            {hasSplitTax ? (
              <>
                <div className='flex justify-between'>
                  <span>CGST {cgstRateValue ?? 0}%</span>
                  <span className='font-semibold text-slate-900'>{fmtINR(cgstAmountValue)}</span>
                </div>
                <div className='flex justify-between'>
                  <span>SGST {sgstRateValue ?? 0}%</span>
                  <span className='font-semibold text-slate-900'>{fmtINR(sgstAmountValue)}</span>
                </div>
              </>
            ) : (
              <div className='flex justify-between'>
                <span>IGST {igstRateValue ?? 0}%</span>
                <span className='font-semibold text-slate-900'>{fmtINR(igstAmountValue)}</span>
              </div>
            )}
            <div className='flex justify-between text-lg font-bold text-slate-900 mt-2'>
              <span>Total</span>
              <span className='inline-flex items-center gap-1'>
                <IndianRupee size={18}/> {fmtINR(grandTotalValue)}
              </span>
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