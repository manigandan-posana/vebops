import React from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { useSelector } from 'react-redux'
import {
  useGetMyProposalsQuery,
  useUploadPOMutation,
  useGetProposalDocumentsQuery,
  useUploadPOFileMutation,
  useCustomerDownloadProposalDocumentFileMutation,
  useCustomerDownloadLatestProposalPdfMutation,
  useApproveProposalMutation,
} from '../../features/customer/customerApi'
import { docLabel } from '../../utils/docs'

const selectAuth = (s) => s?.auth || {}

export default function Proposals() {
  const auth = useSelector(selectAuth)
  const customerId = auth?.user?.customerId ?? null

  const { data, error, isLoading, refetch } = useGetMyProposalsQuery(
    customerId ? { customerId } : undefined,
    { skip: customerId === null }
  )
  const [uploadPO, { isLoading: uploading }] = useUploadPOMutation()

  const proposals = Array.isArray(data?.content) ? data.content : (data?.items || data || [])

  const [poInputs, setPoInputs] = React.useState({}) // { [proposalId]: { poNumber: '', url: '' } }

  const [uploadPOFile, { isLoading: uploadingPoFile }] = useUploadPOFileMutation()

  const [downloadLatest, { isLoading: downloadingLatest }] = useCustomerDownloadLatestProposalPdfMutation()
  const [approve, { isLoading: approving }] = useApproveProposalMutation()


  const handlePoPdfSelect = async (proposalId, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const res = await uploadPOFile({ id: proposalId, file })
    if (res?.error) {
      toast.error(String(res.error?.data?.message || 'PO upload failed'))
    } else {
      toast.success('PO PDF uploaded')
      refetch()
    }
  }


  const setInput = (id, key, val) => {
    setPoInputs((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: val } }))
  }

  const onUpload = async (p) => {
    const pid = p?.id
    const poNumber = poInputs[pid]?.poNumber?.trim()
    const url = poInputs[pid]?.url?.trim()
    if (!pid) return toast.error('Missing proposal id')
    if (!poNumber) return toast.error('Enter PO Number')

    try {
      await uploadPO({ id: pid, poNumber, url }).unwrap()
      toast.success('PO number saved')
      setPoInputs((prev) => ({ ...prev, [pid]: { poNumber: '', url: '' } }))
      refetch()
    } catch (e) {
      const msg = e?.data?.message || e?.error || e?.message || 'Upload failed'
      toast.error(String(msg))
    }
  }

  return (
    <div className="space-y-6">
      <Toaster />
      <h1 className="text-2xl font-semibold">Customer Portal</h1>

      {!customerId && (
        <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
          Your account isn’t linked to a customer profile yet. Please log out and log in using the email on the customer record, or ask support to link your portal user.
        </div>
      )}

      {error && (
        <div className="alert error">
          {String(error?.data?.message || error?.error || 'Failed to load')}
        </div>
      )}

      <div className="card p-4 overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-3">Proposal</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Customer</th>
              <th className="py-2 pr-3">PO Number</th>
              <th className="py-2 pr-3">PO URL (optional)</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td className="py-6 text-slate-500" colSpan={6}>Loading…</td></tr>
            )}

            {!isLoading && proposals.length === 0 && (
              <tr><td className="py-6 text-slate-500" colSpan={6}>No proposals yet.</td></tr>
            )}

            {!isLoading && proposals.map((p) => {
              const code = p.code || p.proposalNo || (p.id ? `P-${p.id}` : '—')
              const status = p.status || p.proposalStatus || '—'
              const customerName = p.customer?.name || p.customer?.displayName || p.customerName || '—'

              return (
                <tr key={p.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-3">{code}</td>
                  <td className="py-2 pr-3">{status}</td>
                  <td className="py-2 pr-3">{customerName}</td>
                  <td className="py-2 pr-3">
                    <input
                      className="input"
                      placeholder="Enter PO Number"
                      value={poInputs[p.id]?.poNumber || ''}
                      onChange={(e) => setInput(p.id, 'poNumber', e.target.value)}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      className="input"
                      placeholder="https://… (optional)"
                      value={poInputs[p.id]?.url || ''}
                      onChange={(e) => setInput(p.id, 'url', e.target.value)}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <button
                      className="btn"
                      disabled={uploading}
                      onClick={() => onUpload(p)}
                    >
                      Save PO
                    </button>
                    <DocsPreview proposalId={p.id} customerId={customerId} />
                  </td>
                  <td className="py-2 pr-3">
                    <label className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer">
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => handlePoPdfSelect(p.id, e)}
                        disabled={uploading} // reuse your local uploading state or add another
                      />
                      <span className="text-sm">{uploading ? 'Uploading…' : 'Upload PO PDF'}</span>
                    </label>
                  </td>
                  <td className="py-2 pr-3">
                    {/* Download Latest PDF */}
                    <button
                      className="text-xs px-2 py-1 rounded bg-indigo-600 text-white"
                      disabled={downloadingLatest}
                      onClick={async () => {
                        try {
                          await downloadLatest({ id: p.id, filename: `proposal-${p.id}.pdf` }).unwrap()
                        } catch (e) {
                          toast.error(String(e?.data?.message || e?.error || 'Download failed'))
                        }
                      }}
                    >
                      {downloadingLatest ? 'Downloading…' : 'Latest PDF'}
                    </button>

                    {/* Approve (poNumber + optional note + optional file) */}
                    <form
                      onSubmit={async (ev) => {
                        ev.preventDefault()
                        const form = ev.currentTarget
                        const poNumber = form.querySelector('input[name="poNumber"]')?.value?.trim()
                        const note = form.querySelector('input[name="note"]')?.value?.trim()
                        const file = form.querySelector('input[name="poFile"]')?.files?.[0] || null
                        try {
                          await approve({ id: p.id, poNumber, note, poFile: file }).unwrap()
                          toast.success('Approved')
                          // Optionally refetch list
                          refetch()
                          form.reset()
                        } catch (e) {
                          toast.error(String(e?.data?.message || e?.error || 'Approve failed'))
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <input name="poNumber" placeholder="PO Number" className="border rounded px-2 py-1 text-sm" />
                      <input name="note" placeholder="Note (optional)" className="border rounded px-2 py-1 text-sm" />
                      <label className="inline-flex items-center px-2 py-1 rounded border cursor-pointer text-sm bg-white">
                        <input name="poFile" type="file" accept="application/pdf" className="hidden" />
                        Upload PO PDF
                      </label>
                      <button
                        type="submit"
                        disabled={approving}
                        className="text-xs px-2 py-1 rounded bg-emerald-600 text-white"
                      >
                        {approving ? 'Approving…' : 'Approve'}
                      </button>
                    </form>

                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}



function DocsPreview({ proposalId, customerId }) {
  const { data, isFetching, error, refetch } = useGetProposalDocumentsQuery(
    { id: proposalId, customerId },
    { skip: !proposalId || !customerId }
  )
  if (isFetching) return <span className="ml-2 text-xs text-slate-500">Loading docs…</span>
  if (error) return <span className="ml-2 text-xs text-red-600">Failed to load docs</span>
  const list = Array.isArray(data) ? data : []

  return (
    <span className="ml-2 text-xs text-slate-600 flex gap-2 items-center">
      {list.map((d) => (
        <DocChip key={d.id} proposalId={proposalId} doc={d} />
      ))}
    </span>
  )
}

function DocChip({ proposalId, doc }) {
  const label = docLabel(doc)
  const [downloadDoc, { isLoading: downloading }] = useCustomerDownloadProposalDocumentFileMutation()
  const onDownload = async () => {
    try {
      await downloadDoc({
        proposalId,
        docId: doc.id,
        filename: doc?.originalName || `${label}-${proposalId}.pdf`
      }).unwrap()
    } catch (e) {
      toast.error(String(e?.data?.message || e?.error || 'Download failed'))
    }
  }
  return (
    <button
      onClick={onDownload}
      disabled={downloading}
      className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100"
      title={doc?.originalName || ''}
    >
      {downloading ? '...' : `Download ${label}`}
    </button>
  )
}
