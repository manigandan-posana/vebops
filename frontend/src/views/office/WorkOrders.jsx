import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Toaster, toast } from 'react-hot-toast'
import Modal from '../../shell/components/Modal'
import {
  useListWOsQuery,
  useWoAssignMutation,
  useWoCompleteMutation,
  useGetFieldEngineersQuery,
  useCreateWorkOrderFromRequestMutation,
  useGetServiceRequestsQuery,
  useListProposalsQuery,
  useProposalApproveMutation,
  useProposalRejectMutation,
} from '../../features/office/officeApi'
import { focusNextOnEnter } from '../../utils/formNavigation'

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'NEW', label: 'New' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
]

const srParams = { status: 'NEW', size: 15 }
const proposalParams = { status: 'SENT', size: 20 }

const emptyArray = []

export default function WorkOrders () {
  const [statusFilter, setStatusFilter] = useState('NEW')
  const [assignModal, setAssignModal] = useState({ open: false, wo: null })
  const [assignNote, setAssignNote] = useState('')
  const [poModal, setPoModal] = useState({ open: false, proposal: null })
  const [poNumber, setPoNumber] = useState('')
  const [poUrl, setPoUrl] = useState('')

  const woQueryParams = useMemo(() => (
    statusFilter === 'ALL'
      ? { size: 50, sort: 'updatedAt,desc' }
      : { status: statusFilter, size: 50, sort: 'updatedAt,desc' }
  ), [statusFilter])

  const { data: woData, isFetching: woLoading, refetch: refetchWos } = useListWOsQuery(woQueryParams)
  const { data: feData } = useGetFieldEngineersQuery({ status: 'AVAILABLE', size: 100 })
  const { data: srData, isFetching: srLoading, refetch: refetchSrs } = useGetServiceRequestsQuery(srParams)
  const { data: proposalData, isFetching: proposalLoading, refetch: refetchProposals } = useListProposalsQuery(proposalParams)

  const [assignWo] = useWoAssignMutation()
  const [completeWo, { isLoading: completing }] = useWoCompleteMutation()
  const [createWoFromRequest, { isLoading: creatingWO }] = useCreateWorkOrderFromRequestMutation()
  const [approveProposal, { isLoading: approving }] = useProposalApproveMutation()
  const [rejectProposal, { isLoading: rejecting }] = useProposalRejectMutation()

  const workOrders = useMemo(() => {
    if (Array.isArray(woData?.content)) return woData.content
    if (Array.isArray(woData?.items)) return woData.items
    if (Array.isArray(woData)) return woData
    return emptyArray
  }, [woData])

  const fieldEngineers = useMemo(() => {
    if (Array.isArray(feData?.content)) return feData.content
    if (Array.isArray(feData?.items)) return feData.items
    if (Array.isArray(feData)) return feData
    return emptyArray
  }, [feData])

  const serviceRequests = useMemo(() => {
    if (Array.isArray(srData?.content)) return srData.content
    if (Array.isArray(srData?.items)) return srData.items
    if (Array.isArray(srData)) return srData
    return emptyArray
  }, [srData])

  const proposals = useMemo(() => {
    if (Array.isArray(proposalData?.content)) return proposalData.content
    if (Array.isArray(proposalData?.items)) return proposalData.items
    if (Array.isArray(proposalData)) return proposalData
    return emptyArray
  }, [proposalData])

  const pendingProposals = proposals.filter((p) => p.status === 'SENT')

  const availableFEs = fieldEngineers.filter((fe) => fe.status ? fe.status === 'AVAILABLE' : true)

  const openAssignModal = (wo) => {
    setAssignModal({ open: true, wo })
    setAssignNote('')
  }

  const closeAssignModal = () => {
    setAssignModal({ open: false, wo: null })
    setAssignNote('')
  }

  const openPoModal = (proposal) => {
    setPoModal({ open: true, proposal })
    setPoNumber('')
    setPoUrl('')
  }

  const closePoModal = () => {
    setPoModal({ open: false, proposal: null })
    setPoNumber('')
    setPoUrl('')
  }

  async function handleAssign (feId) {
    if (!assignModal.wo?.id || !feId) return
    try {
      await assignWo({ id: assignModal.wo.id, feId, note: assignNote || undefined }).unwrap()
      toast.success('Work order assigned')
      closeAssignModal()
      refetchWos()
    } catch (err) {
      toast.error(String(err?.data?.message || err?.error || 'Unable to assign work order'))
    }
  }

  async function handleComplete (woId) {
    if (!woId) return
    try {
      await completeWo({ woId }).unwrap()
      toast.success('Marked as completed')
      refetchWos()
    } catch (err) {
      toast.error(String(err?.data?.message || err?.error || 'Unable to complete work order'))
    }
  }

  async function handleCreateFromRequest (srId) {
    if (!srId) return
    try {
      const res = await createWoFromRequest({ id: srId }).unwrap()
      const wan = typeof res === 'object' ? (res?.wan || res?.code || (res?.id ? `#${res.id}` : null)) : null
      const label = wan || `#${srId}`
      toast.success(`Work order ${label} created`)
      refetchWos()
      refetchSrs()
    } catch (err) {
      const message = String(err?.data?.message || err?.error || 'Unable to create work order')
      if (message.toLowerCase().includes('exist')) {
        toast.success('Work order already exists for this request')
        refetchWos()
      } else {
        toast.error(message)
      }
    }
  }

  async function handleApproveProposal () {
    if (!poModal.proposal?.id) return
    try {
      await approveProposal({ id: poModal.proposal.id, poNumber, poUrl: poUrl || undefined }).unwrap()
      toast.success('Proposal approved. Work order created automatically.')
      closePoModal()
      refetchProposals()
      refetchSrs()
      refetchWos()
    } catch (err) {
      toast.error(String(err?.data?.message || err?.error || 'Unable to approve proposal'))
    }
  }

  async function handleRejectProposal (proposalId) {
    if (!proposalId) return
    try {
      await rejectProposal({ id: proposalId }).unwrap()
      toast.success('Proposal rejected')
      refetchProposals()
    } catch (err) {
      toast.error(String(err?.data?.message || err?.error || 'Unable to reject proposal'))
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 py-10'>
      <Toaster position='top-right' />
      <div className='mx-auto flex max-w-6xl flex-col gap-8 px-4'>
        <header className='flex flex-wrap items-end justify-between gap-4'>
          <div>
            <p className='text-sm uppercase tracking-[0.3em] text-slate-500'>Operations Hub</p>
            <h1 className='mt-2 text-4xl font-semibold text-slate-900'>Work Orders</h1>
            <p className='mt-1 text-sm text-slate-600'>Monitor proposals, convert approved work into service requests, and steer active jobs from one consolidated cockpit.</p>
          </div>
          <div className='flex flex-wrap gap-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200'>
            {STATUS_FILTERS.map((opt) => {
              const active = statusFilter === opt.value
              return (
                <button
                  key={opt.value}
                  type='button'
                  onClick={() => setStatusFilter(opt.value)}
                  className={[
                    'rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                    active
                      ? 'bg-brand text-white shadow'
                      : 'text-slate-600 hover:bg-slate-100'
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </header>

        <section className='card p-6 shadow-lg ring-1 ring-slate-200'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-xl font-semibold text-slate-900'>Active Work Orders</h2>
            <span className='text-sm text-slate-500'>
              {woLoading ? 'Loading…' : `${workOrders.length} result${workOrders.length === 1 ? '' : 's'}`}
            </span>
          </div>
          <div className='mt-4 overflow-hidden rounded-2xl border border-slate-200'>
            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-slate-200 text-sm'>
                <thead className='bg-slate-50 text-xs uppercase tracking-wide text-slate-500'>
                  <tr>
                    <th className='px-4 py-3 text-left'>WAN</th>
                    <th className='px-4 py-3 text-left'>Customer</th>
                    <th className='px-4 py-3 text-left'>Service</th>
                    <th className='px-4 py-3 text-left'>Status</th>
                    <th className='px-4 py-3 text-left'>Assigned</th>
                    <th className='px-4 py-3 text-left'>Actions</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100 bg-white'>
                  {workOrders.length === 0 && !woLoading && (
                    <tr>
                      <td className='px-4 py-6 text-center text-slate-500' colSpan={6}>
                        No work orders in this view yet.
                      </td>
                    </tr>
                  )}

                  {workOrders.map((wo) => {
                    const sr = wo.serviceRequest || {}
                    const customer = sr.customer || {}
                    const fe = wo.assignedFE || {}
                    return (
                      <tr key={wo.id} className='hover:bg-slate-50/60'>
                        <td className='px-4 py-3 font-medium text-slate-900'>{wo.wan || `WO-${wo.id}`}</td>
                        <td className='px-4 py-3 text-slate-700'>{customer.name || customer.displayName || '—'}</td>
                        <td className='px-4 py-3 text-slate-600'>{sr.serviceType || '—'}</td>
                        <td className='px-4 py-3'>
                          <span className='badge bg-brand/10 text-brand'>{wo.status || '—'}</span>
                        </td>
                        <td className='px-4 py-3 text-slate-600'>{fe.user?.displayName || fe.name || 'Unassigned'}</td>
                        <td className='px-4 py-3'>
                          <div className='flex flex-wrap gap-2'>
                            <Link
                              to={`/office/preview?woId=${wo.id}`}
                              className='btn-secondary'
                            >
                              View
                            </Link>
                            <button
                              type='button'
                              onClick={() => openAssignModal(wo)}
                              className='btn-secondary'
                            >
                              Assign
                            </button>
                            <button
                              type='button'
                              disabled={completing}
                              onClick={() => handleComplete(wo.id)}
                              className='btn-primary'
                            >
                              Complete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className='grid gap-6 lg:grid-cols-2'>
          <div className='card flex h-full flex-col gap-4 p-6 ring-1 ring-slate-200'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='text-lg font-semibold text-slate-900'>Proposals awaiting approval</h3>
                <p className='text-sm text-slate-600'>Approve to generate service requests and work orders instantly.</p>
              </div>
              {proposalLoading && <span className='text-sm text-slate-500'>Loading…</span>}
            </div>
            <div className='overflow-hidden rounded-2xl border border-slate-200'>
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-slate-200 text-sm'>
                  <thead className='bg-slate-50 text-xs uppercase tracking-wide text-slate-500'>
                    <tr>
                      <th className='px-4 py-3 text-left'>Proposal</th>
                      <th className='px-4 py-3 text-left'>Customer</th>
                      <th className='px-4 py-3 text-left'>Total</th>
                      <th className='px-4 py-3 text-left'>Actions</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100 bg-white'>
                    {pendingProposals.length === 0 && !proposalLoading && (
                      <tr>
                        <td className='px-4 py-6 text-center text-slate-500' colSpan={4}>
                          No proposals awaiting approval.
                        </td>
                      </tr>
                    )}
                    {pendingProposals.map((proposal) => {
                      const totalDisplay =
                        typeof proposal.total === 'number'
                          ? proposal.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })
                          : (proposal.total ?? '—')
                      return (
                       <tr key={proposal.id} className='hover:bg-slate-50/60'>
                        <td className='px-4 py-3 font-medium text-slate-900'>#{proposal.id}</td>
                        <td className='px-4 py-3 text-slate-700'>{proposal.customer?.name || '—'}</td>
                        <td className='px-4 py-3 text-slate-600'>₹{totalDisplay}</td>
                        <td className='px-4 py-3'>
                          <div className='flex flex-wrap gap-2'>
                            <button
                              type='button'
                              className='btn-primary'
                              onClick={() => openPoModal(proposal)}
                            >
                              Approve
                            </button>
                            <button
                              type='button'
                              className='btn-secondary'
                              disabled={rejecting}
                              onClick={() => handleRejectProposal(proposal.id)}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className='card flex h-full flex-col gap-4 p-6 ring-1 ring-slate-200'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='text-lg font-semibold text-slate-900'>New service requests</h3>
                <p className='text-sm text-slate-600'>Raise work orders for confirmed requests in one click.</p>
              </div>
              {srLoading && <span className='text-sm text-slate-500'>Loading…</span>}
            </div>
            <div className='overflow-hidden rounded-2xl border border-slate-200'>
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-slate-200 text-sm'>
                  <thead className='bg-slate-50 text-xs uppercase tracking-wide text-slate-500'>
                    <tr>
                      <th className='px-4 py-3 text-left'>SRN</th>
                      <th className='px-4 py-3 text-left'>Customer</th>
                      <th className='px-4 py-3 text-left'>Service</th>
                      <th className='px-4 py-3 text-left'>Actions</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100 bg-white'>
                    {serviceRequests.length === 0 && !srLoading && (
                      <tr>
                        <td className='px-4 py-6 text-center text-slate-500' colSpan={4}>
                          No pending service requests.
                        </td>
                      </tr>
                    )}
                    {serviceRequests.map((sr) => (
                      <tr key={sr.id} className='hover:bg-slate-50/60'>
                        <td className='px-4 py-3 font-medium text-slate-900'>{sr.srn}</td>
                        <td className='px-4 py-3 text-slate-700'>{sr.customer?.name || '—'}</td>
                        <td className='px-4 py-3 text-slate-600'>{sr.serviceType}</td>
                        <td className='px-4 py-3'>
                          <button
                            type='button'
                            className='btn-primary'
                            disabled={creatingWO}
                            onClick={() => handleCreateFromRequest(sr.id)}
                          >
                            Create work order
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>

      <AssignModal
        open={assignModal.open}
        workOrder={assignModal.wo}
        onClose={closeAssignModal}
        onAssign={handleAssign}
        note={assignNote}
        onNoteChange={setAssignNote}
        engineers={availableFEs}
      />

      <ApproveModal
        open={poModal.open}
        proposal={poModal.proposal}
        onClose={closePoModal}
        poNumber={poNumber}
        poUrl={poUrl}
        onPoNumberChange={setPoNumber}
        onPoUrlChange={setPoUrl}
        onSubmit={handleApproveProposal}
        submitting={approving}
      />
    </div>
  )
}

function AssignModal ({ open, onClose, workOrder, engineers, note, onNoteChange, onAssign }) {
  const [selectedFe, setSelectedFe] = useState('')

  React.useEffect(() => {
    if (open) {
      setSelectedFe('')
    }
  }, [open, workOrder?.id])

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title={`Assign ${workOrder?.wan || 'work order'}`}>
      <form className='space-y-4'>
        <label className='block text-sm font-medium text-slate-700'>Field engineer</label>
        <input
          list='fe-options'
          className='input'
          value={selectedFe}
          onChange={(event) => setSelectedFe(event.target.value)}
          onKeyDown={focusNextOnEnter}
          placeholder='Search or enter engineer ID'
          autoComplete='on'
        />
        <datalist id='fe-options'>
          {engineers.map((fe) => (
            <option key={fe.id} value={fe.id}>
              {fe.user?.displayName || fe.name || `FE #${fe.id}`}
            </option>
          ))}
        </datalist>

        <label className='block text-sm font-medium text-slate-700'>Note to engineer</label>
        <textarea
          className='input min-h-[96px] resize-y'
          placeholder='Optional instructions'
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          onKeyDown={focusNextOnEnter}
          autoComplete='on'
        />

        <div className='flex justify-end gap-2 pt-2'>
          <button type='button' className='btn-secondary' onClick={onClose}>Cancel</button>
          <button
            type='button'
            className='btn-primary'
            disabled={!selectedFe}
            onClick={() => {
              if (!selectedFe) return
              const numeric = Number(selectedFe)
              const value = Number.isFinite(numeric) && numeric > 0 ? numeric : selectedFe
              onAssign(value)
            }}
          >
            Assign
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ApproveModal ({
  open,
  onClose,
  proposal,
  poNumber,
  onPoNumberChange,
  poUrl,
  onPoUrlChange,
  onSubmit,
  submitting,
}) {
  React.useEffect(() => {
    if (open) {
      // Autofocus the PO number input when the modal opens
      const timer = setTimeout(() => {
        const input = document.getElementById('po-number-input')
        if (input) input.focus()
      }, 80)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [open])

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title={`Approve proposal #${proposal?.id}` }>
      <form
        className='space-y-4'
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <div>
          <label className='block text-sm font-medium text-slate-700'>Purchase order number</label>
          <input
            id='po-number-input'
            className='input'
            value={poNumber}
            onChange={(event) => onPoNumberChange(event.target.value)}
            onKeyDown={focusNextOnEnter}
            placeholder='PO number'
            autoComplete='on'
            required
          />
        </div>
        <div>
          <label className='block text-sm font-medium text-slate-700'>PO document URL (optional)</label>
          <input
            className='input'
            value={poUrl}
            onChange={(event) => onPoUrlChange(event.target.value)}
            onKeyDown={focusNextOnEnter}
            placeholder='https://…'
            autoComplete='on'
            type='url'
          />
        </div>
        <div className='flex justify-end gap-2 pt-2'>
          <button type='button' className='btn-secondary' onClick={onClose}>Cancel</button>
          <button type='submit' className='btn-primary' disabled={submitting || !poNumber.trim()}>
            {submitting ? 'Approving…' : 'Approve & create work order'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

