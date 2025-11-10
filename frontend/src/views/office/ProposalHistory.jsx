// src/views/office/ProposalHistory.jsx
//
// Proposal history reworked with Material UI for a dense enterprise look while
// preserving the existing behaviours: filtering, pagination, detail viewing and
// document downloads.

import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  Typography
} from '@mui/material'
import { FileDown, RefreshCcw, Search } from 'lucide-react'
import { Toaster, toast } from 'react-hot-toast'
import {
  useDownloadProposalDocumentFileMutation,
  useListProposalDocumentsQuery,
  useListProposalsQuery
} from '../../features/office/officeApi'

const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(Number.isFinite(+n) ? +n : 0)

const STATUSES = ['ALL', 'DRAFT', 'SENT', 'APPROVED', 'REJECTED']

const shouldFocusOnEnter = (el) => {
  if (typeof window === 'undefined') return false
  if (!el) return false
  const style = window.getComputedStyle(el)
  return style.display !== 'none' && style.visibility !== 'hidden' && !el.disabled && !el.readOnly
}

const handleEnterNavigation = (event) => {
  if (event.key !== 'Enter' || event.shiftKey) return
  const target = event.currentTarget
  const form = target?.form || target?.closest('form')
  if (!form) return
  event.preventDefault()
  const focusables = Array.from(form.querySelectorAll('input, select, textarea, button')).filter((el) => shouldFocusOnEnter(el))
  const idx = focusables.indexOf(target)
  if (idx >= 0 && idx < focusables.length - 1) {
    const next = focusables[idx + 1]
    next.focus()
    if (typeof next.select === 'function') next.select()
  } else {
    const submit = form.querySelector('button[type="submit"], input[type="submit"]')
    if (submit) {
      submit.click()
    } else if (typeof form.requestSubmit === 'function') {
      form.requestSubmit()
    } else {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    }
  }
}

const statusColor = (status) => {
  const map = {
    APPROVED: 'success',
    REJECTED: 'error',
    SENT: 'info',
    DRAFT: 'default'
  }
  return map[status] || 'default'
}

export default function ProposalHistory () {
  const [searchParams, setSearchParams] = useSearchParams()
  const focusId = searchParams.get('focus')

  const [status, setStatus] = useState('ALL')
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(0)
  const { data = { content: [] }, isFetching, refetch } = useListProposalsQuery(status === 'ALL' ? {} : { status })

  const proposals = Array.isArray(data?.content) ? data.content : []

  useEffect(() => {
    setPage(0)
  }, [status, search, pageSize])

  const filtered = useMemo(() => {
    if (!search.trim()) return proposals
    const q = search.trim().toLowerCase()
    return proposals.filter((p) => {
      const code = `P-${p.id}`
      const customer = p?.customer?.name || p?.customerName || ''
      const po = p?.customerPoNumber || p?.customerPO?.poNumber || ''
      return (
        code.toLowerCase().includes(q) ||
        customer.toLowerCase().includes(q) ||
        String(p?.status || '').toLowerCase().includes(q) ||
        String(po).toLowerCase().includes(q)
      )
    })
  }, [proposals, search])

  const total = filtered.length
  const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize)
  const start = page * pageSize
  const current = filtered.slice(start, start + pageSize)

  const [selected, setSelected] = useState(null)
  const { data: docs = [], isFetching: docsLoading } = useListProposalDocumentsQuery(
    selected?.id,
    { skip: !selected?.id }
  )
  const [downloadDoc] = useDownloadProposalDocumentFileMutation()

  useEffect(() => {
    if (!focusId) return
    const found = proposals.find((p) => String(p.id) === focusId)
    if (found) {
      setSelected(found)
    }
  }, [focusId, proposals])

  const openDetails = (p) => {
    setSelected(p)
    const next = new URLSearchParams(searchParams)
    if (p?.id) next.set('focus', p.id)
    setSearchParams(next)
  }

  const closeDetails = () => {
    setSelected(null)
    if (!searchParams.has('focus')) return
    const next = new URLSearchParams(searchParams)
    next.delete('focus')
    setSearchParams(next)
  }

  const handleDownload = async (doc) => {
    if (!selected?.id || !doc?.id) return
    try {
      await downloadDoc({
        proposalId: selected.id,
        docId: doc.id,
        filename: doc.filename || doc.originalName || `proposal-${selected.id}-doc-${doc.id}.pdf`
      }).unwrap()
    } catch (e) {
      toast.error(String(e?.data?.message || e?.error || e?.message || 'Download failed'))
    }
  }

  const poDocs = Array.isArray(docs)
    ? docs.filter((d) => {
        const name = (d.filename || d.originalName || '').toLowerCase()
        const kind = String(d.kind || d.docType || '')
        return name.includes('po') || kind.includes('PO')
      })
    : []

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100%', py: 3 }}>
      <Container maxWidth='xl'>
        <Toaster />
        <Stack spacing={3}>
          <Stack direction='row' justifyContent='space-between' alignItems='center'>
            <Typography variant='h5' fontWeight={600}>Proposal History</Typography>
            <Button
              variant='outlined'
              size='small'
              startIcon={<RefreshCcw size={16} />}
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? 'Refreshing…' : 'Refresh'}
            </Button>
          </Stack>

          <Card variant='outlined' sx={{ borderRadius: 2 }}>
            <CardContent>
              <Grid container spacing={2} alignItems='center'>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    label='Status'
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    onKeyDown={handleEnterNavigation}
                    size='small'
                    fullWidth
                  >
                    {STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={handleEnterNavigation}
                    placeholder='Search by proposal, customer or PO number'
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
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    label='Rows'
                    value={pageSize}
                    onChange={(event) => setPageSize(Number(event.target.value))}
                    onKeyDown={handleEnterNavigation}
                    size='small'
                    fullWidth
                  >
                    {[10, 20, 50].map((n) => (
                      <MenuItem key={n} value={n}>{n}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card variant='outlined' sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack spacing={2.5}>
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell width='10%'>Proposal</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell width='12%'>Status</TableCell>
                        <TableCell align='right' width='12%'>Total</TableCell>
                        <TableCell width='14%'>Created</TableCell>
                        <TableCell width='14%'>Customer PO</TableCell>
                        <TableCell align='center' width='10%'>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {isFetching && current.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} align='center'>
                            <Typography variant='body2' color='text.secondary'>Loading…</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                      {!isFetching && current.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} align='center'>
                            <Typography variant='body2' color='text.secondary'>No proposals found.</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                      {current.map((p) => {
                        const code = `P-${p.id}`
                        const customer = p?.customer?.name || p?.customerName || '—'
                        const statusBadge = p?.status || 'UNKNOWN'
                        const totalValue = fmtINR(p?.total || p?.grandTotal)
                        const created = p?.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
                        const poNumber = p?.customerPoNumber || p?.customerPO?.poNumber || '—'
                        const isFocused = selected?.id === p.id
                        return (
                          <TableRow hover key={p.id} selected={isFocused}>
                            <TableCell>
                              <Typography variant='body2' fontWeight={600}>{code}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>{customer}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size='small'
                                label={statusBadge}
                                color={statusColor(statusBadge)}
                                variant='outlined'
                              />
                            </TableCell>
                            <TableCell align='right'>
                              <Typography variant='body2' fontWeight={600}>{totalValue}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>{created}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>{poNumber}</Typography>
                            </TableCell>
                            <TableCell align='center'>
                              <Button
                                size='small'
                                variant={isFocused ? 'contained' : 'outlined'}
                                onClick={() => openDetails(p)}
                              >
                                {isFocused ? 'Viewing' : 'View'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='space-between' alignItems={{ xs: 'flex-start', sm: 'center' }}>
                  <Typography variant='body2' color='text.secondary'>
                    Showing {total === 0 ? 0 : start + 1}–{total === 0 ? 0 : Math.min(start + pageSize, total)} of {total}
                  </Typography>
                  <Stack direction='row' spacing={1}>
                    <Button size='small' variant='outlined' disabled={page === 0} onClick={() => setPage(0)}>First</Button>
                    <Button size='small' variant='outlined' disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</Button>
                    <Typography variant='body2' color='text.secondary' sx={{ px: 1.5, display: 'flex', alignItems: 'center' }}>
                      Page {total === 0 ? 0 : page + 1} of {totalPages}
                    </Typography>
                    <Button size='small' variant='outlined' disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>Next</Button>
                    <Button size='small' variant='outlined' disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>Last</Button>
                  </Stack>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {selected && (
            <Card variant='outlined' sx={{ borderRadius: 2 }}>
              <CardHeader
                title={<Typography variant='h6' fontWeight={600}>Proposal {`P-${selected.id}`}</Typography>}
                subheader={<Typography variant='body2' color='text.secondary'>Customer: {selected?.customer?.name || selected?.customerName || '—'}</Typography>}
                action={<Button size='small' onClick={closeDetails}>Close</Button>}
              />
              <Divider />
              <CardContent>
                <Grid container spacing={2}>
                  <Detail label='Status' value={selected?.status || '—'} />
                  <Detail label='Total amount' value={fmtINR(selected?.total || selected?.grandTotal)} />
                  <Detail label='Customer PO number' value={selected?.customerPoNumber || selected?.customerPO?.poNumber || '—'} />
                  <Detail
                    label='Last updated'
                    value={selected?.updatedAt ? new Date(selected.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                  />
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant='subtitle2' fontWeight={600} gutterBottom>Documents</Typography>
                {docsLoading && <Typography variant='body2' color='text.secondary'>Loading documents…</Typography>}
                {!docsLoading && (!docs || docs.length === 0) && (
                  <Typography variant='body2' color='text.secondary'>No documents uploaded yet.</Typography>
                )}
                {!docsLoading && Array.isArray(docs) && docs.length > 0 && (
                  <Stack spacing={1.5} mt={1.5}>
                    {docs.map((doc) => {
                      const isPO = poDocs.some((po) => po.id === doc.id)
                      return (
                        <Card key={doc.id} variant='outlined' sx={{ borderRadius: 1.5 }}>
                          <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
                            <Stack spacing={0.3}>
                              <Typography variant='body2' fontWeight={600}>{doc.originalName || doc.filename || `Document #${doc.id}`}</Typography>
                              <Typography variant='caption' color='text.secondary'>
                                Uploaded {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString('en-IN') : '—'}{isPO ? ' • Customer PO' : ''}
                              </Typography>
                            </Stack>
                            <Button size='small' variant='contained' onClick={() => handleDownload(doc)} startIcon={<FileDown size={16} />}>
                              Download
                            </Button>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </Stack>
                )}
              </CardContent>
            </Card>
          )}
        </Stack>
      </Container>
    </Box>
  )
}

function Detail ({ label, value }) {
  return (
    <Grid item xs={12} md={6}>
      <Typography variant='caption' fontWeight={600} color='text.secondary' sx={{ textTransform: 'uppercase' }}>{label}</Typography>
      <Typography variant='body2'>{value || '—'}</Typography>
    </Grid>
  )
}
