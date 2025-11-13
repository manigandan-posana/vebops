import React from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Toaster, toast } from 'react-hot-toast'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  LinearProgress,
  Link,
  Stack,
  Typography
} from '@mui/material'
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import {
  useGetCustomerWorkOrderDetailQuery,
  useLazyGetCustomerWorkOrderCompletionReportQuery,
  useLazyGetCustomerProgressAttachmentQuery
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

export default function WorkOrderDetail () {
  const { id } = useParams()
  const customerId = useSelector(selectAuth)?.user?.customerId ?? null

  const {
    data: detail,
    isFetching,
    error
  } = useGetCustomerWorkOrderDetailQuery(id, { skip: !id })

  const [downloadCertificate, certificateState] = useLazyGetCustomerWorkOrderCompletionReportQuery()
  const [downloadAttachment, attachmentState] = useLazyGetCustomerProgressAttachmentQuery()

  const workOrder = detail?.workOrder || {}
  const service = detail?.service || {}
  const progress = Array.isArray(detail?.progress) ? detail.progress : []

  const tone = statusTone(workOrder.status)
  const wan = workOrder.wan || workOrder.id || id
  const srLabel = service.serviceRequestNumber || (service.serviceRequestId ? `SR-${service.serviceRequestId}` : '—')
  const serviceType = service.serviceType || workOrder.serviceType || '—'
  const scheduled = workOrder.startDate || workOrder.dueDate ? `${workOrder.startDate ? formatDate(workOrder.startDate) : '—'}${workOrder.dueDate ? ` → ${formatDate(workOrder.dueDate)}` : ''}` : '—'
  const updatedAt = formatDateTime(workOrder.updatedAt || workOrder.createdAt)

  async function handleDownloadCertificate () {
    if (!workOrder?.id) return
    try {
      const blob = await downloadCertificate(workOrder.id).unwrap()
      const filename = `completion-report-${workOrder.wan || workOrder.id}.pdf`
      downloadBlob(blob, filename)
      toast.success('Downloaded')
    } catch (err) {
      toast.error(String(err?.data?.message || err?.error || 'Unable to download certificate'))
    }
  }

  async function handleDownloadAttachment (progressId, attachment) {
    if (!workOrder?.id || !progressId || !attachment?.id) return
    try {
      const blob = await downloadAttachment({ woId: workOrder.id, progressId, attachmentId: attachment.id }).unwrap()
      const filename = attachment.filename || `progress-photo-${attachment.id}`
      downloadBlob(blob, filename)
    } catch (err) {
      toast.error(String(err?.data?.message || err?.error || 'Unable to download attachment'))
    }
  }

  return (
    <Stack spacing={3}>
      <Toaster position='top-right' />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent='space-between'>
        <Stack direction='row' spacing={1.2} alignItems='center'>
          <AssignmentRoundedIcon color='primary' />
          <Typography variant='h4' fontWeight={600}>
            Work order {wan}
          </Typography>
          <Chip size='small' color={tone.color} label={tone.label} variant={tone.color === 'default' ? 'outlined' : 'soft'} />
        </Stack>
        <Button
          variant='text'
          size='small'
          startIcon={<ArrowBackRoundedIcon fontSize='small' />}
          component={RouterLink}
          to='/customer/work-orders'
        >
          Back to work orders
        </Button>
      </Stack>

      {!customerId ? (
        <Alert severity='warning'>
          Your portal user is not linked to a customer record yet. Please contact support to complete the linkage.
        </Alert>
      ) : null}

      {error ? (
        <Alert severity='error'>
          {String(error?.data?.message || error?.error || 'Failed to load work order detail')}
        </Alert>
      ) : null}

      <Card elevation={0}>
        <CardHeader
          title='Work order summary'
          subheader='Key information about this assignment.'
        />
        <Divider />
        <CardContent>
          {isFetching ? (
            <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 2 }}>
              <LinearProgress sx={{ flexGrow: 1 }} />
              <Typography variant='caption' color='text.secondary'>Loading…</Typography>
            </Stack>
          ) : null}

          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
              <Info label='Service request' value={srLabel} />
              <Info label='Service type' value={serviceType} />
              <Info label='Scheduled' value={scheduled} />
              <Info label='Last update' value={updatedAt} />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', sm: 'center' }}>
              <Info
                label='Site address'
                value={service.siteAddress || '—'}
                icon={<LocationOnRoundedIcon fontSize='small' color='primary' />}
              />
              <Info label='Customer PO' value={service.customerPoNumber || workOrder.customerPoNumber || '—'} />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
              <Info label='Contact name' value={service.customerName || '—'} />
              <Info label='Email' value={service.customerEmail || '—'} />
              <Info label='Phone' value={service.customerMobile || '—'} />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card elevation={0}>
        <CardHeader
          avatar={<HistoryRoundedIcon color='primary' />}
          title='Progress updates'
          subheader='Timeline of updates shared by the field team.'
        />
        <Divider />
        <CardContent>
          {progress.length === 0 ? (
            <Typography variant='body2' color='text.secondary'>No progress updates yet.</Typography>
          ) : (
            <Stack spacing={2.5}>
              {progress.map((entry) => (
                <Box
                  key={entry.id || `${entry.status}-${entry.createdAt}`}
                  sx={{
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    p: 2
                  }}
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' spacing={1.5}>
                    <Chip
                      label={(entry.status || '').replace(/_/g, ' ')}
                      size='small'
                      color='primary'
                      variant='outlined'
                    />
                    <Typography variant='caption' color='text.secondary'>
                      {formatDateTime(entry.createdAt)}
                    </Typography>
                  </Stack>
                  {entry.remarks ? (
                    <Typography variant='body2' sx={{ mt: 1 }}>
                      {entry.remarks}
                    </Typography>
                  ) : null}
                  <Stack direction='row' spacing={2} sx={{ mt: 1 }}>
                    {entry.by?.name ? (
                      <Typography variant='caption' color='text.secondary'>
                        By {entry.by.name}
                      </Typography>
                    ) : null}
                    {entry.photoUrl ? (
                      <Link href={entry.photoUrl} target='_blank' rel='noreferrer' variant='caption'>View photo</Link>
                    ) : null}
                  </Stack>
                  {Array.isArray(entry.attachments) && entry.attachments.length > 0 ? (
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
                      {entry.attachments.map((attachment) => (
                        <Button
                          key={attachment.id || attachment.downloadPath}
                          size='small'
                          variant='text'
                          onClick={() => handleDownloadAttachment(entry.id, attachment)}
                          disabled={attachmentState.isFetching}
                        >
                          {attachment.filename || 'Download photo'}
                        </Button>
                      ))}
                    </Stack>
                  ) : null}
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card elevation={0}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent='space-between'>
            <Typography variant='subtitle1'>Completion certificate</Typography>
            <Button
              variant='outlined'
              startIcon={<DownloadRoundedIcon />}
              onClick={handleDownloadCertificate}
              disabled={!workOrder.completionReportAvailable || certificateState.isFetching}
            >
              {certificateState.isFetching ? 'Preparing…' : 'Download PDF'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

function Info ({ label, value, icon = null }) {
  return (
    <Stack spacing={0.5}>
      <Stack direction='row' spacing={1} alignItems='center'>
        {icon}
        <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {label}
        </Typography>
      </Stack>
      <Typography variant='body2' color='text.primary' sx={{ whiteSpace: 'pre-line' }}>
        {value || '—'}
      </Typography>
    </Stack>
  )
}
