import React, { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Toaster, toast } from 'react-hot-toast'
import {
  useGetMyProposalsQuery,
  useCustomerDownloadLatestProposalPdfMutation,
  useApproveProposalMutation,
  useRejectProposalMutation,
  useUploadPOFileMutation,
  useGetProposalDocumentsQuery,
  useCustomerDownloadProposalDocumentFileMutation,
} from '../../features/customer/customerApi'
import { docLabel } from '../../utils/docs'

const selectAuth = (s) => s?.auth || {}

const statusTone = (status) => {
  const map = {
    APPROVED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    REJECTED: 'bg-rose-100 text-rose-700 border border-rose-200',
    SENT: 'bg-blue-100 text-blue-700 border border-blue-200',
    DRAFT: 'bg-slate-100 text-slate-700 border border-slate-200'
  }
  return map[status] || 'bg-slate-100 text-slate-700 border border-slate-200'
}

export default function Proposals () {
  const auth = useSelector(selectAuth)
  const customerId = auth?.user?.customerId ?? null
  const { data, error, isLoading, refetch } = useGetMyProposalsQuery(
    customerId ? { customerId } : undefined,
    { skip: customerId === null }
  )

  const proposals = useMemo(() => {
    if (Array.isArray(data?.content)) return data.content
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.items)) return data.items
    return []
  }, [data])

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
    <div className='space-y-6'>
      <Toaster />
      <h1 className='text-2xl font-semibold'>Proposals</h1>

      {!customerId && (
        <div className='rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800'>
          Your account isn’t linked to a customer profile yet. Please contact support.
        </div>
      )}

      {error && (
        <div className='rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700'>
          {String(error?.data?.message || error?.error || 'Failed to load proposals')}
        </div>
      )}

      <div className='overflow-x-auto rounded-2xl border border-slate-200 bg-white'>
        <table className='min-w-full divide-y divide-slate-200 text-sm'>
          <thead className='bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <tr>
              <th className='px-3 py-2 text-left'>Proposal</th>
              <th className='px-3 py-2 text-left'>Customer</th>
              <th className='px-3 py-2 text-left'>Status</th>
              <th className='px-3 py-2 text-left'>PO Number</th>
              <th className='px-3 py-2 text-left'>Docs</th>
              <th className='px-3 py-2 text-center'>Actions</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-200'>
            {isLoading && (
              <tr><td colSpan={6} className='px-3 py-6 text-center text-slate-500'>Loading…</td></tr>
            )}
            {!isLoading && proposals.length === 0 && (
              <tr><td colSpan={6} className='px-3 py-6 text-center text-slate-500'>No proposals yet.</td></tr>
            )}
            {!isLoading && proposals.map((p) => {
              const code = p.code || p.proposalNo || (p.id ? `P-${p.id}` : '—')
              const status = p.status || p.proposalStatus || '—'
              const customerName = p.customer?.name || p.customer?.displayName || p.customerName || '—'
              const poNumber = p.customerPoNumber || p.customerPO?.poNumber || '—'
              return (
                <tr key={p.id}>
                  <td className='px-3 py-2 font-medium text-slate-900'>{code}</td>
                  <td className='px-3 py-2 text-slate-700'>{customerName}</td>
                  <td className='px-3 py-2'>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone(status)}`}>
                      {status}
                    </span>
                  </td>
                  <td className='px-3 py-2 text-slate-700'>{poNumber || '—'}</td>
                  <td className='px-3 py-2 text-slate-700'>
                    <DocsPreview proposalId={p.id} />
                  </td>
                  <td className='px-3 py-2'>
                    <div className='flex flex-wrap items-center justify-center gap-2'>
                      <button
                        className='rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700'
                        onClick={async () => {
                          try {
                            await downloadLatest({ id: p.id, filename: `proposal-${p.id}.pdf` }).unwrap()
                          } catch (e) {
                            toast.error(String(e?.data?.message || e?.error || 'Download failed'))
                          }
                        }}
                      >
                        Download PDF
                      </button>
                      <button
                        className='rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700'
                        onClick={() => openApprove(p)}
                      >
                        Approve
                      </button>
                      <button
                        className='rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700'
                        onClick={() => openReject(p)}
                      >
                        Reject
                      </button>
                      <label className='inline-flex cursor-pointer items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50'>
                        <input
                          type='file'
                          accept='application/pdf'
                          className='hidden'
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            e.target.value = ''
                            if (file) handleUploadPoFile(p.id, file)
                          }}
                        />
                        Upload PO PDF
                      </label>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {approveModal.open && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
          <div className='w-[90vw] max-w-lg rounded-lg bg-white p-6 shadow-xl'>
            <h2 className='text-lg font-semibold text-slate-900'>Approve {approveModal.proposal ? `P-${approveModal.proposal.id}` : ''}</h2>
            <div className='mt-4 space-y-3'>
              <div>
                <label className='text-sm font-medium text-slate-700'>PO Number</label>
                <input
                  className='mt-1 w-full rounded-lg border border-slate-200 px-3 py-2'
                  value={approveModal.poNumber}
                  onChange={(e) => setApproveModal((m) => ({ ...m, poNumber: e.target.value }))}
                />
              </div>
              <div>
                <label className='text-sm font-medium text-slate-700'>Note (optional)</label>
                <input
                  className='mt-1 w-full rounded-lg border border-slate-200 px-3 py-2'
                  value={approveModal.note}
                  onChange={(e) => setApproveModal((m) => ({ ...m, note: e.target.value }))}
                />
              </div>
              <div>
                <label className='text-sm font-medium text-slate-700'>Attach PO PDF (optional)</label>
                <input
                  type='file'
                  accept='application/pdf'
                  onChange={(e) => setApproveModal((m) => ({ ...m, file: e.target.files?.[0] || null }))}
                />
                {approveModal.file && (
                  <p className='mt-1 text-xs text-slate-500'>Selected: {approveModal.file.name}</p>
                )}
              </div>
            </div>
            <div className='mt-6 flex justify-end gap-3'>
              <button className='rounded-lg border border-slate-200 px-4 py-2 text-sm' onClick={closeApprove}>Cancel</button>
              <button
                className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60'
                disabled={approving}
                onClick={submitApprove}
              >
                {approving ? 'Approving…' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModal.open && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
          <div className='w-[90vw] max-w-md rounded-lg bg-white p-6 shadow-xl'>
            <h2 className='text-lg font-semibold text-slate-900'>Reject {rejectModal.proposal ? `P-${rejectModal.proposal.id}` : ''}</h2>
            <div className='mt-4'>
              <label className='text-sm font-medium text-slate-700'>Reason (optional)</label>
              <textarea
                className='mt-1 w-full rounded-lg border border-slate-200 px-3 py-2'
                rows={4}
                value={rejectModal.note}
                onChange={(e) => setRejectModal((m) => ({ ...m, note: e.target.value }))}
              />
            </div>
            <div className='mt-6 flex justify-end gap-3'>
              <button className='rounded-lg border border-slate-200 px-4 py-2 text-sm' onClick={closeReject}>Cancel</button>
              <button
                className='rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60'
                disabled={rejecting}
                onClick={submitReject}
              >
                {rejecting ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DocsPreview ({ proposalId }) {
  const { data, isFetching, error, refetch } = useGetProposalDocumentsQuery(
    { id: proposalId },
    { skip: !proposalId }
  )
  const [downloadDoc] = useCustomerDownloadProposalDocumentFileMutation()

  if (!proposalId) return null
  if (isFetching) return <span className='text-xs text-slate-500'>Loading…</span>
  if (error) return (
    <button className='text-xs text-red-600 underline' onClick={() => refetch()}>Retry</button>
  )
  const docs = Array.isArray(data) ? data : []
  if (docs.length === 0) return <span className='text-xs text-slate-500'>No docs</span>

  return (
    <div className='flex flex-wrap gap-2'>
      {docs.map((doc) => (
        <button
          key={doc.id}
          className='rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-200'
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
        >
          {docLabel(doc)}
        </button>
      ))}
    </div>
  )
}

