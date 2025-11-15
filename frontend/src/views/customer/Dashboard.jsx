import React from 'react'
import { Stack, Typography, Grid, Card, CardContent, Skeleton, Alert, Chip, Divider } from '@mui/material'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded'
import BuildRoundedIcon from '@mui/icons-material/BuildRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded'
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import { useGetDashboardQuery } from '../../features/customer/customerApi'

const numberFormatter = new Intl.NumberFormat('en-IN')
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
})

const formatNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? numberFormatter.format(num) : '0'
}

const formatCurrency = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? currencyFormatter.format(num) : currencyFormatter.format(0)
}

const MetricCard = ({ icon, label, value, tone = 'text.primary', loading = false }) => (
  <Card variant='outlined' sx={{ borderRadius: 3, height: '100%' }}>
    <CardContent>
      <Stack direction='row' spacing={2} alignItems='center'>
        <Stack
          alignItems='center'
          justifyContent='center'
          sx={(theme) => ({
            width: 44,
            height: 44,
            borderRadius: 2,
            backgroundColor: theme.palette.action.hover,
            color: theme.palette.primary.main
          })}
        >
          {icon}
        </Stack>
        <Stack spacing={0.5}>
          <Typography variant='caption' color='text.secondary'>
            {label}
          </Typography>
          <Typography variant='h5' color={tone}>
            {loading ? <Skeleton width={48} /> : value}
          </Typography>
        </Stack>
      </Stack>
    </CardContent>
  </Card>
)

export default function CustomerDashboard () {
  const { data = {}, isLoading, isError, error } = useGetDashboardQuery()

  const summary = {
    openProposals: Number(data?.openProposals ?? 0),
    awaitingPurchaseOrder: Number(data?.awaitingPurchaseOrder ?? 0),
    approvedProposals: Number(data?.approvedProposals ?? 0),
    activeWorkOrders: Number(data?.activeWorkOrders ?? 0),
    inProgressWorkOrders: Number(data?.inProgressWorkOrders ?? 0),
    completedWorkOrders: Number(data?.completedWorkOrders ?? 0),
    pendingInvoices: Number(data?.pendingInvoices ?? 0),
    outstandingAmount: Number(data?.outstandingAmount ?? 0),
    lastProgressAt: data?.lastProgressAt ?? null
  }

  const metrics = [
    {
      label: 'Open proposals',
      value: formatNumber(summary.openProposals),
      icon: <HandshakeRoundedIcon fontSize='small' />,
      tone: 'info.main'
    },
    {
      label: 'Awaiting PO',
      value: formatNumber(summary.awaitingPurchaseOrder),
      icon: <HourglassEmptyRoundedIcon fontSize='small' />,
      tone: 'warning.main'
    },
    {
      label: 'Active work orders',
      value: formatNumber(summary.activeWorkOrders),
      icon: <BuildRoundedIcon fontSize='small' />,
      tone: 'primary.main'
    },
    {
      label: 'Work orders in progress',
      value: formatNumber(summary.inProgressWorkOrders),
      icon: <ScheduleRoundedIcon fontSize='small' />,
      tone: 'secondary.main'
    },
    {
      label: 'Pending invoices',
      value: formatNumber(summary.pendingInvoices),
      icon: <ReceiptLongRoundedIcon fontSize='small' />,
      tone: 'error.main'
    },
    {
      label: 'Outstanding amount',
      value: formatCurrency(summary.outstandingAmount),
      icon: <PaymentsRoundedIcon fontSize='small' />,
      tone: 'success.main'
    }
  ]

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant='h4' fontWeight={600} color='text.primary'>
          Account overview
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Track proposal approvals, service progress and billing status at a glance.
        </Typography>
      </Stack>

      {isError && (
        <Alert severity='error' variant='outlined'>
          Unable to load dashboard: {error?.data?.message || error?.error || 'Unknown error'}
        </Alert>
      )}

      <Grid container spacing={2}>
        {metrics.map((metric) => (
          <Grid item xs={12} sm={6} md={4} key={metric.label}>
            <MetricCard {...metric} loading={isLoading} />
          </Grid>
        ))}
      </Grid>

      <Card variant='outlined' sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction='row' spacing={1} alignItems='center'>
              <TrendingUpRoundedIcon color='primary' fontSize='small' />
              <Typography variant='subtitle1' fontWeight={600}>
                Service delivery snapshot
              </Typography>
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Stack spacing={1.5}>
                  <Typography variant='overline' color='text.secondary'>Proposals</Typography>
                  <Stack direction='row' spacing={1} alignItems='center'>
                    <Chip label={`${formatNumber(summary.openProposals)} open`} color='info' size='small' />
                    <Chip label={`${formatNumber(summary.approvedProposals)} approved`} color='success' size='small' />
                  </Stack>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack spacing={1.5}>
                  <Typography variant='overline' color='text.secondary'>Work orders</Typography>
                  <Stack direction='row' spacing={1} alignItems='center'>
                    <Chip label={`${formatNumber(summary.activeWorkOrders)} active`} color='primary' size='small' />
                    <Chip label={`${formatNumber(summary.completedWorkOrders)} completed`} color='success' size='small' />
                  </Stack>
                </Stack>
              </Grid>
            </Grid>
            <Divider />
            <Stack spacing={1.5}>
              <Typography variant='overline' color='text.secondary'>Invoices</Typography>
              <Typography variant='body2' color='text.primary'>
                {summary.pendingInvoices > 0
                  ? `You have ${formatNumber(summary.pendingInvoices)} invoice${summary.pendingInvoices === 1 ? '' : 's'} awaiting payment.`
                  : 'All invoices are settled. Thank you!'}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Outstanding balance: {formatCurrency(summary.outstandingAmount)}
              </Typography>
            </Stack>
            {summary.lastProgressAt && (
              <Typography variant='caption' color='text.secondary'>
                Latest site update recorded on {new Date(summary.lastProgressAt).toLocaleString()}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
