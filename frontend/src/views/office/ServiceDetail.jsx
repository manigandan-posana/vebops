// src/views/office/ServiceDetail.jsx
//
// Detailed view for a single service record. This page fetches the
// service using its ID, then parses the JSON fields (metaJson,
// itemsJson, totalsJson) to present a read‑only summary. Buyers and
// consignees are displayed, followed by invoice meta details and a
// table of individual line items with totals. The component offers a
// back link to return to the history list.

import React from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { IndianRupee } from 'lucide-react'
// Import the getService hook rather than the paginated getServices hook. This
// endpoint fetches a single service by ID and returns the raw Service
// object (with metaJson/itemsJson/totalsJson strings). See officeApi.js.
import { useGetServiceQuery } from '../../features/office/officeApi'

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

  if (isFetching) {
    return (
      <div className='min-h-screen bg-slate-50 p-6 lg:p-10'>
        <div className='mx-auto max-w-4xl'>Loading…</div>
      </div>
    )
  }
  if (error || !service) {
    return (
      <div className='min-h-screen bg-slate-50 p-6 lg:p-10'>
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

  return (
    <div className='min-h-screen bg-slate-50 p-6 lg:p-10'>
      <div className='mx-auto max-w-4xl space-y-6'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-semibold text-slate-900'>Service Detail</h1>
          <Link to='/office/service-history' className='rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black'>
            Back to History
          </Link>
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
            <LabeledRow label='Invoice No.' value={meta.invoiceNo} />
            <LabeledRow label='Invoice Date' value={meta.invoiceDate} />
            <LabeledRow label='PINV No.' value={meta.pinvNo} />
            <LabeledRow label='PINV Date' value={meta.pinvDate} />
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
    </div>
  )
}