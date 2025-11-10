import React from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { useSelector } from 'react-redux'
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
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import {
  useGetMyInvoicesQuery,
  useLazyGetInvoicePdfQuery
} from '../../features/customer/customerApi'
import { downloadBlob } from '../../utils/file'
import { displayDocNumber, normalizeDocNumber } from '../../utils/docNumbers'

const selectAuth = (s) => s?.auth || {}

const statusTone = (status) => {
  const value = (status || '').toUpperCase()
  switch (value) {
    case 'PAID':
      return { color: 'success', label: 'Paid' }
    case 'OVERDUE':
      return { color: 'error', label: 'Overdue' }
    case 'PARTIAL':
      return { color: 'warning', label: 'Partial' }
    default:
      return { color: 'default', label: status || '—' }
  }
}

export default function Invoices () {
  const customerId = useSelector(selectAuth)?.user?.customerId ?? null
  const { data = { content: [] }, error, isLoading } = useGetMyInvoicesQuery(customerId ? { customerId } : undefined)
  const [triggerPdf, pdfState] = useLazyGetInvoicePdfQuery()
  const invoices = Array.isArray(data?.content) ? data.content : []

  const handleDownload = async (inv) => {
    try {
      const res = await triggerPdf(inv.id).unwrap()
      const blob = res
      const code = normalizeDocNumber(inv.invoiceNo)
      const filename = `invoice-${code || inv.id}.pdf`
      downloadBlob(blob, filename)
      toast.success('Downloaded')
    } catch (e) {
      toast.error(String(e?.data?.message || e?.error || 'Download failed'))
    }
  }

  return (
    <Stack spacing={3}>
      <Toaster position='top-right' />

      <Stack direction='row' spacing={1.2} alignItems='center'>
        <ReceiptLongRoundedIcon color='primary' />
        <Typography variant='h4' fontWeight={600}>
          Invoices
        </Typography>
      </Stack>

      {!customerId ? (
        <Alert severity='warning'>
          Your account isn’t linked to a customer profile yet. Please log out and log in using the email on the customer record, or ask support to link your portal user.
        </Alert>
      ) : null}

      {error ? (
        <Alert severity='error'>
          {String(error?.data?.message || error?.error || 'Failed to load invoices')}
        </Alert>
      ) : null}

      <Card elevation={0}>
        <CardHeader
          title={<Typography variant='subtitle1'>Invoice history</Typography>}
          subheader='Download billing documents for your completed work orders.'
        />
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Work Order</TableCell>
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

                {!isLoading && invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align='center' sx={{ py: 6 }}>
                      <Typography variant='body2' color='text.secondary'>
                        No invoices yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}

                {!isLoading
                  ? invoices.map((inv) => {
                      const id = inv.id
                      const code = displayDocNumber(inv.invoiceNo, id ? `INV-${id}` : '—')
                      const date = inv.invoiceDate || '—'
                      const total = typeof inv.total === 'number' ? inv.total.toFixed(2) : inv.total ?? '—'
                      const status = inv.status || '—'
                      const wan = inv.workOrder?.wan || inv.woNo || '—'
                      const tone = statusTone(status)

                      return (
                        <TableRow key={id} hover>
                          <TableCell>{code}</TableCell>
                          <TableCell>{date}</TableCell>
                          <TableCell>{total}</TableCell>
                          <TableCell>
                            <Chip
                              size='small'
                              color={tone.color}
                              label={tone.label}
                              variant={tone.color === 'default' ? 'outlined' : 'soft'}
                            />
                          </TableCell>
                          <TableCell>{wan}</TableCell>
                          <TableCell align='right'>
                            <Button
                              size='small'
                              variant='outlined'
                              startIcon={<DownloadRoundedIcon fontSize='small' />}
                              onClick={() => handleDownload(inv)}
                              disabled={pdfState.isFetching}
                            >
                              {pdfState.isFetching ? 'Preparing…' : 'Download'}
                            </Button>
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
