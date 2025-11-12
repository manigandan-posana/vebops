import React, { useEffect, useState } from 'react'
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
  MenuItem,
  Chip,
  Link
} from '@mui/material'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded'
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded'
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded'
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import {
  usePostProgressMutation,
  useLazyGetCompletionReportPdfQuery,
  useGetWorkOrderDetailQuery,
  useLazyGetProgressAttachmentQuery
} from '../../features/fe/feApi'
import { downloadBlob } from '../../utils/file'
import { focusNextInputOnEnter } from '../../utils/enterKeyNavigation'

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
  const serviceInfo = detail?.serviceInfo || {}
  const progress = Array.isArray(detail?.progress) ? detail.progress : []
  const sr = workOrder?.serviceRequest || {}
  const customer = sr?.customer || {}
  const po = workOrder?.customerPO || {}
  const srSiteAddress = [
    serviceInfo?.siteAddress,
    sr?.siteAddress,
    sr?.serviceLocation,
    sr?.siteLocation,
    workOrder?.siteAddress
  ]
    .map((val) => (typeof val === 'string' ? val.trim() : ''))
    .find((val) => val) || ''
  const srDescription = [serviceInfo?.description, sr?.description]
    .map((val) => (typeof val === 'string' ? val.trim() : ''))
    .find((val) => val) || ''
  const buyer = serviceInfo?.buyer || {}
  const consignee = serviceInfo?.consignee || {}
  const kit = serviceInfo?.kit || {}
  const kitComponents = Array.isArray(kit?.components) ? kit.components : []
  const serviceDocId = serviceInfo?.serviceId
  const rawCustomerPo = serviceInfo?.customerPoNumber || po?.poNumber || ''
  const hasValue = (value) => {
    if (value === null || value === undefined) return false
    if (typeof value === 'string') return value.trim().length > 0
    return true
  }
  const joinParts = (parts = [], separator = ', ') =>
    parts
      .filter((part) => hasValue(part))
      .map((part) => (typeof part === 'string' ? part.trim() : String(part)))
      .filter((part) => part.length > 0)
      .join(separator)
  const formatQty = (value) => {
    if (value === null || value === undefined) return '—'
    const num = Number(value)
    if (Number.isFinite(num)) {
      if (Math.abs(num - Math.round(num)) < 0.001) return String(Math.round(num))
      return num.toFixed(2).replace(/\.00$/, '')
    }
    if (typeof value === 'string') return value.trim() || '—'
    return String(value)
  }
  const hasBuyerDetails = [buyer.name, buyer.gst, buyer.address, buyer.pin, buyer.state, buyer.contact, buyer.email].some(hasValue)
  const hasConsigneeDetails = [consignee.name, consignee.gst, consignee.address, consignee.pin, consignee.state].some(hasValue)
  const hasKitSummary = hasValue(kit.name) || hasValue(kit.code) || kitComponents.length > 0
  const customerPoValue = hasValue(rawCustomerPo)
    ? (typeof rawCustomerPo === 'string' ? rawCustomerPo.trim() : String(rawCustomerPo))
    : '—'
  const serviceDocValue = hasValue(serviceDocId) ? `#${serviceDocId}` : '—'

  const [status, setStatus] = useState(STEPS[0].value)
  const [remarks, setRemarks] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const [postProgress, { isLoading }] = usePostProgressMutation()
  const [fetchPdf, { isFetching: isPdfLoading }] = useLazyGetCompletionReportPdfQuery()
  const [fetchAttachment, { isFetching: isAttachmentLoading }] = useLazyGetProgressAttachmentQuery()

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null)
      return undefined
    }
    const objectUrl = URL.createObjectURL(photoFile)
    setPhotoPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [photoFile])

  async function handlePostProgress (event) {
    event?.preventDefault()
    if (!id) return
    try {
      await postProgress({ woId: id, status, remarks, photoFile }).unwrap()
      setRemarks('')
      setPhotoFile(null)
      toast.success('Progress updated')
      refetchDetail()
    } catch (e) {
      toast.error(String(e?.data?.message || e?.error || 'Failed to post progress'))
    }
  }

  function handleSelectPhoto (event) {
    const file = event?.target?.files?.[0]
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error('Please select a photo under 8 MB')
        return
      }
      setPhotoFile(file)
    }
  }

  function clearPhotoSelection () {
    setPhotoFile(null)
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

  async function handleDownloadAttachment (progressId, attachment) {
    if (!id || !attachment?.id) return
    try {
      const blob = await fetchAttachment({ woId: id, progressId, attachmentId: attachment.id }).unwrap()
      const filename = attachment.filename || `progress-photo-${attachment.id}`
      downloadBlob(blob, filename)
    } catch (e) {
      toast.error(String(e?.data?.message || e?.error || 'Unable to download photo'))
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
              <Info label='Customer PO' value={customerPoValue} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Info label='Service Document' value={serviceDocValue} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Info label='Service Request' value={sr?.srn || '—'} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Info label='Service Type' value={sr?.serviceType || '—'} />
            </Grid>
            {serviceInfo?.customerName && (
              <Grid item xs={12} sm={6} md={4}>
                <Info
                  label='Customer'
                  value={
                    <Stack spacing={0.5}>
                      <Typography variant='body2' color='text.primary'>
                        {serviceInfo.customerName}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {serviceInfo.customerEmail || '—'}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {serviceInfo.customerMobile || '—'}
                      </Typography>
                    </Stack>
                  }
                />
              </Grid>
            )}
            <Grid item xs={12} md={8}>
              <Info icon={<LocationOnRoundedIcon fontSize='small' color='primary' />} label='Site Address' value={srSiteAddress} multiline />
            </Grid>
            {srDescription ? (
              <Grid item xs={12}>
                <Info label='Job Description' value={srDescription} multiline />
              </Grid>
            ) : null}
            {hasBuyerDetails && (
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    borderRadius: 2,
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    p: 2
                  }}
                >
                  <Stack spacing={1}>
                    <Stack direction='row' spacing={1} alignItems='center'>
                      <StorefrontRoundedIcon color='primary' fontSize='small' />
                      <Typography variant='subtitle2'>Buyer (Bill To)</Typography>
                    </Stack>
                    <Stack spacing={0.5}>
                      <Typography variant='body2' fontWeight={600}>
                        {hasValue(buyer.name) ? buyer.name : '—'}
                      </Typography>
                      {hasValue(buyer.gst) ? (
                        <Typography variant='caption' color='text.secondary'>
                          GSTIN: {buyer.gst}
                        </Typography>
                      ) : null}
                      {hasValue(buyer.contact) || hasValue(buyer.email) ? (
                        <Stack spacing={0.25}>
                          {hasValue(buyer.contact) ? (
                            <Typography variant='caption' color='text.secondary'>
                              Contact: {buyer.contact}
                            </Typography>
                          ) : null}
                          {hasValue(buyer.email) ? (
                            <Typography variant='caption' color='text.secondary'>
                              Email: {buyer.email}
                            </Typography>
                          ) : null}
                        </Stack>
                      ) : null}
                      {hasValue(buyer.address) ? (
                        <Typography variant='body2' color='text.secondary'>
                          {buyer.address}
                        </Typography>
                      ) : null}
                      {hasValue(buyer.pin) || hasValue(buyer.state) ? (
                        <Typography variant='caption' color='text.secondary'>
                        {joinParts([buyer.pin, buyer.state])}
                        </Typography>
                      ) : null}
                    </Stack>
                  </Stack>
                </Box>
              </Grid>
            )}
            {hasConsigneeDetails && (
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    borderRadius: 2,
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    p: 2
                  }}
                >
                  <Stack spacing={1}>
                    <Stack direction='row' spacing={1} alignItems='center'>
                      <LocalShippingRoundedIcon color='primary' fontSize='small' />
                      <Typography variant='subtitle2'>Consignee (Ship To)</Typography>
                    </Stack>
                    <Stack spacing={0.5}>
                      <Typography variant='body2' fontWeight={600}>
                        {hasValue(consignee.name) ? consignee.name : '—'}
                      </Typography>
                      {hasValue(consignee.gst) ? (
                        <Typography variant='caption' color='text.secondary'>
                          GSTIN: {consignee.gst}
                        </Typography>
                      ) : null}
                      {hasValue(consignee.address) ? (
                        <Typography variant='body2' color='text.secondary'>
                          {consignee.address}
                        </Typography>
                      ) : null}
                      {hasValue(consignee.pin) || hasValue(consignee.state) ? (
                        <Typography variant='caption' color='text.secondary'>
                        {joinParts([consignee.pin, consignee.state])}
                        </Typography>
                      ) : null}
                    </Stack>
                  </Stack>
                </Box>
              </Grid>
            )}
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
            {hasKitSummary ? (
              <Box
                sx={{
                  borderRadius: 2,
                  border: (theme) => `1px dashed ${theme.palette.divider}`,
                  p: 2
                }}
              >
                <Stack spacing={1}>
                  <Stack direction='row' spacing={1} alignItems='center'>
                    <Inventory2RoundedIcon color='primary' fontSize='small' />
                    <Typography variant='subtitle2'>Kit overview</Typography>
                  </Stack>
                  <Stack spacing={0.25}>
                    <Typography variant='body2' fontWeight={600}>
                      {hasValue(kit.name) ? kit.name : '—'}
                    </Typography>
                    {hasValue(kit.code) || hasValue(kit.description) ? (
                      <Typography variant='caption' color='text.secondary'>
                        {joinParts([kit.code, kit.description], ' • ')}
                      </Typography>
                    ) : null}
                  </Stack>
                  {hasValue(kit.brand) || hasValue(kit.category) || hasValue(kit.material) || hasValue(kit.voltage) || hasValue(kit.cores) ? (
                    <Typography variant='caption' color='text.secondary'>
                      {joinParts([kit.brand, kit.category, kit.material, kit.voltage, kit.cores], ' • ')}
                    </Typography>
                  ) : null}
                  {hasValue(kit.hsn) || hasValue(kit.price) ? (
                    <Typography variant='caption' color='text.secondary'>
                      {joinParts([
                        hasValue(kit.hsn) ? `HSN: ${kit.hsn}` : null,
                        hasValue(kit.price) ? `Price: ₹${formatQty(kit.price)}` : null
                      ], ' • ')}
                    </Typography>
                  ) : null}
                  {kitComponents.length > 0 ? (
                    <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                      {kitComponents.map((component, index) => {
                        const label = joinParts([component.name, component.code], ' • ') || 'Component'
                        const quantity = formatQty(component.qty)
                        const uom = hasValue(component.uom) ? component.uom : ''
                        const key = component.itemId || component.code || component.name || `kit-${index}`
                        return (
                          <Typography key={key} variant='caption' color='text.secondary'>
                            • {label} — {quantity}{uom ? ` ${uom}` : ''}
                          </Typography>
                        )
                      })}
                    </Stack>
                  ) : null}
                </Stack>
              </Box>
            ) : null}
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
                      <TableCell align='right'>Issued</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id || `${item.item?.id || item.code}-${item.workOrderId || 'row'}`}>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography variant='body2'>{item.name || item.description || '—'}</Typography>
                            {(item.spec || item.hsn || item.uom) && (
                              <Typography variant='caption' color='text.secondary'>
                                {[item.spec, item.uom, item.hsn].filter(Boolean).join(' • ')}
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>{item.code || '—'}</TableCell>
                        <TableCell align='right'>{item.qtyPlanned ?? item.qty ?? item.quantity ?? '—'}</TableCell>
                        <TableCell align='right'>{item.qtyIssued ?? '—'}</TableCell>
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
        <CardHeader
          avatar={<HistoryRoundedIcon color='primary' />}
          title='Recent updates'
          subheader='Timeline of progress shared with the back office'
        />
        <Divider />
        <CardContent>
          {progress.length === 0 ? (
            <Typography variant='body2' color='text.secondary'>No updates logged yet.</Typography>
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
                    <Chip label={(entry.status || '').replace(/_/g, ' ')} size='small' color='primary' variant='outlined' />
                    <Typography variant='caption' color='text.secondary'>
                      {entry.createdAt ? new Date(entry.createdAt).toLocaleString('en-IN') : '—'}
                    </Typography>
                  </Stack>
                  {entry.remarks && (
                    <Typography variant='body2' sx={{ mt: 1 }}>
                      {entry.remarks}
                    </Typography>
                  )}
                  <Stack direction='row' spacing={2} sx={{ mt: 1 }}>
                    {entry.by?.name && (
                      <Typography variant='caption' color='text.secondary'>
                        By {entry.by.name}
                      </Typography>
                    )}
                    {entry.photoUrl && (
                      <Link href={entry.photoUrl} target='_blank' rel='noreferrer' variant='caption'>
                        View photo
                      </Link>
                    )}
                  </Stack>
                  {Array.isArray(entry.attachments) && entry.attachments.length > 0 && (
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
                      {entry.attachments.map((attachment) => (
                        <Button
                          key={attachment.id || attachment.downloadPath}
                          size='small'
                          variant='text'
                          onClick={() => handleDownloadAttachment(entry.id, attachment)}
                          disabled={isAttachmentLoading}
                        >
                          {attachment.filename || 'Download photo'}
                        </Button>
                      ))}
                    </Stack>
                  )}
                </Box>
              ))}
            </Stack>
          )}
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
                  onKeyDown={focusNextInputOnEnter}
                >
                  {STEPS.map((step) => (
                    <MenuItem key={step.value} value={step.value}>
                      {step.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack spacing={1} alignItems='flex-start'>
                  <Button
                    variant='outlined'
                    component='label'
                    size='small'
                    disabled={isLoading}
                  >
                    {photoFile ? 'Change photo' : 'Upload progress photo'}
                    <input type='file' accept='image/*' hidden onChange={handleSelectPhoto} />
                  </Button>
                  {photoFile && (
                    <Chip
                      label={`${photoFile.name} (${Math.round(photoFile.size / 1024)} KB)`}
                      onDelete={clearPhotoSelection}
                      variant='outlined'
                      size='small'
                    />
                  )}
                  <Typography variant='caption' color='text.secondary'>JPEG/PNG up to 8 MB</Typography>
                  {photoPreview && (
                    <Box
                      component='img'
                      src={photoPreview}
                      alt='Selected progress'
                      sx={{ width: 160, height: 'auto', borderRadius: 2, border: (theme) => `1px solid ${theme.palette.divider}` }}
                    />
                  )}
                </Stack>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size='small'
                  label='Remarks (optional)'
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  onKeyDown={focusNextInputOnEnter}
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
