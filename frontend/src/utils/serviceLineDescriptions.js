const KNOWN_ITEM_KINDS = ['SUPPLY', 'INSTALLATION', 'TRANSPORT', 'CUSTOM']

export const ITEM_KINDS = {
  SUPPLY: 'SUPPLY',
  INSTALLATION: 'INSTALLATION',
  TRANSPORT: 'TRANSPORT',
  CUSTOM: 'CUSTOM'
}

const trim = (value) => {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\s+/g, ' ').trim()
}

const cleanItemLabel = (raw) => {
  const label = trim(raw)
  if (!label) return ''
  return label.replace(/^installation\s*[-–]\s*/i, '').trim()
}

const inferItemKind = (item) => {
  const explicit = trim(item?.kind || item?.type || item?.lineKind).toUpperCase()
  if (KNOWN_ITEM_KINDS.includes(explicit)) return explicit
  const name = trim(item?.name || item?.itemName)
  if (!name) return ITEM_KINDS.SUPPLY
  const lower = name.toLowerCase()
  if (/transport|freight|logistic|delivery/.test(lower)) return ITEM_KINDS.TRANSPORT
  if (/installation|erection|commissioning/.test(lower)) return ITEM_KINDS.INSTALLATION
  return ITEM_KINDS.SUPPLY
}

export const computeChargesDescription = (serviceType, label, kind = ITEM_KINDS.SUPPLY) => {
  const name = cleanItemLabel(label)
  if (!name) return ''
  if (kind === ITEM_KINDS.TRANSPORT) return 'Transportation charges'
  if (kind === ITEM_KINDS.INSTALLATION) return `Installation charges for ${name}`
  const st = trim(serviceType).toLowerCase()
  if (st.includes('installation only')) return `Installation charges for ${name}`
  if (st.includes('supply with installation')) {
    if (/installation/i.test(name)) return `Installation charges for ${name}`
    return `Supply charges for ${name}`
  }
  if (st.includes('supply')) return `Supply charges for ${name}`
  return name
}

const splitDescriptionSegments = (value) => {
  const text = trim(value)
  if (!text) return []
  return text
    .split(/\r?\n|[;|]|,(?!\s*\d)/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

export const buildServiceLineDescriptions = (serviceType, item = {}) => {
  const lines = []
  const seen = new Set()
  const push = (line) => {
    const cleaned = trim(line)
    if (!cleaned) return
    const key = cleaned.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    lines.push(cleaned)
  }

  const label = trim(item?.name || item?.itemName)
  const kind = inferItemKind(item)
  const auto = computeChargesDescription(serviceType, label, kind)
  push(auto)

  const candidates = [item?.description, item?.details, item?.itemDescription, item?.notes]
  candidates.forEach((candidate) => {
    splitDescriptionSegments(candidate).forEach(push)
  })

  return lines
}
