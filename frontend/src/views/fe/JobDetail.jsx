// views/fe/JobDetail.jsx
import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Toaster, toast } from 'react-hot-toast'
import {
  usePostProgressMutation,
  useLazyGetCompletionReportPdfQuery,
  useGetWorkOrderDetailQuery,
} from '../../features/fe/feApi'
import { downloadBlob } from '../../utils/file'
import { focusNextOnEnter } from '../../utils/formNavigation'

const STEPS = [
  { label: 'Started', value: 'STARTED' },
  { label: 'Material Received', value: 'MATERIAL_RECEIVED' },
  { label: 'Installation Started', value: 'INSTALLATION_STARTED' },
  { label: 'Completed', value: 'COMPLETED' },
]

export default function JobDetail () {
  const { id } = useParams()

  const { data: detail, isFetching: detailLoading, error: detailError, refetch: refetchDetail } = useGetWorkOrderDetailQuery(
    id,
    { skip: !id }
  )

  const workOrder = detail?.workOrder || {}
  const instruction = detail?.instruction || ''
  const items = Array.isArray(detail?.items) ? detail.items : []
  const sr = workOrder?.serviceRequest || {}
  const customer = sr?.customer || {}
  const po = workOrder?.customerPO || {}

  const [status, setStatus] = useState(STEPS[0].value)
  const [remarks, setRemarks] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')

  const [postProgress, { isLoading }] = usePostProgressMutation()
  const [fetchPdf, { isFetching: isPdfLoading }] = useLazyGetCompletionReportPdfQuery()

  async function handlePostProgress () {
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
    <div className='space-y-6'>
      <Toaster />
      <h1 className='text-2xl font-semibold'>Job #{id}</h1>

      <div className='card p-4 space-y-4'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <h2 className='text-xl font-semibold text-slate-900'>Work Order {workOrder?.wan || workOrder?.id || id}</h2>
            <p className='text-sm text-slate-600'>Service: {sr?.serviceType || '—'}</p>
            {detailLoading && <p className='text-sm text-slate-500'>Loading job details…</p>}
            {detailError && (
              <p className='text-sm text-rose-600'>
                {String(detailError?.data?.message || detailError?.error || 'Unable to load job detail')}
              </p>
            )}
          </div>
          <div className='text-sm text-slate-600'>
            <div>
              <span className='font-semibold text-slate-800'>Customer:</span> {customer?.name || customer?.displayName || '—'}
            </div>
            <div>{customer?.email || sr?.customerEmail || '—'}</div>
            <div>{customer?.mobile || sr?.customerMobile || '—'}</div>
          </div>
        </div>

        <div className='grid gap-3 sm:grid-cols-2'>
          <Info label='Work Order Status' value={workOrder?.status || '—'} />
          <Info
            label='Scheduled Date'
            value={workOrder?.scheduledAt ? new Date(workOrder.scheduledAt).toLocaleString('en-IN') : '—'}
          />
          <Info label='Customer PO' value={po?.poNumber || '—'} />
          <Info label='Location' value={sr?.serviceLocation || workOrder?.siteAddress || '—'} />
        </div>

        {instruction && (
          <div className='rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700'>
            <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Instruction from back office</div>
            <p className='mt-1 whitespace-pre-line'>{instruction}</p>
          </div>
        )}

        <div>
          <h3 className='text-sm font-semibold uppercase tracking-wide text-slate-500'>Items / Kits</h3>
          {items.length === 0 ? (
            <p className='mt-2 text-sm text-slate-600'>No items assigned.</p>
          ) : (
            <div className='mt-2 overflow-x-auto'>
              <table className='min-w-full divide-y divide-slate-200 text-sm'>
                <thead className='bg-slate-50 text-xs uppercase tracking-wide text-slate-500'>
                  <tr>
                    <th className='px-3 py-2 text-left'>Item</th>
                    <th className='px-3 py-2 text-left'>Code</th>
                    <th className='px-3 py-2 text-right'>Qty</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                  {items.map((item) => (
                    <tr key={item.id || `${item.item?.id}-${item.workOrderId}`}>
                      <td className='px-3 py-2 text-slate-800'>{item.item?.name || item.description || '—'}</td>
                      <td className='px-3 py-2 text-slate-600'>{item.item?.code || item.code || '—'}</td>
                      <td className='px-3 py-2 text-right text-slate-800'>{item.qty ?? item.quantity ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className='card p-4 grid md:grid-cols-2 gap-3'>
        <select className='input' value={status} onChange={(e) => setStatus(e.target.value)} onKeyDown={focusNextOnEnter}>
          {STEPS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <input
          className='input'
          placeholder='Photo URL (optional)'
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          onKeyDown={focusNextOnEnter}
          autoComplete='on'
        />

        <input
          className='input md:col-span-2'
          placeholder='Remarks (optional)'
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          onKeyDown={focusNextOnEnter}
          autoComplete='on'
        />

        <button className='btn-primary md:col-span-2' disabled={isLoading} onClick={handlePostProgress}>
          {isLoading ? 'Posting…' : 'Post Progress'}
        </button>
      </div>

      <div className='card p-4'>
        <button className='btn-secondary' disabled={isPdfLoading} onClick={handleDownload}>
          {isPdfLoading ? 'Preparing…' : 'Download Completion Report'}
        </button>
      </div>
    </div>
  )
}

function Info ({ label, value }) {
  return (
    <div>
      <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>{label}</div>
      <div className='text-sm text-slate-900'>{value || '—'}</div>
    </div>
  )
}
