import React, { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Toaster, toast } from 'react-hot-toast'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
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
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded'
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import GavelRoundedIcon from '@mui/icons-material/GavelRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import {
  useGetMyProposalsQuery,
  useCustomerDownloadLatestProposalPdfMutation,
  useApproveProposalMutation,
  useRejectProposalMutation,
  useUploadPOFileMutation,
  useGetProposalDocumentsQuery,
  useCustomerDownloadProposalDocumentFileMutation
} from '../../features/customer/customerApi'
import { docLabel } from '../../utils/docs'
import { focusNextOnEnter } from '../../utils/formNavigation'

const selectAuth = (s) => s?.auth || {}

const statusTone = (status) => {
  const value = (status || '').toUpperCase()
  switch (value) {
    case 'APPROVED':
      return { color: 'success', label: 'Approved' }
    case 'REJECTED':
      return { color: 'error', label: 'Rejected' }
    case 'SENT':
    case 'PUBLISHED':
      return { color: 'primary', label: status }
    case 'DRAFT':
      return { color: 'default', label: 'Draft' }
    default:
      return { color: 'default', label: status || '—' }
  }
}

export default function Proposals () {
  const auth = useSelector(selectAuth)
  const customerId = auth?.user?.customerId ?? null
  const { data = { content: [] }, error, isLoading, refetch } = useGetMyProposalsQuery(
    customerId ? { customerId } : undefined,
    { skip: customerId === null }
  )

  const proposals = useMemo(() => (Array.isArray(data?.content) ? data.content : []), [data])

  const [downloadLatest] = useCustomerDownloadLatestProposalPdfMutation()
  const [approve, { isLoading: approving }] = useApproveProposalMutation()
  const [reject, { isLoading: rejecting }] = useRejectProposalMutation()
  const [uploadPOFile] = useUploadPOFileMutation()

  const [approveModal, setApproveModal] = useState({ open: false, proposal: null, poNumber: '', note: '', file: null })
  const [rejectModal, setRejectModal] = useState({ open: false, proposal: null, note: '' })

  const openApprove = (proposal) => {
    setApproveModal({ open: true, proposal, poNumber: proposal?.customerPoNumber || '', note: '', file: null })
  }
  const closeApprove = () => setApproveModal({ open: false, proposal: null, poNumber: '', note: '', file: null })

  const submitApprove = async () => {
    if (!approveModal.proposal) return
    const id = approveModal.proposal.id
    if (!approveModal.poNumber?.trim()) {
      toast.error('Please enter the PO number')
      return
    }
    try {
      await approve({
        id,
        poNumber: approveModal.poNumber.trim(),
        note: approveModal.note?.trim(),
        poFile: approveModal.file || undefined
      }).unwrap()
      toast.success('Proposal approved')
      closeApprove()
      refetch()
    } catch (e) {
      toast.error(String(e?.data?.message || e?.error || 'Approval failed'))
    }
  }

  const openReject = (proposal) => setRejectModal({ open: true, proposal, note: '' })
  const closeReject = () => setRejectModal({ open: false, proposal: null, note: '' })

  const submitReject = async () => {
    if (!rejectModal.proposal) return
    try {
      await reject({ id: rejectModal.proposal.id, note: rejectModal.note?.trim() }).unwrap()
      toast.success('Proposal rejected')
      closeReject()
      refetch()
    } catch (e) {
      toast.error(String(e?.data?.message || e?.error || 'Reject failed'))
    }
  }

  const handleUploadPoFile = async (proposalId, file) => {
    if (!file) return
    try {
      await uploadPOFile({ id: proposalId, file }).unwrap()
      toast.success('PO PDF uploaded')
      refetch()
    } catch (e) {
      toast.error(String(e?.data?.message || e?.error || 'Upload failed'))
    }
  }

  return (
    <Stack spacing={3}>
      <Toaster position='top-right' />

      <Stack direction='row' spacing={1.2} alignItems='center'>
        <GavelRoundedIcon color='primary' />
        <Typography variant='h4' fontWeight={600}>
          Proposals
        </Typography>
      </Stack>

      {!customerId ? (
        <Alert severity='warning'>
          Your account isn’t linked to a customer profile yet. Please contact support.
        </Alert>
      ) : null}

      {error ? (
        <Alert severity='error'>
          {String(error?.data?.message || error?.error || 'Failed to load proposals')}
        </Alert>
      ) : null}

      <Card elevation={0}>
        <CardHeader
          title={<Typography variant='subtitle1'>Proposal history</Typography>}
          subheader='Review and manage proposals shared with your organisation.'
        />
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Proposal</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>PO Number</TableCell>
                  <TableCell>Documents</TableCell>
                  <TableCell align='right'>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ p: 0 }}>
                      <LinearProgress color='primary' />
                    </TableCell>
                  </TableRow>
                ) : null}

                {!isLoading && proposals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align='center' sx={{ py: 6 }}>
                      <Typography variant='body2' color='text.secondary'>
                        No proposals yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}

                {!isLoading
                  ? proposals.map((p) => {
                      const code = p.code || p.proposalNo || (p.id ? `P-${p.id}` : '—')
                      const status = p.status || p.proposalStatus || '—'
                      const customerName = p.customer?.name || p.customer?.displayName || p.customerName || '—'
                      const poNumber = p.customerPoNumber || p.customerPO?.poNumber || '—'
                      const tone = statusTone(status)

                      return (
                        <TableRow key={p.id} hover>
                          <TableCell>
                            <Typography variant='body2' fontWeight={600}>
                              {code}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>{customerName}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size='small'
                              color={tone.color}
                              label={tone.label}
                              variant={tone.color === 'default' ? 'outlined' : 'soft'}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2' color='text.secondary'>
                              {poNumber || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <DocsPreview proposalId={p.id} />
                          </TableCell>
                          <TableCell align='right'>
                            <Stack direction='row' spacing={1} justifyContent='flex-end' flexWrap='wrap'>
                              <Button
                                size='small'
                                variant='outlined'
                                startIcon={<DownloadRoundedIcon fontSize='small' />}
                                onClick={async () => {
                                  try {
                                    await downloadLatest({ id: p.id, filename: `proposal-${p.id}.pdf` }).unwrap()
                                  } catch (e) {
                                    toast.error(String(e?.data?.message || e?.error || 'Download failed'))
                                  }
                                }}
                              >
                                PDF
                              </Button>
                              <Button
                                size='small'
                                variant='contained'
                                color='success'
                                startIcon={<CheckCircleRoundedIcon fontSize='small' />}
                                onClick={() => openApprove(p)}
                              >
                                Approve
                              </Button>
                              <Button
                                size='small'
                                variant='contained'
                                color='error'
                                startIcon={<DoNotDisturbOnRoundedIcon fontSize='small' />}
                                onClick={() => openReject(p)}
                              >
                                Reject
                              </Button>
                              <Button
                                size='small'
                                variant='outlined'
                                startIcon={<CloudUploadRoundedIcon fontSize='small' />}
                                component='label'
                              >
                                Upload PO
                                <input
                                  type='file'
                                  accept='application/pdf'
                                  hidden
                                  onChange={(event) => {
                                    const file = event.target.files?.[0]
                                    event.target.value = ''
                                    if (file) handleUploadPoFile(p.id, file)
                                  }}
                                />
                              </Button>
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

      <Dialog open={approveModal.open} onClose={closeApprove} maxWidth='sm' fullWidth>
        <DialogTitle>Approve proposal {approveModal.proposal ? `P-${approveModal.proposal.id}` : ''}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label='PO Number'
              value={approveModal.poNumber}
              onChange={(event) => setApproveModal((m) => ({ ...m, poNumber: event.target.value }))}
              onKeyDown={focusNextOnEnter}
              fullWidth
              size='small'
            />
            <TextField
              label='Note (optional)'
              value={approveModal.note}
              onChange={(event) => setApproveModal((m) => ({ ...m, note: event.target.value }))}
              onKeyDown={focusNextOnEnter}
              fullWidth
              size='small'
            />
            <Button
              variant='outlined'
              startIcon={<CloudUploadRoundedIcon />}
              component='label'
              color='primary'
            >
              Attach PO PDF
              <input
                type='file'
                accept='application/pdf'
                hidden
                onChange={(event) => setApproveModal((m) => ({ ...m, file: event.target.files?.[0] || null }))}
              />
            </Button>
            {approveModal.file ? (
              <Typography variant='caption' color='text.secondary'>
                Selected: {approveModal.file.name}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeApprove} color='inherit'>Cancel</Button>
          <Button
            onClick={submitApprove}
            variant='contained'
            color='success'
            startIcon={<CheckCircleRoundedIcon fontSize='small' />}
            disabled={approving}
          >
            {approving ? 'Approving…' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectModal.open} onClose={closeReject} maxWidth='sm' fullWidth>
        <DialogTitle>Reject proposal {rejectModal.proposal ? `P-${rejectModal.proposal.id}` : ''}</DialogTitle>
        <DialogContent>
          <TextField
            label='Reason (optional)'
            value={rejectModal.note}
            onChange={(event) => setRejectModal((m) => ({ ...m, note: event.target.value }))}
            onKeyDown={focusNextOnEnter}
            fullWidth
            multiline
            minRows={4}
            size='small'
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeReject} color='inherit'>Cancel</Button>
          <Button
            onClick={submitReject}
            variant='contained'
            color='error'
            startIcon={<DoNotDisturbOnRoundedIcon fontSize='small' />}
            disabled={rejecting}
          >
            {rejecting ? 'Rejecting…' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

function DocsPreview ({ proposalId }) {
  const { data, isFetching, error, refetch } = useGetProposalDocumentsQuery(
    { id: proposalId },
    { skip: !proposalId }
  )
  const [downloadDoc] = useCustomerDownloadProposalDocumentFileMutation()

  if (!proposalId) return null
  if (isFetching) return <LinearProgress color='inherit' sx={{ height: 2, borderRadius: 1 }} />
  if (error) {
    return (
      <Button size='small' color='error' startIcon={<RefreshRoundedIcon />} onClick={() => refetch()}>
        Retry
      </Button>
    )
  }
  const docs = Array.isArray(data) ? data : []
  if (docs.length === 0) {
    return (
      <Typography variant='caption' color='text.secondary'>
        No docs
      </Typography>
    )
  }

  return (
    <Stack direction='row' spacing={1} flexWrap='wrap'>
      {docs.map((doc) => (
        <Chip
          key={doc.id}
          size='small'
          icon={<DescriptionRoundedIcon />}
          label={docLabel(doc)}
          onClick={async () => {
            try {
              await downloadDoc({
                proposalId,
                docId: doc.id,
                filename: doc.originalName || doc.filename || `${docLabel(doc)}-${proposalId}.pdf`
              }).unwrap()
            } catch (e) {
              toast.error(String(e?.data?.message || e?.error || 'Download failed'))
            }
          }}
          variant='outlined'
        />
      ))}
    </Stack>
  )
}
