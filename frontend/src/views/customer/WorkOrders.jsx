import React from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material'
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import {
  useGetMyWorkOrdersQuery,
  useLazyGetCustomerWorkOrderCompletionReportQuery
} from '../../features/customer/customerApi'
import { downloadBlob } from '../../utils/file'

const selectAuth = (s) => s?.auth || {}

const statusTone = (status) => {
  const value = (status || '').toUpperCase()
  switch (value) {
    case 'COMPLETED':
      return { color: 'success', label: 'Completed' }
    case 'IN_PROGRESS':
      return { color: 'info', label: 'In progress' }
    case 'ASSIGNED':
      return { color: 'primary', label: 'Assigned' }
    case 'NEW':
      return { color: 'default', label: 'New' }
    default:
      return { color: 'default', label: status || '—' }
  }
}

const formatDateTime = (value) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('en-IN')
  } catch (e) {
    return String(value)
  }
}

const formatDate = (value) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-IN')
  } catch (e) {
    return String(value)
  }
}

export default function WorkOrders () {
  const customerId = useSelector(selectAuth)?.user?.customerId ?? null
  const {
    data: rawWorkOrders = [],
    isFetching,
    error
  } = useGetMyWorkOrdersQuery(customerId ? { customerId } : undefined, {
    skip: customerId === null
  })
  const [triggerDownload, downloadState] = useLazyGetCustomerWorkOrderCompletionReportQuery()

  const workOrders = Array.isArray(rawWorkOrders) ? rawWorkOrders : []

  const handleDownload = async (workOrder) => {
    if (!workOrder?.id) return
    try {
      const blob = await triggerDownload(workOrder.id).unwrap()
      const filename = `completion-report-${workOrder.wan || workOrder.id}.pdf`
      downloadBlob(blob, filename)
      toast.success('Downloaded')
    } catch (err) {
      toast.error(String(err?.data?.message || err?.error || 'Unable to download certificate'))
    }
  }

  return (
    <Stack spacing={3}>

      <Stack direction='row' spacing={1.2} alignItems='center'>
        <AssignmentRoundedIcon color='primary' />
        <Typography variant='h4' fontWeight={600}>
          Work orders
        </Typography>
      </Stack>

      {!customerId ? (
        <Alert severity='warning'>
          Your portal user is not linked to a customer record yet. Please contact support to complete the linkage.
        </Alert>
      ) : null}

      {error ? (
        <Alert severity='error'>
          {String(error?.data?.message || error?.error || 'Failed to load work orders')}
        </Alert>
      ) : null}

      <Card elevation={0}>
        <CardHeader
          title={<Typography variant='subtitle1'>Latest work orders</Typography>}
          subheader='Track the status of on-going and completed work orders for your organisation.'
        />
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Work Order</TableCell>
                  <TableCell>Service Request</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Scheduled</TableCell>
                  <TableCell>Last Update</TableCell>
                  <TableCell>Site</TableCell>
                  <TableCell align='right'>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ p: 0 }}>
                      <LinearProgress color='primary' />
                    </TableCell>
                  </TableRow>
                ) : null}

                {!isFetching && workOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align='center' sx={{ py: 6 }}>
                      <Typography variant='body2' color='text.secondary'>
                        No work orders yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}

                {!isFetching
                  ? workOrders.map((wo) => {
                      const tone = statusTone(wo.status)
                      const wan = wo.wan || `WO-${wo.id}`
                      const srLabel = wo.serviceRequestNumber || (wo.serviceRequestId ? `SR-${wo.serviceRequestId}` : '—')
                      const site = wo.siteAddress || '—'
                      const scheduled = wo.startDate || wo.dueDate ? `${wo.startDate ? formatDate(wo.startDate) : '—'}${wo.dueDate ? ` → ${formatDate(wo.dueDate)}` : ''}` : '—'
                      const updated = formatDateTime(wo.updatedAt || wo.createdAt)
                      return (
                        <TableRow key={wo.id} hover>
                          <TableCell>{wan}</TableCell>
                          <TableCell>{srLabel}</TableCell>
                          <TableCell>
                            <Chip
                              size='small'
                              color={tone.color}
                              label={tone.label}
                              variant={tone.color === 'default' ? 'outlined' : 'soft'}
                            />
                          </TableCell>
                          <TableCell>{scheduled}</TableCell>
                          <TableCell>{updated}</TableCell>
                          <TableCell>
                            <Typography variant='body2' color='text.secondary' noWrap maxWidth={220}>
                              {site}
                            </Typography>
                          </TableCell>
                          <TableCell align='right'>
                            <Stack direction='row' spacing={1} justifyContent='flex-end'>
                              <Button
                                size='small'
                                variant='text'
                                component={RouterLink}
                                to={`/customer/work-orders/${wo.id}`}
                                startIcon={<VisibilityRoundedIcon fontSize='small' />}
                              >
                                View
                              </Button>
                              {wo.completionReportAvailable ? (
                                <Button
                                  size='small'
                                  variant='outlined'
                                  onClick={() => handleDownload(wo)}
                                  startIcon={<DownloadRoundedIcon fontSize='small' />}
                                  disabled={downloadState.isFetching}
                                >
                                  {downloadState.isFetching ? 'Preparing…' : 'Certificate'}
                                </Button>
                              ) : null}
                            </Stack>
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
