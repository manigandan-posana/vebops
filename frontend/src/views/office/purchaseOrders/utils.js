export const firstNonEmpty = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue
    if (typeof value === 'string' && value.trim() !== '') return value
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (Array.isArray(value) && value.length) return value
    if (typeof value === 'object') {
      if (value instanceof Date && !Number.isNaN(value.getTime())) return value
      if (Object.keys(value).length) return value
    }
  }
  return null
}

export const parseAmount = (value) => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'object') {
    if ('value' in value) return parseAmount(value.value)
    if ('amount' in value) return parseAmount(value.amount)
    if ('total' in value) return parseAmount(value.total)
    if ('grandTotal' in value) return parseAmount(value.grandTotal)
    return null
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '')
    if (!cleaned) return null
    const num = Number(cleaned)
    return Number.isFinite(num) ? num : null
  }
  return null
}

export const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100

export const coerceNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

export const isoDate = (value = new Date()) => {
  try {
    const d = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

export const makeInitialPoForm = (service = {}) => ({
  voucherNumber: '',
  date: isoDate(),
  buyer: {
    name: service?.buyerName || '',
    address: service?.buyerAddress || '',
    phone: service?.buyerContact || '',
    gstin: service?.buyerGst || '',
    stateName: service?.buyerState || '',
    stateCode: '',
    email: service?.buyerEmail || '',
    website: ''
  },
  supplier: {
    name: '',
    address: '',
    gstin: '',
    stateName: '',
    stateCode: '',
    email: '',
    whatsapp: ''
  },
  meta: {
    referenceNumberAndDate: '',
    paymentTerms: '',
    dispatchedThrough: '',
    destination: '',
    otherReferences: '',
    termsOfDelivery: ''
  },
  totals: {
    cgstRate: 0,
    sgstRate: 0
  },
  amountInWords: '',
  companyPan: ''
})

export const makeInitialPoItems = (items) => {
  if (!Array.isArray(items)) return []
  return items.map((it, index) => {
    const quantity = parseAmount(firstNonEmpty(it?.qty, it?.quantity, it?.qtyOrdered)) ?? 0
    const rate = parseAmount(firstNonEmpty(it?.rate, it?.basePrice, it?.unitPrice, it?.price)) ?? 0
    const amount = parseAmount(firstNonEmpty(it?.amount, it?.lineTotal, it?.total)) ?? round2(quantity * rate)
    return {
      key: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      description: firstNonEmpty(it?.description, it?.itemName, it?.name, it?.code) || '',
      quantity: Number.isFinite(quantity) ? quantity : 0,
      unit: firstNonEmpty(it?.unit, it?.uom, it?.unitType, 'NO') || 'NO',
      rate: Number.isFinite(rate) ? rate : 0,
      amount: Number.isFinite(amount) ? amount : 0
    }
  })
}

export const mapDetailToForm = (detail) => {
  if (!detail) return makeInitialPoForm({})
  return {
    voucherNumber: detail?.header?.voucherNumber || '',
    date: detail?.header?.date ? isoDate(detail.header.date) : isoDate(),
    buyer: {
      name: detail?.buyer?.name || '',
      address: detail?.buyer?.address || '',
      phone: detail?.buyer?.phone || '',
      gstin: detail?.buyer?.gstin || '',
      stateName: detail?.buyer?.stateName || '',
      stateCode: detail?.buyer?.stateCode || '',
      email: detail?.buyer?.email || '',
      website: detail?.buyer?.website || ''
    },
    supplier: {
      name: detail?.supplier?.name || detail?.header?.supplierName || '',
      address: detail?.supplier?.address || '',
      gstin: detail?.supplier?.gstin || '',
      stateName: detail?.supplier?.stateName || '',
      stateCode: detail?.supplier?.stateCode || '',
      email: detail?.supplier?.email || detail?.header?.supplierEmail || '',
      whatsapp: detail?.supplier?.whatsapp || detail?.header?.supplierWhatsapp || ''
    },
    meta: {
      referenceNumberAndDate: detail?.meta?.referenceNumberAndDate || '',
      paymentTerms: detail?.meta?.paymentTerms || '',
      dispatchedThrough: detail?.meta?.dispatchedThrough || '',
      destination: detail?.meta?.destination || '',
      otherReferences: detail?.meta?.otherReferences || '',
      termsOfDelivery: detail?.meta?.termsOfDelivery || ''
    },
    totals: {
      cgstRate: detail?.totals?.cgstRate ?? 0,
      sgstRate: detail?.totals?.sgstRate ?? 0
    },
    amountInWords: detail?.amountInWords || '',
    companyPan: detail?.companyPan || ''
  }
}

export const mapDetailToItems = (detail) => {
  if (!detail?.items) return []
  return detail.items.map((item, index) => ({
    key: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    description: item?.description || '',
    quantity: Number.isFinite(item?.quantity) ? item.quantity : 0,
    unit: item?.unit || 'NO',
    rate: Number.isFinite(item?.rate) ? item.rate : 0,
    amount: Number.isFinite(item?.amount) ? item.amount : 0
  }))
}

export const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(Number.isFinite(+n) ? +n : 0)
