// src/views/office/ServiceDetail.jsx
//
// Detailed view for a single service record. This page fetches the
// service using its ID, then parses the JSON fields (metaJson,
// itemsJson, totalsJson) to present a read‑only summary. Buyers and
// consignees are displayed, followed by invoice meta details and a
// table of individual line items with totals. The component offers a
// back link to return to the history list.

import React, { useState } from 'react'
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom'
import { IndianRupee, Send, Share2, FileDown } from 'lucide-react'
import { Toaster, toast } from 'react-hot-toast'
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
import { displayDocNumber } from '../../utils/docNumbers'
import { buildServiceLineDescriptions } from '../../utils/serviceLineDescriptions'
// Import the getService hook rather than the paginated getServices hook. This
// endpoint fetches a single service by ID and returns the raw Service
// object (with metaJson/itemsJson/totalsJson strings). See officeApi.js.
import {
  useGetServiceQuery,
  useDownloadServiceInvoiceMutation,
  useSendServiceInvoiceMutation,
  useShareServiceProposalMutation
} from '../../features/office/officeApi'

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
      <Box sx={{ minHeight: '100vh', bgcolor: (theme) => theme.palette.grey[100], py: { xs: 4, md: 8 } }}>
        <Toaster />
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
        <Toaster />
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
  const hasSplitTax = cgstRateValue !== null && cgstRateValue !== undefined

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
      <Toaster />
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
                    {(!items || items.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} align='center'>
                          <Typography variant='body2' color='text.secondary'>
                            No items recorded.
                          </Typography>
                        </TableCell>
                      </TableRow>
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
                        <TableRow key={idx} hover>
                          <TableCell align='center'>
                            <Typography variant='body2' fontWeight={600}>{idx + 1}</Typography>
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.75}>
                              <Typography variant='subtitle2' color='text.primary'>
                                {itemName}
                              </Typography>
                              {itemCode && (
                                <Typography variant='caption' color='text.secondary'>
                                  {itemCode}
                                </Typography>
                              )}
                              {descriptionLines.length > 0 && (
                                <Stack spacing={0.5}>
                                  {descriptionLines.map((line, lineIdx) => (
                                    <Typography key={lineIdx} variant='caption' color='text.secondary'>
                                      {line}
                                    </Typography>
                                  ))}
                                </Stack>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>{firstNonEmpty(it.hsnSac, it.hsn, it.sac) || '—'}</Typography>
                          </TableCell>
                          <TableCell align='right'>
                            <Typography variant='body2' fontWeight={600}>{fmtINR(base)}</Typography>
                          </TableCell>
                          <TableCell align='right'>
                            <Typography variant='body2'>{qty || '—'}</Typography>
                          </TableCell>
                          <TableCell align='right'>
                            <Typography variant='body2'>{disc || '—'}</Typography>
                          </TableCell>
                          <TableCell align='right'>
                            <Typography variant='body2' fontWeight={600}>{fmtINR(line)}</Typography>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 3 }} />

              <Stack spacing={1.5}>
                <Stack direction='row' justifyContent='space-between'>
                  <Typography variant='body2'>Subtotal</Typography>
                  <Typography variant='body2' fontWeight={600}>{fmtINR(subtotalValue)}</Typography>
                </Stack>
                <Stack direction='row' justifyContent='space-between'>
                  <Typography variant='body2'>Discount savings</Typography>
                  <Typography variant='body2' fontWeight={600}>{fmtINR(discountValue)}</Typography>
                </Stack>
                <Stack direction='row' justifyContent='space-between'>
                  <Typography variant='body2'>Transport</Typography>
                  <Typography variant='body2' fontWeight={600}>{fmtINR(transportValue)}</Typography>
                </Stack>
                {hasSplitTax ? (
                  <>
                    <Stack direction='row' justifyContent='space-between'>
                      <Typography variant='body2'>CGST {cgstRateValue ?? 0}%</Typography>
                      <Typography variant='body2' fontWeight={600}>{fmtINR(cgstAmountValue)}</Typography>
                    </Stack>
                    <Stack direction='row' justifyContent='space-between'>
                      <Typography variant='body2'>SGST {sgstRateValue ?? 0}%</Typography>
                      <Typography variant='body2' fontWeight={600}>{fmtINR(sgstAmountValue)}</Typography>
                    </Stack>
                  </>
                ) : (
                  <Stack direction='row' justifyContent='space-between'>
                    <Typography variant='body2'>IGST {igstRateValue ?? 0}%</Typography>
                    <Typography variant='body2' fontWeight={600}>{fmtINR(igstAmountValue)}</Typography>
                  </Stack>
                )}
                <Divider sx={{ my: 1.5 }} />
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                  <Typography variant='h6' fontWeight={700}>Total</Typography>
                  <Stack direction='row' spacing={0.5} alignItems='center'>
                    <IndianRupee size={18} />
                    <Typography variant='h6' fontWeight={700}>{fmtINR(grandTotalValue)}</Typography>
                  </Stack>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>

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
