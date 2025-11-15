import React from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Grid,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button
} from '@mui/material'
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded'
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded'
import { useGetAssignedQuery, useGetDashboardQuery } from '../../features/fe/feApi'

const numberFormatter = new Intl.NumberFormat('en-IN')
const formatCount = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? numberFormatter.format(num) : '0'
}

const SummaryTile = ({ label, value, loading, tone = 'text.primary' }) => (
  <Card variant='outlined' sx={{ height: '100%', borderRadius: 3 }}>
    <CardContent>
      <Stack spacing={1} alignItems='flex-start'>
        <Typography variant='caption' color='text.secondary'>
          {label}
        </Typography>
        <Typography variant='h5' color={tone}>
          {loading ? <Skeleton width={48} /> : formatCount(value)}
        </Typography>
      </Stack>
    </CardContent>
  </Card>
)

const statusTone = (status) => {
  const value = (status || '').toUpperCase()
  switch (value) {
    case 'COMPLETED':
    case 'CLOSED':
      return { color: 'success', label: status }
    case 'IN_PROGRESS':
    case 'STARTED':
    case 'ASSIGNED':
      return { color: 'primary', label: status }
    case 'ON_HOLD':
    case 'PENDING':
      return { color: 'warning', label: status }
    default:
      return { color: 'default', label: status || '—' }
  }
}

export default function Assigned () {
  const { data = [], isFetching } = useGetAssignedQuery()
  const { data: dashboardSummary = {}, isFetching: dashboardLoading } = useGetDashboardQuery()

  const metrics = {
    totalAssignments: Number(dashboardSummary?.totalAssignments ?? 0),
    inProgress: Number(dashboardSummary?.inProgress ?? 0),
    dueToday: Number(dashboardSummary?.dueToday ?? 0),
    overdue: Number(dashboardSummary?.overdue ?? 0),
    awaitingMaterials: Number(dashboardSummary?.awaitingMaterials ?? 0)
  }

  const rows = Array.isArray(data) ? data : []

  return (
    <Stack spacing={3}>
      <Stack direction='row' alignItems='center' spacing={1}>
        <AssignmentTurnedInRoundedIcon color='primary' fontSize='medium' />
        <Typography variant='h4' fontWeight={600}>
          Assigned Work Orders
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
          <SummaryTile label='Active assignments' value={metrics.totalAssignments} loading={dashboardLoading} tone='primary.main' />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
          <SummaryTile label='In progress' value={metrics.inProgress} loading={dashboardLoading} tone='info.main' />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
          <SummaryTile label='Due today' value={metrics.dueToday} loading={dashboardLoading} tone='warning.main' />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
          <SummaryTile label='Overdue' value={metrics.overdue} loading={dashboardLoading} tone='error.main' />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
          <SummaryTile label='Awaiting materials' value={metrics.awaitingMaterials} loading={dashboardLoading} tone='text.primary' />
        </Grid>
      </Grid>

      <Card elevation={0}>
        <CardHeader
          title={<Typography variant='subtitle1'>Current assignments</Typography>}
          subheader='Monitor the work orders in your queue and jump into the details instantly.'
        />
        <CardContent>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>WO No</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align='right'>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={4} align='center' sx={{ py: 6 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : null}

                {!isFetching && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align='center' sx={{ py: 6 }}>
                      <Typography variant='body2' color='text.secondary'>
                        No assigned work orders.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}

                {!isFetching
                  ? rows.map((w) => {
                      const woNo = w.wan || w.woNo || w.code || (w.id ? `WO-${w.id}` : '—')
                      const customerName =
                        (w.customer && (w.customer.name || w.customer.displayName)) ||
                        w.customerName ||
                        w.clientName ||
                        '—'
                      const status = w.status || w.currentStatus || '—'
                      const tone = statusTone(status)

                      return (
                        <TableRow key={w.id ?? woNo} hover>
                          <TableCell>
                            <Typography variant='body2' fontWeight={600}>
                              {woNo}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2' color='text.primary'>
                              {customerName}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size='small'
                              color={tone.color}
                              label={(tone.label || '—').toString()}
                              variant={tone.color === 'default' ? 'outlined' : 'soft'}
                            />
                          </TableCell>
                          <TableCell align='right'>
                            {w.id ? (
                              <Button
                                size='small'
                                variant='contained'
                                endIcon={<LaunchRoundedIcon fontSize='small' />}
                                component={RouterLink}
                                to={`/fe/job/${w.id}`}
                              >
                                Open
                              </Button>
                            ) : (
                              <Typography variant='body2' color='text.disabled'>
                                N/A
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  : null}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Stack>
  )
}
