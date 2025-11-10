import React, { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useGetTenantCustomersQuery,
  useGetTenantFieldEngineersQuery,
  useResetPasswordMutation
} from '../../features/admin/adminApi'
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  MenuItem,
  Pagination,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded'
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded'
import { focusNextOnEnter } from '../../utils/formNavigation'

const statusChip = (status) => {
  if (!status) return { label: 'Active', color: 'primary' }
  switch (status) {
    case 'ACTIVE':
    case 'AVAILABLE':
    case 'BUSY':
      return { label: 'Active', color: 'primary' }
    case 'INACTIVE':
      return { label: 'Inactive', color: 'default' }
    default:
      return { label: status, color: 'primary' }
  }
}

export default function TenantProfile () {
  const { id } = useParams()
  const tid = Number(id)
  const navigate = useNavigate()

  const [resetPassword] = useResetPasswordMutation()

  const [tab, setTab] = useState('FE')
  const [q, setQ] = useState('')
  const [mPage, setMPage] = useState(0)
  const [mSize, setMSize] = useState(10)
  const [feStatus, setFeStatus] = useState('ALL')

  const {
    data: feData,
    isFetching: loadingFE
  } = useGetTenantFieldEngineersQuery(
    { tenantId: tid, page: mPage, size: mSize, q, status: feStatus, sort: 'id,desc' },
    { skip: tab !== 'FE' }
  )

  const {
    data: custData,
    isFetching: loadingCust
  } = useGetTenantCustomersQuery(
    { tenantId: tid, page: mPage, size: mSize, q, sort: 'id,desc' },
    { skip: tab !== 'CUSTOMER' }
  )

  async function onResetMemberPassword (uid) {
    if (!uid) return
    try {
      await resetPassword({ id: uid, sendEmail: true }).unwrap()
      window.alert('Temporary password generated & emailed.')
    } catch (e) {
      window.alert(e?.data?.message || 'Failed to reset password.')
    }
  }

  const activeQuery = tab === 'FE' ? feData : custData
  const total = activeQuery?.total ?? 0
  const totalPages = activeQuery?.totalPages ?? 0
  const items = activeQuery?.items ?? []

  const loading = tab === 'FE' ? loadingFE : loadingCust

  const start = total ? mPage * mSize + 1 : 0
  const end = Math.min(total, mPage * mSize + items.length)

  const stats = useMemo(() => {
    if (tab !== 'FE') return null
    const groups = items.reduce(
      (acc, row) => {
        const key = row.status || 'UNKNOWN'
        acc[key] = (acc[key] || 0) + 1
        acc.total += 1
        return acc
      },
      { total: 0 }
    )
    return groups
  }, [items, tab])

  return (
    <Stack spacing={3}>
      <Box>
        <Button
          variant='outlined'
          size='small'
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
      </Box>

      <Card elevation={0}>
        <CardHeader
          title={
            <Stack direction='row' spacing={1} alignItems='center'>
              <BadgeRoundedIcon fontSize='small' color='primary' />
              <Typography variant='h5' fontWeight={600}>
                Members
              </Typography>
            </Stack>
          }
          subheader='Manage your field engineers and customer contacts without changing their business rules.'
        />
        <Divider />
        <CardContent>
          <Tabs
            value={tab}
            onChange={(_, value) => {
              setTab(value)
              setMPage(0)
              setQ('')
            }}
            sx={{ mb: 2.5 }}
          >
            <Tab
              icon={<PeopleAltRoundedIcon fontSize='small' />}
              iconPosition='start'
              value='FE'
              label='Field Engineers'
            />
            <Tab
              icon={<PersonRoundedIcon fontSize='small' />}
              iconPosition='start'
              value='CUSTOMER'
              label='Customers'
            />
          </Tabs>

          <Stack
            component='form'
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ md: 'center' }}
            sx={{ mb: 3 }}
            onSubmit={(event) => event.preventDefault()}
          >
            <TextField
              fullWidth
              size='small'
              value={q}
              onChange={(event) => {
                setQ(event.target.value)
                setMPage(0)
              }}
              onKeyDown={focusNextOnEnter}
              placeholder='Search members by name or email'
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <SearchRoundedIcon fontSize='small' />
                  </InputAdornment>
                )
              }}
            />

            {tab === 'FE' ? (
              <TextField
                select
                size='small'
                value={feStatus}
                onChange={(event) => {
                  setFeStatus(event.target.value)
                  setMPage(0)
                }}
                onKeyDown={focusNextOnEnter}
                sx={{ minWidth: { xs: '100%', md: 180 } }}
                label='Status'
              >
                <MenuItem value='ALL'>All</MenuItem>
                <MenuItem value='AVAILABLE'>Available</MenuItem>
                <MenuItem value='BUSY'>Busy</MenuItem>
                <MenuItem value='INACTIVE'>Inactive</MenuItem>
              </TextField>
            ) : null}
          </Stack>

          {stats ? (
            <Stack
              direction='row'
              spacing={2}
              flexWrap='wrap'
              sx={{ mb: 2, color: 'text.secondary', fontSize: 12 }}
            >
              <Typography variant='caption' color='text.secondary'>
                Total: {stats.total}
              </Typography>
              {['AVAILABLE', 'BUSY', 'INACTIVE'].map((key) => (
                <Typography key={key} variant='caption' color='text.secondary'>
                  {key.replace('_', ' ')}: {stats[key] || 0}
                </Typography>
              ))}
            </Stack>
          ) : null}

          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align='right'>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} align='center' sx={{ py: 6 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : null}

                {!loading && items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align='center' sx={{ py: 6 }}>
                      <Typography variant='body2' color='text.secondary'>
                        No {tab === 'FE' ? 'field engineers' : 'customers'} found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}

                {!loading
                  ? items.map((row) => {
                      const isFE = tab === 'FE'
                      const name = isFE ? row.userName || '—' : row.name || '—'
                      const email = isFE ? row.userEmail || '—' : row.email || '—'
                      const resetUserId = isFE ? row.userId : row.portalUserId
                      const chip = statusChip(isFE ? row.status : row.portalUserId ? 'ACTIVE' : 'INACTIVE')

                      return (
                        <TableRow key={row.id || `${name}-${email}`} hover>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography variant='body2' fontWeight={600} color='text.primary'>
                                {name}
                              </Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {email}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size='small'
                              label={chip.label}
                              color={chip.color}
                              variant={chip.color === 'default' ? 'outlined' : 'soft'}
                            />
                          </TableCell>
                          <TableCell align='right'>
                            <Button
                              size='small'
                              variant='text'
                              startIcon={<LockResetRoundedIcon fontSize='small' />}
                              onClick={() => onResetMemberPassword(resetUserId)}
                              disabled={!resetUserId}
                            >
                              Reset Password
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  : null}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ md: 'center' }}
            justifyContent='space-between'
            sx={{ mt: 3 }}
          >
            <Typography variant='body2' color='text.secondary'>
              {total ? `Showing ${start} – ${end} of ${total}` : 'No records to show'}
            </Typography>
            <Pagination
              color='primary'
              shape='rounded'
              page={mPage + 1}
              count={Math.max(totalPages, 1)}
              onChange={(_, page) => setMPage(page - 1)}
              showFirstButton
              showLastButton
              size='small'
            />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
