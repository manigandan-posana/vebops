import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Divider,
  Grid,
  IconButton,
  Paper,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import { ArrowLeft, Plus, Save, Search } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  useCreatePurchaseOrderMutation,
  useGetCompanyQuery,
  useLazyGetServicesQuery,
  useLazyGetServiceQuery,
  useListPurchaseOrderKitsQuery,
  usePurchaseOrderSuggestionsQuery
} from '../../../features/office/officeApi'
import {
  INDIA_STATES,
  calculateTaxSplit,
  coerceNumber,
  fmtINR,
  isoDate,
  makeInitialPoForm,
  mapDetailToForm,
  mapDetailToItems,
  round2
} from '../purchaseOrders/utils'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'

const emptyPage = { content: [], totalElements: 0, totalPages: 0, size: 10, number: 0 }

const serviceLabel = (service) => {
  if (!service) return ''
  const parts = []
  if (service.wan) parts.push(service.wan)
  else if (service.serviceWan) parts.push(service.serviceWan)
  else if (service.id) parts.push(`SR-${service.id}`)
  const buyer = service.buyerName || service.buyer?.name
  if (buyer) parts.push(buyer)
  return parts.join(' • ')
}

const serviceSubtitle = (service) => {
  if (!service) return ''
  const consignee = service.consigneeName || service.consignee?.name
  const address = service.consigneeAddress || service.siteAddress || service.siteLocation || ''
  const pieces = []
  if (consignee) pieces.push(consignee)
  if (address) pieces.push(address)
  return pieces.join(' • ')
}

const templateLabel = (detail) => {
  if (!detail) return ''
  const header = detail.header || detail
  const voucher = header?.voucherNumber || (header?.id ? `PO-${header.id}` : '')
  const supplier = header?.supplierName || detail?.supplier?.name || ''
  return [voucher, supplier].filter(Boolean).join(' • ')
}

const buildKitDescription = (kit) => {
  const name = kit?.name ? kit.name.trim() : ''
  if (!name) return 'Supply of kit'
  if (/^supply of/i.test(name)) return name
  return `Supply of ${name}`
}

export default function PurchaseOrderCreate () {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialServiceId = searchParams.get('serviceId')

  const [serviceOptions, setServiceOptions] = useState([])
  const [serviceSearch, setServiceSearch] = useState('')
  const [serviceInput, setServiceInput] = useState('')
  const [selectedService, setSelectedService] = useState(null)
const [fetchServices, { isFetching: servicesLoading }] = useLazyGetServicesQuery()
const [fetchService] = useLazyGetServiceQuery()

  const { data: companyDetails } = useGetCompanyQuery()
  const [poForm, setPoForm] = useState(() => makeInitialPoForm({}, companyDetails || {}))
  const [buyerPrefilled, setBuyerPrefilled] = useState(false)
  const [poItems, setPoItems] = useState([])

  useEffect(() => {
    if (companyDetails && !buyerPrefilled) {
      setPoForm((prev) => ({
        ...makeInitialPoForm(selectedService || {}, companyDetails),
        supplier: prev.supplier,
        meta: prev.meta,
        amountInWords: prev.amountInWords,
        totals: prev.totals,
        companyPan: companyDetails?.pan || prev.companyPan
      }))
      setBuyerPrefilled(true)
    }
  }, [companyDetails, buyerPrefilled])

  const queryArgs = useMemo(() => ({
    page: 0,
    size: 20,
    sort: 'createdAt,desc',
    q: serviceSearch.trim() || undefined
  }), [serviceSearch])

  useEffect(() => {
    let active = true
    const loadServices = async () => {
      try {
        const res = await fetchServices(queryArgs).unwrap()
        if (!active) return
        const rows = Array.isArray(res?.content) ? res.content : Array.isArray(res) ? res : []
        setServiceOptions(rows)
      } catch (err) {
        if (!active) return
        console.error('Failed to fetch services', err)
        toast.error('Unable to load service suggestions')
      }
    }
    loadServices()
    return () => { active = false }
  }, [fetchServices, queryArgs])

  useEffect(() => {
    if (!initialServiceId) return
    const id = Number(initialServiceId)
    if (!Number.isFinite(id)) return
    const bootstrap = async () => {
      try {
        const res = await fetchService(id).unwrap()
        const svc = res?.service ?? res
        if (svc) {
          setSelectedService(svc)
          setServiceInput(serviceLabel(svc))
          setPoForm((prev) => ({
            ...makeInitialPoForm(svc, companyDetails || {}),
            supplier: prev.supplier,
            meta: prev.meta,
            amountInWords: prev.amountInWords,
            totals: prev.totals,
            companyPan: companyDetails?.pan || prev.companyPan
          }))
          setPoItems([])
        }
      } catch (err) {
        console.error('Failed to bootstrap service', err)
      }
    }
    bootstrap()
  // intentionally run only once when component mounts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [templateQuery, setTemplateQuery] = useState('')
const { data: templateOptions = [], isFetching: templatesLoading } = usePurchaseOrderSuggestionsQuery(
    { q: templateQuery, limit: 8 },
    { skip: templateQuery.trim().length < 2 }
  )

  const [kitSearch, setKitSearch] = useState('')
  const [kitPage, setKitPage] = useState(0)
  const [kitRowsPerPage, setKitRowsPerPage] = useState(5)
  const {
    data: kitPageData = emptyPage,
    isFetching: kitsLoading
  } = useListPurchaseOrderKitsQuery({ q: kitSearch, page: kitPage, size: kitRowsPerPage })
  const kits = kitPageData?.content ?? []

  const [createPo, createPoState] = useCreatePurchaseOrderMutation()

  const poSummary = useMemo(() => {
    const subTotal = round2(poItems.reduce((sum, item) => sum + coerceNumber(item.amount), 0))
    const tax = calculateTaxSplit(subTotal, poForm.supplier?.stateName, poForm.supplier?.stateCode)
    const grandTotal = round2(subTotal + tax.cgstAmount + tax.sgstAmount + tax.igstAmount)
    return { subTotal, ...tax, grandTotal }
  }, [poItems, poForm.supplier?.stateName, poForm.supplier?.stateCode])

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

  const handleServiceSelect = useCallback(async (_event, value) => {
    setSelectedService(value || null)
    setServiceInput(value ? serviceLabel(value) : '')
    if (!value?.id) {
      setPoItems([])
      return
    }
    try {
      await fetchService(value.id).unwrap()
      setPoItems([])
    } catch (err) {
      console.error('Failed to fetch service', err)
      toast.error('Unable to load service details')
      setPoItems([])
    }
  }, [fetchService])

  const handleTemplateSelect = useCallback((_event, option) => {
    if (!option) return
    const mapped = mapDetailToForm(option)
    mapped.buyer = { ...poForm.buyer }
    if (!mapped.companyPan) {
      mapped.companyPan = poForm.companyPan
    }
    setPoForm(mapped)
    setPoItems(mapDetailToItems(option))
  }, [poForm.buyer, poForm.companyPan])

  const handleAddBlankItem = useCallback(() => {
    setPoItems((prev) => ([
      ...prev,
      {
        key: `${Date.now()}-${prev.length + 1}`,
        description: '',
        quantity: 1,
        unit: 'NO',
        rate: 0,
        amount: 0
      }
    ]))
  }, [])

  const handleAddKit = useCallback((kit) => {
    if (!kit) return
    setPoItems((prev) => ([
      ...prev,
      {
        key: `kit-${kit.id}-${Date.now()}`,
        description: buildKitDescription(kit),
        quantity: 1,
        unit: 'NO',
        rate: round2(coerceNumber(kit.price)),
        amount: round2(coerceNumber(kit.price))
      }
    ]))
    toast.success('Kit added to purchase order')
  }, [])

  const updateItem = useCallback((index, field, rawValue) => {
    setPoItems((prev) => prev.map((item, idx) => {
      if (idx !== index) return item
      const next = { ...item }
      if (field === 'description' || field === 'unit') {
        next[field] = rawValue
      } else {
        const numeric = coerceNumber(rawValue)
        next[field] = numeric
      }
      const quantity = field === 'quantity' ? coerceNumber(rawValue) : coerceNumber(next.quantity)
      const rate = field === 'rate' ? coerceNumber(rawValue) : coerceNumber(next.rate)
      if (field === 'quantity' || field === 'rate') {
        next.amount = round2(quantity * rate)
      }
      if (field === 'amount') {
        next.amount = round2(coerceNumber(rawValue))
      }
      return next
    }))
  }, [])

  const removeItem = useCallback((index) => {
    setPoItems((prev) => prev.filter((_, idx) => idx !== index))
  }, [])

  const handleSupplierStateSelect = useCallback((_event, option) => {
    if (option) {
      handlePoFormChange('supplier.stateName', option.name)
      handlePoFormChange('supplier.stateCode', option.code)
    } else {
      handlePoFormChange('supplier.stateName', '')
      handlePoFormChange('supplier.stateCode', '')
    }
  }, [handlePoFormChange])

  const supplierStateValue = useMemo(() => {
    const code = (poForm.supplier?.stateCode || '').trim()
    const name = poForm.supplier?.stateName || ''
    return INDIA_STATES.find((opt) => opt.code === code) || (name ? { code: '', name } : null)
  }, [poForm.supplier?.stateCode, poForm.supplier?.stateName])

  const handleSubmit = useCallback(async () => {
    if (!selectedService?.id) {
      toast.error('Select a service to link this purchase order')
      return
    }
    if (!poItems.length) {
      toast.error('Add at least one item')
      return
    }
    const items = poItems
      .map((item) => ({
        description: (item.description || '').trim(),
        quantity: round2(coerceNumber(item.quantity)),
        unit: (item.unit || '').trim() || 'NO',
        rate: round2(coerceNumber(item.rate)),
        amount: round2(coerceNumber(item.amount))
      }))
      .filter((item) => item.description)

    if (!items.length) {
      toast.error('Each item needs a description')
      return
    }

    const payload = {
      serviceId: selectedService.id,
      voucherNumber: poForm.voucherNumber || undefined,
      date: poForm.date || isoDate(),
      buyer: { ...poForm.buyer },
      supplier: { ...poForm.supplier },
      meta: { ...poForm.meta },
      items,
      totals: {
        subTotal: poSummary.subTotal,
        cgstRate: poSummary.cgstRate,
        cgstAmount: poSummary.cgstAmount,
        sgstRate: poSummary.sgstRate,
        sgstAmount: poSummary.sgstAmount,
        igstRate: poSummary.igstRate,
        igstAmount: poSummary.igstAmount,
        grandTotal: poSummary.grandTotal
      },
      amountInWords: poForm.amountInWords || '',
      companyPan: poForm.companyPan || ''
    }

    try {
      const res = await createPo(payload).unwrap()
      toast.success('Purchase order created')
      const newId = res?.header?.id
      if (newId) {
        navigate(`/office/purchase-orders?highlight=${newId}`)
      } else {
        navigate('/office/purchase-orders')
      }
    } catch (err) {
      const message = err?.data?.message || err?.error || 'Failed to create purchase order'
      toast.error(String(message))
    }
  }, [selectedService?.id, poItems, poForm, poSummary, createPo, navigate])

  return (
    <Box sx={{ pb: 6 }}>
      <Container maxWidth='xl' disableGutters>
        <Stack spacing={3}>
          <Stack direction='row' spacing={1} alignItems='center'>
            <Button startIcon={<ArrowLeft size={18} />} onClick={() => navigate('/office/purchase-orders')}>
              Back to purchase orders
            </Button>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2} alignItems={{ md: 'center' }}>
            <Box>
              <Typography variant='h4' fontWeight={700}>Create purchase order</Typography>
              <Typography variant='body2' color='text.secondary'>Raise a supplier order with attachments, kit selections, and automated tax splits.</Typography>
            </Box>
            <Stack direction='row' spacing={1}>
              <Button variant='outlined' startIcon={<Save size={18} />} onClick={handleSubmit} disabled={createPoState.isLoading}>
                {createPoState.isLoading ? 'Saving…' : 'Save purchase order'}
              </Button>
            </Stack>
          </Stack>

          <Card>
            <CardHeader
              avatar={<Search size={18} />}
              title='Link service request'
              subheader='Select the service or work order this purchase order belongs to'
            />
            <CardContent>
              <Stack spacing={3}>
                <Autocomplete
                  options={serviceOptions}
                  value={selectedService}
                  onChange={handleServiceSelect}
                  inputValue={serviceInput}
                  onInputChange={(_event, value, reason) => {
                    if (reason === 'reset') return
                    setServiceInput(value)
                    setServiceSearch(value)
                  }}
                  getOptionLabel={serviceLabel}
                  isOptionEqualToValue={(option, value) => option?.id === value?.id}
                  filterOptions={(options) => options}
                  loading={servicesLoading}
                  loadingText='Loading services…'
                  noOptionsText={serviceSearch ? 'No matching services' : 'Start typing to search services'}
                  renderOption={(props, option) => {
                    const primary = serviceLabel(option)
                    const secondary = serviceSubtitle(option)
                    return (
                      <li {...props}>
                        <Stack spacing={0.25}>
                          <Typography variant='body2' fontWeight={600}>
                            {primary || 'Service'}
                          </Typography>
                          {secondary && (
                            <Typography variant='caption' color='text.secondary'>
                              {secondary}
                            </Typography>
                          )}
                        </Stack>
                      </li>
                    )
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label='Service'
                      placeholder='Search WAN / buyer / SR ID'
                      required
                    />
                  )}
                  clearOnBlur={false}
                />

                <Autocomplete
                  options={Array.isArray(templateOptions) ? templateOptions : []}
                  getOptionLabel={templateLabel}
                  onChange={handleTemplateSelect}
                  onInputChange={(_event, value) => setTemplateQuery(value || '')}
                  filterOptions={(options) => options}
                  loading={templatesLoading}
                  loadingText='Loading recent orders…'
                  noOptionsText={templateQuery ? 'No matching purchase orders' : 'Type to search previous orders'}
                  renderOption={(props, option) => {
                    const header = option?.header || option || {}
                    const supplierName = header?.supplierName || option?.supplier?.name || ''
                    const supplierAddress = header?.supplierAddress || option?.supplier?.address || ''
                    const secondary = [supplierName, supplierAddress].filter(Boolean).join(' • ')
                    return (
                      <li {...props}>
                        <Stack spacing={0.25}>
                          <Typography variant='body2' fontWeight={600}>{templateLabel(option)}</Typography>
                          {secondary && (
                            <Typography variant='caption' color='text.secondary'>{secondary}</Typography>
                          )}
                        </Stack>
                      </li>
                    )
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label='Reuse previous purchase order'
                      placeholder='Type supplier or voucher to search templates'
                    />
                  )}
                  clearOnBlur={false}
                />
                <Typography variant='caption' color='text.secondary'>Selecting a template copies supplier, items, and totals while keeping your company details intact.</Typography>
              </Stack>
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            <Grid item xs={12} lg={6}>
              <Card>
                <CardHeader title='Invoice to (Buyer)' subheader='Auto-filled from company profile, editable if required' />
                <CardContent>
                  <Stack spacing={2}>
                    <TextField
                      label='Company name'
                      value={poForm.buyer?.name ?? ''}
                      onChange={(event) => handlePoFormChange('buyer.name', event.target.value)}
                      required
                    />
                    <TextField
                      label='Address'
                      value={poForm.buyer?.address ?? ''}
                      onChange={(event) => handlePoFormChange('buyer.address', event.target.value)}
                      multiline
                      minRows={3}
                    />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label='Phone / cell'
                          value={poForm.buyer?.phone ?? ''}
                          onChange={(event) => handlePoFormChange('buyer.phone', event.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label='Email'
                          value={poForm.buyer?.email ?? ''}
                          onChange={(event) => handlePoFormChange('buyer.email', event.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label='GSTIN / UIN'
                          value={poForm.buyer?.gstin ?? ''}
                          onChange={(event) => handlePoFormChange('buyer.gstin', event.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label='Website'
                          value={poForm.buyer?.website ?? ''}
                          onChange={(event) => handlePoFormChange('buyer.website', event.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label='State name'
                          value={poForm.buyer?.stateName ?? ''}
                          onChange={(event) => handlePoFormChange('buyer.stateName', event.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label='State code'
                          value={poForm.buyer?.stateCode ?? ''}
                          onChange={(event) => handlePoFormChange('buyer.stateCode', event.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={6}>
              <Card>
                <CardHeader title='Supplier (Bill From)' subheader='The vendor receiving this purchase order' />
                <CardContent>
                  <Stack spacing={2}>
                    <TextField
                      label='Supplier name'
                      value={poForm.supplier?.name ?? ''}
                      onChange={(event) => handlePoFormChange('supplier.name', event.target.value)}
                      required
                    />
                    <TextField
                      label='Supplier address'
                      value={poForm.supplier?.address ?? ''}
                      onChange={(event) => handlePoFormChange('supplier.address', event.target.value)}
                      multiline
                      minRows={3}
                    />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label='GSTIN / UIN'
                          value={poForm.supplier?.gstin ?? ''}
                          onChange={(event) => handlePoFormChange('supplier.gstin', event.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label='Email'
                          value={poForm.supplier?.email ?? ''}
                          onChange={(event) => handlePoFormChange('supplier.email', event.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label='WhatsApp number'
                          value={poForm.supplier?.whatsapp ?? ''}
                          onChange={(event) => handlePoFormChange('supplier.whatsapp', event.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Autocomplete
                          options={INDIA_STATES}
                          value={supplierStateValue && supplierStateValue.code ? INDIA_STATES.find((opt) => opt.code === supplierStateValue.code) : null}
                          getOptionLabel={(option) => option?.name || ''}
                          onChange={handleSupplierStateSelect}
                          inputValue={supplierStateValue?.name || ''}
                          onInputChange={(_event, value, reason) => {
                            if (reason === 'input') {
                              handlePoFormChange('supplier.stateName', value)
                              if (!INDIA_STATES.some((opt) => opt.name === value)) {
                                handlePoFormChange('supplier.stateCode', '')
                              }
                            }
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label='Supplier state'
                              placeholder='Select state'
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label='State code'
                          value={poForm.supplier?.stateCode ?? ''}
                          onChange={(event) => handlePoFormChange('supplier.stateCode', event.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardHeader title='Order meta' subheader='Reference numbers, payment terms, dispatch details and destination' />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label='Voucher number'
                    value={poForm.voucherNumber ?? ''}
                    onChange={(event) => handlePoFormChange('voucherNumber', event.target.value)}
                    helperText='Auto-generated on save if left blank'
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label='Date'
                    type='date'
                    value={poForm.date ?? ''}
                    onChange={(event) => handlePoFormChange('date', event.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label='Reference number & date'
                    value={poForm.meta?.referenceNumberAndDate ?? ''}
                    onChange={(event) => handlePoFormChange('meta.referenceNumberAndDate', event.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label='Mode / terms of payment'
                    value={poForm.meta?.paymentTerms ?? ''}
                    onChange={(event) => handlePoFormChange('meta.paymentTerms', event.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label='Dispatched through'
                    value={poForm.meta?.dispatchedThrough ?? ''}
                    onChange={(event) => handlePoFormChange('meta.dispatchedThrough', event.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label='Destination'
                    value={poForm.meta?.destination ?? ''}
                    onChange={(event) => handlePoFormChange('meta.destination', event.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label='Other references'
                    value={poForm.meta?.otherReferences ?? ''}
                    onChange={(event) => handlePoFormChange('meta.otherReferences', event.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label='Terms of delivery'
                    value={poForm.meta?.termsOfDelivery ?? ''}
                    onChange={(event) => handlePoFormChange('meta.termsOfDelivery', event.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            <Grid item xs={12} lg={7}>
              <Card>
                <CardHeader
                  title='Line items'
                  subheader='Add kits or manual items. Descriptions default to "Supply of" phrasing for kits.'
                  action={
                    <Stack direction='row' spacing={1}>
                      <Button startIcon={<Plus size={18} />} onClick={handleAddBlankItem}>Add item</Button>
                    </Stack>
                  }
                />
                <CardContent>
                  <TableContainer component={Paper} variant='outlined'>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>Description of goods</TableCell>
                          <TableCell align='right'>Quantity</TableCell>
                          <TableCell align='center'>Unit</TableCell>
                          <TableCell align='right'>Rate (₹)</TableCell>
                          <TableCell align='right'>Amount (₹)</TableCell>
                          <TableCell align='right'>Remove</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {poItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} align='center'>No items yet. Add a kit or manual line item.</TableCell>
                          </TableRow>
                        ) : (
                          poItems.map((item, index) => (
                            <TableRow key={item.key} hover>
                              <TableCell sx={{ minWidth: 260 }}>
                                <TextField
                                  value={item.description}
                                  onChange={(event) => updateItem(index, 'description', event.target.value)}
                                  fullWidth
                                  multiline
                                  minRows={3}
                                  placeholder='Describe the goods or kit details'
                                  inputProps={{ 'aria-label': 'Description of goods' }}
                                />
                              </TableCell>
                              <TableCell align='right' sx={{ width: 120 }}>
                                <TextField
                                  type='number'
                                  label='Qty'
                                  value={item.quantity}
                                  onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                                  fullWidth
                                  inputProps={{ min: 0, step: '0.01' }}
                                  InputLabelProps={{ shrink: true }}
                                />
                              </TableCell>
                              <TableCell align='center' sx={{ width: 110 }}>
                                <TextField
                                  label='Unit'
                                  value={item.unit}
                                  onChange={(event) => updateItem(index, 'unit', event.target.value)}
                                  fullWidth
                                  InputLabelProps={{ shrink: true }}
                                />
                              </TableCell>
                              <TableCell align='right' sx={{ width: 140 }}>
                                <TextField
                                  type='number'
                                  label='Rate'
                                  value={item.rate}
                                  onChange={(event) => updateItem(index, 'rate', event.target.value)}
                                  fullWidth
                                  inputProps={{ min: 0, step: '0.01' }}
                                  InputLabelProps={{ shrink: true }}
                                />
                              </TableCell>
                              <TableCell align='right' sx={{ width: 150 }}>
                                <TextField
                                  type='number'
                                  label='Amount'
                                  value={item.amount}
                                  onChange={(event) => updateItem(index, 'amount', event.target.value)}
                                  fullWidth
                                  inputProps={{ min: 0, step: '0.01' }}
                                  InputLabelProps={{ shrink: true }}
                                />
                              </TableCell>
                              <TableCell align='right' sx={{ width: 70 }}>
                                <IconButton color='error' onClick={() => removeItem(index)}>
                                  <DeleteOutlineIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={5}>
              <Card>
                <CardHeader title='Kit catalogue' subheader='Search kits and add them as supply lines' />
                <CardContent>
                  <Stack spacing={2}>
                    <TextField
                      placeholder='Search kits by name, code, or description'
                      value={kitSearch}
                      onChange={(event) => {
                        setKitSearch(event.target.value)
                        setKitPage(0)
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position='start'>
                            <Search size={18} />
                          </InputAdornment>
                        )
                      }}
                    />
                    <TableContainer component={Paper} variant='outlined'>
                      <Table size='small'>
                        <TableHead>
                          <TableRow>
                            <TableCell>Kit</TableCell>
                            <TableCell align='right'>Price</TableCell>
                            <TableCell align='right'>Add</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {kits.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} align='center'>
                                {kitsLoading ? 'Loading kits…' : 'No kits found for the given search.'}
                              </TableCell>
                            </TableRow>
                          ) : (
                            kits.map((kit) => (
                              <TableRow key={kit.id} hover>
                                <TableCell>
                                  <Typography variant='body2' fontWeight={600}>{kit.name || 'Untitled kit'}</Typography>
                                  <Typography variant='caption' color='text.secondary'>{kit.description || '—'}</Typography>
                                </TableCell>
                                <TableCell align='right'>{fmtINR(kit.price)}</TableCell>
                                <TableCell align='right'>
                                  <Button size='small' startIcon={<Plus size={16} />} onClick={() => handleAddKit(kit)}>
                                    Add
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                      <TablePagination
                        component='div'
                        count={kitPageData.totalElements ?? kits.length}
                        page={kitPage}
                        onPageChange={(_event, value) => setKitPage(value)}
                        rowsPerPage={kitRowsPerPage}
                        onRowsPerPageChange={(event) => {
                          setKitRowsPerPage(parseInt(event.target.value, 10))
                          setKitPage(0)
                        }}
                        rowsPerPageOptions={[5, 10, 20]}
                      />
                    </TableContainer>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardHeader title='Totals & declarations' subheader='Review computed totals and add narration if required' />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label='Amount in words'
                    value={poForm.amountInWords ?? ''}
                    onChange={(event) => handlePoFormChange('amountInWords', event.target.value)}
                    multiline
                    minRows={2}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Company's PAN"
                    value={poForm.companyPan || ''}
                    onChange={(event) => handlePoFormChange('companyPan', event.target.value)}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

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
                <Stack direction='row' justifyContent='space-between'>
                  <Typography variant='body2'>IGST {poSummary.igstRate}%</Typography>
                  <Typography variant='body2' fontWeight={600}>{fmtINR(poSummary.igstAmount)}</Typography>
                </Stack>
                <Divider />
                <Stack direction='row' justifyContent='space-between'>
                  <Typography variant='subtitle1' fontWeight={700}>Grand total</Typography>
                  <Typography variant='subtitle1' fontWeight={700}>{fmtINR(poSummary.grandTotal)}</Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  )
}
