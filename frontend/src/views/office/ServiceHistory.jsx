// src/views/office/ServiceHistory.jsx
//
// Service history rendered with Material UI components. Behaviour matches the
// previous implementation while presenting information in a denser, more
// professional layout with keyboard-friendly interactions.

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
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
import { FileDown, Search, Send, Share2 } from 'lucide-react'
import { Toaster, toast } from 'react-hot-toast'
import {
  useDownloadServiceInvoiceMutation,
  useGetServicesQuery,
  useSendServiceInvoiceMutation,
  useShareServiceProposalMutation
} from '../../features/office/officeApi'
import { displayDocNumber } from '../../utils/docNumbers'
import { focusNextInputOnEnter } from '../../utils/enterKeyNavigation'

const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(Number.isFinite(+n) ? +n : 0)

const FILTER_STORAGE_KEY = 'vebops.serviceHistory.filters'


export default function ServiceHistory () {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(FILTER_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.q === 'string') setQ(parsed.q)
        const storedSize = Number(parsed.size)
        if (Number.isFinite(storedSize) && storedSize > 0) setSize(storedSize)
      }
    } catch {
      // ignore
    }
  }, [])

  const { data = { content: [], page: 0, size: 0, totalPages: 0, totalElements: 0 }, isFetching } =
    useGetServicesQuery({ q: q?.trim() || undefined, page, size, sort: 'createdAt,desc' })

  const [modal, setModal] = useState({ open: false, serviceId: null, method: 'email', contact: '', docType: 'INVOICE' })
  const [downloadInvoice] = useDownloadServiceInvoiceMutation()
  const [sendServiceInvoice, sendState] = useSendServiceInvoiceMutation()
  const [shareServiceProposal] = useShareServiceProposalMutation()
  const [sharingId, setSharingId] = useState(null)

  const openSendModal = (srv, docType = 'INVOICE') => {
    const contact = srv?.buyerContact || ''
    setModal({ open: true, serviceId: srv.id, method: 'email', contact, docType })
  }

  const closeModal = () => setModal((m) => ({ ...m, open: false }))

  const handleSend = async () => {
    if (!modal.contact || !modal.serviceId) {
      toast.error('Please enter a valid email or mobile number')
      return
    }
    const payload = { id: modal.serviceId }
    if (modal.method === 'email') {
      payload.toEmail = modal.contact
    } else {
      payload.toWhatsapp = modal.contact
    }
    const res = await sendServiceInvoice({ ...payload, type: modal.docType || 'INVOICE' })
    if ('error' in res) {
      toast.error(res.error?.data?.message || 'Failed to send invoice')
    } else {
      toast.success('Invoice sent to customer')
      closeModal()
    }
  }

  const handleDownload = async (serviceId, docType) => {
    try {
      const trigger = downloadInvoice({ id: serviceId, type: docType })
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

  const handleShare = async (srv, docType = 'PROFORMA') => {
    if (!srv?.id) return
    try {
      setSharingId(srv.id)
      const res = await shareServiceProposal({ id: srv.id, docType }).unwrap()
      const pid = res?.proposalId ? `P-${res.proposalId}` : 'proposal'
      toast.success(`${pid} shared to portal`)
    } catch (e) {
      toast.error(String(e?.data?.message || e?.error || e?.message || 'Failed to share proposal'))
    } finally {
      setSharingId(null)
    }
  }

  useEffect(() => {
    setPage(0)
  }, [q, size])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({ q, size }))
    } catch {
      // ignore
    }
  }, [q, size])

  const { content, totalPages, totalElements } = data

  const firstRow = useMemo(() => (totalElements === 0 ? 0 : page * size + 1), [page, size, totalElements])
  const lastRow = useMemo(() => {
    if (!content || content.length === 0) return 0
    return page * size + content.length
  }, [content, page, size])

  const goFirst = () => setPage(0)
  const goPrev = () => setPage((p) => Math.max(0, p - 1))
  const goNext = () => setPage((p) => Math.min(totalPages - 1, p + 1))
  const goLast = () => setPage(totalPages - 1)

  const renderStatus = useCallback((status) => {
    const tone = {
      CREATED: { label: 'Created', color: 'default' },
      SENT: { label: 'Sent', color: 'info' },
      COMPLETED: { label: 'Completed', color: 'success' }
    }
    const meta = tone[status] || { label: status || 'Unknown', color: 'default' }
    return <Chip label={meta.label} color={meta.color} size='small' variant='outlined' />
  }, [])

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100%', py: 3 }}>
      <Container maxWidth='xl'>
        <Toaster />
        <Card variant='outlined' sx={{ borderRadius: 2 }}>
          <CardHeader
            title={<Typography variant='h5' fontWeight={600}>Service History</Typography>}
            subheader={<Typography variant='body2' color='text.secondary'>Review and act on previously created services.</Typography>}
            sx={{ pb: 0.5 }}
          />
          <CardContent>
            <Stack spacing={3}>
              <Grid container spacing={2} alignItems='center'>
                <Grid item xs={12} md={6} lg={5}>
                  <TextField
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    onKeyDown={focusNextInputOnEnter}
                    placeholder='Search by buyer, GSTIN or contact'
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
                </Grid>
                <Grid item xs={6} md={3} lg={2}>
                  <TextField
                    select
                    label='Rows'
                    size='small'
                    value={size}
                    onChange={(event) => setSize(Number(event.target.value))}
                    onKeyDown={focusNextInputOnEnter}
                    fullWidth
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <MenuItem key={n} value={n}>{n}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6} md={3} lg={2}>
                  <Typography variant='body2' color='text.secondary'>Showing {firstRow}–{lastRow} of {totalElements}</Typography>
                </Grid>
                <Grid item xs={12} md={6} lg={3} textAlign={{ xs: 'left', md: 'right' }}>
                  <Stack direction='row' spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                    <Button variant='outlined' size='small' disabled={page === 0} onClick={goFirst}>First</Button>
                    <Button variant='outlined' size='small' disabled={page === 0} onClick={goPrev}>Prev</Button>
                    <Button variant='outlined' size='small' disabled={page >= totalPages - 1} onClick={goNext}>Next</Button>
                    <Button variant='outlined' size='small' disabled={page >= totalPages - 1} onClick={goLast}>Last</Button>
                  </Stack>
                </Grid>
              </Grid>

              <Divider />

              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice</TableCell>
                      <TableCell>Buyer</TableCell>
                      <TableCell>Service type</TableCell>
                      <TableCell align='right'>Total</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align='center'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isFetching && (!content || content.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} align='center'>
                          <Typography variant='body2' color='text.secondary'>Loading services…</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {!isFetching && (!content || content.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} align='center'>
                          <Typography variant='body2' color='text.secondary'>No services found.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {content.map((srv) => (
                      <TableRow hover key={srv.id}>
                        <TableCell>
                          <Stack spacing={0.3}>
                            <Typography variant='body2' fontWeight={600}>{displayDocNumber(srv.invoiceNumber)}</Typography>
                            <Typography variant='caption' color='text.secondary'>#{srv.id}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.3}>
                            <Typography variant='body2'>{srv.buyerName || '—'}</Typography>
                            <Typography variant='caption' color='text.secondary'>{srv.buyerGst || srv.buyerContact || '—'}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction='row' spacing={1} alignItems='center'>
                            {renderStatus(srv.status)}
                            <Typography variant='body2' color='text.secondary'>{srv.serviceType || '—'}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2' fontWeight={600}>{fmtINR(srv.grandTotal || srv.total)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>{new Date(srv.createdAt).toLocaleString()}</Typography>
                        </TableCell>
                        <TableCell align='center'>
                          <Stack direction='row' spacing={1} justifyContent='center'>
                            <Tooltip title='Download invoice'>
                              <span>
                                <IconButton size='small' onClick={() => handleDownload(srv.id, 'INVOICE')}>
                                  <FileDown size={16} />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title='Share proposal to portal'>
                              <span>
                                <IconButton
                                  size='small'
                                  onClick={() => handleShare(srv, 'PROFORMA')}
                                  disabled={sharingId === srv.id}
                                >
                                  <Share2 size={16} />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title='Send to customer'>
                              <span>
                                <IconButton size='small' onClick={() => openSendModal(srv)}>
                                  <Send size={16} />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Button component={Link} to={`/office/services/${srv.id}`} size='small' variant='outlined'>Open</Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </CardContent>
        </Card>
      </Container>

      <Dialog open={modal.open} onClose={closeModal} maxWidth='xs' fullWidth>
        <DialogTitle>Send document</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label='Method'
              value={modal.method}
              onChange={(event) => setModal((m) => ({ ...m, method: event.target.value }))}
              onKeyDown={focusNextInputOnEnter}
              size='small'
            >
              <MenuItem value='email'>Email</MenuItem>
              <MenuItem value='whatsapp'>WhatsApp</MenuItem>
            </TextField>
            <TextField
              label={modal.method === 'email' ? 'Email address' : 'WhatsApp number'}
              value={modal.contact}
              onChange={(event) => setModal((m) => ({ ...m, contact: event.target.value }))}
              onKeyDown={focusNextInputOnEnter}
              size='small'
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeModal} color='inherit'>Cancel</Button>
          <Button onClick={handleSend} disabled={sendState.isLoading} variant='contained'>
            {sendState.isLoading ? 'Sending…' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
