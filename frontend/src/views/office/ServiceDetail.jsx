// src/views/office/ServiceDetail.jsx
//
// Detailed view for a single service record. This page fetches the
// service using its ID, then parses the JSON fields (metaJson,
// itemsJson, totalsJson) to present a read‑only summary. Buyers and
// consignees are displayed, followed by invoice meta details and a
// table of individual line items with totals. The component offers a
// back link to return to the history list.

import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom'
import { IndianRupee, Send, Share2, FileDown } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  Link,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import Tooltip from '@mui/material/Tooltip'
import { alpha } from '@mui/material/styles'
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { displayDocNumber } from '../../utils/docNumbers'
import { buildServiceLineDescriptions } from '../../utils/serviceLineDescriptions'
// Import the getService hook rather than the paginated getServices hook. This
// endpoint fetches a single service by ID and returns the raw Service
// object (with metaJson/itemsJson/totalsJson strings). See officeApi.js.
import {
  useGetServiceQuery,
  useDownloadServiceInvoiceMutation,
  useSendServiceInvoiceMutation,
  useShareServiceProposalMutation,
  useLazyGetWoProgressAttachmentQuery,
  useCreatePurchaseOrderMutation,
  useListPurchaseOrdersQuery,
  useGetPurchaseOrderQuery,
  useDownloadPurchaseOrderPdfMutation,
  useSendPurchaseOrderMutation,
  usePurchaseOrderSuggestionsQuery
} from '../../features/office/officeApi'
import { downloadBlob } from '../../utils/file'
import { skipToken } from '@reduxjs/toolkit/query'
import {
  firstNonEmpty,
  parseAmount,
  round2,
  coerceNumber,
  isoDate,
  makeInitialPoForm,
  makeInitialPoItems,
  mapDetailToForm,
  mapDetailToItems,
  fmtINR
} from './purchaseOrders/utils'

const parseJson = (value, fallback) => {
  if (!value) return fallback
  if (Array.isArray(value) || typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch (err) {
    return fallback
  }
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

const formatDate = (value) => {
  if (!value) return '—'
  try {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

const InfoRow = ({ label, value }) => {
  const isElement = React.isValidElement(value)
  const textValue = isElement
    ? null
    : (() => {
        if (value === null || value === undefined) return '—'
        if (typeof value === 'string') return value.trim() || '—'
        const str = String(value)
        return str.trim() ? str : '—'
      })()

  return (
    <Stack spacing={0.5} alignItems='flex-start'>
      <Typography variant='caption' color='text.secondary' sx={{ letterSpacing: 0.6 }}>
        {label}
      </Typography>
      {isElement ? (
        value
      ) : (
        <Typography variant='body2' color='text.primary'>
          {textValue}
        </Typography>
      )}
    </Stack>
  )
}

export default function ServiceDetail () {
  const { id } = useParams()
  const navigate = useNavigate()
  // Fetch a single service using the getService endpoint. The
  // paginated getServices endpoint expects query parameters and will not
  // return a single record when provided an ID. Using getService
  // ensures we fetch the correct Service entity.
  const { data, isFetching, error } = useGetServiceQuery(id)
  const service = data?.service ?? data ?? {}
  const workOrder = data?.workOrder ?? null
  const customerPo = workOrder?.customerPO ?? null
  const serviceRequest = data?.serviceRequest ?? null
  const progress = Array.isArray(data?.progress) ? data.progress : []
  const assignments = Array.isArray(data?.assignments) ? data.assignments : []
  const progressSummary = data?.progressSummary || {}
  const [downloadInvoice] = useDownloadServiceInvoiceMutation()
  const [sendServiceInvoice, sendState] = useSendServiceInvoiceMutation()
  const [shareServiceProposal] = useShareServiceProposalMutation()
  const [downloadProgressAttachment, { isFetching: isServiceAttachmentDownloading }] = useLazyGetWoProgressAttachmentQuery()
  const [modal, setModal] = useState({ open: false, serviceId: null, method: 'email', contact: '', docType: 'INVOICE' })
  const [sharingDocType, setSharingDocType] = useState(null)
  const poQueryArgs = service?.id ? { serviceId: service.id, size: 25, sort: 'createdAt,desc' } : skipToken
  const { data: poPage, isFetching: isPoLoading, refetch: refetchPurchaseOrders } = useListPurchaseOrdersQuery(poQueryArgs)
  const purchaseOrders = poPage?.content ?? []
  const [createPurchaseOrder, createPoState] = useCreatePurchaseOrderMutation()
  const [downloadPurchaseOrderPdf] = useDownloadPurchaseOrderPdfMutation()
  const [sendPurchaseOrder, sendPoState] = useSendPurchaseOrderMutation()
  const [poModal, setPoModal] = useState({ open: false })
  const [poForm, setPoForm] = useState(makeInitialPoForm(service))
  const [poItems, setPoItems] = useState([])
  const [poSuggestionQuery, setPoSuggestionQuery] = useState('')
  const { data: poSuggestions = [] } = usePurchaseOrderSuggestionsQuery({ q: poSuggestionQuery, limit: 8 }, { skip: !poModal.open })
  const [poSendModal, setPoSendModal] = useState({ open: false, id: null, method: 'email', contact: '' })
  const [poDetailOpen, setPoDetailOpen] = useState(false)
  const [selectedPoId, setSelectedPoId] = useState(null)
  const { data: selectedPoDetail } = useGetPurchaseOrderQuery(selectedPoId, { skip: !selectedPoId })

  useEffect(() => {
    if (!poModal.open) {
      setPoForm(makeInitialPoForm(service))
      const rawItems = parseJson(service?.itemsJson, [])
      setPoItems(makeInitialPoItems(rawItems))
    }
  }, [service?.id, poModal.open])

  const poSummary = useMemo(() => {
    const subTotal = round2(poItems.reduce((sum, item) => sum + coerceNumber(item.amount), 0))
    const cgstRate = coerceNumber(poForm.totals?.cgstRate)
    const sgstRate = coerceNumber(poForm.totals?.sgstRate)
    const cgstAmount = round2(subTotal * (cgstRate / 100))
    const sgstAmount = round2(subTotal * (sgstRate / 100))
    const grandTotal = round2(subTotal + cgstAmount + sgstAmount)
    return { subTotal, cgstRate, sgstRate, cgstAmount, sgstAmount, grandTotal }
  }, [poItems, poForm.totals?.cgstRate, poForm.totals?.sgstRate])

  const statusChip = useMemo(() => {
    if (!workOrder?.status) return null
    const label = String(workOrder.status).replace(/_/g, ' ').toLowerCase()
    const text = label.replace(/(^|\s)\w/g, (m) => m.toUpperCase())
    let color = 'default'
    const upper = String(workOrder.status).toUpperCase()
    if (upper === 'COMPLETED') color = 'success'
    else if (upper === 'IN_PROGRESS') color = 'primary'
    else if (upper === 'ASSIGNED') color = 'info'
    else if (upper === 'ON_HOLD') color = 'error'
    return <Chip label={text} size='small' color={color} variant={color === 'default' ? 'outlined' : 'filled'} />
  }, [workOrder?.status])

  const openPurchaseOrderModal = useCallback(() => {
    setPoModal({ open: true })
    setPoSuggestionQuery('')
  }, [])

  const closePurchaseOrderModal = useCallback(() => {
    setPoModal({ open: false })
    setPoSuggestionQuery('')
  }, [])

  const handlePoTemplateSelect = useCallback((_event, value) => {
    if (!value) return
    setPoForm(mapDetailToForm(value))
    setPoItems(mapDetailToItems(value))
  }, [])

  const handlePoFormChange = useCallback((path, value) => {
    setPoForm((prev) => {
      const next = { ...prev }
      if (path.startsWith('buyer.')) {
        const key = path.replace('buyer.', '')
        next.buyer = { ...next.buyer, [key]: value }
      } else if (path.startsWith('supplier.')) {
        const key = path.replace('supplier.', '')
        next.supplier = { ...next.supplier, [key]: value }
      } else if (path.startsWith('meta.')) {
        const key = path.replace('meta.', '')
        next.meta = { ...next.meta, [key]: value }
      } else if (path.startsWith('totals.')) {
        const key = path.replace('totals.', '')
        next.totals = { ...next.totals, [key]: value }
      } else {
        next[path] = value
      }
      return next
    })
  }, [])

  const handlePoItemChange = useCallback((index, field, rawValue) => {
    setPoItems((prev) => {
      const next = prev.map((item, idx) => {
        if (idx !== index) return item
        const updated = { ...item }
        if (field === 'description' || field === 'unit') {
          updated[field] = rawValue
        } else {
          const numeric = coerceNumber(rawValue)
          updated[field] = numeric
        }
        if (field === 'quantity' || field === 'rate') {
          const qty = field === 'quantity' ? coerceNumber(rawValue) : coerceNumber(updated.quantity)
          const rate = field === 'rate' ? coerceNumber(rawValue) : coerceNumber(updated.rate)
          updated.amount = round2(qty * rate)
        }
        if (field === 'amount') {
          updated.amount = round2(coerceNumber(rawValue))
        }
        return updated
      })
      return next
    })
  }, [])

  const handlePoAddItem = useCallback(() => {
    setPoItems((prev) => [
      ...prev,
      {
        key: `${Date.now()}-${prev.length + 1}`,
        description: '',
        quantity: 0,
        unit: 'NO',
        rate: 0,
        amount: 0
      }
    ])
  }, [])

  const handlePoRemoveItem = useCallback((index) => {
    setPoItems((prev) => prev.filter((_, idx) => idx !== index))
  }, [])

  const handlePoSubmit = useCallback(async () => {
    if (!service?.id) {
      toast.error('Service not ready yet')
      return
    }
    if (!poItems.length) {
      toast.error('Add at least one line item')
      return
    }
    const preparedItems = poItems
      .map((item, idx) => ({
        index: idx,
        description: (item.description || '').trim(),
        quantity: round2(coerceNumber(item.quantity)),
        unit: (item.unit || '').trim() || 'NO',
        rate: round2(coerceNumber(item.rate)),
        amount: round2(coerceNumber(item.amount))
      }))
      .filter((item) => item.description)

    if (!preparedItems.length) {
      toast.error('Add a description for each item')
      return
    }

    const payload = {
      serviceId: service.id,
      voucherNumber: poForm.voucherNumber || undefined,
      date: poForm.date || isoDate(),
      buyer: {
        name: poForm.buyer?.name || '',
        address: poForm.buyer?.address || '',
        phone: poForm.buyer?.phone || '',
        gstin: poForm.buyer?.gstin || '',
        stateName: poForm.buyer?.stateName || '',
        stateCode: poForm.buyer?.stateCode || '',
        email: poForm.buyer?.email || '',
        website: poForm.buyer?.website || ''
      },
      supplier: {
        name: poForm.supplier?.name || '',
        address: poForm.supplier?.address || '',
        gstin: poForm.supplier?.gstin || '',
        stateName: poForm.supplier?.stateName || '',
        stateCode: poForm.supplier?.stateCode || '',
        email: poForm.supplier?.email || '',
        whatsapp: poForm.supplier?.whatsapp || ''
      },
      meta: {
        referenceNumberAndDate: poForm.meta?.referenceNumberAndDate || '',
        paymentTerms: poForm.meta?.paymentTerms || '',
        dispatchedThrough: poForm.meta?.dispatchedThrough || '',
        destination: poForm.meta?.destination || '',
        otherReferences: poForm.meta?.otherReferences || '',
        termsOfDelivery: poForm.meta?.termsOfDelivery || ''
      },
      items: preparedItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        amount: item.amount
      })),
      totals: {
        subTotal: poSummary.subTotal,
        cgstRate: poSummary.cgstRate,
        cgstAmount: poSummary.cgstAmount,
        sgstRate: poSummary.sgstRate,
        sgstAmount: poSummary.sgstAmount,
        grandTotal: poSummary.grandTotal
      },
      amountInWords: poForm.amountInWords || '',
      companyPan: poForm.companyPan || ''
    }

    try {
      const res = await createPurchaseOrder(payload).unwrap()
      toast.success('Purchase order created')
      closePurchaseOrderModal()
      refetchPurchaseOrders()
      const newId = res?.header?.id
      if (newId) {
        setSelectedPoId(newId)
        setPoDetailOpen(true)
      }
    } catch (err) {
      const message = err?.data?.message || err?.error || 'Failed to create purchase order'
      toast.error(String(message))
    }
  }, [service?.id, poItems, poForm, poSummary, createPurchaseOrder, closePurchaseOrderModal, refetchPurchaseOrders])

  const handlePoView = useCallback((id) => {
    setSelectedPoId(id)
    setPoDetailOpen(true)
  }, [])

  const handlePoDownload = useCallback(async (id) => {
    try {
      await downloadPurchaseOrderPdf(id).unwrap()
    } catch (err) {
      const message = err?.data?.message || err?.error || 'Unable to download purchase order'
      toast.error(String(message))
    }
  }, [downloadPurchaseOrderPdf])

  const handlePoSendOpen = useCallback((row) => {
    const method = row?.supplierEmail ? 'email' : 'whatsapp'
    const contact = method === 'email' ? (row?.supplierEmail || '') : (row?.supplierWhatsapp || '')
    setPoSendModal({ open: true, id: row?.id || null, method, contact })
  }, [])

  const closePoSendModal = useCallback(() => {
    setPoSendModal({ open: false, id: null, method: 'email', contact: '' })
  }, [])

  const handlePoSendSubmit = useCallback(async () => {
    if (!poSendModal.id) {
      toast.error('Select a purchase order first')
      return
    }
    const contact = poSendModal.contact?.trim()
    if (!contact) {
      toast.error('Provide an email or WhatsApp number')
      return
    }
    const payload = {
      id: poSendModal.id,
      toEmail: poSendModal.method === 'email' ? contact : undefined,
      toWhatsapp: poSendModal.method === 'whatsapp' ? contact : undefined
    }
    try {
      await sendPurchaseOrder(payload).unwrap()
      toast.success('Purchase order sent')
      closePoSendModal()
    } catch (err) {
      const message = err?.data?.message || err?.error || 'Failed to send purchase order'
      toast.error(String(message))
    }
  }, [poSendModal, sendPurchaseOrder, closePoSendModal])

  const closePoDetail = useCallback(() => {
    setPoDetailOpen(false)
    setSelectedPoId(null)
  }, [])

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

  const woId = workOrder?.id

  const handleDownloadProgressAttachment = async (progressId, attachment) => {
    if (!woId || !progressId || !attachment?.id) return
    try {
      const blob = await downloadProgressAttachment({ woId, progressId, attachmentId: attachment.id }).unwrap()
      const filename = attachment.filename || `progress-photo-${attachment.id}`
      downloadBlob(blob, filename)
    } catch (err) {
      toast.error(String(err?.data?.message || err?.error || 'Unable to download attachment'))
    }
  }

  const summaryTotalUpdates = progressSummary?.totalUpdates ?? progress.length
  const summaryPhotoCount = progressSummary?.photoCount ?? progress.reduce((sum, entry) => sum + (Array.isArray(entry.attachments) ? entry.attachments.length : 0), 0)
  const summaryLastUpdated = progressSummary?.lastUpdatedAt ? formatDateTime(progressSummary.lastUpdatedAt) : (progress.length ? formatDateTime(progress[progress.length - 1]?.createdAt) : '—')
  const summaryLastStatus = progressSummary?.lastStatus || (progress.length ? progress[progress.length - 1]?.status : null)

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
      <Box sx={{ minHeight: '100vh', bgcolor: (theme) => theme.palette.grey[100], py: { xs: 4, md: 8 } }}>
        <Container maxWidth='lg'>
          <Stack alignItems='center' spacing={2} sx={{ py: 12 }}>
            <CircularProgress color='primary' />
            <Typography variant='body2' color='text.secondary'>
              Loading service details…
            </Typography>
          </Stack>
        </Container>
      </Box>
    )
  }

  if (error || !service) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: (theme) => theme.palette.grey[100], py: { xs: 4, md: 8 } }}>
        <Container maxWidth='md'>
          <Card>
            <CardContent>
              <Stack spacing={3} alignItems='flex-start'>
                <Alert severity='error' sx={{ width: '100%' }}>
                  Unable to load this service right now.
                </Alert>
                <Button variant='contained' onClick={() => navigate(-1)}>
                  Go back
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Container>
      </Box>
    )
  }

  const meta = parseJson(service?.metaJson, {})
  const parsedItems = parseJson(service?.itemsJson, [])
  const items = Array.isArray(parsedItems) ? parsedItems : []
  const totals = parseJson(service?.totalsJson, {})

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

  const subtotalAmount = parseAmount(subtotalValue)
  const discountAmount = parseAmount(discountValue)
  const transportAmount = parseAmount(transportValue)
  const cgstRate = parseAmount(cgstRateValue)
  const sgstRate = parseAmount(sgstRateValue)
  const igstRate = parseAmount(igstRateValue)
  let cgstAmount = parseAmount(cgstAmountValue)
  let sgstAmount = parseAmount(sgstAmountValue)
  let igstAmount = parseAmount(igstAmountValue)
  let grandTotalAmount = parseAmount(grandTotalValue)

  const normalisedItems = items.map((it) => {
    const qty = parseAmount(firstNonEmpty(it.qty, it.quantity, it.qtyOrdered))
    const base = parseAmount(firstNonEmpty(it.basePrice, it.unitPrice, it.price, it.rate))
    const preDiscount = (base ?? 0) * (qty ?? 0)
    const discountPercent = parseAmount(firstNonEmpty(it.discount, it.discountPercent))
    let discountComponent = discountPercent !== null ? preDiscount * (discountPercent / 100) : null
    const explicitLine = parseAmount(firstNonEmpty(it.lineTotal, it.total, it.amount))
    let lineTotal = explicitLine
    if (lineTotal === null) {
      const tentative = preDiscount - (discountComponent ?? 0)
      lineTotal = Number.isFinite(tentative) ? tentative : null
    }
    if (discountComponent === null && lineTotal !== null) {
      const diff = preDiscount - lineTotal
      if (Number.isFinite(diff) && diff > 0) discountComponent = diff
    }

    const taxRate = parseAmount(firstNonEmpty(it.taxRate, it.tax_percent, it.gstRate, it.igstRate))
    const explicitTax = parseAmount(firstNonEmpty(it.taxAmount, it.tax, it.gstAmount, it.igstAmount))
    let taxAmount = explicitTax
    if (taxAmount === null && taxRate !== null && lineTotal !== null) {
      const computed = lineTotal * (taxRate / 100)
      taxAmount = Number.isFinite(computed) ? computed : null
    }

    const descriptionLines = buildServiceLineDescriptions(meta.serviceType, it)
    const itemName = firstNonEmpty(it.name, it.itemName) || '—'
    const itemCode = firstNonEmpty(it.code, it.itemCode)
    const hsn = firstNonEmpty(it.hsnSac, it.hsn, it.sac)

    return {
      original: it,
      qty,
      base,
      discountPercent,
      preDiscount,
      discountComponent,
      lineTotal,
      taxAmount,
      descriptionLines,
      itemName,
      itemCode,
      hsn
    }
  })

  const fallbackPreDiscount = normalisedItems.reduce((sum, row) => sum + (row.preDiscount ?? row.lineTotal ?? 0), 0)
  const fallbackDiscount = normalisedItems.reduce((sum, row) => sum + (row.discountComponent ?? Math.max(0, (row.preDiscount ?? 0) - (row.lineTotal ?? 0))), 0)
  const fallbackTax = normalisedItems.reduce((sum, row) => sum + (row.taxAmount ?? 0), 0)

  const effectiveSubtotal = subtotalAmount ?? fallbackPreDiscount
  const effectiveDiscount = discountAmount ?? fallbackDiscount
  const effectiveTransport = transportAmount ?? 0

  if ((cgstAmount ?? 0) === 0 && (sgstAmount ?? 0) === 0 && (igstAmount ?? null) === null && fallbackTax > 0) {
    igstAmount = fallbackTax
  }

  const hasSplitTax = (cgstAmount ?? 0) > 0 || (sgstAmount ?? 0) > 0 || (cgstRate ?? null) !== null || (sgstRate ?? null) !== null
  if (!hasSplitTax && (igstAmount ?? 0) === 0 && fallbackTax > 0) {
    igstAmount = fallbackTax
  }

  const totalTax = (cgstAmount ?? 0) + (sgstAmount ?? 0) + (igstAmount ?? 0)

  const progressStatusColor = (status) => {
    const upper = String(status || '').toUpperCase()
    switch (upper) {
      case 'COMPLETED':
        return 'success'
      case 'INSTALLATION_STARTED':
        return 'info'
      case 'MATERIAL_RECEIVED':
        return 'warning'
      case 'STARTED':
        return 'primary'
      case 'ON_HOLD':
        return 'error'
      default:
        return 'default'
    }
  }

  const formatDateTime = (value) => {
    if (!value) return '—'
    try {
      return new Date(value).toLocaleString('en-IN')
    } catch (err) {
      return String(value)
    }
  }
  if (grandTotalAmount === null) {
    grandTotalAmount = effectiveSubtotal - effectiveDiscount + effectiveTransport + totalTax
  }

  const proposalId = meta?.proposalId || meta?.proposalID || null
  const proposalStatus = meta?.proposalStatus || null
  const proposalLink = proposalId
    ? (
        <Stack direction='row' spacing={1} alignItems='center'>
          <Link component={RouterLink} to={`/office/proposal-history?focus=${proposalId}`} underline='hover'>
            P-{proposalId}
          </Link>
          {proposalStatus && (
            <Chip size='small' label={String(proposalStatus)} color='secondary' variant='outlined' sx={{ textTransform: 'uppercase' }} />
          )}
        </Stack>
      )
    : null

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: (theme) => theme.palette.grey[100], py: { xs: 4, md: 8 } }}>
      <Container maxWidth='lg'>
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent='space-between' spacing={2}>
            <Stack spacing={0.5}>
              <Typography variant='h4' fontWeight={700} color='text.primary'>
                Service Detail
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Review buyer, consignee and invoice level information for this service.
              </Typography>
            </Stack>
            <Button component={RouterLink} to='/office/service-history' variant='outlined'>
              Back to history
            </Button>
          </Stack>

          <Card>
            <CardHeader
              title='Quick Actions'
              subheader='Download or share invoice and proforma documents'
            />
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} useFlexGap flexWrap='wrap'>
                <Button
                  variant='contained'
                  color='success'
                  startIcon={<FileDown size={18} />}
                  onClick={() => handleDownload('INVOICE')}
                  disabled={!service?.id}
                >
                  Invoice PDF
                </Button>
                <Button
                  variant='contained'
                  color='success'
                  startIcon={<FileDown size={18} />}
                  onClick={() => handleDownload('PROFORMA')}
                  disabled={!service?.id}
                  sx={{ bgcolor: 'success.dark' }}
                >
                  Proforma PDF
                </Button>
                <Divider flexItem orientation='vertical' sx={{ display: { xs: 'none', sm: 'block' }, mx: 1 }} />
                <Button
                  variant='contained'
                  color='primary'
                  startIcon={<Send size={18} />}
                  onClick={() => openSendModal('INVOICE')}
                  disabled={!service?.id}
                >
                  Send invoice
                </Button>
                <Button
                  variant='contained'
                  color='primary'
                  startIcon={<Send size={18} />}
                  onClick={() => openSendModal('PROFORMA')}
                  disabled={!service?.id}
                  sx={{ bgcolor: 'primary.dark' }}
                >
                  Send proforma
                </Button>
                <Divider flexItem orientation='vertical' sx={{ display: { xs: 'none', sm: 'block' }, mx: 1 }} />
                <Button
                  variant='contained'
                  color='secondary'
                  startIcon={<Share2 size={18} />}
                  onClick={() => handleShare('PROFORMA')}
                  disabled={!service?.id || sharingDocType === 'PROFORMA'}
                >
                  {sharingDocType === 'PROFORMA' ? 'Sharing…' : 'Share proforma to portal'}
                </Button>
                <Button
                  variant='contained'
                  color='secondary'
                  startIcon={<Share2 size={18} />}
                  onClick={() => handleShare('INVOICE')}
                  disabled={!service?.id || sharingDocType === 'INVOICE'}
                  sx={{ bgcolor: 'secondary.dark' }}
                >
                  {sharingDocType === 'INVOICE' ? 'Sharing…' : 'Share invoice to portal'}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title='Buyer (Bill To)' subheader={service.buyerName || 'Buyer information'} />
                <CardContent>
                  <Stack spacing={2}>
                    <InfoRow label='GSTIN' value={service.buyerGst} />
                    <InfoRow label='Contact' value={service.buyerContact} />
                    <InfoRow label='Address' value={service.buyerAddress} />
                    <InfoRow label='PIN' value={service.buyerPin} />
                    <InfoRow label='State' value={service.buyerState} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title='Consignee (Ship To)' subheader={service.consigneeName || 'Consignee information'} />
                <CardContent>
                  <Stack spacing={2}>
                    <InfoRow label='GSTIN' value={service.consigneeGst} />
                    <InfoRow label='Contact' value={service.consigneeContact} />
                    <InfoRow label='Address' value={service.consigneeAddress} />
                    <InfoRow label='PIN' value={service.consigneePin} />
                    <InfoRow label='State' value={service.consigneeState} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {(workOrder || serviceRequest) && (
            <Card>
              <CardHeader
                avatar={<EventNoteRoundedIcon color='primary' />}
                title='Work order context'
                subheader='Operational details shared with field engineers'
              />
              <CardContent>
                <Grid container spacing={3}>
                  {workOrder && (
                    <>
                      <Grid item xs={12} sm={6} md={3}>
                        <InfoRow label='Work Order' value={workOrder?.wan || workOrder?.id || '—'} />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <InfoRow label='Status' value={statusChip || workOrder?.status || '—'} />
                      </Grid>
                      {workOrder?.assignedFE && (
                        <Grid item xs={12} sm={6} md={3}>
                          <InfoRow label='Field Engineer' value={`${workOrder.assignedFE.name || '—'}${workOrder.assignedFE.id ? ` (ID ${workOrder.assignedFE.id})` : ''}`} />
                        </Grid>
                      )}
                      {customerPo && (
                        <Grid item xs={12} sm={6} md={3}>
                          <InfoRow
                            label='Customer PO'
                            value={(
                              <Stack spacing={1} alignItems='flex-start'>
                                <Typography variant='body2' color='text.primary'>
                                  {customerPo.poNumber || '—'}
                                </Typography>
                                {customerPo.fileUrl && (
                                  <Button
                                    size='small'
                                    variant='outlined'
                                    component='a'
                                    href={customerPo.fileUrl}
                                    target='_blank'
                                    rel='noreferrer'
                                  >
                                    View PO
                                  </Button>
                                )}
                              </Stack>
                            )}
                          />
                        </Grid>
                      )}
                    </>
                  )}
                  {serviceRequest && (
                    <>
                      <Grid item xs={12} sm={6} md={3}>
                        <InfoRow label='Service Request' value={serviceRequest.srn || serviceRequest.id || '—'} />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <InfoRow label='Service Type' value={formatServiceType(serviceRequest.serviceType)} />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <InfoRow label='Site Address' value={serviceRequest.siteAddress} />
                      </Grid>
                      {serviceRequest.customer && (
                        <Grid item xs={12} md={6}>
                          <InfoRow
                            label='Customer'
                            value={
                              <Stack spacing={0.5}>
                                <Typography variant='body2' color='text.primary'>
                                  {serviceRequest.customer.name || '—'}
                                </Typography>
                                <Typography variant='caption' color='text.secondary'>
                                  {serviceRequest.customer.email || '—'}
                                </Typography>
                                <Typography variant='caption' color='text.secondary'>
                                  {serviceRequest.customer.mobile || '—'}
                                </Typography>
                              </Stack>
                            }
                          />
                        </Grid>
                      )}
                    </>
                  )}
                  {assignments.length > 0 && assignments[0]?.note && (
                    <Grid item xs={12}>
                      <InfoRow label='Latest assignment note' value={assignments[0].note} />
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader title='Invoice & Service Information' subheader='Key references and metadata for this service' />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoRow label='Invoice No.' value={invoiceNumber} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoRow label='Invoice Date' value={invoiceDate} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoRow label='Proforma No.' value={proformaNumber} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoRow label='Proforma Date' value={proformaDate} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoRow label='Linked Proposal' value={proposalLink} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoRow label='Buyer Order No.' value={meta.buyerOrderNo} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoRow label='Order Date' value={meta.orderDate} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoRow label='Delivery Challan No.' value={meta.dcNo} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoRow label='Work Completion Certificate No.' value={meta.wcNo} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoRow label='Service Type' value={serviceType} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InfoRow
                    label='Created At'
                    value={service.createdAt ? new Date(service.createdAt).toLocaleString() : null}
                  />
                </Grid>
              </Grid>

              {(meta.terms || meta.narration) && (
                <Stack spacing={3} sx={{ mt: 4 }}>
                  {meta.terms && (
                    <Stack spacing={1}>
                      <Typography variant='subtitle2' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
                        Terms & Conditions
                      </Typography>
                      <Stack component='ul' spacing={1} sx={{ pl: 2, m: 0 }}>
                        {(Array.isArray(meta.terms) ? meta.terms : String(meta.terms).split(/\r?\n/))
                          .map((line) => String(line || '').trim())
                          .filter(Boolean)
                          .map((line, index) => (
                            <Typography component='li' key={index} variant='body2' color='text.primary'>
                              {line}
                            </Typography>
                          ))}
                      </Stack>
                    </Stack>
                  )}
                  {meta.narration && (
                    <Stack spacing={1}>
                      <Typography variant='subtitle2' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
                        Narration / Remarks
                      </Typography>
                      <Typography variant='body2' color='text.primary'>
                        {meta.narration}
                      </Typography>
                    </Stack>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title='Purchase orders'
              subheader='Create and share supplier purchase orders for this work order'
              action={(
                <Button
                  variant='contained'
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={openPurchaseOrderModal}
                  disabled={!service?.id}
                >
                  New purchase order
                </Button>
              )}
            />
            <CardContent>
              {isPoLoading ? (
                <Stack direction='row' spacing={2} alignItems='center'>
                  <CircularProgress size={24} />
                  <Typography variant='body2' color='text.secondary'>Loading purchase orders…</Typography>
                </Stack>
              ) : purchaseOrders.length === 0 ? (
                <Stack spacing={2} alignItems='flex-start'>
                  <Typography variant='body2' color='text.secondary'>
                    No purchase orders have been raised for this service yet.
                  </Typography>
                  <Button
                    size='small'
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={openPurchaseOrderModal}
                    disabled={!service?.id}
                  >
                    Create the first purchase order
                  </Button>
                </Stack>
              ) : (
                <TableContainer component={Paper} variant='outlined'>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Voucher</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Supplier</TableCell>
                        <TableCell>Buyer</TableCell>
                        <TableCell align='right'>Total</TableCell>
                        <TableCell align='right'>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {purchaseOrders.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography variant='body2' fontWeight={600}>
                                {row.voucherNumber || `PO-${row.id}`}
                              </Typography>
                              {row.serviceWan && (
                                <Typography variant='caption' color='text.secondary'>
                                  {row.serviceWan}
                                </Typography>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>{formatDate(row.date)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography variant='body2'>{row.supplierName || '—'}</Typography>
                              {row.supplierEmail && (
                                <Typography variant='caption' color='text.secondary'>
                                  {row.supplierEmail}
                                </Typography>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>{row.buyerName || '—'}</Typography>
                          </TableCell>
                          <TableCell align='right'>
                            <Typography variant='body2' fontWeight={600}>{fmtINR(row.grandTotal)}</Typography>
                          </TableCell>
                          <TableCell align='right'>
                            <Stack direction='row' spacing={1} justifyContent='flex-end'>
                              <Tooltip title='View details'>
                                <span>
                                  <IconButton size='small' onClick={() => handlePoView(row.id)}>
                                    <OpenInNewIcon fontSize='small' />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title='Download PDF'>
                                <span>
                                  <IconButton size='small' onClick={() => handlePoDownload(row.id)}>
                                    <FileDown size={18} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title='Send to supplier'>
                                <span>
                                  <IconButton size='small' onClick={() => handlePoSendOpen(row)}>
                                    <Send size={18} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          {(workOrder || progress.length > 0) && (
            <Card>
              <CardHeader
                avatar={<HistoryRoundedIcon color='primary' />}
                title='Progress updates'
                subheader={workOrder
                  ? `Last update ${summaryLastUpdated} • ${summaryTotalUpdates} update${summaryTotalUpdates === 1 ? '' : 's'} • ${summaryPhotoCount} photo${summaryPhotoCount === 1 ? '' : 's'} • Latest status ${formatServiceType(summaryLastStatus)}`
                  : 'No linked work order was found'}
              />
              <CardContent>
                {progress.length === 0 ? (
                  <Typography variant='body2' color='text.secondary'>
                    No progress updates recorded yet.
                  </Typography>
                ) : (
                  <Stack spacing={2.5}>
                    {progress.map((entry) => {
                      const key = entry.id || `${entry.status}-${entry.createdAt}`
                      const color = progressStatusColor(entry.status)
                      const chipProps = {
                        label: formatServiceType(entry.status),
                        size: 'small',
                        color: color === 'default' ? undefined : color,
                        variant: color === 'default' ? 'outlined' : 'filled'
                      }
                      return (
                        <Box
                          key={key}
                          sx={{
                            border: (theme) => `1px solid ${theme.palette.divider}`,
                            borderRadius: 2,
                            p: 2,
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02)
                          }}
                        >
                          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' spacing={1.5}>
                            <Chip {...chipProps} />
                            <Typography variant='caption' color='text.secondary'>
                              {formatDateTime(entry.createdAt)}
                            </Typography>
                          </Stack>
                          {entry.remarks && (
                            <Typography variant='body2' sx={{ mt: 1 }}>
                              {entry.remarks}
                            </Typography>
                          )}
                          <Stack direction='row' spacing={2} sx={{ mt: 1 }}>
                            {(entry.byFE?.name || entry.byFE?.displayName) && (
                              <Typography variant='caption' color='text.secondary'>
                                By {(entry.byFE?.displayName || entry.byFE?.name)}{entry.byFE?.id ? ` (ID ${entry.byFE.id})` : ''}
                              </Typography>
                            )}
                            {entry.photoUrl && (
                              <Link href={entry.photoUrl} target='_blank' rel='noreferrer' variant='caption'>
                                View photo evidence
                              </Link>
                            )}
                          </Stack>
                          {Array.isArray(entry.attachments) && entry.attachments.length > 0 && (
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
                              {entry.attachments.map((attachment) => (
                                <Button
                                  key={attachment.id || attachment.downloadPath}
                                  size='small'
                                  variant='text'
                                  onClick={() => handleDownloadProgressAttachment(entry.id, attachment)}
                                  disabled={isServiceAttachmentDownloading}
                                >
                                  {attachment.filename || 'Download photo'}
                                </Button>
                              ))}
                            </Stack>
                          )}
                        </Box>
                      )
                    })}
                  </Stack>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader title='Items & Services' subheader='Line items captured for this service' />
            <CardContent>
              <TableContainer component={Paper} variant='outlined' sx={{ borderRadius: 2 }}>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell align='center' width={56}>#</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>HSN/SAC</TableCell>
                      <TableCell align='right'>Base</TableCell>
                      <TableCell align='right'>Qty</TableCell>
                      <TableCell align='right'>Disc %</TableCell>
                      <TableCell align='right'>Line Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {normalisedItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align='center'>
                          <Typography variant='body2' color='text.secondary'>
                            No items recorded.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {normalisedItems.map((row, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell align='center'>
                          <Typography variant='body2' fontWeight={600}>{idx + 1}</Typography>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.75}>
                            <Typography variant='subtitle2' color='text.primary'>
                              {row.itemName}
                            </Typography>
                            {row.itemCode && (
                              <Typography variant='caption' color='text.secondary'>
                                {row.itemCode}
                              </Typography>
                            )}
                            {row.descriptionLines.length > 0 && (
                              <Stack spacing={0.5}>
                                {row.descriptionLines.map((line, lineIdx) => (
                                  <Typography key={lineIdx} variant='caption' color='text.secondary'>
                                    {line}
                                  </Typography>
                                ))}
                              </Stack>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>{row.hsn || '—'}</Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2' fontWeight={600}>{fmtINR(row.base ?? 0)}</Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2'>{row.qty ?? '—'}</Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2'>{row.discountPercent ?? '—'}</Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2' fontWeight={600}>{fmtINR(row.lineTotal ?? 0)}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 3 }} />

              <Stack spacing={1.5}>
                <Stack direction='row' justifyContent='space-between'>
                  <Typography variant='body2'>Subtotal</Typography>
                  <Typography variant='body2' fontWeight={600}>{fmtINR(effectiveSubtotal)}</Typography>
                </Stack>
                <Stack direction='row' justifyContent='space-between'>
                  <Typography variant='body2'>Discount savings</Typography>
                  <Typography variant='body2' fontWeight={600}>{fmtINR(effectiveDiscount)}</Typography>
                </Stack>
                <Stack direction='row' justifyContent='space-between'>
                  <Typography variant='body2'>Transport</Typography>
                  <Typography variant='body2' fontWeight={600}>{fmtINR(effectiveTransport)}</Typography>
                </Stack>
                {hasSplitTax ? (
                  <>
                    <Stack direction='row' justifyContent='space-between'>
                      <Typography variant='body2'>CGST {cgstRate ?? 0}%</Typography>
                      <Typography variant='body2' fontWeight={600}>{fmtINR(cgstAmount ?? 0)}</Typography>
                    </Stack>
                    <Stack direction='row' justifyContent='space-between'>
                      <Typography variant='body2'>SGST {sgstRate ?? 0}%</Typography>
                      <Typography variant='body2' fontWeight={600}>{fmtINR(sgstAmount ?? 0)}</Typography>
                    </Stack>
                  </>
                ) : (
                  <Stack direction='row' justifyContent='space-between'>
                    <Typography variant='body2'>IGST {igstRate ?? 0}%</Typography>
                    <Typography variant='body2' fontWeight={600}>{fmtINR(igstAmount ?? 0)}</Typography>
                  </Stack>
                )}
                <Divider sx={{ my: 1.5 }} />
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                  <Typography variant='h6' fontWeight={700}>Total</Typography>
                  <Stack direction='row' spacing={0.5} alignItems='center'>
                    <IndianRupee size={18} />
                    <Typography variant='h6' fontWeight={700}>{fmtINR(grandTotalAmount)}</Typography>
                  </Stack>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>

      <Dialog open={poModal.open} onClose={closePurchaseOrderModal} maxWidth='lg' fullWidth>
        <DialogTitle>New purchase order</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Autocomplete
              options={poSuggestions}
              getOptionLabel={(option) => {
                const header = option?.header || option
                const voucher = header?.voucherNumber || (header?.id ? `PO-${header.id}` : '')
                const supplier = option?.supplier?.name || header?.supplierName || ''
                return [voucher, supplier].filter(Boolean).join(' • ') || 'Previous purchase order'
              }}
              onInputChange={(_, value) => setPoSuggestionQuery(value)}
              onChange={handlePoTemplateSelect}
              isOptionEqualToValue={(option, value) => (option?.header?.id || option?.id) === (value?.header?.id || value?.id)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label='Reuse a previous purchase order'
                  placeholder='Search by supplier, voucher, or destination'
                />
              )}
            />

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label='Voucher number'
                  value={poForm.voucherNumber}
                  onChange={(event) => handlePoFormChange('voucherNumber', event.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  type='date'
                  label='Order date'
                  InputLabelProps={{ shrink: true }}
                  value={poForm.date || isoDate()}
                  onChange={(event) => handlePoFormChange('date', event.target.value)}
                  fullWidth
                />
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper variant='outlined' sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    <Typography variant='subtitle2'>Invoice To (Buyer)</Typography>
                    <TextField
                      label='Company name'
                      value={poForm.buyer?.name || ''}
                      onChange={(event) => handlePoFormChange('buyer.name', event.target.value)}
                      fullWidth
                    />
                    <TextField
                      label='Address'
                      value={poForm.buyer?.address || ''}
                      onChange={(event) => handlePoFormChange('buyer.address', event.target.value)}
                      multiline
                      minRows={2}
                      fullWidth
                    />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label='Phone / Cell'
                          value={poForm.buyer?.phone || ''}
                          onChange={(event) => handlePoFormChange('buyer.phone', event.target.value)}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label='GSTIN / UIN'
                          value={poForm.buyer?.gstin || ''}
                          onChange={(event) => handlePoFormChange('buyer.gstin', event.target.value)}
                          fullWidth
                        />
                      </Grid>
                    </Grid>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label='State name'
                          value={poForm.buyer?.stateName || ''}
                          onChange={(event) => handlePoFormChange('buyer.stateName', event.target.value)}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label='State code'
                          value={poForm.buyer?.stateCode || ''}
                          onChange={(event) => handlePoFormChange('buyer.stateCode', event.target.value)}
                          fullWidth
                        />
                      </Grid>
                    </Grid>
                    <TextField
                      label='Email'
                      value={poForm.buyer?.email || ''}
                      onChange={(event) => handlePoFormChange('buyer.email', event.target.value)}
                      fullWidth
                    />
                    <TextField
                      label='Website'
                      value={poForm.buyer?.website || ''}
                      onChange={(event) => handlePoFormChange('buyer.website', event.target.value)}
                      fullWidth
                    />
                  </Stack>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant='outlined' sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    <Typography variant='subtitle2'>Supplier (Bill From)</Typography>
                    <TextField
                      label='Supplier name'
                      value={poForm.supplier?.name || ''}
                      onChange={(event) => handlePoFormChange('supplier.name', event.target.value)}
                      fullWidth
                    />
                    <TextField
                      label='Address'
                      value={poForm.supplier?.address || ''}
                      onChange={(event) => handlePoFormChange('supplier.address', event.target.value)}
                      multiline
                      minRows={2}
                      fullWidth
                    />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label='GSTIN / UIN'
                          value={poForm.supplier?.gstin || ''}
                          onChange={(event) => handlePoFormChange('supplier.gstin', event.target.value)}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label='State name'
                          value={poForm.supplier?.stateName || ''}
                          onChange={(event) => handlePoFormChange('supplier.stateName', event.target.value)}
                          fullWidth
                        />
                      </Grid>
                    </Grid>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label='State code'
                          value={poForm.supplier?.stateCode || ''}
                          onChange={(event) => handlePoFormChange('supplier.stateCode', event.target.value)}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label='Email'
                          value={poForm.supplier?.email || ''}
                          onChange={(event) => handlePoFormChange('supplier.email', event.target.value)}
                          fullWidth
                        />
                      </Grid>
                    </Grid>
                    <TextField
                      label='WhatsApp number'
                      value={poForm.supplier?.whatsapp || ''}
                      onChange={(event) => handlePoFormChange('supplier.whatsapp', event.target.value)}
                      fullWidth
                    />
                  </Stack>
                </Paper>
              </Grid>
            </Grid>

            <Paper variant='outlined' sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Typography variant='subtitle2'>Order details</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label='Reference No. & Date'
                      value={poForm.meta?.referenceNumberAndDate || ''}
                      onChange={(event) => handlePoFormChange('meta.referenceNumberAndDate', event.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label='Mode / Terms of Payment'
                      value={poForm.meta?.paymentTerms || ''}
                      onChange={(event) => handlePoFormChange('meta.paymentTerms', event.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label='Dispatched through'
                      value={poForm.meta?.dispatchedThrough || ''}
                      onChange={(event) => handlePoFormChange('meta.dispatchedThrough', event.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label='Destination'
                      value={poForm.meta?.destination || ''}
                      onChange={(event) => handlePoFormChange('meta.destination', event.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label='Other references'
                      value={poForm.meta?.otherReferences || ''}
                      onChange={(event) => handlePoFormChange('meta.otherReferences', event.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label='Terms of delivery'
                      value={poForm.meta?.termsOfDelivery || ''}
                      onChange={(event) => handlePoFormChange('meta.termsOfDelivery', event.target.value)}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Stack>
            </Paper>

            <Stack spacing={2}>
              <Stack direction='row' justifyContent='space-between' alignItems='center'>
                <Typography variant='subtitle2'>Line items</Typography>
                <Button startIcon={<AddCircleOutlineIcon />} onClick={handlePoAddItem}>
                  Add item
                </Button>
              </Stack>
              <TableContainer component={Paper} variant='outlined'>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Sl No.</TableCell>
                      <TableCell>Description of goods</TableCell>
                      <TableCell align='right'>Quantity</TableCell>
                      <TableCell align='right'>Unit</TableCell>
                      <TableCell align='right'>Rate (₹)</TableCell>
                      <TableCell align='right'>Amount (₹)</TableCell>
                      <TableCell align='center'>Remove</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {poItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <Typography variant='body2' color='text.secondary' align='center'>
                            Add at least one item for the purchase order.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      poItems.map((item, index) => (
                        <TableRow key={item.key || index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell sx={{ minWidth: 220 }}>
                            <TextField
                              value={item.description}
                              onChange={(event) => handlePoItemChange(index, 'description', event.target.value)}
                              multiline
                              minRows={2}
                              fullWidth
                            />
                          </TableCell>
                          <TableCell align='right' sx={{ width: 110 }}>
                            <TextField
                              type='number'
                              value={item.quantity}
                              onChange={(event) => handlePoItemChange(index, 'quantity', event.target.value)}
                              inputProps={{ step: '0.01', min: 0 }}
                              fullWidth
                            />
                          </TableCell>
                          <TableCell align='right' sx={{ width: 110 }}>
                            <TextField
                              value={item.unit}
                              onChange={(event) => handlePoItemChange(index, 'unit', event.target.value)}
                              fullWidth
                            />
                          </TableCell>
                          <TableCell align='right' sx={{ width: 140 }}>
                            <TextField
                              type='number'
                              value={item.rate}
                              onChange={(event) => handlePoItemChange(index, 'rate', event.target.value)}
                              inputProps={{ step: '0.01', min: 0 }}
                              fullWidth
                            />
                          </TableCell>
                          <TableCell align='right' sx={{ width: 140 }}>
                            <TextField
                              type='number'
                              value={item.amount}
                              onChange={(event) => handlePoItemChange(index, 'amount', event.target.value)}
                              inputProps={{ step: '0.01', min: 0 }}
                              fullWidth
                            />
                          </TableCell>
                          <TableCell align='center' sx={{ width: 80 }}>
                            <Tooltip title='Remove item'>
                              <span>
                                <IconButton size='small' color='error' onClick={() => handlePoRemoveItem(index)}>
                                  <DeleteOutlineIcon fontSize='small' />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>

            <Grid container spacing={3} alignItems='flex-start'>
              <Grid item xs={12} md={6}>
                <Stack spacing={2}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        type='number'
                        label='CGST %'
                        value={poForm.totals?.cgstRate ?? ''}
                        onChange={(event) => handlePoFormChange('totals.cgstRate', event.target.value)}
                        inputProps={{ step: '0.01', min: 0 }}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        type='number'
                        label='SGST %'
                        value={poForm.totals?.sgstRate ?? ''}
                        onChange={(event) => handlePoFormChange('totals.sgstRate', event.target.value)}
                        inputProps={{ step: '0.01', min: 0 }}
                        fullWidth
                      />
                    </Grid>
                  </Grid>
                  <TextField
                    label='Amount in words'
                    value={poForm.amountInWords}
                    onChange={(event) => handlePoFormChange('amountInWords', event.target.value)}
                    multiline
                    minRows={2}
                    fullWidth
                  />
                  <TextField
                    label="Company's PAN"
                    value={poForm.companyPan}
                    onChange={(event) => handlePoFormChange('companyPan', event.target.value)}
                    fullWidth
                  />
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant='outlined' sx={{ p: 2 }}>
                  <Stack spacing={1.25}>
                    <Stack direction='row' justifyContent='space-between'>
                      <Typography variant='body2'>Subtotal</Typography>
                      <Typography variant='body2' fontWeight={600}>{fmtINR(poSummary.subTotal)}</Typography>
                    </Stack>
                    <Stack direction='row' justifyContent='space-between'>
                      <Typography variant='body2'>CGST {poSummary.cgstRate}%</Typography>
                      <Typography variant='body2' fontWeight={600}>{fmtINR(poSummary.cgstAmount)}</Typography>
                    </Stack>
                    <Stack direction='row' justifyContent='space-between'>
                      <Typography variant='body2'>SGST {poSummary.sgstRate}%</Typography>
                      <Typography variant='body2' fontWeight={600}>{fmtINR(poSummary.sgstAmount)}</Typography>
                    </Stack>
                    <Divider sx={{ my: 1 }} />
                    <Stack direction='row' justifyContent='space-between' alignItems='center'>
                      <Typography variant='subtitle1' fontWeight={700}>Grand total</Typography>
                      <Typography variant='h6' fontWeight={700}>{fmtINR(poSummary.grandTotal)}</Typography>
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closePurchaseOrderModal} color='inherit'>Cancel</Button>
          <Button onClick={handlePoSubmit} variant='contained' disabled={createPoState.isLoading}>
            {createPoState.isLoading ? 'Creating…' : 'Create purchase order'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={poDetailOpen} onClose={closePoDetail} maxWidth='md' fullWidth>
        <DialogTitle>Purchase order details</DialogTitle>
        <DialogContent dividers>
          {!selectedPoDetail ? (
            <Stack alignItems='center' justifyContent='center' sx={{ py: 6 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <Stack spacing={3}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={1}>
                    <Typography variant='subtitle2'>Voucher</Typography>
                    <Typography variant='body1' fontWeight={600}>
                      {selectedPoDetail.header?.voucherNumber || `PO-${selectedPoDetail.header?.id}`}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Date: {formatDate(selectedPoDetail.header?.date)}
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={1}>
                    <Typography variant='subtitle2'>Supplier</Typography>
                    <Typography variant='body1'>{selectedPoDetail.supplier?.name || '—'}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {selectedPoDetail.supplier?.address || '—'}
                    </Typography>
                    {(selectedPoDetail.supplier?.gstin || selectedPoDetail.supplier?.stateName) && (
                      <Typography variant='body2' color='text.secondary'>
                        GSTIN: {selectedPoDetail.supplier?.gstin || '—'} • State: {selectedPoDetail.supplier?.stateName || '—'}
                      </Typography>
                    )}
                  </Stack>
                </Grid>
              </Grid>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper variant='outlined' sx={{ p: 2 }}>
                    <Typography variant='subtitle2' gutterBottom>Invoice To</Typography>
                    <Typography variant='body2' fontWeight={600}>{selectedPoDetail.buyer?.name || '—'}</Typography>
                    <Typography variant='body2' color='text.secondary'>{selectedPoDetail.buyer?.address || '—'}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      GSTIN: {selectedPoDetail.buyer?.gstin || '—'}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper variant='outlined' sx={{ p: 2 }}>
                    <Typography variant='subtitle2' gutterBottom>Supplier</Typography>
                    <Typography variant='body2' fontWeight={600}>{selectedPoDetail.supplier?.name || '—'}</Typography>
                    <Typography variant='body2' color='text.secondary'>{selectedPoDetail.supplier?.address || '—'}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      GSTIN: {selectedPoDetail.supplier?.gstin || '—'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <TableContainer component={Paper} variant='outlined'>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Sl No.</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align='right'>Quantity</TableCell>
                      <TableCell align='right'>Unit</TableCell>
                      <TableCell align='right'>Rate (₹)</TableCell>
                      <TableCell align='right'>Amount (₹)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selectedPoDetail.items || []).map((item, index) => (
                      <TableRow key={`${item.description}-${index}`}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{item.description || '—'}</TableCell>
                        <TableCell align='right'>{item.quantity ?? '—'}</TableCell>
                        <TableCell align='right'>{item.unit || '—'}</TableCell>
                        <TableCell align='right'>{fmtINR(item.rate)}</TableCell>
                        <TableCell align='right'>{fmtINR(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Paper variant='outlined' sx={{ p: 2, alignSelf: 'flex-end', width: { xs: '100%', sm: 360 } }}>
                <Stack spacing={1.25}>
                  <Stack direction='row' justifyContent='space-between'>
                    <Typography variant='body2'>Subtotal</Typography>
                    <Typography variant='body2' fontWeight={600}>{fmtINR(selectedPoDetail.totals?.subTotal)}</Typography>
                  </Stack>
                  <Stack direction='row' justifyContent='space-between'>
                    <Typography variant='body2'>CGST {selectedPoDetail.totals?.cgstRate ?? 0}%</Typography>
                    <Typography variant='body2' fontWeight={600}>{fmtINR(selectedPoDetail.totals?.cgstAmount)}</Typography>
                  </Stack>
                  <Stack direction='row' justifyContent='space-between'>
                    <Typography variant='body2'>SGST {selectedPoDetail.totals?.sgstRate ?? 0}%</Typography>
                    <Typography variant='body2' fontWeight={600}>{fmtINR(selectedPoDetail.totals?.sgstAmount)}</Typography>
                  </Stack>
                  <Divider sx={{ my: 1 }} />
                  <Stack direction='row' justifyContent='space-between'>
                    <Typography variant='subtitle1' fontWeight={700}>Grand total</Typography>
                    <Typography variant='subtitle1' fontWeight={700}>{fmtINR(selectedPoDetail.totals?.grandTotal)}</Typography>
                  </Stack>
                  {selectedPoDetail.amountInWords && (
                    <Typography variant='caption' color='text.secondary'>
                      Amount chargeable in words: {selectedPoDetail.amountInWords}
                    </Typography>
                  )}
                </Stack>
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closePoDetail} color='inherit'>Close</Button>
          {selectedPoDetail?.header?.id && (
            <Button
              onClick={() => handlePoSendOpen({
                id: selectedPoDetail.header.id,
                supplierEmail: selectedPoDetail.header.supplierEmail,
                supplierWhatsapp: selectedPoDetail.header.supplierWhatsapp
              })}
              startIcon={<Send size={18} />}
            >
              Send
            </Button>
          )}
          {selectedPoDetail?.header?.id && (
            <Button
              variant='contained'
              startIcon={<FileDown size={18} />}
              onClick={() => handlePoDownload(selectedPoDetail.header.id)}
            >
              Download PDF
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={poSendModal.open} onClose={closePoSendModal} maxWidth='xs' fullWidth>
        <DialogTitle>Send purchase order</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl component='fieldset'>
              <FormLabel component='legend'>Delivery method</FormLabel>
              <RadioGroup
                row
                value={poSendModal.method}
                onChange={(_, value) => setPoSendModal((prev) => ({ ...prev, method: value }))}
              >
                <FormControlLabel value='email' control={<Radio />} label='Email' />
                <FormControlLabel value='whatsapp' control={<Radio />} label='WhatsApp' />
              </RadioGroup>
            </FormControl>
            <TextField
              label={poSendModal.method === 'email' ? 'Supplier email' : 'Supplier WhatsApp number'}
              value={poSendModal.contact}
              onChange={(event) => setPoSendModal((prev) => ({ ...prev, contact: event.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closePoSendModal} color='inherit'>Cancel</Button>
          <Button onClick={handlePoSendSubmit} variant='contained' disabled={sendPoState.isLoading}>
            {sendPoState.isLoading ? 'Sending…' : 'Send purchase order'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={modal.open} onClose={closeModal} maxWidth='sm' fullWidth>
        <DialogTitle>Send document</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl component='fieldset'>
              <FormLabel component='legend'>Delivery method</FormLabel>
              <RadioGroup
                row
                value={modal.method}
                onChange={(_, value) => setModal((m) => ({ ...m, method: value }))}
              >
                <FormControlLabel value='email' control={<Radio />} label='Email' />
                <FormControlLabel value='whatsapp' control={<Radio />} label='WhatsApp' />
              </RadioGroup>
            </FormControl>
            <FormControl component='fieldset'>
              <FormLabel component='legend'>Document</FormLabel>
              <RadioGroup
                row
                value={modal.docType || 'INVOICE'}
                onChange={(_, value) => setModal((m) => ({ ...m, docType: value }))}
              >
                <FormControlLabel value='INVOICE' control={<Radio />} label='Invoice' />
                <FormControlLabel value='PROFORMA' control={<Radio />} label='Proforma' />
              </RadioGroup>
            </FormControl>
            <TextField
              label={modal.method === 'email' ? 'Customer email' : 'Customer mobile'}
              value={modal.contact}
              onChange={(event) => setModal((m) => ({ ...m, contact: event.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeModal} color='inherit'>
            Cancel
          </Button>
          <Button onClick={handleSend} variant='contained' disabled={sendState.isLoading}>
            {sendState.isLoading ? 'Sending…' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
