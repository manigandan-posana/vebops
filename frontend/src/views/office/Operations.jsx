// src/pages/Operations.jsx
import React from 'react'
import { Toaster, toast } from 'react-hot-toast'
import Modal from '../../shell/components/Modal'
import {
  // Requests
  useGetServiceRequestsQuery,
  useCreateWorkOrderFromRequestMutation,
  useGetFieldEngineersQuery,
  useWoAssignMutation,
  // Proposals
  useListProposalsQuery,
  useProposalApproveMutation,
  useProposalRejectMutation,
  useAttachProposalDocumentMutation,
  useListProposalDocumentsQuery,
  useDownloadProposalDocumentFileMutation,
  useWoCompleteMutation,
  useLazyGetInvoiceForWOQuery,
  useSendInvoiceMutation,
  // Work Orders
  useListWOsQuery,
} from '../../features/office/officeApi'
import { docLabel } from '../../utils/docs'

/* --------------------------------- Tabs -------------------------------- */
const TABS = [
  { key: 'requests', label: 'Requests' },
  { key: 'proposals', label: 'Proposals' },
  { key: 'workorders', label: 'Work Orders' },
]

export default function Operations() {
  const [tab, setTab] = React.useState('requests')

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <Toaster />
      <div className="max-w-5xl mx-auto">
        {/* Header + Tabs (top-left) */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-slate-900">Operations</h1>
        </div>

        <div className="mb-4">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
            {TABS.map(t => {
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={[
                    'px-4 py-2 rounded-lg text-sm font-semibold transition',
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100',
                  ].join(' ')}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Views */}
        {tab === 'requests' && <RequestsView />}
        {tab === 'proposals' && <ProposalsView />}
        {tab === 'workorders' && <WorkOrdersView />}
      </div>
    </div>
  )
}

/* ---------------------------- Requests (SR) ---------------------------- */
function RequestsView() {
  const { data, error, isLoading, refetch } = useGetServiceRequestsQuery({})
  const [createWO, { isLoading: creating }] = useCreateWorkOrderFromRequestMutation()
  const { data: feData } = useGetFieldEngineersQuery({ status: 'AVAILABLE' })
  const [assign] = useWoAssignMutation()

  const requests = Array.isArray(data?.content)
    ? data.content
    : (Array.isArray(data) ? data : [])
  const availableFEs = Array.isArray(feData)
    ? feData
    : (Array.isArray(feData?.content) ? feData.content : [])

  const handleCreate = async (srId) => {
    if (creating) return
    try {
      const wo = await createWO({ id: srId }).unwrap()
      toast.success(`Work Order ${wo?.wan || wo?.id} created`)
      const fe = availableFEs?.[0]
      if (fe?.id && wo?.id) {
        try {
          await assign({ id: wo.id, feId: fe.id, note: 'Auto-assigned to available FE' }).unwrap()
          toast.success(`Assigned to ${fe.userName || ('FE #' + fe.id)}`)
        } catch (e) {
          toast.error(e?.data?.message || 'Created, but auto-assign failed')
        }
      }
      refetch()
    } catch (e) {
      toast.error(e?.data?.message || 'Failed to create work order')
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-8 py-8">
        <h1 className="text-3xl font-semibold text-slate-900 mb-6">Service Requests</h1>
        <p className="text-slate-600">Loading service requests...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-8 py-8">
        <h1 className="text-3xl font-semibold text-slate-900 mb-6">Service Requests</h1>
        <p className="text-red-600">Error: {error?.data?.message || 'Unable to load service requests'}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-8 py-8">
      <h1 className="text-3xl font-semibold text-slate-900 mb-6">Service Requests</h1>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-slate-600 text-xs font-semibold uppercase tracking-wide">
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">SRN</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Service Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {requests.map(sr => (
                <tr key={sr.id}>
                  <td className="px-4 py-3 text-slate-800">{sr.id}</td>
                  <td className="px-4 py-3 text-slate-800">{sr.srn}</td>
                  <td className="px-4 py-3 text-slate-800">{sr.customer?.name || ''}</td>
                  <td className="px-4 py-3 text-slate-800">{sr.serviceType}</td>
                  <td className="px-4 py-3 text-slate-800">{sr.status}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleCreate(sr.id)}
                      disabled={creating}
                      className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                                 text-white px-4 py-2 font-semibold shadow-sm disabled:opacity-60"
                    >
                      Create WO
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

/* ------------------------------ Proposals ------------------------------ */
function ProposalsView() {
  const { data, error, isLoading, refetch } = useListProposalsQuery({})
  const [approve, { isLoading: approving }] = useProposalApproveMutation()
  const [reject,  { isLoading: rejecting }] = useProposalRejectMutation()

  const proposals = Array.isArray(data?.content)
    ? data.content
    : (Array.isArray(data) ? data : [])

  const [approveId, setApproveId] = React.useState(null)
  const [poNumber, setPoNumber] = React.useState('')
  const [poUrl, setPoUrl] = React.useState('')

  const [rejectId, setRejectId] = React.useState(null)

  const openApprove = (id) => { setApproveId(id); setPoNumber(''); setPoUrl('') }
  const closeApprove = () => { setApproveId(null) }
  const openReject = (id) => { setRejectId(id) }
  const closeReject = () => { setRejectId(null) }

  const submitApprove = async () => {
    if (!poNumber.trim()) { toast.error('PO number is required'); return }
    const id = approveId
    try {
      await approve({ id, poNumber, poUrl }).unwrap()
      toast.success('Proposal approved')
      closeApprove()
      refetch()
    } catch (e) {
      toast.error(e?.data?.message || 'Error approving proposal')
    }
  }

  const submitReject = async () => {
    const id = rejectId
    try {
      await reject({ id }).unwrap()
      toast.success('Proposal rejected')
      closeReject()
      refetch()
    } catch (e) {
      toast.error(e?.data?.message || 'Error rejecting proposal')
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-8 py-8">
        <h1 className="text-3xl font-semibold text-slate-900 mb-6">Proposals</h1>
        <p className="text-slate-600">Loading proposals...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-8 py-8">
        <h1 className="text-3xl font-semibold text-slate-900 mb-6">Proposals</h1>
        <p className="text-red-600">Error: {error?.data?.message || 'Unable to load proposals'}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-8 py-8">
      <h1 className="text-3xl font-semibold text-slate-900 mb-6">Proposals</h1>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-slate-600 text-xs font-semibold uppercase tracking-wide">
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Service Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
                <th className="px-4 py-3 text-left">Docs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {proposals.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-slate-800">{p.id}</td>
                  <td className="px-4 py-3 text-slate-800">{p.customer?.name || ''}</td>
                  <td className="px-4 py-3 text-slate-800">{p.serviceType}</td>
                  <td className="px-4 py-3 text-slate-800">{p.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openApprove(p.id)}
                        disabled={approving}
                        className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                                   text-white px-3 py-2 font-semibold shadow-sm disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openReject(p.id)}
                        disabled={rejecting}
                        className="inline-flex items-center rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800
                                   text-white px-3 py-2 font-semibold shadow-sm disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ProposalDocsCell proposal={p} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve Modal */}
      <Modal open={!!approveId} onClose={closeApprove} title="Approve Proposal">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700">PO Number</label>
            <input
              className="mt-1 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4
                         text-slate-900 placeholder-slate-400 outline-none
                         focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition"
              value={poNumber}
              onChange={e=>setPoNumber(e.target.value)}
              placeholder="Enter PO number"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">PO URL (optional)</label>
            <input
              className="mt-1 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4
                         text-slate-900 placeholder-slate-400 outline-none
                         focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition"
              value={poUrl}
              onChange={e=>setPoUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="inline-flex items-center rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300
                       px-4 py-2 font-medium"
            onClick={closeApprove}
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                       text-white px-4 py-2 font-semibold shadow-sm disabled:opacity-60"
            disabled={approving}
            onClick={submitApprove}
          >
            Approve
          </button>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!rejectId} onClose={closeReject} title="Reject Proposal">
        <p className="text-slate-700">Are you sure you want to reject this proposal?</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="inline-flex items-center rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300
                       px-4 py-2 font-medium"
            onClick={closeReject}
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800
                       text-white px-4 py-2 font-semibold shadow-sm disabled:opacity-60"
            disabled={rejecting}
            onClick={submitReject}
          >
            Reject
          </button>
        </div>
      </Modal>
    </div>
  )
}

/* ----------------------------- Work Orders ----------------------------- */
function WorkOrdersView() {
  const { data, error, isLoading } = useListWOsQuery({})
  const wos = Array.isArray(data?.content)
    ? data.content
    : (Array.isArray(data) ? data : [])

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-8 py-8">
        <h1 className="text-3xl font-semibold text-slate-900 mb-6">Work Orders</h1>
        <p className="text-slate-600">Loading work orders...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-8 py-8">
        <h1 className="text-3xl font-semibold text-slate-900 mb-6">Work Orders</h1>
        <p className="text-red-600">Error: {error?.data?.message || 'Unable to load work orders'}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-8 py-8">
      <h1 className="text-3xl font-semibold text-slate-900 mb-6">Work Orders</h1>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-slate-600 text-xs font-semibold uppercase tracking-wide">
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">WAN</th>
                <th className="px-4 py-3 text-left">Service Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Assign</th>
                <th className='px-4 py-3 text-left'>Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {wos.map(wo => (
                <tr key={wo.id}>
                  <td className="px-4 py-3 text-slate-800">{wo.id}</td>
                  <td className="px-4 py-3 text-slate-800">{wo.wan}</td>
                  <td className="px-4 py-3 text-slate-800">{wo.serviceRequest?.serviceType || ''}</td>
                  <td className="px-4 py-3 text-slate-800">{wo.status}</td>
                  <td className="px-4 py-3">
                    <AssignFEButton woId={wo.id} />
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceCell wo={wo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

function AssignFEButton({ woId }) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm"
      >
        Assign
      </button>
      {open && <AssignFEModal woId={woId} onClose={() => setOpen(false)} />}
    </>
  )
}

function AssignFEModal({ woId, onClose }) {
  const { data: engineers, isLoading, error } = useGetFieldEngineersQuery()
  const [search, setSearch] = React.useState('')
  const [woAssign, { isLoading: assigning }] = useWoAssignMutation()

  const list = (Array.isArray(engineers) ? engineers : []).filter(e => {
    const name  = e.userName  || ''
    const email = e.userEmail || ''
    return !search ? true : `${name} ${email}`.toLowerCase().includes(search.toLowerCase())
  })

  const assign = async (feId) => {
    const res = await woAssign({ id: woId, feId })
    if (res?.error) toast.error(String(res.error?.data?.message || 'Assign failed'))
    else {
      toast.success('Assigned')
      onClose()
    }
  }

  return (
    <Modal title={`Assign WO #${woId}`} onClose={onClose}>
      <div className="mb-3">
        <input
          className="w-full h-11 rounded-lg border border-slate-200 px-3"
          placeholder="Search FE by name/email/region"
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
        />
      </div>
      {isLoading && <p className="text-slate-600">Loading…</p>}
      {error && <p className="text-red-600">Failed to load FEs</p>}
      <div className="max-h-80 overflow-auto space-y-2">
        {list.map((fe) => (
          <div key={fe.id} className="flex items-center justify-between p-2 rounded border">
            <div>
              <div className="font-medium">{fe.userName || `FE #${fe.id}`}</div>
              <div className="text-xs text-slate-500">{fe.userEmail || '—'}</div>
            </div>
            <button
              onClick={() => assign(fe.id)}
              disabled={assigning}
              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
            >
              {assigning ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        ))}
        {!isLoading && list.length === 0 && (
          <div className="text-sm text-slate-500">No matches</div>
        )}
      </div>
    </Modal>
  )
}


function ProposalDocsCell({ proposal }) {
  const [attach, { isLoading: attaching }] = useAttachProposalDocumentMutation()
  const { data: docs, refetch } = useListProposalDocumentsQuery(proposal.id)

  const onPick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', 'PROPOSAL_PDF') // backend uses type to classify
    const res = await attach({ id: proposal.id, body: fd })
    if (res?.error) {
      toast.error(String(res.error?.data?.message || 'Upload failed'))
    } else {
      toast.success('Proposal PDF uploaded')
      refetch()
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer">
        <input type="file" accept="application/pdf" className="hidden" onChange={onPick} disabled={attaching} />
        <span className="text-sm font-medium">{attaching ? 'Uploading…' : 'Upload Proposal PDF'}</span>
      </label>

      {Array.isArray(docs) && docs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {docs.map((d) => (
            <DocBadge key={d.id} proposalId={proposal.id} doc={d} />
          ))}
        </div>
      )}
    </div>
  )
}

function DocBadge({ proposalId, doc }) {
  const [downloadDoc, { isLoading: downloading }] = useDownloadProposalDocumentFileMutation()
  const label = docLabel(doc)
  const onDownload = async () => {
    try {
      await downloadDoc({
        proposalId,
        docId: doc.id,
        filename: doc?.originalName || `${doc?.type || 'document'}-${proposalId}.pdf`
      }).unwrap()
    } catch (e) {
      toast.error(String(e?.data?.message || e?.error || 'Download failed'))
    }
  }

  return (
    <button
      onClick={onDownload}
      disabled={downloading}
      className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
      title={doc?.originalName || ''}
    >
      {downloading ? '...' : `${label} PDF`}
    </button>
  )
}

function InvoiceCell({ wo }) {
  const [complete, completeState] = useWoCompleteMutation()
  const [fetchInv] = useLazyGetInvoiceForWOQuery()
  const [sendInvoice, sendState] = useSendInvoiceMutation()

  const canComplete =
    ['ASSIGNED','IN_PROGRESS','STARTED','MATERIAL_RECEIVED','INSTALLATION_STARTED']
      .includes(wo?.status)

  const onComplete = async () => {
    const res = await complete({ woId: wo.id })
    if ('error' in res) {
      toast.error(res.error?.data?.message || 'Complete failed')
      return
    }
    toast.success('Work Order completed — Invoice generated')

    // Optional: tiny delay + warmup fetch in case commit is slightly delayed
    setTimeout(() => { fetchInv(wo.id) }, 200)
  }

  const onEmailInvoice = async () => {
    if (wo.status !== 'COMPLETED') {
      toast.error('Complete the Work Order first')
      return
    }
    const invRes = await fetchInv(wo.id)
    if ('error' in invRes) {
      toast.error(invRes.error?.data?.message || 'Invoice not found yet — try again')
      return
    }
    const inv = invRes.data
    const toEmail = inv?.customer?.email
    if (!toEmail) {
      toast.error('No customer email on file')
      return
    }
    const r = await sendInvoice({ invoiceId: inv.id, toEmail })
    if ('error' in r) {
      toast.error(r.error?.data?.message || 'Email failed')
    } else {
      toast.success('Invoice emailed to customer')
    }
  }

  return (
    <div className="flex gap-2">
      {canComplete && (
        <button
          className="inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-sm"
          disabled={completeState.isLoading}
          onClick={onComplete}
        >
          {completeState.isLoading ? 'Completing…' : 'Mark Complete'}
        </button>
      )}
      <button
        className="inline-flex items-center rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 px-3 py-2 text-sm"
        disabled={sendState.isLoading || wo.status !== 'COMPLETED'}
        onClick={onEmailInvoice}
        title={wo.status !== 'COMPLETED' ? 'Complete WO to enable' : 'Email invoice to customer'}
      >
        {sendState.isLoading ? 'Sending…' : 'Email Invoice'}
      </button>
    </div>
  )
}
