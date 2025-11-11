import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Toaster, toast } from 'react-hot-toast'
import {
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Box,
  MenuItem
} from '@mui/material'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded'
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded'
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded'
import {
  usePostProgressMutation,
  useLazyGetCompletionReportPdfQuery,
  useGetWorkOrderDetailQuery
} from '../../features/fe/feApi'
import { downloadBlob } from '../../utils/file'
import { focusNextOnEnter } from '../../utils/formNavigation'

const STEPS = [
  { label: 'Started', value: 'STARTED' },
  { label: 'Material Received', value: 'MATERIAL_RECEIVED' },
  { label: 'Installation Started', value: 'INSTALLATION_STARTED' },
  { label: 'Completed', value: 'COMPLETED' }
]

export default function JobDetail () {
  const { id } = useParams()

  const {
    data: detail,
    isFetching: detailLoading,
    error: detailError,
    refetch: refetchDetail
  } = useGetWorkOrderDetailQuery(id, { skip: !id })

  const workOrder = detail?.workOrder || {}
  const instruction = detail?.instruction || ''
  const items = Array.isArray(detail?.items) ? detail.items : []
  const sr = workOrder?.serviceRequest || {}
  const customer = sr?.customer || {}
  const po = workOrder?.customerPO || {}
  const srSiteAddress = [
    sr?.siteAddress,
    sr?.serviceLocation,
    sr?.siteLocation,
    workOrder?.siteAddress
  ]
    .map((val) => (typeof val === 'string' ? val.trim() : ''))
    .find((val) => val) || ''
  const srDescription = typeof sr?.description === 'string' ? sr.description.trim() : ''

  const [status, setStatus] = useState(STEPS[0].value)
  const [remarks, setRemarks] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')

  const [postProgress, { isLoading }] = usePostProgressMutation()
  const [fetchPdf, { isFetching: isPdfLoading }] = useLazyGetCompletionReportPdfQuery()

  async function handlePostProgress (event) {
    event?.preventDefault()
    if (!id) return
    try {
      await postProgress({ woId: id, status, remarks, photoUrl }).unwrap()
      setRemarks('')
      toast.success('Progress updated')
      refetchDetail()
    } catch (e) {
      toast.error(String(e?.data?.message || e?.error || 'Failed to post progress'))
    }
  }

  async function handleDownload () {
    if (!id) return
    try {
      const res = await fetchPdf(id).unwrap()
      if (res) downloadBlob(res, `completion-report-${id}.pdf`)
    } catch (e) {
      toast.error(String(e?.data?.message || e?.error || 'Download failed'))
    }
  }

  return (
    <Stack spacing={3}>
      <Toaster position='top-right' />

      <Stack direction='row' spacing={1} alignItems='center'>
        <AssignmentRoundedIcon color='primary' />
        <Typography variant='h4' fontWeight={600}>
          Job #{id}
        </Typography>
      </Stack>

      <Card elevation={0}>
        <CardHeader
          title={
            <Stack spacing={0.5}>
              <Typography variant='h6' fontWeight={600}>
                Work Order {workOrder?.wan || workOrder?.id || id}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Service: {sr?.serviceType || '—'}
              </Typography>
            </Stack>
          }
          action={
            <Stack spacing={0.5} alignItems='flex-end'>
              <Typography variant='body2' fontWeight={600}>
                {customer?.name || customer?.displayName || '—'}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {customer?.email || sr?.customerEmail || '—'}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {customer?.mobile || sr?.customerMobile || '—'}
              </Typography>
            </Stack>
          }
        />
        <Divider />
        <CardContent>
          {detailLoading ? (
            <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 2 }}>
              <CircularProgress size={20} />
              <Typography variant='body2' color='text.secondary'>
                Loading job details…
              </Typography>
            </Stack>
          ) : null}

          {detailError ? (
            <Alert severity='error' sx={{ mb: 2 }}>
              {String(detailError?.data?.message || detailError?.error || 'Unable to load job detail')}
            </Alert>
          ) : null}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Info label='Work Order Status' value={workOrder?.status || '—'} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Info
                label='Scheduled Date'
                value={
                  workOrder?.scheduledAt
                    ? new Date(workOrder.scheduledAt).toLocaleString('en-IN')
                    : '—'
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Info label='Customer PO' value={po?.poNumber || '—'} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Info label='Service Request' value={sr?.srn || '—'} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Info label='Service Type' value={sr?.serviceType || '—'} />
            </Grid>
            <Grid item xs={12} md={8}>
              <Info icon={<LocationOnRoundedIcon fontSize='small' color='primary' />} label='Site Address' value={srSiteAddress} multiline />
            </Grid>
            {srDescription ? (
              <Grid item xs={12}>
                <Info label='Job Description' value={srDescription} multiline />
              </Grid>
            ) : null}
          </Grid>

          {instruction ? (
            <Alert
              icon={<TaskAltRoundedIcon fontSize='small' />}
              severity='info'
              sx={{ mt: 3 }}
            >
              <Typography variant='subtitle2' sx={{ mb: 0.5 }}>
                Instruction from back office
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ whiteSpace: 'pre-line' }}>
                {instruction}
              </Typography>
            </Alert>
          ) : null}

          <Stack spacing={1.5} sx={{ mt: 3 }}>
            <Typography variant='subtitle2' color='text.secondary'>
              Items / Kits
            </Typography>
            {items.length === 0 ? (
              <Typography variant='body2' color='text.secondary'>
                No items assigned.
              </Typography>
            ) : (
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Code</TableCell>
                      <TableCell align='right'>Qty</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id || `${item.item?.id}-${item.workOrderId}`}>
                        <TableCell>{item.item?.name || item.description || '—'}</TableCell>
                        <TableCell>{item.item?.code || item.code || '—'}</TableCell>
                        <TableCell align='right'>{item.qty ?? item.quantity ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card elevation={0}>
        <CardHeader title='Update progress' subheader='Share quick updates to keep the back office informed.' />
        <Divider />
        <CardContent>
          <Box component='form' onSubmit={handlePostProgress} noValidate>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  size='small'
                  label='Status'
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  onKeyDown={focusNextOnEnter}
                >
                  {STEPS.map((step) => (
                    <MenuItem key={step.value} value={step.value}>
                      {step.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size='small'
                  label='Photo URL (optional)'
                  value={photoUrl}
                  onChange={(event) => setPhotoUrl(event.target.value)}
                  onKeyDown={focusNextOnEnter}
                  autoComplete='on'
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size='small'
                  label='Remarks (optional)'
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  onKeyDown={focusNextOnEnter}
                  autoComplete='on'
                />
              </Grid>
              <Grid item xs={12}>
                <Stack direction='row' justifyContent='flex-end'>
                  <Button
                    type='submit'
                    variant='contained'
                    disabled={isLoading}
                    startIcon={<TaskAltRoundedIcon fontSize='small' />}
                  >
                    {isLoading ? 'Posting…' : 'Post Progress'}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>

      <Card elevation={0}>
        <CardContent>
          <Stack direction='row' justifyContent='space-between' alignItems='center'>
            <Typography variant='subtitle1'>Completion report</Typography>
            <Button
              variant='outlined'
              startIcon={<DownloadRoundedIcon />}
              disabled={isPdfLoading}
              onClick={handleDownload}
            >
              {isPdfLoading ? 'Preparing…' : 'Download PDF'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

function Info ({ label, value, multiline = false, icon = null }) {
  return (
    <Stack spacing={0.5}>
      <Stack direction='row' spacing={1} alignItems='center'>
        {icon}
        <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {label}
        </Typography>
      </Stack>
      <Typography
        variant='body2'
        color='text.primary'
        sx={multiline ? { whiteSpace: 'pre-line' } : undefined}
      >
        {value || '—'}
      </Typography>
    </Stack>
  )
}
