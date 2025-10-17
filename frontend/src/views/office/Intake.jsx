import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import {
  useIntakeCallMutation,
  useProposalFromKitMutation,
  useGetKitsQuery
} from '../../features/office/officeApi'

// Human label -> enum (unchanged)
const SERVICE_MAP = {
  'Supply Only': 'SUPPLY',
  'Supply with installation': 'SUPPLY_INSTALL',
  'Installation only': 'INSTALL_ONLY',
  'Erection(Electrical)': 'ERECTION'
}
const SERVICE_TYPES = Object.keys(SERVICE_MAP)

// Reusable field shell w/ label + error (visual only; logic unchanged)
function Field({ label, hint, error, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
      {error ? <span className="text-xs text-red-600 mt-0.5">{error}</span> : null}
    </label>
  )
}

// Base styles to mirror the screenshot (soft gray inputs, subtle borders)
const inputBase =
  'h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 ' +
  'text-slate-900 placeholder-slate-400 outline-none ' +
  'focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition'

const selectBase = inputBase + ' appearance-none'

// === COMPONENT ===
export default function Intake() {
  // Data hooks (unchanged)
  const tenantId = useSelector(s => s?.auth?.tenantId)
  const { data: kits = [] } = useGetKitsQuery(tenantId, { skip: !tenantId })
  const [intakeCall, { isLoading: savingCall }] = useIntakeCallMutation()
  const [proposalFromKit, { isLoading: savingProposal }] = useProposalFromKitMutation()

  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    reset,
    formState: { errors }
  } = useForm({ mode: 'onChange' })

  const serviceTypeLabel = watch('serviceType') || ''
  const isSupplyFlow =
    serviceTypeLabel === 'Supply Only' || serviceTypeLabel === 'Supply with installation'

  const [message, setMessage] = useState(null)

  // ---- logic below is IDENTICAL to previous version ----
  function normalize(values) {
    const serviceType = SERVICE_MAP[values.serviceType] || ''
    const payload = {
      customerName: (values.customerName || '').trim(),
      email: (values.email || '').trim(),
      mobile: (values.mobile || '').trim(),
      address: (values.address || '').trim(),
      serviceType,
      serviceHint: (values.serviceHint || '').trim(),
      customerId: (values.customerId || '').trim(),
      kitId: (values.kitId || '').trim(),
      terms: (values.terms || '').trim()
    }
    if (payload.customerId !== '') payload.customerId = Number(payload.customerId)
    else payload.customerId = null
    if (payload.kitId !== '') payload.kitId = Number(payload.kitId)
    else payload.kitId = null
    return payload
  }

  function validate(values) {
    clearErrors()
    const errs = {}

    const serviceType = SERVICE_MAP[values.serviceType]
    if (!serviceType) errs.serviceType = 'Select a service type'

    if (isSupplyFlow) {
      if (!values.kitId || String(values.kitId).trim() === '') {
        errs.kitId = 'Select a kit for supply flows'
      }
      const hasCustomerId = values.customerId && String(values.customerId).trim() !== ''
      if (!hasCustomerId) {
        if (!values.customerName || !values.customerName.trim()) {
          errs.customerName = 'Customer name is required when no existing Customer ID'
        }
      }
      if (values.email && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email.trim())) {
        errs.email = 'Invalid email'
      }
      if (values.mobile && !/^[0-9+ \-]{7,}$/.test(values.mobile.trim())) {
        errs.mobile = 'Invalid mobile'
      }
    } else {
      if (!values.customerName || !values.customerName.trim()) {
        errs.customerName = 'Customer name is required'
      }
      if (values.email && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email.trim())) {
        errs.email = 'Invalid email'
      }
      if (values.mobile && !/^[0-9+ \-]{7,}$/.test(values.mobile.trim())) {
        errs.mobile = 'Invalid mobile'
      }
    }

    Object.entries(errs).forEach(([k, v]) => setError(k, { type: 'manual', message: v }))
    return Object.keys(errs).length === 0
  }

  async function onSubmit(values) {
    setMessage(null)
    if (!validate(values)) return

    const v = normalize(values)
    try {
      if (isSupplyFlow) {
        const body = {
          customerId: v.customerId ?? undefined,
          serviceType: v.serviceType,
          kitId: v.kitId,
          terms: v.terms || undefined,
          ...(v.customerId
            ? {}
            : {
                customerName: v.customerName,
                email: v.email || undefined,
                mobile: v.mobile || undefined,
                address: v.address || undefined
              })
        }
        const proposal = await proposalFromKit(body).unwrap()
        setMessage(`Draft proposal created (ID: ${proposal?.id ?? '—'}).`)
        reset()
        return
      }

      const params = {
        customerName: v.customerName,
        email: v.email || undefined,
        mobile: v.mobile || undefined,
        address: v.address || undefined,
        serviceType: v.serviceType,
        serviceHint: v.serviceHint || undefined
      }
      const intakeId = await intakeCall(params).unwrap()
      setMessage(
        `Intake recorded (ID: ${intakeId}). For non-supply flows SR/WO may be auto-created.`
      )
      reset()
    } catch (e) {
      const msg = e?.data?.message || e?.error || 'Failed to submit intake.'
      setMessage(msg)
    }
  }
  // ---- end: identical logic ----

  const submitting = savingCall || savingProposal

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      {/* Centered card container to match screenshot width */}
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-8 py-8">
          {/* Title */}
          <h1 className="text-3xl font-semibold text-slate-900 mb-6">New Service Request</h1>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Row 1 */}
            <Field label="Customer Name" error={errors.customerName?.message}>
              <input
                className={inputBase}
                placeholder="Enter customer name"
                {...register('customerName')}
              />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input
                className={inputBase}
                placeholder="Enter email"
                {...register('email')}
              />
            </Field>

            {/* Row 2 */}
            <Field label="Mobile" error={errors.mobile?.message}>
              <input
                className={inputBase}
                placeholder="Enter mobile number"
                {...register('mobile')}
              />
            </Field>
            <Field label="Address" error={errors.address?.message}>
              <input
                className={inputBase}
                placeholder="Enter address"
                {...register('address')}
              />
            </Field>

            {/* Row 3 */}
            <Field label="Service Type" error={errors.serviceType?.message}>
              <select className={selectBase} {...register('serviceType')}>
                <option value="">Select service type</option>
                {SERVICE_TYPES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Existing Customer ID (Optional)" error={errors.customerId?.message}>
              <input
                className={inputBase}
                placeholder="Enter customer ID"
                {...register('customerId')}
              />
            </Field>

            {/* Row 4 (only visible for supply flows) */}
            {isSupplyFlow ? (
              <>
                <Field label="Select Kit (If supply-related)" error={errors.kitId?.message}>
                  <select className={selectBase} {...register('kitId')}>
                    <option value="">Select kit</option>
                    {Array.isArray(kits) &&
                      kits.map(k => (
                        <option key={k.id} value={k.id}>
                          {k.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Terms" error={errors.terms?.message}>
                  <input
                    className={inputBase}
                    placeholder="Enter terms"
                    {...register('terms')}
                  />
                </Field>
              </>
            ) : (
              // Keep the grid aligned even when not supply (optional aesthetics)
              <>
                <div className="md:col-span-1" />
                <div className="md:col-span-1" />
              </>
            )}

            {/* Notes / Service Hint (full width) */}
            <div className="md:col-span-2">
              <Field label="Notes / Service Hint" error={errors.serviceHint?.message}>
                <textarea
                  className={inputBase + ' min-h-[120px] resize-y py-3'}
                  placeholder="Enter notes or service hints"
                  rows={4}
                  {...register('serviceHint')}
                />
              </Field>
            </div>

            {/* Footer actions */}
            <div className="md:col-span-2 flex justify-end">
              <button
                className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                           text-white px-5 py-3 font-semibold shadow-sm"
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </form>

          {/* Inline status message (kept minimal; optional to remove) */}
          {message && (
            <div className="mt-4 text-sm p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
