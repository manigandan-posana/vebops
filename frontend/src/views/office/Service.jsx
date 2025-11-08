// src/views/office/Service.jsx
//
// This page provides a simple service creation flow inspired by the HT Power
// dashboard. Users can enter buyer/consignee details, add kit items and
// service lines, preview an invoice and finally create the service. The
// functionality is deliberately scoped to the front‑end; it stores the
// compiled service payload in localStorage and exposes a button to call the
// server via the createService mutation.

import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IndianRupee, Search, Trash2 } from 'lucide-react'
import { useSelector } from 'react-redux'
import { useCreateServiceMutation, useGetKitsQuery, useGetCompanyQuery, useAutocompleteServiceBuyersQuery } from '../../features/office/officeApi'
import { normalizeDocNumber } from '../../utils/docNumbers'
import toast from 'react-hot-toast'

/* -------------------------------------------------------------------------- */
// Utility helpers reused from the original HT Power dashboard. These provide
// simple formatting or state management logic for the data grid.

const SERVICE_TYPES = [
  'Installation only',
  'Cable fault identification',
  'Hipot testing',
  'Supply only',
  'Supply with installation'
]

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry','Chandigarh','Andaman & Nicobar','Dadra & Nagar Haveli & Daman & Diu','Lakshadweep'
]

const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(Number.isFinite(+n) ? +n : 0)

const safeNum = (v, fallback = 0) => (Number.isFinite(+v) ? +v : fallback)

// Simple number input with no spinners
function NumberInput ({ value, onChange, min, max, step = 1, className = '', ...rest }) {
  const handle = (e) => {
    const v = e.target.value
    if (v === '') return onChange('')
    const n = Number(v)
    if (Number.isFinite(n)) {
      let next = n
      if (typeof min === 'number') next = Math.max(min, next)
      if (typeof max === 'number') next = Math.min(max, next)
      onChange(next)
    }
  }
  return (
    <>
      <input
        type='number'
        inputMode='decimal'
        value={value === null || value === undefined ? '' : value}
        onChange={handle}
        min={min}
        max={max}
        step={step}
        className={
          'no-spinner h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 ' +
          'outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition ' +
          className
        }
        style={{ textAlign: 'left' }}
        // Prevent scroll wheel from incrementing/decrementing the value
        onWheel={(e) => {
          // Blur the input so the default scroll action doesn’t change the number
          e.currentTarget.blur()
        }}
        {...rest}
      />
      <style>{`
        input[type="number"].no-spinner::-webkit-outer-spin-button,
        input[type="number"].no-spinner::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0 }
        input[type="number"].no-spinner { -moz-appearance: textfield; appearance: textfield }
      `}</style>
    </>
  )
}

const Labeled = ({ label, children, hint }) => (
  <label className='flex flex-col gap-1'>
    <span className='text-sm font-medium text-slate-700'>{label}</span>
    {children}
    {hint ? <span className='text-xs text-slate-400'>{hint}</span> : null}
  </label>
)

const TextInput = (props) => (
  <input
    {...props}
    className={
      'h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-900 placeholder-slate-400 ' +
      'outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition ' +
      (props.className || '')
    }
  />
)

const Select = (props) => (
  <select
    {...props}
    className={
      'h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-900 ' +
      'outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition ' +
      (props.className || '')
    }
  />
)

const Section = ({ title, right, children }) => (
  <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
    <div className='mb-4 flex items-center justify-between'>
      <h2 className='text-lg font-semibold text-slate-900'>{title}</h2>
      {right}
    </div>
    {children}
  </div>
)

// Catalogue component adapted from HT Power. Supports searching and adding kits
function KitCatalogue ({ kits, onAdd, pageSize: initialPageSize = 20 }) {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return kits
    return kits.filter((k) => [k.code, k.name].some((x) => (x || '').toLowerCase().includes(qq)))
  }, [q, kits])

  useEffect(() => {
    setPage(1)
  }, [q, pageSize])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const start = (page - 1) * pageSize
  const end = Math.min(start + pageSize, filtered.length)
  const pageItems = filtered.slice(start, end)

  const goFirst = () => setPage(1)
  const goPrev = () => setPage((p) => Math.max(1, p - 1))
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1))
  const goLast = () => setPage(totalPages)

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='relative sm:max-w-md'>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Search kits by code/name…'
            className='h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
          />
          <Search className='absolute left-3 top-1/2 -translate-y-1/2' size={18} />
        </div>
        <div className='flex flex-wrap items-center gap-2 text-sm text-slate-600'>
          <span>Rows per page:</span>
          <select
            className='h-9 rounded-md border border-slate-200 bg-white px-2'
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className='hidden sm:inline'>•</span>
          <span>
            Showing <span className='font-medium text-slate-900'>{filtered.length ? start + 1 : 0}</span>–
            <span className='font-medium text-slate-900'>{end}</span> of{' '}
            <span className='font-medium text-slate-900'>{filtered.length}</span>
          </span>
        </div>
      </div>
      <div className='overflow-hidden rounded-xl border border-slate-200'>
        <table className='min-w-full divide-y divide-slate-200'>
          <thead className='bg-slate-50'>
            <tr>
              <th className='px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>Code</th>
              <th className='px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>Name</th>
              <th className='px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500'>Base Price</th>
              <th className='px-3 py-2' />
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100 bg-white'>
            {pageItems.map((k) => (
              <tr key={`${k.id ?? k.code}-${k.code}`} className='hover:bg-slate-50'>
                <td className='px-3 py-2 font-mono text-sm text-slate-700'>{k.code}</td>
                <td className='px-3 py-2 text-sm text-slate-900'>{k.name}</td>
                <td className='px-3 py-2 text-right text-sm font-semibold text-slate-900'>{fmtINR(k.basePrice)}</td>
                <td className='px-3 py-2 text-right'>
                  <button
                    type='button'
                    onClick={() => onAdd(k)}
                    className='rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700'
                  >
                    Add
                  </button>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={4} className='px-3 py-6 text-center text-sm text-slate-500'>No kits match “{q}”.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className='flex flex-col items-center justify-between gap-3 sm:flex-row'>
        <div className='text-sm text-slate-600'>
          Page <span className='font-medium text-slate-900'>{page}</span> of{' '}
          <span className='font-medium text-slate-900'>{totalPages}</span>
        </div>
        <div className='inline-flex items-center gap-2'>
          <button onClick={goFirst} disabled={page === 1} className='rounded-md border px-3 py-1.5 text-sm disabled:opacity-50'>« First</button>
          <button onClick={goPrev} disabled={page === 1} className='rounded-md border px-3 py-1.5 text-sm disabled:opacity-50'>‹ Prev</button>
          <button onClick={goNext} disabled={page === totalPages} className='rounded-md border px-3 py-1.5 text-sm disabled:opacity-50'>Next ›</button>
          <button onClick={goLast} disabled={page === totalPages} className='rounded-md border px-3 py-1.5 text-sm disabled:opacity-50'>Last »</button>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
// Main component: handles state for buyer/consignee, items, totals and service
// creation. It reuses much of the HT Power logic but adapts to our API and
// application structure.

export default function Service () {
  const navigate = useNavigate()
  const [createService, { isLoading: creating }] = useCreateServiceMutation()

  // Buyer / Consignee details (includes contact number/email for buyer)
  const [buyer, setBuyer] = useState({ name: '', gst: '', address: '', pin: '', state: '', contact: '' ,email: '' })
  const [consignee, setConsignee] = useState({ name: '', gst: '', address: '', pin: '', state: '' })

  // ---------------------------------------------------------------------------
  // Buyer auto‑complete state. When the buyer.name changes we debounce the
  // value and trigger the autocomplete query. Suggestions are shown in a
  // dropdown beneath the input. Selecting a suggestion populates all buyer
  // fields (name, gst, address, pin, state, contact). See bottom of buyer
  // section for the UI.
  const [buyerQuery, setBuyerQuery] = useState('')
  const [showBuyerSuggestions, setShowBuyerSuggestions] = useState(false)
  // Debounce: update buyerQuery after the user stops typing for 300ms
  useEffect(() => {
    const t = setTimeout(() => {
      const q = String(buyer.name || '').trim()
      if (q && q.length > 1) {
        setBuyerQuery(q)
      } else {
        setBuyerQuery('')
        setShowBuyerSuggestions(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [buyer.name])
  // Call the autocomplete endpoint only when buyerQuery is non‑empty
  const { data: buyerSuggestions = [] } = useAutocompleteServiceBuyersQuery(
    { q: buyerQuery, limit: 5 },
    { skip: !buyerQuery }
  )
  // Toggle suggestions visibility based on results
  useEffect(() => {
    if (buyerQuery && buyerSuggestions && buyerSuggestions.length > 0) {
      setShowBuyerSuggestions(true)
    } else {
      setShowBuyerSuggestions(false)
    }
  }, [buyerQuery, buyerSuggestions])
  const handleSelectBuyerSuggestion = (sugg) => {
    setBuyer({
      name: sugg.buyerName || '',
      gst: sugg.buyerGst || '',
      address: sugg.buyerAddress || '',
      pin: sugg.buyerPin || '',
      state: sugg.buyerState || '',
      contact: sugg.buyerContact || '',
      email: sugg.buyerEmail || ''
    })
    setShowBuyerSuggestions(false)
  }

  // Meta information about the invoice/service
  const [meta, setMeta] = useState({
    invoiceNo: '',
    invoiceDate: '',
    pinvNo: '',
    pinvDate: '',
    buyerOrderNo: '',
    orderDate: '',
    dcNo: '',
    wcNo: '',
    serviceType: '',
    terms: '',
    narration: ''
  })

  // List of item/service lines
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [transport, setTransport] = useState(0)

  // Fetch kits from backend for the catalogue. Each kit provides code, name and price.
  const { data: kitsData = [] } = useGetKitsQuery(undefined)
  const catalog = useMemo(() => {
    return (kitsData || []).map(k => ({
      ...k,
      code: k.code || k.id,
      name: k.name,
      hsnSac: k.hsnSac || '854690',
      basePrice: safeNum(k.price, 0)
    }))
  }, [kitsData])

  // Add a blank item line
  const addBlank = () => {
    setItems((prev) => [
      ...prev,
      {
        key: `${Date.now()}-${prev.length + 1}`,
        code: '',
        name: '',
        hsnSac: '',
        basePrice: 0,
        qty: 1,
        discount: ''
      }
    ])
  }

  // Add a default service line for installation
  const addInstallation = () => {
    setItems(prev => [
      ...prev,
      {
        key: `inst-${Date.now()}`,
        code: '',
        name: 'Installation Charges',
        hsnSac: '995461',
        basePrice: 0,
        qty: 1,
        discount: ''
      }
    ])
  }

  // Add a transport line
  const addTransportLine = () => {
    setItems(prev => [
      ...prev,
      {
        key: `trans-${Date.now()}`,
        code: '',
        name: 'Transportation Charges',
        hsnSac: '995461',
        basePrice: 0,
        qty: 1,
        discount: ''
      }
    ])
  }

  // Add from catalogue
  const addKit = (k) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((p) => p.code === k.code && (p.hsnSac || k.hsnSac))
      if (existingIdx >= 0) {
        const copy = [...prev]
        copy[existingIdx] = { ...copy[existingIdx], qty: safeNum(copy[existingIdx].qty, 0) + 1 }
        return copy
      }
      return [
        ...prev,
        {
          key: `${k.code}-${Date.now()}`,
          code: k.code,
          name: k.name,
          basePrice: safeNum(k.basePrice, 0),
          qty: 1,
          discount: '',
          hsnSac: k.hsnSac || '854690'
        }
      ]
    })
  }

  const updateItem = (idx, patch) =>
    setItems((prev) => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], ...patch }
      return copy
    })

  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx))

  const clearAllItems = () => {
    if (!items.length) return
    // eslint-disable-next-line no-alert
    if (window.confirm('Delete all item lines? This cannot be undone.')) {
      setItems([])
    }
  }

  // Determine tax rates based on buyer/consignee state; uses simple IGST/CGST/SGST rules.
  // Load the company profile so the state used for tax computation reflects the
  // actual tenant configuration rather than a hard-coded default. If the
  // company details fail to load fall back to Tamil Nadu.
  const { data: companyProfile } = useGetCompanyQuery()
  const counterpartyState = buyer.state || ''
  const companyState = companyProfile?.state || 'Tamil Nadu'
  // Normalise state names by removing whitespace and converting to lowercase. Treat Tamil Nadu
  // specially so that taxes are split into CGST/SGST even if the company's state differs.
  const normalBuyer = String(counterpartyState || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
  const normalCompany = String(companyState || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
  const sameState = normalBuyer === normalCompany || normalBuyer === 'tamilnadu'
  const cgstRate = sameState ? 9 : 0
  const sgstRate = sameState ? 9 : 0
  const igstRate = sameState ? 0 : 18

  // Check if there is already a transport line to avoid double counting
  const hasTransportLine = useMemo(
    () => items.some(it => /transport/i.test(it.name || '')),
    [items]
  )

  // Compute totals whenever items or transport changes
  const totals = useMemo(() => {
    const raw = items.reduce((acc, it) => acc + safeNum(it.basePrice, 0) * safeNum(it.qty, 0), 0)
    const afterDisc = items.reduce((acc, it) => {
      const disc = safeNum(it.discount, 0)
      const line = safeNum(it.basePrice, 0) * safeNum(it.qty, 0)
      return acc + line * (1 - disc / 100)
    }, 0)
    const discountSavings = Math.round(raw - afterDisc)
    const subtotal = Math.round(afterDisc)
    const t = hasTransportLine ? 0 : Math.round(safeNum(transport, 0))
    const base = subtotal + t
    const cgst = Math.round((base * cgstRate) / 100)
    const sgst = Math.round((base * sgstRate) / 100)
    const igst = Math.round((base * igstRate) / 100)
    const grand = base + cgst + sgst + igst
    return { raw, discountSavings, subtotal, transport: t, cgstRate, sgstRate, igstRate, cgst, sgst, igst, grand }
  }, [items, transport, cgstRate, sgstRate, igstRate, hasTransportLine])

  // Compose service payload for submission. This serialises items into a simple array.
  const buildPayload = () => {
    const cleanMeta = {
      ...meta,
      invoiceNo: normalizeDocNumber(meta.invoiceNo),
      pinvNo: normalizeDocNumber(meta.pinvNo),
    }
    return {
      buyer,
      consignee,
      meta: cleanMeta,
      items,
      totals,
    }
  }

  const handleCreateService = async () => {
    try {
      const payload = buildPayload()
      await createService(payload).unwrap()
      toast.success('Service created successfully')
    } catch (err) {
      toast.error(err?.data?.message || err?.error || 'Failed to create service')
    }
  }

  // Filtered rows by search string
  const filteredIdx = items
    .map((it, idx) => ({ it, idx }))
    .filter(({ it }) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return [it.code, it.name].some((v) => (v || '').toLowerCase().includes(q))
    })

  return (
    <div className='min-h-screen bg-slate-50 p-6 lg:p-10'>
      {/* Top actions: navigate to kits management or home */}
      <div className='mx-auto mb-6 flex max-w-7xl flex-wrap gap-3 px-0'>
        <button
          onClick={() => navigate('/office/kits')}
          className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800'
        >
          Kits
        </button>
      </div>
      <div className='mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-2'>
        <div className='space-y-6 lg:col-span-2'>
          {/* Buyer & Consignee */}
          <Section title='Buyer & Consignee'>
            <div className='grid grid-cols-1 gap-6'>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <Labeled label='Buyer (Bill To) Name'>
                  <div className='relative'>
                    <TextInput
                      value={buyer.name}
                      onChange={(e) => setBuyer((v) => ({ ...v, name: e.target.value }))}
                      onBlur={() => {
                        // Hide suggestions shortly after blur to allow click selection
                        setTimeout(() => setShowBuyerSuggestions(false), 150)
                      }}
                      onFocus={() => {
                        if (buyerSuggestions && buyerSuggestions.length > 0) setShowBuyerSuggestions(true)
                      }}
                    />
                    {showBuyerSuggestions && (
                      <ul className='absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg'>
                        {buyerSuggestions.map((sugg, idx) => (
                          <li
                            key={idx}
                            onMouseDown={() => handleSelectBuyerSuggestion(sugg)}
                            className='cursor-pointer px-3 py-2 hover:bg-slate-100'
                          >
                            <div className='font-medium text-slate-900'>{sugg.buyerName}</div>
                            <div className='text-xs text-slate-500'>
                              {sugg.buyerContact || '—'}{sugg.buyerGst ? ` • ${sugg.buyerGst}` : ''}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Labeled>
                <Labeled label='Buyer GSTIN'>
                  <TextInput value={buyer.gst} onChange={(e) => setBuyer((v) => ({ ...v, gst: e.target.value.toUpperCase() }))} />
                </Labeled>
                <Labeled label='Buyer Address'>
                  <TextInput value={buyer.address} onChange={(e) => setBuyer((v) => ({ ...v, address: e.target.value }))} />
                </Labeled>
                <Labeled label='Buyer PIN'>
                  <TextInput value={buyer.pin} onChange={(e) => setBuyer((v) => ({ ...v, pin: e.target.value }))} />
                </Labeled>
                <Labeled label='Buyer State'>
                  <Select value={buyer.state} onChange={(e) => setBuyer((v) => ({ ...v, state: e.target.value }))}>
                    <option value=''>Select state…</option>
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </Labeled>
                <Labeled label='Buyer Contact'>
                  <TextInput value={buyer.contact} onChange={(e) => setBuyer((v) => ({ ...v, contact: e.target.value }))} />
                </Labeled>
                <Labeled label='Buyer Email'>
                  <TextInput value={buyer.email} onChange={(e) => setBuyer((v) => ({ ...v, email: e.target.value }))} />
                </Labeled>
              </div>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <Labeled label='Consignee (Ship To) Name'>
                  <TextInput value={consignee.name} onChange={(e) => setConsignee((v) => ({ ...v, name: e.target.value }))} />
                </Labeled>
                <Labeled label='Consignee GSTIN (optional)'>
                  <TextInput value={consignee.gst} onChange={(e) => setConsignee((v) => ({ ...v, gst: e.target.value.toUpperCase() }))} />
                </Labeled>
                <Labeled label='Consignee Address'>
                  <TextInput value={consignee.address} onChange={(e) => setConsignee((v) => ({ ...v, address: e.target.value }))} />
                </Labeled>
                <Labeled label='Consignee PIN'>
                  <TextInput value={consignee.pin} onChange={(e) => setConsignee((v) => ({ ...v, pin: e.target.value }))} />
                </Labeled>
                <Labeled label='Consignee State'>
                  <Select value={consignee.state} onChange={(e) => setConsignee((v) => ({ ...v, state: e.target.value }))}>
                    <option value=''>Select state…</option>
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </Labeled>
              </div>
            </div>
          </Section>
          {/* Invoice Meta & Terms */}
          <Section title='Invoice Meta & Terms'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <Labeled label='Invoice No.'>
                <TextInput value={meta.invoiceNo} onChange={(e) => setMeta((m) => ({ ...m, invoiceNo: normalizeDocNumber(e.target.value) }))} />
              </Labeled>
              <Labeled label='Invoice Date'>
                <TextInput type='date' value={meta.invoiceDate} onChange={(e) => setMeta((m) => ({ ...m, invoiceDate: e.target.value }))} />
              </Labeled>
              <Labeled label='PINV No.'>
                <TextInput value={meta.pinvNo} onChange={(e) => setMeta((m) => ({ ...m, pinvNo: normalizeDocNumber(e.target.value) }))} placeholder='e.g. PINV-24-001' />
              </Labeled>
              <Labeled label='PINV Date'>
                <TextInput type='date' value={meta.pinvDate} onChange={(e) => setMeta((m) => ({ ...m, pinvDate: e.target.value }))} />
              </Labeled>
              <Labeled label='Buyer’s Order / PO / WO #'>
                <TextInput value={meta.buyerOrderNo} onChange={(e) => setMeta((m) => ({ ...m, buyerOrderNo: e.target.value }))} />
              </Labeled>
              <Labeled label='Order / PO / WO Date'>
                <TextInput type='date' value={meta.orderDate} onChange={(e) => setMeta((m) => ({ ...m, orderDate: e.target.value }))} />
              </Labeled>
              <Labeled label='Delivery Challan No.'>
                <TextInput value={meta.dcNo} onChange={(e) => setMeta((m) => ({ ...m, dcNo: e.target.value }))} />
              </Labeled>
              <Labeled label='Work Completion Certificate No.'>
                <TextInput value={meta.wcNo} onChange={(e) => setMeta((m) => ({ ...m, wcNo: e.target.value }))} />
              </Labeled>
              <Labeled label='Service Type'>
                <Select value={meta.serviceType} onChange={(e) => setMeta((m) => ({ ...m, serviceType: e.target.value }))}>
                  <option value=''>Select service…</option>
                  {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Labeled>
              <Labeled label='Terms & Conditions (one per line)' hint='These will appear as a numbered list in the preview/print.'>
                <textarea
                  value={meta.terms}
                  onChange={(e) => setMeta((m) => ({ ...m, terms: e.target.value }))}
                  rows={6}
                  className='w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition'
                />
              </Labeled>
              <Labeled label='Narration / Remarks'>
                <TextInput value={meta.narration} onChange={(e) => setMeta((m) => ({ ...m, narration: e.target.value }))} />
              </Labeled>
            </div>
          </Section>
          {/* Kits Catalogue */}
          <Section title='Kits Catalogue' right={<div className='hidden text-xs text-slate-500 sm:block'>Add items from your master list.</div>}>
            <KitCatalogue kits={catalog} onAdd={addKit} />
          </Section>
          {/* Items / Services */}
          <Section
            title='Items / Services'
            right={
              <div className='flex gap-2'>
                <button type='button' onClick={addBlank} className='rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700'>+ Line</button>
                <button type='button' onClick={addInstallation} className='rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700'>+ Installation</button>
                <button type='button' onClick={addTransportLine} className='rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700'>+ Transport</button>
                <button type='button' onClick={clearAllItems} className='rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700' title='Delete all lines'>
                  <span className='inline-flex items-center gap-1'><Trash2 size={14}/> Clear</span>
                </button>
              </div>
            }
          >
            <div className='mb-3 flex items-center gap-2'>
              <div className='relative flex-1'>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder='Quick find by code/name…'
                  className='h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                />
                <Search className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2' size={18}/>
              </div>
            </div>
            <div className='overflow-hidden rounded-xl border border-slate-200'>
              <table className='min-w-full divide-y divide-slate-200'>
                <thead className='bg-slate-50'>
                  <tr>
                    <th className='px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>Item / Description</th>
                    <th className='px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>HSN/SAC</th>
                    <th className='px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500'>Base</th>
                    <th className='px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500'>Qty</th>
                    <th className='px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500'>Disc %</th>
                    <th className='px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500'>Line</th>
                    <th className='px-3 py-2' />
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100 bg-white'>
                  {filteredIdx.length === 0 && (
                    <tr><td colSpan={7} className='px-3 py-6 text-center text-sm text-slate-500'>No lines yet. Click “Add line”.</td></tr>
                  )}
                  {filteredIdx.map(({ it, idx }) => {
                    const qty = safeNum(it.qty, 0)
                    const disc = safeNum(it.discount, 0)
                    const line = Math.round(safeNum(it.basePrice, 0) * qty * (1 - disc / 100))
                    return (
                      <tr key={it.key} className='hover:bg-slate-50'>
                        <td className='px-3 py-2'>
                          <input
                            value={it.name}
                            onChange={(e) => updateItem(idx, { name: e.target.value })}
                            placeholder='Service / Goods name'
                            className='h-11 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                          />
                          <input
                            value={it.code}
                            onChange={(e) => updateItem(idx, { code: e.target.value })}
                            placeholder='Code (optional)'
                            className='mt-2 h-10 w-40 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                          />
                        </td>
                        <td className='px-3 py-2'>
                          <TextInput
                            value={it.hsnSac}
                            onChange={(e) => updateItem(idx, { hsnSac: e.target.value })}
                            placeholder='995461 / 854690'
                            className='w-28'
                          />
                        </td>
                        <td className='px-3 py-2 text-right'>
                          <NumberInput
                            value={it.basePrice}
                            min={0}
                            step={100}
                            onChange={(v) => updateItem(idx, { basePrice: v === '' ? '' : v })}
                            onBlur={() => {
                              if (it.basePrice === '' || Number(it.basePrice) < 0) {
                                updateItem(idx, { basePrice: 0 })
                              }
                            }}
                            className='w-28'
                          />
                        </td>
                        <td className='px-3 py-2'>
                          <NumberInput
                            value={it.qty}
                            min={1}
                            onChange={(v) => updateItem(idx, { qty: v === '' ? '' : v })}
                            onBlur={() => { if (it.qty === '' || Number(it.qty) < 1) updateItem(idx, { qty: 1 }) }}
                          />
                        </td>
                        <td className='px-3 py-2'>
                          <NumberInput
                            value={it.discount}
                            min={0}
                            max={100}
                            step={1}
                            onChange={(v) => updateItem(idx, { discount: v === '' ? '' : Math.max(0, Math.min(100, v)) })}
                            placeholder='0'
                          />
                        </td>
                        <td className='px-3 py-2 text-right font-semibold'>{fmtINR(line)}</td>
                        <td className='px-3 py-2 text-right'>
                          <button
                            type='button'
                            onClick={() => removeItem(idx)}
                            className='rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600'
                            title='Remove line'
                          >
                            <Trash2 size={16}/>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* Footer totals row */}
            <div className='mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <Labeled
                label='Transportation charges (₹)'
                hint={hasTransportLine ? 'Disabled because a "Transportation Charges" line exists.' : undefined}
              >
                <NumberInput
                  value={hasTransportLine ? 0 : transport}
                  onChange={setTransport}
                  min={0}
                  step={100}
                  className='w-full'
                  disabled={hasTransportLine}
                />
              </Labeled>
              <div className='grid grid-cols-3 gap-3'>
                <Labeled label='CGST %'>
                  <NumberInput value={cgstRate} disabled className='bg-slate-100'/>
                </Labeled>
                <Labeled label='SGST %'>
                  <NumberInput value={sgstRate} disabled className='bg-slate-100'/>
                </Labeled>
                <Labeled label='IGST %'>
                  <NumberInput value={igstRate} disabled className='bg-slate-100'/>
                </Labeled>
              </div>
            </div>
            <div className='mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4'>
              <div className='text-sm text-slate-600'>
                <div>Subtotal: <span className='font-semibold text-slate-900'>{fmtINR(totals.subtotal)}</span></div>
                <div>Discount savings: <span className='font-semibold text-slate-900'>{fmtINR(totals.discountSavings)}</span></div>
                <div>Transport: <span className='font-semibold text-slate-900'>{fmtINR(totals.transport)}</span></div>
                {sameState ? (
                  <>
                    <div>CGST {cgstRate}%: <span className='font-semibold text-slate-900'>{fmtINR(totals.cgst)}</span></div>
                    <div>SGST {sgstRate}%: <span className='font-semibold text-slate-900'>{fmtINR(totals.sgst)}</span></div>
                  </>
                ) : (
                  <div>IGST {igstRate}%: <span className='font-semibold text-slate-900'>{fmtINR(totals.igst)}</span></div>
                )}
              </div>
              <div className='text-right text-lg font-bold text-slate-900 flex items-center gap-2'>
                <IndianRupee size={18}/> {fmtINR(totals.grand)}
              </div>
            </div>
            {/* Action buttons: preview/print or create service */}
            <div className='mt-3 flex flex-wrap justify-end gap-2'>
              <button
                onClick={() => {
                  // Navigate to the invoice preview without using localStorage. Pass the payload via state.
                  const payload = buildPayload()
                  // embed document type into meta so that the PDF generator knows the document kind
                  payload.meta = { ...(payload.meta || {}), docType: 'INVOICE' }
                  navigate('/office/preview', { state: { ...payload, docType: 'INVOICE' } })
                }}
                className='rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-black'
              >
                Export Invoice
              </button>
              <button
                onClick={() => {
                  // Navigate to the proforma preview without using localStorage. Pass the payload via state.
                  const payload = buildPayload()
                  // embed document type into meta so that the PDF generator knows the document kind
                  payload.meta = { ...(payload.meta || {}), docType: 'PROFORMA' }
                  navigate('/office/preview-proforma', { state: { ...payload, docType: 'PROFORMA' } })
                }}
                className='rounded-md bg-slate-700 px-4 py-2 text-white hover:bg-slate-800'
              >
                Export Proforma Invoice
              </button>
              <button
                onClick={handleCreateService}
                disabled={creating}
                className='rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50'
              >
                {creating ? 'Creating…' : 'Create Service'}
              </button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}