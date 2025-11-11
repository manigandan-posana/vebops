// src/views/office/Preview.jsx
//
// A minimal invoice/proforma preview page inspired by the HT Power version.
// It receives the draft payload via React Router `state` (see Service page).
// Nothing is stored in localStorage: the Service page passes the buyer,
// consignee, meta, items and totals via navigation state. A `docType`
// property determines whether this is an invoice or proforma.

import React, { useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useGetCompanyQuery } from '../../features/office/officeApi'
import { displayDocNumber } from '../../utils/docNumbers'
import { buildServiceLineDescriptions } from '../../utils/serviceLineDescriptions'

// GST state codes mapping. Keys are lower‑cased state names (spaces normalized) and values are
// two‑digit GST codes. Used to display the state code next to the state in billing/shipping
// addresses and to derive a code when the GSTIN prefix is absent.
const STATE_CODES = {
  'andhra pradesh': '37',
  'arunachal pradesh': '12',
  assam: '18',
  bihar: '10',
  chhattisgarh: '22',
  goa: '30',
  gujarat: '24',
  haryana: '06',
  'himachal pradesh': '02',
  jharkhand: '20',
  karnataka: '29',
  kerala: '32',
  'madhya pradesh': '23',
  maharashtra: '27',
  manipur: '14',
  meghalaya: '17',
  mizoram: '15',
  nagaland: '13',
  odisha: '21',
  punjab: '03',
  rajasthan: '08',
  sikkim: '11',
  'tamil nadu': '33',
  tamilnadu: '33',
  telangana: '36',
  tripura: '16',
  'uttar pradesh': '09',
  uttarakhand: '05',
  'west bengal': '19',
  delhi: '07',
  'jammu & kashmir': '01',
  'jammu and kashmir': '01',
  ladakh: '38',
  puducherry: '34',
  chandigarh: '04',
  'andaman & nicobar': '35',
  'andaman and nicobar': '35',
  'dadra & nagar haveli & daman & diu': '26',
  'dadra and nagar haveli and daman and diu': '26',
  lakshadweep: '31'
}

// Derive GST state code from GSTIN or state name. GSTINs begin with two digits which are
// used when present. Otherwise the state name is looked up in the mapping. Returns
// an empty string if no code can be determined.
function getStateCode (gstin, state) {
  if (gstin && String(gstin).length >= 2) {
    const prefix = String(gstin).substring(0, 2)
    if (/^\d{2}$/.test(prefix)) return prefix
  }
  if (state) {
    let key = String(state).trim().toLowerCase()
    key = key.replace(/&/g, 'and')
    key = key.replace(/\s+/g, ' ')
    return STATE_CODES[key] || ''
  }
  return ''
}

export default function Preview () {
  const navigate = useNavigate()
  const location = useLocation()
  // Payload was passed via navigation state from Service page
  const data = location.state || {}

  // Fetch company profile from backend. If absent, default to empty object.
  const { data: companyData = {} } = useGetCompanyQuery()
  const {
    buyer = {},
    consignee = {},
    meta = {},
    items = [],
    totals = {},
    docType = 'INVOICE'
  } = data
  const isProforma = String(docType).toUpperCase() === 'PROFORMA'
  const docTitle = isProforma ? 'PROFORMA INVOICE' : 'INVOICE'
  const docNoLabel = isProforma ? 'PINV No.' : 'Invoice No.'
  const docDateLabel = isProforma ? 'PINV Date' : 'Date'
  const docNoValue = isProforma
    ? displayDocNumber(meta.pinvNo)
    : displayDocNumber(meta.invoiceNo)
  const docDateValue = isProforma ? (meta.pinvDate || '—') : (meta.invoiceDate || '—')

  const money = (n) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(Number.isFinite(+n) ? +n : 0)

  const termsFromString = (s) =>
    String(s || '')
      .split(/\r?\n|[;|]/)
      .map((t) => t.trim())
      .filter(Boolean)

  const termsList =
    Array.isArray(meta.termsList) && meta.termsList.length
      ? meta.termsList
      : termsFromString(meta.terms)
  const igstRate = Number(totals.igstRate) || 0 // for per-line display of IGST %

  // Compute a description line for each item based on the selected service type.
  // When the service type is "Supply only" the description will read "Supply of <item>".
  // For "Supply with installation" the description will be "Supply of <item>" for normal
  // items and "Installation of <item>" for lines whose name contains the word
  // "installation" (case‑insensitive). An "Installation only" service type prefixes
  // all items with "Installation of".  All other service types return an empty string.
  // Normalise the company data. The backend returns addressLine1/addressLine2 and logoDataUrl
  // but the preview expects addressLines and logo fields. Construct a derived object
  // that flattens address lines into an array and maps logoDataUrl to logo. If both
  // are absent the properties will be undefined.
  const company = useMemo(() => {
    const c = companyData || {}
    const lines = []
    if (Array.isArray(c.addressLines)) {
      lines.push(...c.addressLines)
    } else {
      if (c.addressLine1) lines[0] = c.addressLine1
      if (c.addressLine2) lines[1] = c.addressLine2
    }
    return {
      ...c,
      addressLines: lines,
      logo: c.logo || c.logoDataUrl
    }
  }, [companyData])
  const placeOfSupply =
    meta.placeOfSupply || buyer.state || consignee.state || company.state || '—'

  // Compute GST state codes for buyer and consignee.  GSTIN prefixes take precedence
  // over textual state names. When no code can be derived an empty string is returned.
  const buyerStateCode = getStateCode(buyer.gst, buyer.state)
  const consigneeStateCode = getStateCode(consignee.gst, consignee.state)

  // Simplified words conversion; can be improved
  function inrToWords (amount) {
    const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
    const u100 = (n) => n < 20 ? ones[n] : tens[Math.floor(n/10)] + (n%10 ? '-' + ones[n%10] : '')
    const u1000 = (n) => {
      let s = ''
      if (n >= 100) { s += ones[Math.floor(n/100)] + ' Hundred'; n %= 100; if (n) s += ' ' }
      if (n) s += u100(n)
      return s || 'Zero'
    }
    const chunk = (n, denom) => n ? u1000(n) + ' ' + denom : ''
    const round2 = Math.round((Number(amount) || 0) * 100) / 100
    const rupees = Math.floor(round2)
    const paise  = Math.round((round2 - rupees) * 100)
    let n = rupees
    const crore   = Math.floor(n / 10000000); n %= 10000000
    const lakh    = Math.floor(n / 100000);   n %= 100000
    const thousand= Math.floor(n / 1000);     n %= 1000
    const last    = n
    const parts = []
    if (crore)   parts.push(chunk(crore, 'Crore'))
    if (lakh)    parts.push(chunk(lakh, 'Lakh'))
    if (thousand)parts.push(chunk(thousand, 'Thousand'))
    if (last)    parts.push(u1000(last))
    const rupeeWords = (parts.join(' ') || 'Zero') + ' Rupees'
    const out = paise ? `${rupeeWords} and ${u1000(paise)} Paise` : `${rupeeWords}`
    return out + ' Only'
  }
  const totalInWords = useMemo(() => {
      const t = (totals.inWords || '').trim()
      return t ? t : inrToWords(totals.grand || 0)
    }, [totals.inWords, totals.grand])

  return (
    <div className='min-h-screen bg-[#f3f6fb] p-6 print:p-0'>
      <style>{`
        @page { size: A4; margin: 10mm 12mm; }
        @media print { .no-print{display:none!important} .sheet{box-shadow:none!important;background:white} }
        *{ box-sizing:border-box }
        html,body{ height:auto; overflow:visible }
        thead { display: table-header-group; }
      `}</style>
      <div className='mb-4 flex justify-between no-print'>
        <button onClick={() => navigate(-1)} className='rounded border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50'>Back</button>
        <button onClick={() => window.print()} className='rounded bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-black'>Print / Save PDF</button>
      </div>
      <div className='sheet mx-auto max-w-4xl rounded-md bg-white shadow-[0_8px_30px_rgba(17,24,39,.08)] border border-slate-200'>
        {/* Header */}
        <div className='px-8 pt-8 pb-6'>
          <div className='flex items-start justify-between gap-6'>
            <div className='flex items-center gap-4'>
              <div className='h-16 w-16 shrink-0 grid place-items-center'>
                {company.logo ? (
                  <img src={company.logo} alt='Logo' className='h-full w-full object-contain' />
                ) : (
                  <div className='h-full w-full flex items-center justify-center bg-slate-100 text-slate-400'>Logo</div>
                )}
              </div>
              <div>
                <div className='text-[22px] font-extrabold text-slate-800 leading-6'>
                  {company.name || '—'}
                </div>
                <div className='text-[12px] text-slate-500 leading-5'>
                  {(company.addressLines || []).join(', ') || '—'}
                  <br />
                  {company.gstin ? <>GSTIN: {company.gstin}<br /></> : null}
                  {company.pan ? <>PAN: {company.pan}</> : null}
                </div>
              </div>
            </div>
            <div className='text-right'>
              <div className='text-3xl font-extrabold tracking-wide text-slate-900'>
                {docTitle}
              </div>
              <div className='mt-2 text-[12px] text-slate-600'>
                <span className='font-medium'>{docNoLabel}:</span> {docNoValue || '—'}
                <br />
                <span className='font-medium'>{docDateLabel}:</span> {docDateValue || '—'}
              </div>
            </div>
          </div>
        </div>
        {/* Divider */}
        <div className='h-[1px] bg-slate-200 mx-8' />
        {/* Bill To / Ship To */}
        <div className='px-8 py-5 grid grid-cols-2 gap-8'>
          <div>
            <div className='text-[12px] font-semibold text-slate-700 uppercase tracking-wide'>
              Bill To
            </div>
            <div className='mt-1 text-[14px] font-semibold text-slate-900'>
              {(buyer.name || '').toUpperCase() || '—'}
            </div>
            <div className='whitespace-pre-line text-[13px] leading-5 text-slate-700'>
              {(buyer.address || '').trim()}
              {buyer.pin ? `\n${buyer.pin}` : ''}
              {buyer.state ? `\n${buyer.state}${buyerStateCode ? ` (${buyerStateCode})` : ''}` : ''}
              {buyer.gst ? `\nGSTIN: ${buyer.gst}` : ''}
              {buyer.contact ? `\nContact: ${buyer.contact}` : ''}
            </div>
          </div>
          <div>
            <div className='text-[12px] font-semibold text-slate-700 uppercase tracking-wide'>
              Ship To
            </div>
            <div className='mt-1 text-[14px] font-semibold text-slate-900'>
              {(consignee.name || '').toUpperCase() || '—'}
            </div>
            <div className='whitespace-pre-line text-[13px] leading-5 text-slate-700'>
              {(consignee.address || '').trim()}
              {consignee.pin ? `\n${consignee.pin}` : ''}
              {consignee.state ? `\n${consignee.state}${consigneeStateCode ? ` (${consigneeStateCode})` : ''}` : ''}
              {consignee.gst ? `\nGSTIN: ${consignee.gst}` : ''}
            </div>
          </div>
        </div>
        {/* light band of meta (3 columns × 2 rows like screenshot) */}
        <div className='px-8 pb-4'>
          <div className='grid grid-cols-3 gap-6 text-[12px]'>
            <MetaLine label='Service Type' value={meta.serviceType || '—'} />
            <MetaLine label='Place of Supply' value={placeOfSupply} />
            <MetaLine label='Buyer’s Order / PO No.' value={meta.buyerOrderNo || '—'} />
            <MetaLine label='PO / WO Date' value={meta.orderDate || '—'} />
            <MetaLine label='Delivery Challan No.' value={meta.dcNo || '—'} />
            <MetaLine label='Work Completion Cert No.' value={meta.wcNo || '—'} />
          </div>
        </div>
        {/* Items Table */}
        <div className='px-8'>
          <table className='w-full border-t border-b border-slate-200 text-[13px]'>
            <thead className='bg-[#f7f9ff] text-slate-700'>
              <tr>
                <Th className='text-center w-[56px]'>S.No</Th>
                {/* Description column */}
                <Th className='text-left pl-3'>Item Description</Th>
                <Th>HSN/SAC</Th>
                <Th>Qty</Th>
                {/* Rate column replaces Base Rate and hides Discount % */}
                <Th>Rate</Th>
                <Th>Amount</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const qty = Number(it.qty) || 0
                const disc = Number(it.discount) || 0
                const rate = Number(it.basePrice) || 0
                // Compute line after discount; discount is still applied internally
                const line = Math.round(rate * qty * (1 - disc / 100) * 100) / 100
                const descriptionLines = buildServiceLineDescriptions(meta.serviceType, it)
                const itemCode = it.code || it.itemCode
                return (
                  <tr key={idx} className='border-b border-slate-200'>
                    <Td className='text-center font-semibold text-slate-700'>{idx + 1}</Td>
                    <Td className='text-left pl-3'>
                      <div className='font-medium text-slate-900'>{it.name || it.itemName || '—'}</div>
                      {itemCode && (
                        <div className='mt-0.5 text-[11px] uppercase tracking-wide text-slate-500'>Code: {itemCode}</div>
                      )}
                      {descriptionLines.length > 0 && (
                        <div className='mt-0.5 space-y-0.5 text-[11px] leading-relaxed text-slate-500'>
                          {descriptionLines.map((line, lineIdx) => (
                            <div key={lineIdx}>{line}</div>
                          ))}
                        </div>
                      )}
                    </Td>
                    <Td className='text-center'>{it.hsnSac}</Td>
                    <Td className='text-center'>{qty}</Td>
                    <Td className='text-right'>{money(rate)}</Td>
                    <Td className='text-right'>{money(line)}</Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* Totals */}
        <div className='px-8 py-4 flex justify-end'>
          <table className='text-[13px]'>
            <tbody>
              <tr><td className='pr-3'>Subtotal:</td><td className='font-semibold text-right'>{money(totals.subtotal)}</td></tr>
              <tr><td className='pr-3'>Discount savings:</td><td className='font-semibold text-right'>{money(totals.discountSavings)}</td></tr>
              <tr><td className='pr-3'>Transport:</td><td className='font-semibold text-right'>{money(totals.transport)}</td></tr>
              {totals.cgst > 0 && <tr><td className='pr-3'>CGST ({totals.cgstRate}%):</td><td className='font-semibold text-right'>{money(totals.cgst)}</td></tr>}
              {totals.sgst > 0 && <tr><td className='pr-3'>SGST ({totals.sgstRate}%):</td><td className='font-semibold text-right'>{money(totals.sgst)}</td></tr>}
              {totals.igst > 0 && <tr><td className='pr-3'>IGST ({totals.igstRate}%):</td><td className='font-semibold text-right'>{money(totals.igst)}</td></tr>}
              <tr><td className='pr-3 font-bold'>Grand Total:</td><td className='font-bold text-right'>{money(totals.grand)}</td></tr>
              <tr><td className='pr-3'>Amount in words:</td><td className='text-right'>{totalInWords}</td></tr>
            </tbody>
          </table>
        </div>
        {/* Bank details, Terms & Amount Due */}
        <div className='px-8 pb-8 flex flex-col md:flex-row gap-6'>
          <div className='flex-1 space-y-4'>
            {/* Company bank details */}
            <div>
              <div className='text-[12px] font-semibold uppercase text-sky-700 tracking-wide'>Company's Bank Details</div>
              <div className='mt-1 text-[13px] leading-5 text-slate-800'>
                <div><span className='font-medium'>Bank Name: </span>{company.bankName || '—'}</div>
                <div><span className='font-medium'>A/C No: </span>{company.accNo || company.accountNo || company.accno || '—'}</div>
                <div><span className='font-medium'>Branch: </span>{company.branch || '—'}</div>
                <div><span className='font-medium'>IFSC: </span>{company.ifsc || '—'}</div>
              </div>
            </div>
            {/* Terms & conditions */}
            {Array.isArray(termsList) && termsList.length > 0 && (
              <div>
                <div className='text-[12px] font-semibold uppercase text-sky-700 tracking-wide'>Terms & Conditions</div>
                <ol className='mt-1 list-decimal pl-4 text-[12px] text-slate-800'>
                  {termsList.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ol>
              </div>
            )}
            {/* Narration / remarks */}
            {meta.narration && (
              <div>
                <div className='text-[12px] font-semibold uppercase text-sky-700 tracking-wide'>Narration / Remarks</div>
                <div className='mt-1 text-[12px] text-slate-800'>{meta.narration}</div>
              </div>
            )}
          </div>
          {/* Summary card removed per requirements (no separate Total/Amount Due box) */}
        </div>
      </div>
    </div>
  )
}

/* ---------- small presentational helpers (no logic changes) ---------- */
function MetaLine ({ label, value }) {
  return (
    <div className='min-w-0'>
      <div className='text-sky-700 font-semibold uppercase tracking-wide text-[10px]'>
        {label}
      </div>
      <div className='mt-1 text-[13px] text-slate-800'>{value}</div>
    </div>
  )
}
function Th ({ children, className = '' }) {
  return (
    <th className={`px-3 py-2 font-medium ${className}`}>{children}</th>
  )
}
function Td ({ children, className = '' }) {
  // Default table cell styling uses left alignment. Consumers can override
  // alignment by passing classes such as text-right or text-center via className.
  return (
    <td className={`px-3 py-2 text-slate-800 ${className}`}>{children}</td>
  )
}