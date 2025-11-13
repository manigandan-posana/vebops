import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
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
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { FileDown, Plus, RefreshCcw, Send, Eye } from 'lucide-react'
import { Toaster, toast } from 'react-hot-toast'
import { skipToken } from '@reduxjs/toolkit/query'
import {
  useListPurchaseOrdersQuery,
  useCreatePurchaseOrderMutation,
  useDownloadPurchaseOrderPdfMutation,
  useSendPurchaseOrderMutation,
  usePurchaseOrderSuggestionsQuery,
  useGetPurchaseOrderQuery,
  useLazyGetServicesQuery,
  useLazyGetServiceQuery
} from '../../features/office/officeApi'
import {
  coerceNumber,
  firstNonEmpty,
  fmtINR,
  isoDate,
  makeInitialPoForm,
  makeInitialPoItems,
  mapDetailToForm,
  mapDetailToItems,
  round2
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

const serviceLabel = (service) => {
  if (!service) return ''
  const parts = []
  if (service.wan) parts.push(service.wan)
  else if (service.serviceWan) parts.push(service.serviceWan)
  else if (service.id) parts.push(`SR-${service.id}`)
  const buyer = firstNonEmpty(service.buyerName, service.buyer?.name)
  if (buyer) parts.push(buyer)
  const type = firstNonEmpty(service.serviceTypeCode, service.meta?.serviceType)
  if (type) parts.push(String(type).replace(/[_-]+/g, ' '))
  return parts.join(' • ')
}

const emptyPage = { content: [], totalElements: 0, totalPages: 0, size: 25, number: 0 }

export default function PurchaseOrders () {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [serviceFilter, setServiceFilter] = useState(null)
  const [serviceOptions, setServiceOptions] = useState([])
  const [serviceSearch, setServiceSearch] = useState('')
  const [filterServiceInput, setFilterServiceInput] = useState('')
  const [modalServiceInput, setModalServiceInput] = useState('')
  const [fetchServices] = useLazyGetServicesQuery()
  const [fetchService] = useLazyGetServiceQuery()

  const queryArgs = useMemo(() => ({
    page,
    size: rowsPerPage,
    sort: 'createdAt,desc',
    serviceId: serviceFilter?.id || undefined
  }), [page, rowsPerPage, serviceFilter?.id])

  const {
    data: poPage = emptyPage,
    isFetching,
    refetch: refetchPurchaseOrders
  } = useListPurchaseOrdersQuery(queryArgs)
  const purchaseOrders = poPage?.content ?? []

  const [createPo, createPoState] = useCreatePurchaseOrderMutation()
  const [downloadPoPdf] = useDownloadPurchaseOrderPdfMutation()
  const [sendPurchaseOrder, sendPoState] = useSendPurchaseOrderMutation()
  const [poModal, setPoModal] = useState({ open: false })
  const [selectedService, setSelectedService] = useState(null)
  const [poForm, setPoForm] = useState(makeInitialPoForm())
  const [poItems, setPoItems] = useState([])
  const [poSuggestionQuery, setPoSuggestionQuery] = useState('')
  const { data: poTemplates = [] } = usePurchaseOrderSuggestionsQuery(
    { q: poSuggestionQuery, limit: 8 },
    { skip: !poModal.open }
  )
  const [poSendModal, setPoSendModal] = useState({ open: false, id: null, method: 'email', contact: '' })
  const [poDetailOpen, setPoDetailOpen] = useState(false)
  const [selectedPoId, setSelectedPoId] = useState(null)
  const { data: selectedPoDetail } = useGetPurchaseOrderQuery(selectedPoId ?? skipToken)

  const poSummary = useMemo(() => {
    const subTotal = round2(poItems.reduce((sum, item) => sum + coerceNumber(item.amount), 0))
    const cgstRate = coerceNumber(poForm.totals?.cgstRate)
    const sgstRate = coerceNumber(poForm.totals?.sgstRate)
    const cgstAmount = round2(subTotal * (cgstRate / 100))
    const sgstAmount = round2(subTotal * (sgstRate / 100))
    const grandTotal = round2(subTotal + cgstAmount + sgstAmount)
    return { subTotal, cgstRate, sgstRate, cgstAmount, sgstAmount, grandTotal }
  }, [poItems, poForm.totals?.cgstRate, poForm.totals?.sgstRate])

  useEffect(() => {
    if (!poModal.open) {
      setSelectedService(null)
      setPoForm(makeInitialPoForm())
      setPoItems([])
      setPoSuggestionQuery('')
      setModalServiceInput('')
    }
  }, [poModal.open])

  useEffect(() => {
    let active = true
    const loadServices = async (input = '') => {
      try {
        const params = {
          q: input?.trim() || undefined,
          page: 0,
          size: 20,
          sort: 'createdAt,desc'
        }
        const res = await fetchServices(params).unwrap()
        if (!active) return
        const content = Array.isArray(res?.content) ? res.content : Array.isArray(res) ? res : []
        setServiceOptions(content)
      } catch (err) {
        if (!active) return
        console.error('Failed to load services', err)
        toast.error('Unable to load service suggestions')
      }
    }
    loadServices(serviceSearch)
    return () => { active = false }
  }, [fetchServices, serviceSearch])

  const handleServiceFilterChange = useCallback((_event, value) => {
    setServiceFilter(value || null)
    setFilterServiceInput(value ? serviceLabel(value) : '')
    setPage(0)
  }, [])

  const openCreateModal = useCallback(() => {
    setPoModal({ open: true })
    setPoSuggestionQuery('')
  }, [])

  const closeCreateModal = useCallback(() => {
    setPoModal({ open: false })
  }, [])

  const handleTemplateSelect = useCallback((_event, value) => {
    if (!value) return
    setPoForm(mapDetailToForm(value))
    setPoItems(mapDetailToItems(value))
  }, [])

  const handleServiceSelect = useCallback(async (_event, value) => {
    setSelectedService(value || null)
    setModalServiceInput(value ? serviceLabel(value) : '')
    if (!value?.id) {
      setPoForm(makeInitialPoForm())
      setPoItems([])
      return
    }
    try {
      const res = await fetchService(value.id).unwrap()
      const svc = res?.service ?? res ?? value
      setPoForm(makeInitialPoForm(svc))
      const rawItems = parseJson(svc?.itemsJson, [])
      setPoItems(makeInitialPoItems(rawItems))
    } catch (err) {
      console.error('Failed to fetch service', err)
      toast.error('Unable to load service details')
      setPoForm(makeInitialPoForm(value))
      setPoItems([])
    }
  }, [fetchService])

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
    if (!selectedService?.id) {
      toast.error('Select a service for this purchase order')
      return
    }
    if (!poItems.length) {
      toast.error('Add at least one line item')
      return
    }
    const preparedItems = poItems
      .map((item) => ({
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
      serviceId: selectedService.id,
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
      items: preparedItems,
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
      const res = await createPo(payload).unwrap()
      toast.success('Purchase order created')
      closeCreateModal()
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
  }, [selectedService?.id, poItems, poForm, poSummary, createPo, closeCreateModal, refetchPurchaseOrders])

  const handlePoView = useCallback((row) => {
    if (!row?.id) return
    setSelectedPoId(row.id)
    setPoDetailOpen(true)
  }, [])

  const handlePoDownload = useCallback(async (row) => {
    if (!row?.id) return
    try {
      await downloadPoPdf(row.id).unwrap()
    } catch (err) {
      const message = err?.data?.message || err?.error || 'Unable to download purchase order'
      toast.error(String(message))
    }
  }, [downloadPoPdf])

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
    const payload = poSendModal.method === 'email'
      ? { id: poSendModal.id, toEmail: poSendModal.contact }
      : { id: poSendModal.id, toWhatsapp: poSendModal.contact }
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

  const handleRefresh = useCallback(() => {
    refetchPurchaseOrders()
  }, [refetchPurchaseOrders])

  return (
    <Box>
      <Toaster position='top-right' />
      <Container maxWidth='xl' disableGutters>
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2} alignItems={{ md: 'center' }}>
            <Box>
              <Typography variant='h4' fontWeight={700}>Purchase Orders</Typography>
              <Typography variant='body2' color='text.secondary'>Track, generate, and share supplier purchase orders.</Typography>
            </Box>
            <Stack direction='row' spacing={1}>
              <Button variant='outlined' startIcon={<RefreshCcw size={18} />} onClick={handleRefresh} disabled={isFetching}>
                Refresh
              </Button>
              <Button variant='contained' startIcon={<Plus size={18} />} onClick={openCreateModal}>
                New purchase order
              </Button>
            </Stack>
          </Stack>

          <Card>
            <CardHeader
              title='Filters'
              subheader='Narrow down purchase orders by service or supplier'
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6} lg={4}>
                  <Autocomplete
                    options={serviceOptions}
                    value={serviceFilter}
                    onChange={handleServiceFilterChange}
                    inputValue={filterServiceInput}
                    onInputChange={(_event, value, reason) => {
                      if (reason === 'reset') return
                      setFilterServiceInput(value)
                      setServiceSearch(value)
                    }}
                    getOptionLabel={serviceLabel}
                    isOptionEqualToValue={(option, value) => option?.id === value?.id}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label='Filter by service'
                        placeholder='Search work orders or buyers'
                      />
                    )}
                    clearOnBlur={false}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title='Recent purchase orders'
              action={isFetching ? <Chip label='Loading…' size='small' /> : null}
            />
            <CardContent>
              {purchaseOrders.length === 0 && (
                <Alert severity='info' sx={{ mb: 2 }}>No purchase orders found for the selected filters.</Alert>
              )}
              <TableContainer component={Paper} variant='outlined'>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Voucher</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Supplier</TableCell>
                      <TableCell>Buyer</TableCell>
                      <TableCell>Service</TableCell>
                      <TableCell align='right'>Total</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {purchaseOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align='center'>No purchase orders to display.</TableCell>
                      </TableRow>
                    ) : (
                      purchaseOrders.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>{row.voucherNumber || `PO-${row.id}`}</TableCell>
                          <TableCell>{formatDate(row.date)}</TableCell>
                          <TableCell>
                            <Stack spacing={0.3}>
                              <Typography variant='body2' fontWeight={600}>{row.supplierName || '—'}</Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {row.supplierEmail || row.supplierWhatsapp || '—'}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>{row.buyerName || '—'}</TableCell>
                          <TableCell>{row.serviceWan || `Service #${row.serviceId || '—'}`}</TableCell>
                          <TableCell align='right'>
                            <Typography variant='body2' fontWeight={600}>{fmtINR(row.grandTotal)}</Typography>
                          </TableCell>
                          <TableCell align='right'>
                            <Tooltip title='View details'>
                              <IconButton size='small' onClick={() => handlePoView(row)}>
                                <Eye size={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title='Download PDF'>
                              <IconButton size='small' onClick={() => handlePoDownload(row)}>
                                <FileDown size={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title='Send purchase order'>
                              <IconButton size='small' onClick={() => handlePoSendOpen(row)}>
                                <Send size={18} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <TablePagination
                  component='div'
                  count={poPage.totalElements ?? purchaseOrders.length}
                  page={page}
                  onPageChange={(_event, newPage) => setPage(newPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(event) => {
                    setRowsPerPage(parseInt(event.target.value, 10))
                    setPage(0)
                  }}
                  rowsPerPageOptions={[10, 25, 50]}
                />
              </TableContainer>
            </CardContent>
          </Card>
        </Stack>
      </Container>

      <Dialog open={poModal.open} onClose={closeCreateModal} maxWidth='lg' fullWidth>
        <DialogTitle>Create purchase order</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Autocomplete
              options={serviceOptions}
              value={selectedService}
              onChange={handleServiceSelect}
              inputValue={modalServiceInput}
              onInputChange={(_event, value, reason) => {
                if (reason === 'reset') return
                setModalServiceInput(value)
                setServiceSearch(value)
              }}
              getOptionLabel={serviceLabel}
              isOptionEqualToValue={(option, value) => option?.id === value?.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label='Select service'
                  placeholder='Search work orders or buyers'
                  required
                />
              )}
            />

            <Autocomplete
              options={poTemplates}
              getOptionLabel={(option) => {
                const header = option?.header || option
                const voucher = header?.voucherNumber || (header?.id ? `PO-${header.id}` : '')
                const supplier = option?.supplier?.name || header?.supplierName || ''
                return [voucher, supplier].filter(Boolean).join(' • ') || 'Previous purchase order'
              }}
              onInputChange={(_event, value) => setPoSuggestionQuery(value)}
              onChange={handleTemplateSelect}
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
                      fullWidth
                      multiline
                      minRows={3}
                    />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label='Phone/Cell'
                          value={poForm.buyer?.phone || ''}
                          onChange={(event) => handlePoFormChange('buyer.phone', event.target.value)}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label='GSTIN/UIN'
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
                      fullWidth
                      multiline
                      minRows={3}
                    />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label='GSTIN/UIN'
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
                <Typography variant='subtitle2'>Order meta information</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label='Reference No. & Date'
                      value={poForm.meta?.referenceNumberAndDate || ''}
                      onChange={(event) => handlePoFormChange('meta.referenceNumberAndDate', event.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label='Mode/Terms of Payment'
                      value={poForm.meta?.paymentTerms || ''}
                      onChange={(event) => handlePoFormChange('meta.paymentTerms', event.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label='Dispatched Through'
                      value={poForm.meta?.dispatchedThrough || ''}
                      onChange={(event) => handlePoFormChange('meta.dispatchedThrough', event.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label='Destination'
                      value={poForm.meta?.destination || ''}
                      onChange={(event) => handlePoFormChange('meta.destination', event.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label='Other References'
                      value={poForm.meta?.otherReferences || ''}
                      onChange={(event) => handlePoFormChange('meta.otherReferences', event.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label='Terms of Delivery'
                      value={poForm.meta?.termsOfDelivery || ''}
                      onChange={(event) => handlePoFormChange('meta.termsOfDelivery', event.target.value)}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Stack>
            </Paper>

            <Paper variant='outlined'>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell width='5%'>Sl No.</TableCell>
                      <TableCell>Description of Goods</TableCell>
                      <TableCell width='12%'>Quantity</TableCell>
                      <TableCell width='12%'>Unit</TableCell>
                      <TableCell width='12%'>Rate (₹)</TableCell>
                      <TableCell width='12%'>Amount (₹)</TableCell>
                      <TableCell width='6%' align='right'>Remove</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {poItems.map((item, index) => (
                      <TableRow key={item.key || index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <TextField
                            value={item.description}
                            onChange={(event) => handlePoItemChange(index, 'description', event.target.value)}
                            fullWidth
                            placeholder='Describe the goods or service'
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type='number'
                            value={item.quantity}
                            onChange={(event) => handlePoItemChange(index, 'quantity', event.target.value)}
                            fullWidth
                            inputProps={{ min: 0, step: 'any' }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={item.unit}
                            onChange={(event) => handlePoItemChange(index, 'unit', event.target.value)}
                            fullWidth
                            placeholder='Unit'
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type='number'
                            value={item.rate}
                            onChange={(event) => handlePoItemChange(index, 'rate', event.target.value)}
                            fullWidth
                            inputProps={{ min: 0, step: 'any' }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type='number'
                            value={item.amount}
                            onChange={(event) => handlePoItemChange(index, 'amount', event.target.value)}
                            fullWidth
                            inputProps={{ min: 0, step: 'any' }}
                          />
                        </TableCell>
                        <TableCell align='right'>
                          <IconButton size='small' color='error' onClick={() => handlePoRemoveItem(index)}>
                            <DeleteOutlineIcon fontSize='small' />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Button startIcon={<AddCircleOutlineIcon />} onClick={handlePoAddItem}>
                          Add line item
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper variant='outlined' sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    <Typography variant='subtitle2'>Tax summary</Typography>
                    <Stack direction='row' spacing={2}>
                      <TextField
                        label='CGST %'
                        type='number'
                        value={poForm.totals?.cgstRate ?? ''}
                        onChange={(event) => handlePoFormChange('totals.cgstRate', event.target.value)}
                        fullWidth
                      />
                      <TextField
                        label='SGST %'
                        type='number'
                        value={poForm.totals?.sgstRate ?? ''}
                        onChange={(event) => handlePoFormChange('totals.sgstRate', event.target.value)}
                        fullWidth
                      />
                    </Stack>
                    <Divider />
                    <Stack spacing={1}>
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
                      <Stack direction='row' justifyContent='space-between'>
                        <Typography variant='subtitle1' fontWeight={700}>Grand total</Typography>
                        <Typography variant='subtitle1' fontWeight={700}>{fmtINR(poSummary.grandTotal)}</Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant='outlined' sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    <TextField
                      label='Amount in words'
                      value={poForm.amountInWords || ''}
                      onChange={(event) => handlePoFormChange('amountInWords', event.target.value)}
                      fullWidth
                      multiline
                      minRows={2}
                    />
                    <TextField
                      label="Company's PAN"
                      value={poForm.companyPan || ''}
                      onChange={(event) => handlePoFormChange('companyPan', event.target.value)}
                      fullWidth
                    />
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCreateModal} color='inherit'>Cancel</Button>
          <Button onClick={handlePoSubmit} variant='contained' disabled={createPoState.isLoading}>
            {createPoState.isLoading ? 'Creating…' : 'Create purchase order'}
          </Button>
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
                onChange={(_event, value) => setPoSendModal((prev) => ({ ...prev, method: value }))}
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

      <Dialog open={poDetailOpen} onClose={closePoDetail} maxWidth='md' fullWidth>
        <DialogTitle>Purchase order details</DialogTitle>
        <DialogContent dividers>
          {selectedPoDetail ? (
            <Stack spacing={3}>
              <Stack spacing={0.5}>
                <Typography variant='h6'>{selectedPoDetail?.header?.voucherNumber || `PO-${selectedPoDetail?.header?.id}`}</Typography>
                <Typography variant='body2' color='text.secondary'>
                  {formatDate(selectedPoDetail?.header?.date)} • {selectedPoDetail?.header?.supplierName || '—'}
                </Typography>
              </Stack>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper variant='outlined' sx={{ p: 2 }}>
                    <Typography variant='subtitle2' gutterBottom>Invoice To</Typography>
                    <Typography variant='body2' fontWeight={600}>{selectedPoDetail?.buyer?.name || '—'}</Typography>
                    <Typography variant='body2'>{selectedPoDetail?.buyer?.address || '—'}</Typography>
                    <Typography variant='body2' color='text.secondary'>GSTIN: {selectedPoDetail?.buyer?.gstin || '—'}</Typography>
                    <Typography variant='body2' color='text.secondary'>Phone: {selectedPoDetail?.buyer?.phone || '—'}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper variant='outlined' sx={{ p: 2 }}>
                    <Typography variant='subtitle2' gutterBottom>Supplier</Typography>
                    <Typography variant='body2' fontWeight={600}>{selectedPoDetail?.supplier?.name || '—'}</Typography>
                    <Typography variant='body2'>{selectedPoDetail?.supplier?.address || '—'}</Typography>
                    <Typography variant='body2' color='text.secondary'>GSTIN: {selectedPoDetail?.supplier?.gstin || '—'}</Typography>
                    <Typography variant='body2' color='text.secondary'>Email: {selectedPoDetail?.supplier?.email || '—'}</Typography>
                  </Paper>
                </Grid>
              </Grid>
              <Paper variant='outlined'>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Sl No.</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align='right'>Qty</TableCell>
                      <TableCell align='right'>Unit</TableCell>
                      <TableCell align='right'>Rate</TableCell>
                      <TableCell align='right'>Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPoDetail.items?.map((item, index) => (
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
              </Paper>
              <Paper variant='outlined' sx={{ p: 2 }}>
                <Stack spacing={1}>
                  <Stack direction='row' justifyContent='space-between'>
                    <Typography variant='body2'>Subtotal</Typography>
                    <Typography variant='body2' fontWeight={600}>{fmtINR(selectedPoDetail?.totals?.subTotal)}</Typography>
                  </Stack>
                  <Stack direction='row' justifyContent='space-between'>
                    <Typography variant='body2'>CGST {selectedPoDetail?.totals?.cgstRate ?? 0}%</Typography>
                    <Typography variant='body2' fontWeight={600}>{fmtINR(selectedPoDetail?.totals?.cgstAmount)}</Typography>
                  </Stack>
                  <Stack direction='row' justifyContent='space-between'>
                    <Typography variant='body2'>SGST {selectedPoDetail?.totals?.sgstRate ?? 0}%</Typography>
                    <Typography variant='body2' fontWeight={600}>{fmtINR(selectedPoDetail?.totals?.sgstAmount)}</Typography>
                  </Stack>
                  <Divider sx={{ my: 1 }} />
                  <Stack direction='row' justifyContent='space-between'>
                    <Typography variant='subtitle1' fontWeight={700}>Grand total</Typography>
                    <Typography variant='subtitle1' fontWeight={700}>{fmtINR(selectedPoDetail?.totals?.grandTotal)}</Typography>
                  </Stack>
                  {selectedPoDetail?.amountInWords && (
                    <Typography variant='caption' color='text.secondary'>
                      Amount chargeable (in words): {selectedPoDetail.amountInWords}
                    </Typography>
                  )}
                </Stack>
              </Paper>
            </Stack>
          ) : (
            <Typography variant='body2' color='text.secondary'>Select a purchase order to view details.</Typography>
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
              onClick={() => handlePoDownload({ id: selectedPoDetail.header.id })}
            >
              Download PDF
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}
