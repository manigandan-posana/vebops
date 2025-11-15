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
import InputAdornment from '@mui/material/InputAdornment'
import { FileDown, Plus, RefreshCcw, Send, Eye, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { skipToken } from '@reduxjs/toolkit/query'
import { useNavigate } from 'react-router-dom'
import {
  useListPurchaseOrdersQuery,
  useDownloadPurchaseOrderPdfMutation,
  useSendPurchaseOrderMutation,
  useGetPurchaseOrderQuery
} from '../../features/office/officeApi'
import { fmtINR } from './purchaseOrders/utils'

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

const emptyPage = { content: [], totalElements: 0, totalPages: 0, size: 25, number: 0 }

export default function PurchaseOrders () {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchTerm(searchInput.trim())
      setPage(0)
    }, 250)
    return () => clearTimeout(handle)
  }, [searchInput])

  const queryArgs = useMemo(() => ({
    page,
    size: rowsPerPage,
    sort: 'createdAt,desc',
    q: searchTerm || undefined
  }), [page, rowsPerPage, searchTerm])

  const {
    data: poPage = emptyPage,
    isFetching,
    refetch: refetchPurchaseOrders
  } = useListPurchaseOrdersQuery(queryArgs)
  const purchaseOrders = poPage?.content ?? []

  const [downloadPoPdf] = useDownloadPurchaseOrderPdfMutation()
  const [sendPurchaseOrder, sendPoState] = useSendPurchaseOrderMutation()
  const [poSendModal, setPoSendModal] = useState({ open: false, id: null, method: 'email', contact: '' })
  const [poDetailOpen, setPoDetailOpen] = useState(false)
  const [selectedPoId, setSelectedPoId] = useState(null)
  const { data: selectedPoDetail } = useGetPurchaseOrderQuery(selectedPoId ?? skipToken)

  const handleCreateNavigate = useCallback(() => {
    navigate('/office/purchase-orders/new')
  }, [navigate])

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
              <Button variant='contained' startIcon={<Plus size={18} />} onClick={handleCreateNavigate}>
                New purchase order
              </Button>
            </Stack>
          </Stack>

          <Card>
            <CardHeader
              title='Filters'
              subheader='Search by voucher number, supplier, or buyer'
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6} lg={4}>
                  <TextField
                    label='Search purchase orders'
                    placeholder='Search voucher, supplier, or buyer'
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position='start'>
                          <Search size={16} />
                        </InputAdornment>
                      )
                    }}
                    fullWidth
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
                  <Stack direction='row' justifyContent='space-between'>
                    <Typography variant='body2'>IGST {selectedPoDetail?.totals?.igstRate ?? 0}%</Typography>
                    <Typography variant='body2' fontWeight={600}>{fmtINR(selectedPoDetail?.totals?.igstAmount)}</Typography>
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
