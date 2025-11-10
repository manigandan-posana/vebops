// src/views/admin/Subscriptions.jsx
//
// Admin subscription management redesigned with Material UI for a denser,
// enterprise feel. Logic mirrors the previous implementation while replacing the
// bespoke UI atoms with first-party components and keyboard-friendly inputs.

import React, { useMemo, useState, useEffect } from 'react'
import dayjs from 'dayjs'
import {
  useExtendSubscriptionMutation,
  useGetSubscriptionBreakdownQuery,
  useGetTenantQuery,
  useGetTenantsQuery,
  useUpsertSubscriptionMutation
} from '../../features/admin/adminApi'
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

const STATUS_OPTIONS = ['ALL', 'ACTIVE', 'INACTIVE', 'EXPIRED']

export default function Subscriptions () {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [subFilter, setSubFilter] = useState('ALL')
  const [selectedTenantId, setSelectedTenantId] = useState(null)

  const { data: breakdown } = useGetSubscriptionBreakdownQuery()
  const { data: tlist, isFetching } = useGetTenantsQuery(
    { page, size, q, status: 'ALL', sub: subFilter, sort: 'name,asc' },
    { refetchOnMountOrArgChange: true }
  )

  const { data: tenant } = useGetTenantQuery(selectedTenantId, { skip: !selectedTenantId })

  const pages = useMemo(() => {
    const total = tlist?.total ?? 0
    return Math.max(1, Math.ceil(total / size))
  }, [tlist?.total, size])

  const tenants = tlist?.items ?? []

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100%', py: 3 }}>
      <Container maxWidth='xl'>
        <Grid container spacing={3} alignItems='stretch'>
          <Grid item xs={12} lg={7} xl={8}>
            <Card variant='outlined' sx={{ borderRadius: 2, height: '100%' }}>
              <CardHeader
                title={<Typography variant='h5' fontWeight={600}>Subscriptions</Typography>}
                subheader={<Typography variant='body2' color='text.secondary'>Activate, extend or pause tenant subscriptions.</Typography>}
              />
              <Divider />
              <CardContent>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} mb={2}>
                  <TextField
                    placeholder='Search tenants by name/code/email…'
                    value={q}
                    onChange={(event) => { setPage(0); setQ(event.target.value) }}
                    onKeyDown={handleEnterNavigation}
                    size='small'
                    fullWidth
                  />
                  <TextField
                    select
                    size='small'
                    label='Status'
                    value={subFilter}
                    onChange={(event) => { setPage(0); setSubFilter(event.target.value) }}
                    onKeyDown={handleEnterNavigation}
                    sx={{ minWidth: 140 }}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <MenuItem key={option} value={option}>{option}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size='small'
                    label='Rows'
                    value={size}
                    onChange={(event) => setSize(Number(event.target.value))}
                    onKeyDown={handleEnterNavigation}
                    sx={{ minWidth: 120 }}
                  >
                    {[10, 20, 50].map((n) => (
                      <MenuItem key={n} value={n}>{n} / page</MenuItem>
                    ))}
                  </TextField>
                </Stack>

                <Stack direction='row' spacing={1.5} mb={2}>
                  <Chip label={`Active: ${breakdown?.active ?? 0}`} color='success' variant='outlined' size='small' />
                  <Chip label={`Inactive: ${breakdown?.inactive ?? 0}`} color='error' variant='outlined' size='small' />
                </Stack>

                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Tenant</TableCell>
                        <TableCell>Code</TableCell>
                        <TableCell>Window</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align='right'>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {isFetching && tenants.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align='center'>
                            <Typography variant='body2' color='text.secondary'>Loading…</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                      {tenants.map((t) => {
                        const starts = t.latestStartsAt ? dayjs(t.latestStartsAt).format('YYYY-MM-DD') : '—'
                        const ends = t.latestEndsAt ? dayjs(t.latestEndsAt).format('YYYY-MM-DD') : '—'
                        const st = (t.latestStatus || '').toUpperCase()
                        const tone = st === 'ACTIVE' ? 'success' : st === 'EXPIRED' ? 'warning' : 'error'
                        const selected = selectedTenantId === t.id
                        return (
                          <TableRow
                            key={t.id}
                            hover
                            selected={selected}
                            onClick={() => setSelectedTenantId(t.id)}
                            sx={{ cursor: 'pointer' }}
                          >
                            <TableCell>{t.name}</TableCell>
                            <TableCell><Typography variant='caption' fontFamily='JetBrains Mono, monospace'>{t.code}</Typography></TableCell>
                            <TableCell>{`${starts} → ${ends}`}</TableCell>
                            <TableCell>
                              <Chip label={st || '—'} color={tone} variant='outlined' size='small' />
                            </TableCell>
                            <TableCell align='right'>
                              <Button size='small' variant='outlined' onClick={(event) => { event.stopPropagation(); setSelectedTenantId(t.id) }}>
                                Manage
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {!isFetching && tenants.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align='center'>
                            <Typography variant='body2' color='text.secondary'>No tenants match this filter.</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Stack direction='row' justifyContent='space-between' alignItems='center' mt={2}>
                  <Typography variant='caption' color='text.secondary'>Page {page + 1} of {pages}</Typography>
                  <Stack direction='row' spacing={1}>
                    <Button size='small' variant='outlined' disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</Button>
                    <Button size='small' variant='outlined' disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={5} xl={4}>
            <SubscriptionEditor tenantId={selectedTenantId} tenant={tenant} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}

function SubscriptionEditor ({ tenantId, tenant }) {
  const latest = tenant?.latestSubscription || null
  const [form, setForm] = useState(() => {
    const today = dayjs().format('YYYY-MM-DD')
    return {
      startsAt: latest?.startsAt ? dayjs(latest.startsAt).format('YYYY-MM-DD') : today,
      endsAt: latest?.endsAt ? dayjs(latest.endsAt).format('YYYY-MM-DD') : today,
      status: latest?.status || 'ACTIVE'
    }
  })

  useEffect(() => {
    if (latest) {
      setForm({
        startsAt: latest.startsAt ? dayjs(latest.startsAt).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        endsAt: latest.endsAt ? dayjs(latest.endsAt).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        status: latest.status || 'ACTIVE'
      })
    }
  }, [latest?.id])

  const [saveSub, saveResult] = useUpsertSubscriptionMutation()
  const [extendSub, extendResult] = useExtendSubscriptionMutation()
  const disabled = !tenantId || saveResult.isLoading || extendResult.isLoading

  const onChange = (event) => setForm((f) => ({ ...f, [event.target.name]: event.target.value }))

  const onSave = async () => {
    if (!tenantId) return
    await saveSub({ tenantId, startsAt: form.startsAt, endsAt: form.endsAt, status: form.status })
  }

  const onExtend = async (days) => {
    if (!tenantId) return
    await extendSub({ tenantId, days })
  }

  const quickActivate30 = () => {
    const starts = dayjs().format('YYYY-MM-DD')
    const ends = dayjs().add(30, 'day').format('YYYY-MM-DD')
    setForm((f) => ({ ...f, startsAt: starts, endsAt: ends, status: 'ACTIVE' }))
  }

  const feedback = (
    <Typography variant='caption' color={saveResult.isError || extendResult.isError ? 'error.main' : 'text.secondary'}>
      {saveResult.isLoading || extendResult.isLoading
        ? 'Working…'
        : saveResult.isError || extendResult.isError
          ? String(saveResult.error?.data?.message || extendResult.error?.data?.message || 'Error while saving')
          : saveResult.isSuccess || extendResult.isSuccess
            ? 'Saved.'
            : ' '}
    </Typography>
  )

  if (!tenantId) {
    return (
      <Card variant='outlined' sx={{ borderRadius: 2 }}>
        <CardHeader title='Edit subscription' subheader='Select a tenant to manage its subscription.' />
        <CardContent>
          <Typography variant='body2' color='text.secondary'>Use search and filters to find a tenant quickly.</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant='outlined' sx={{ borderRadius: 2 }}>
      <CardHeader
        title={`Edit subscription — ${tenant?.name ?? ''}`}
        subheader={tenant?.code ? <Typography variant='body2' color='text.secondary'>Code: <Typography component='span' variant='body2' fontFamily='JetBrains Mono, monospace'>{tenant.code}</Typography></Typography> : null}
      />
      <Divider />
      <CardContent>
        <Stack spacing={2}>
          <Stack direction='row' spacing={1} flexWrap='wrap'>
            <Button variant='outlined' size='small' onClick={quickActivate30} disabled={disabled}>Quick: Activate 30 days</Button>
            <Button variant='outlined' size='small' onClick={() => onExtend(30)} disabled={disabled}>Extend +30</Button>
            <Button variant='outlined' size='small' onClick={() => onExtend(90)} disabled={disabled}>Extend +90</Button>
            <Button variant='outlined' size='small' onClick={() => onExtend(365)} disabled={disabled}>Extend +365</Button>
          </Stack>

          <TextField
            label='Starts at'
            type='date'
            name='startsAt'
            value={form.startsAt}
            onChange={onChange}
            onKeyDown={handleEnterNavigation}
            size='small'
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label='Ends at'
            type='date'
            name='endsAt'
            value={form.endsAt}
            onChange={onChange}
            onKeyDown={handleEnterNavigation}
            size='small'
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            select
            label='Status'
            name='status'
            value={form.status}
            onChange={onChange}
            onKeyDown={handleEnterNavigation}
            size='small'
            fullWidth
          >
            <MenuItem value='ACTIVE'>ACTIVE</MenuItem>
            <MenuItem value='INACTIVE'>INACTIVE</MenuItem>
          </TextField>

          <Stack direction='row' spacing={2} alignItems='center'>
            <Button onClick={onSave} disabled={disabled} variant='contained'>Save subscription</Button>
            {feedback}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
