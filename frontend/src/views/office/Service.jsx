// src/views/office/Service.jsx
//
// A comprehensive service creation flow that mirrors the legacy HT Power
// experience but adopts the Material UI design system for a denser,
// professional layout. Business logic remains unchanged – the UI simply
// surfaces the existing behaviours in a refreshed presentation.

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'
import { IndianRupee, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  useAutocompleteServiceBuyersQuery,
  useCreateServiceMutation,
  useGetCompanyQuery,
  useGetKitsQuery
} from '../../features/office/officeApi'
import { normalizeDocNumber } from '../../utils/docNumbers'
import { focusNextInputOnEnter } from '../../utils/enterKeyNavigation'

const SERVICE_TYPES = [
  'Installation only',
  'Cable fault identification',
  'Hipot testing',
  'Supply only',
  'Supply with installation'
]

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry',
  'Chandigarh', 'Andaman & Nicobar', 'Dadra & Nagar Haveli & Daman & Diu', 'Lakshadweep'
]

const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(Number.isFinite(+n) ? +n : 0)

const safeNum = (v, fallback = 0) => (Number.isFinite(+v) ? +v : fallback)


const NumberField = ({ value, onChange, min, max, step = 1, ...props }) => {
  const handleChange = (event) => {
    const raw = event.target.value
    if (raw === '') {
      onChange?.('')
      return
    }
    const next = Number(raw)
    if (Number.isFinite(next)) {
      let computed = next
      if (typeof min === 'number') computed = Math.max(min, computed)
      if (typeof max === 'number') computed = Math.min(max, computed)
      onChange?.(computed)
    }
  }

  return (
    <TextField
      type='number'
      variant='outlined'
      size='small'
      value={value === null || value === undefined ? '' : value}
      onChange={handleChange}
      inputProps={{ min, max, step, style: { textAlign: 'right' } }}
      onWheel={(e) => e.currentTarget.blur()}
      onKeyDown={focusNextInputOnEnter}
      fullWidth
      {...props}
    />
  )
}

const Section = ({ title, action, children, subheader }) => (
  <Card variant='outlined' sx={{ borderRadius: 2 }}>
    <CardHeader
      title={<Typography variant='subtitle1' fontWeight={600}>{title}</Typography>}
      subheader={subheader}
      action={action}
      sx={{
        py: 1.5,
        '& .MuiCardHeader-action': { alignSelf: 'center', marginTop: 0 },
        '& .MuiCardHeader-content': { minWidth: 0 }
      }}
    />
    <Divider />
    <CardContent sx={{ pt: 2.5, '&:last-child': { pb: 2.5 } }}>
      {children}
    </CardContent>
  </Card>
)

const KitCatalogue = ({ kits, onAdd, pageSize: initialPageSize = 20 }) => {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return kits
    return kits.filter((k) => [k.code, k.name].some((v) => (v || '').toLowerCase().includes(needle)))
  }, [kits, q])

  useEffect(() => {
    setPage(0)
  }, [q, pageSize])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const start = page * pageSize
  const rows = filtered.slice(start, start + pageSize)

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems='center'>
        <TextField
          value={q}
          onChange={(event) => setQ(event.target.value)}
          onKeyDown={focusNextInputOnEnter}
          placeholder='Search kits by code or name'
          size='small'
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <Search size={16} />
              </InputAdornment>
            )
          }}
        />
        <TextField
          select
          label='Rows'
          size='small'
          value={pageSize}
          onChange={(event) => setPageSize(Number(event.target.value))}
          onKeyDown={focusNextInputOnEnter}
          sx={{ minWidth: 120 }}
        >
          {[10, 20, 50, 100].map((n) => (
            <MenuItem key={n} value={n}>{n}</MenuItem>
          ))}
        </TextField>
        <Typography variant='body2' color='text.secondary' sx={{ flexGrow: 1, textAlign: { xs: 'left', sm: 'right' } }}>
          Showing {filtered.length ? start + 1 : 0}–{Math.min(filtered.length, start + pageSize)} of {filtered.length}
        </Typography>
      </Stack>

      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell width='18%'>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell align='right' width='18%'>Base price</TableCell>
              <TableCell align='right' width='12%'>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((kit) => (
              <TableRow hover key={`${kit.id ?? kit.code}-${kit.code}`}>
                <TableCell>
                  <Typography variant='body2' fontFamily='JetBrains Mono, monospace'>{kit.code}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant='body2' fontWeight={500}>{kit.name}</Typography>
                  <Typography variant='caption' color='text.secondary'>HSN/SAC {kit.hsnSac}</Typography>
                </TableCell>
                <TableCell align='right'><Typography variant='body2'>{fmtINR(kit.basePrice)}</Typography></TableCell>
                <TableCell align='right'>
                  <Button
                    size='small'
                    variant='contained'
                    onClick={() => onAdd(kit)}
                  >
                    Add
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align='center'>
                  <Typography variant='body2' color='text.secondary'>No kits match “{q}”.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack direction='row' spacing={1} justifyContent='flex-end'>
        <Button size='small' variant='outlined' disabled={page === 0} onClick={() => setPage(0)}>First</Button>
        <Button size='small' variant='outlined' disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</Button>
        <Button size='small' variant='outlined' disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>Next</Button>
        <Button size='small' variant='outlined' disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>Last</Button>
      </Stack>
    </Stack>
  )
}

export default function Service () {
  const navigate = useNavigate()
  const [createService, { isLoading: creating }] = useCreateServiceMutation()

  const [buyer, setBuyer] = useState({ name: '', gst: '', address: '', pin: '', state: '', contact: '', email: '' })
  const [consignee, setConsignee] = useState({ name: '', gst: '', address: '', pin: '', state: '' })

  const [buyerQuery, setBuyerQuery] = useState('')
  const [showBuyerSuggestions, setShowBuyerSuggestions] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      const name = String(buyer.name || '').trim()
      if (name.length > 1) {
        setBuyerQuery(name)
      } else {
        setBuyerQuery('')
        setShowBuyerSuggestions(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [buyer.name])

  const { data: buyerSuggestions = [] } = useAutocompleteServiceBuyersQuery(
    { q: buyerQuery, limit: 5 },
    { skip: !buyerQuery }
  )

  useEffect(() => {
    if (buyerQuery && buyerSuggestions && buyerSuggestions.length > 0) {
      setShowBuyerSuggestions(true)
    } else {
      setShowBuyerSuggestions(false)
    }
  }, [buyerQuery, buyerSuggestions])

  const handleSelectBuyerSuggestion = (suggestion) => {
    setBuyer({
      name: suggestion.buyerName || '',
      gst: suggestion.buyerGst || '',
      address: suggestion.buyerAddress || '',
      pin: suggestion.buyerPin || '',
      state: suggestion.buyerState || '',
      contact: suggestion.buyerContact || '',
      email: suggestion.buyerEmail || ''
    })
    setShowBuyerSuggestions(false)
  }

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

  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [transport, setTransport] = useState(0)

  const { data: kitsData = [] } = useGetKitsQuery(undefined)
  const catalog = useMemo(() => (kitsData || []).map((k) => ({
    ...k,
    code: k.code || k.id,
    name: k.name,
    hsnSac: k.hsnSac || '854690',
    basePrice: safeNum(k.price, 0)
  })), [kitsData])

  const addBlank = () => {
    setItems((prev) => ([
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
    ]))
  }

  const addInstallation = () => {
    setItems((prev) => ([
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
    ]))
  }

  const addTransportLine = () => {
    setItems((prev) => ([
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
    ]))
  }

  const addKit = (kit) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((p) => p.code === kit.code && (p.hsnSac || kit.hsnSac))
      if (existingIdx >= 0) {
        const clone = [...prev]
        clone[existingIdx] = { ...clone[existingIdx], qty: safeNum(clone[existingIdx].qty, 0) + 1 }
        return clone
      }
      return [
        ...prev,
        {
          key: `${kit.code}-${Date.now()}`,
          code: kit.code,
          name: kit.name,
          basePrice: safeNum(kit.basePrice, 0),
          qty: 1,
          discount: '',
          hsnSac: kit.hsnSac || '854690'
        }
      ]
    })
  }

  const updateItem = (idx, patch) => {
    setItems((prev) => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], ...patch }
      return copy
    })
  }

  const removeItem = (idx) => setItems((prev) => prev.filter((_, index) => index !== idx))

  const clearAllItems = () => {
    if (!items.length) return
    if (window.confirm('Delete all item lines? This cannot be undone.')) {
      setItems([])
    }
  }

  const { data: companyProfile } = useGetCompanyQuery()
  const counterpartyState = buyer.state || ''
  const companyState = companyProfile?.state || 'Tamil Nadu'
  const normalBuyer = String(counterpartyState || '').trim().toLowerCase().replace(/\s+/g, '')
  const normalCompany = String(companyState || '').trim().toLowerCase().replace(/\s+/g, '')
  const sameState = normalBuyer === normalCompany || normalBuyer === 'tamilnadu'
  const cgstRate = sameState ? 9 : 0
  const sgstRate = sameState ? 9 : 0
  const igstRate = sameState ? 0 : 18

  const hasTransportLine = useMemo(() => items.some((it) => /transport/i.test(it.name || '')), [items])

  const totals = useMemo(() => {
    const raw = items.reduce((acc, it) => acc + safeNum(it.basePrice, 0) * safeNum(it.qty, 0), 0)
    const afterDisc = items.reduce((acc, it) => {
      const line = safeNum(it.basePrice, 0) * safeNum(it.qty, 0)
      return acc + line * (1 - safeNum(it.discount, 0) / 100)
    }, 0)
    const discountSavings = Math.round(raw - afterDisc)
    const subtotal = Math.round(afterDisc)
    const transportCharge = hasTransportLine ? 0 : Math.round(safeNum(transport, 0))
    const base = subtotal + transportCharge
    const cgst = Math.round((base * cgstRate) / 100)
    const sgst = Math.round((base * sgstRate) / 100)
    const igst = Math.round((base * igstRate) / 100)
    const grand = base + cgst + sgst + igst
    return { raw, discountSavings, subtotal, transport: transportCharge, cgstRate, sgstRate, igstRate, cgst, sgst, igst, grand }
  }, [items, transport, cgstRate, sgstRate, igstRate, hasTransportLine])

  const buildPayload = () => {
    const cleanMeta = {
      ...meta,
      invoiceNo: normalizeDocNumber(meta.invoiceNo),
      pinvNo: normalizeDocNumber(meta.pinvNo)
    }
    return {
      buyer,
      consignee,
      meta: cleanMeta,
      items,
      totals
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

  const handleSubmit = async (event) => {
    event.preventDefault()
    await handleCreateService()
  }

  const filteredIdx = items
    .map((it, idx) => ({ it, idx }))
    .filter(({ it }) => {
      if (!search.trim()) return true
      const needle = search.toLowerCase()
      return [it.code, it.name].some((value) => (value || '').toLowerCase().includes(needle))
    })

  const renderBuyerSuggestions = () => {
    if (!showBuyerSuggestions || !buyerSuggestions?.length) return null
    return (
      <Card elevation={8} sx={{ position: 'absolute', width: '100%', zIndex: 10, mt: 0.5 }}>
        <Stack spacing={0}>
          {buyerSuggestions.map((suggestion, idx) => (
            <Box
              key={`${suggestion.buyerGst || suggestion.buyerName || idx}`}
              sx={{ px: 1.5, py: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              onMouseDown={() => handleSelectBuyerSuggestion(suggestion)}
            >
              <Typography variant='body2' fontWeight={600}>{suggestion.buyerName}</Typography>
              <Typography variant='caption' color='text.secondary'>
                {(suggestion.buyerContact || '—')}{suggestion.buyerGst ? ` • ${suggestion.buyerGst}` : ''}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Card>
    )
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100%', py: 3 }}>
      <Container maxWidth='xl'>
        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 2 }}>
          <Typography variant='h5' fontWeight={600}>New Service</Typography>
          <Button variant='outlined' size='small' onClick={() => navigate('/office/kits')}>
            Manage Kits
          </Button>
        </Stack>

        <Stack spacing={2.5} component='form' autoComplete='off' onSubmit={handleSubmit}>
          <Section title='Buyer & Consignee'>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Stack spacing={2}>
                  <Box sx={{ position: 'relative' }}>
                    <TextField
                      label='Buyer (Bill To) name'
                      value={buyer.name}
                      onChange={(event) => setBuyer((prev) => ({ ...prev, name: event.target.value }))}
                      onBlur={() => setTimeout(() => setShowBuyerSuggestions(false), 150)}
                      onFocus={() => buyerSuggestions?.length && setShowBuyerSuggestions(true)}
                      onKeyDown={focusNextInputOnEnter}
                      fullWidth
                      size='small'
                    />
                    {renderBuyerSuggestions()}
                  </Box>
                  <TextField
                    label='Buyer GSTIN'
                    value={buyer.gst}
                    onChange={(event) => setBuyer((prev) => ({ ...prev, gst: event.target.value.toUpperCase() }))}
                    onKeyDown={focusNextInputOnEnter}
                    size='small'
                  />
                  <TextField
                    label='Buyer address'
                    value={buyer.address}
                    onChange={(event) => setBuyer((prev) => ({ ...prev, address: event.target.value }))}
                    onKeyDown={focusNextInputOnEnter}
                    size='small'
                    multiline
                    minRows={2}
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        label='PIN'
                        value={buyer.pin}
                        onChange={(event) => setBuyer((prev) => ({ ...prev, pin: event.target.value }))}
                        onKeyDown={focusNextInputOnEnter}
                        size='small'
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        select
                        label='State'
                        value={buyer.state}
                        onChange={(event) => setBuyer((prev) => ({ ...prev, state: event.target.value }))}
                        onKeyDown={focusNextInputOnEnter}
                        size='small'
                      >
                        <MenuItem value=''>Select state…</MenuItem>
                        {INDIAN_STATES.map((state) => (
                          <MenuItem key={state} value={state}>{state}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  </Grid>
                  <TextField
                    label='Buyer contact'
                    value={buyer.contact}
                    onChange={(event) => setBuyer((prev) => ({ ...prev, contact: event.target.value }))}
                    onKeyDown={focusNextInputOnEnter}
                    size='small'
                  />
                  <TextField
                    label='Buyer email'
                    value={buyer.email}
                    onChange={(event) => setBuyer((prev) => ({ ...prev, email: event.target.value }))}
                    onKeyDown={focusNextInputOnEnter}
                    size='small'
                  />
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack spacing={2}>
                  <TextField
                    label='Consignee (Ship To) name'
                    value={consignee.name}
                    onChange={(event) => setConsignee((prev) => ({ ...prev, name: event.target.value }))}
                    onKeyDown={focusNextInputOnEnter}
                    size='small'
                  />
                  <TextField
                    label='Consignee GSTIN'
                    value={consignee.gst}
                    onChange={(event) => setConsignee((prev) => ({ ...prev, gst: event.target.value.toUpperCase() }))}
                    onKeyDown={focusNextInputOnEnter}
                    size='small'
                  />
                  <TextField
                    label='Consignee address'
                    value={consignee.address}
                    onChange={(event) => setConsignee((prev) => ({ ...prev, address: event.target.value }))}
                    onKeyDown={focusNextInputOnEnter}
                    size='small'
                    multiline
                    minRows={2}
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        label='PIN'
                        value={consignee.pin}
                        onChange={(event) => setConsignee((prev) => ({ ...prev, pin: event.target.value }))}
                        onKeyDown={focusNextInputOnEnter}
                        size='small'
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        select
                        label='State'
                        value={consignee.state}
                        onChange={(event) => setConsignee((prev) => ({ ...prev, state: event.target.value }))}
                        onKeyDown={focusNextInputOnEnter}
                        size='small'
                      >
                        <MenuItem value=''>Select state…</MenuItem>
                        {INDIAN_STATES.map((state) => (
                          <MenuItem key={state} value={state}>{state}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  </Grid>
                </Stack>
              </Grid>
            </Grid>
          </Section>

          <Section title='Invoice meta & terms'>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label='Invoice number'
                  value={meta.invoiceNo}
                  onChange={(event) => setMeta((prev) => ({ ...prev, invoiceNo: normalizeDocNumber(event.target.value) }))}
                  onKeyDown={focusNextInputOnEnter}
                  size='small'
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label='Invoice date'
                  type='date'
                  value={meta.invoiceDate}
                  onChange={(event) => setMeta((prev) => ({ ...prev, invoiceDate: event.target.value }))}
                  onKeyDown={focusNextInputOnEnter}
                  size='small'
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label='PINV number'
                  value={meta.pinvNo}
                  onChange={(event) => setMeta((prev) => ({ ...prev, pinvNo: normalizeDocNumber(event.target.value) }))}
                  onKeyDown={focusNextInputOnEnter}
                  size='small'
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label='PINV date'
                  type='date'
                  value={meta.pinvDate}
                  onChange={(event) => setMeta((prev) => ({ ...prev, pinvDate: event.target.value }))}
                  onKeyDown={focusNextInputOnEnter}
                  size='small'
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label='Buyer order / PO / WO number'
                  value={meta.buyerOrderNo}
                  onChange={(event) => setMeta((prev) => ({ ...prev, buyerOrderNo: event.target.value }))}
                  onKeyDown={focusNextInputOnEnter}
                  size='small'
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label='Order / PO / WO date'
                  type='date'
                  value={meta.orderDate}
                  onChange={(event) => setMeta((prev) => ({ ...prev, orderDate: event.target.value }))}
                  onKeyDown={focusNextInputOnEnter}
                  size='small'
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label='Delivery challan number'
                  value={meta.dcNo}
                  onChange={(event) => setMeta((prev) => ({ ...prev, dcNo: event.target.value }))}
                  onKeyDown={focusNextInputOnEnter}
                  size='small'
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label='Work completion certificate number'
                  value={meta.wcNo}
                  onChange={(event) => setMeta((prev) => ({ ...prev, wcNo: event.target.value }))}
                  onKeyDown={focusNextInputOnEnter}
                  size='small'
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label='Service type'
                  value={meta.serviceType}
                  onChange={(event) => setMeta((prev) => ({ ...prev, serviceType: event.target.value }))}
                  onKeyDown={focusNextInputOnEnter}
                  size='small'
                  fullWidth
                >
                  <MenuItem value=''>Select service…</MenuItem>
                  {SERVICE_TYPES.map((service) => (
                    <MenuItem key={service} value={service}>{service}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label='Narration / remarks'
                  value={meta.narration}
                  onChange={(event) => setMeta((prev) => ({ ...prev, narration: event.target.value }))}
                  onKeyDown={focusNextInputOnEnter}
                  size='small'
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label='Terms & conditions (one per line)'
                  value={meta.terms}
                  onChange={(event) => setMeta((prev) => ({ ...prev, terms: event.target.value }))}
                  onKeyDown={focusNextInputOnEnter}
                  size='small'
                  fullWidth
                  multiline
                  minRows={4}
                />
              </Grid>
            </Grid>
          </Section>

          <Section title='Kits catalogue' subheader='Add items from your master list.'>
            <KitCatalogue kits={catalog} onAdd={addKit} />
          </Section>

          <Section
            title='Items & services'
            action={(
              <Stack direction='row' spacing={1}>
                <Button variant='contained' size='small' color='success' onClick={addBlank}>+ Line</Button>
                <Button variant='contained' size='small' onClick={addInstallation}>+ Installation</Button>
                <Button variant='contained' size='small' color='info' onClick={addTransportLine}>+ Transport</Button>
                <Button variant='outlined' size='small' color='error' onClick={clearAllItems} startIcon={<Trash2 size={16} />}>Clear</Button>
              </Stack>
            )}
          >
            <Stack spacing={2.5}>
              <TextField
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={focusNextInputOnEnter}
                placeholder='Filter lines by code or description'
                size='small'
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Search size={16} />
                    </InputAdornment>
                  )
                }}
              />

              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Description</TableCell>
                      <TableCell width='12%'>HSN / SAC</TableCell>
                      <TableCell align='right' width='12%'>Base (₹)</TableCell>
                      <TableCell align='right' width='10%'>Qty</TableCell>
                      <TableCell align='right' width='12%'>Disc %</TableCell>
                      <TableCell align='right' width='12%'>Line total</TableCell>
                      <TableCell align='right' width='6%'>Delete</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredIdx.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align='center'>
                          <Typography variant='body2' color='text.secondary'>No lines yet. Add one from the actions above.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredIdx.map(({ it, idx }) => {
                      const qty = safeNum(it.qty, 0)
                      const disc = safeNum(it.discount, 0)
                      const lineTotal = Math.round(safeNum(it.basePrice, 0) * qty * (1 - disc / 100))
                      return (
                        <TableRow hover key={it.key}>
                          <TableCell>
                            <Stack spacing={1.2}>
                              <TextField
                                size='small'
                                value={it.name}
                                onChange={(event) => updateItem(idx, { name: event.target.value })}
                                onKeyDown={focusNextInputOnEnter}
                                placeholder='Service / goods name'
                                fullWidth
                              />
                              <TextField
                                size='small'
                                value={it.code}
                                onChange={(event) => updateItem(idx, { code: event.target.value })}
                                onKeyDown={focusNextInputOnEnter}
                                placeholder='Code (optional)'
                                sx={{ maxWidth: 180 }}
                              />
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size='small'
                              value={it.hsnSac}
                              onChange={(event) => updateItem(idx, { hsnSac: event.target.value })}
                              onKeyDown={focusNextInputOnEnter}
                              placeholder='995461'
                              fullWidth
                            />
                          </TableCell>
                          <TableCell align='right'>
                            <NumberField
                              value={it.basePrice}
                              min={0}
                              step={100}
                              onChange={(value) => updateItem(idx, { basePrice: value === '' ? '' : value })}
                              onBlur={() => {
                                if (it.basePrice === '' || Number(it.basePrice) < 0) {
                                  updateItem(idx, { basePrice: 0 })
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell align='right'>
                            <NumberField
                              value={it.qty}
                              min={1}
                              onChange={(value) => updateItem(idx, { qty: value === '' ? '' : value })}
                              onBlur={() => {
                                if (it.qty === '' || Number(it.qty) < 1) {
                                  updateItem(idx, { qty: 1 })
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell align='right'>
                            <NumberField
                              value={it.discount}
                              min={0}
                              max={100}
                              step={1}
                              onChange={(value) => updateItem(idx, { discount: value === '' ? '' : Math.max(0, Math.min(100, value)) })}
                            />
                          </TableCell>
                          <TableCell align='right'>
                            <Typography variant='body2' fontWeight={600}>{fmtINR(lineTotal)}</Typography>
                          </TableCell>
                          <TableCell align='right'>
                            <Tooltip title='Remove line'>
                              <span>
                                <IconButton color='error' size='small' onClick={() => removeItem(idx)}>
                                  <Trash2 size={16} />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label='Transportation charges (₹)'
                    value={hasTransportLine ? 0 : transport}
                    onChange={(event) => setTransport(Number(event.target.value) || 0)}
                    onKeyDown={focusNextInputOnEnter}
                    disabled={hasTransportLine}
                    size='small'
                    type='number'
                    fullWidth
                    InputProps={{ inputProps: { min: 0, step: 100 }, endAdornment: <InputAdornment position='end'>₹</InputAdornment> }}
                  />
                  {hasTransportLine && (
                    <Typography variant='caption' color='text.secondary'>A transport line already exists – this field is disabled.</Typography>
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  <Stack direction='row' spacing={1.5} justifyContent='flex-end'>
                    <Chip label={`CGST ${cgstRate}%`} color='default' variant='outlined' />
                    <Chip label={`SGST ${sgstRate}%`} color='default' variant='outlined' />
                    <Chip label={`IGST ${igstRate}%`} color='default' variant='outlined' />
                  </Stack>
                </Grid>
              </Grid>

              <Card variant='outlined' sx={{ borderRadius: 1.5 }}>
                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
                  <Stack spacing={0.5}>
                    <Typography variant='body2'>Subtotal: <strong>{fmtINR(totals.subtotal)}</strong></Typography>
                    <Typography variant='body2'>Discount savings: <strong>{fmtINR(totals.discountSavings)}</strong></Typography>
                    <Typography variant='body2'>Transport: <strong>{fmtINR(totals.transport)}</strong></Typography>
                    {sameState ? (
                      <>
                        <Typography variant='body2'>CGST {cgstRate}%: <strong>{fmtINR(totals.cgst)}</strong></Typography>
                        <Typography variant='body2'>SGST {sgstRate}%: <strong>{fmtINR(totals.sgst)}</strong></Typography>
                      </>
                    ) : (
                      <Typography variant='body2'>IGST {igstRate}%: <strong>{fmtINR(totals.igst)}</strong></Typography>
                    )}
                  </Stack>
                  <Stack direction='row' alignItems='center' spacing={1}>
                    <IndianRupee size={18} />
                    <Typography variant='h6' fontWeight={700}>{fmtINR(totals.grand)}</Typography>
                  </Stack>
                </CardContent>
              </Card>

              <Stack direction='row' spacing={1} justifyContent='flex-end'>
                <Button
                  variant='outlined'
                  onClick={() => {
                    const payload = buildPayload()
                    payload.meta = { ...(payload.meta || {}), docType: 'INVOICE' }
                    navigate('/office/preview', { state: { ...payload, docType: 'INVOICE' } })
                  }}
                >
                  Export invoice
                </Button>
                <Button
                  variant='outlined'
                  onClick={() => {
                    const payload = buildPayload()
                    payload.meta = { ...(payload.meta || {}), docType: 'PROFORMA' }
                    navigate('/office/preview-proforma', { state: { ...payload, docType: 'PROFORMA' } })
                  }}
                >
                  Export proforma
                </Button>
                <Button
                  type='submit'
                  variant='contained'
                  color='success'
                  disabled={creating}
                >
                  {creating ? 'Creating…' : 'Create service'}
                </Button>
              </Stack>
            </Stack>
          </Section>
        </Stack>
      </Container>
    </Box>
  )
}
