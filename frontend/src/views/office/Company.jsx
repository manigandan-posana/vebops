// src/views/office/Company.jsx
//
// Company profile page for back office users. Allows the tenant to edit
// their organisation details such as name, GSTIN, bank info and logo. All
// changes are persisted via the /office/company API. This component
// deliberately avoids localStorage and instead relies on the backend for
// persistence.

import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGetCompanyQuery, useUpdateCompanyMutation } from '../../features/office/officeApi'
import toast from 'react-hot-toast'

const Labeled = ({ label, children }) => (
  <label className='flex flex-col gap-1'>
    <span className='text-sm font-medium text-slate-700'>{label}</span>
    {children}
  </label>
)

export default function Company () {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const { data: companyData = {}, isLoading } = useGetCompanyQuery()
  const [updateCompany, { isLoading: saving }] = useUpdateCompanyMutation()
  const [company, setCompany] = useState({})

  // Sync state when data loads
  useEffect(() => {
    if (companyData) {
      // When loading the company profile from the backend the address is split
      // into addressLine1/addressLine2. Combine these into an array for the form
      // fields. If addressLines already exists it will be preserved.
      const lines = []
      if (companyData.addressLines && Array.isArray(companyData.addressLines)) {
        lines.push(...companyData.addressLines)
      } else {
        if (companyData.addressLine1) lines[0] = companyData.addressLine1
        if (companyData.addressLine2) lines[1] = companyData.addressLine2
      }
      setCompany({ ...companyData, addressLines: lines })
    }
  }, [companyData])

  const onChange = (key) => (e) => {
    const value = e?.target?.value ?? e
    setCompany((c) => ({ ...c, [key]: value }))
  }
  const onAddressChange = (idx) => (e) => {
    const next = Array.isArray(company.addressLines) ? [...company.addressLines] : ['', '']
    next[idx] = e.target.value
    setCompany((c) => ({ ...c, addressLines: next }))
  }
  const onLogoFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Read the file as a Data URL and downscale it if necessary to avoid
    // exceeding the size limits of the backend column.  Large images
    // (e.g. photographs) can produce base64 strings larger than 64KB which
    // will cause a DataIntegrityViolationException on save.  By resizing
    // to a sensible maximum dimension (e.g. 800px) and exporting at
    // reasonable quality we significantly reduce the payload size.  If
    // resizing fails for any reason we fall back to the original Data URL.
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      try {
        const img = new Image()
        img.onload = () => {
          // Determine new dimensions while preserving aspect ratio
          const maxDim = 800
          let { width, height } = img
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              const ratio = maxDim / width
              width = maxDim
              height = height * ratio
            } else {
              const ratio = maxDim / height
              height = maxDim
              width = width * ratio
            }
          }
          // Draw to canvas at the new size
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          // Export as PNG at 0.8 quality; browsers ignore quality for PNG
          const compressed = canvas.toDataURL('image/png', 0.8)
          setCompany((c) => ({ ...c, logoDataUrl: compressed }))
        }
        img.onerror = () => {
          // Fallback: store the original Data URL if image fails to load
          setCompany((c) => ({ ...c, logoDataUrl: dataUrl }))
        }
        img.src = dataUrl
      } catch (err) {
        setCompany((c) => ({ ...c, logoDataUrl: dataUrl }))
      }
    }
    reader.readAsDataURL(file)
  }

  const onSave = async () => {
    // Flatten address lines for backend
    const payload = { ...company }
    // Flatten address array into individual lines expected by the backend
    if (Array.isArray(payload.addressLines)) {
      payload.addressLine1 = payload.addressLines[0] || ''
      payload.addressLine2 = payload.addressLines[1] || ''
    }
    // The backend expects the logo to be sent under the key `logo`, not
    // `logoDataUrl`. Map accordingly and drop the client-side key to avoid
    // unknown field errors.
    if (typeof payload.logoDataUrl === 'string') {
      payload.logo = payload.logoDataUrl
    }
    try {
      await updateCompany(payload).unwrap()
      toast.success('Company details updated')
      navigate('/office/dashboard')
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update company')
    }
  }

  if (isLoading) {
    return <div className='p-6'>Loading…</div>
  }

  return (
    <div className='min-h-screen bg-slate-50'>
      <header className='sticky top-0 z-10 bg-white border-b border-slate-200'>
        <div className='mx-auto max-w-5xl px-4 py-4 flex items-center justify-between'>
          <h1 className='text-xl font-semibold'>Company Settings</h1>
          <div className='flex items-center gap-3'>
            <button onClick={() => navigate(-1)} className='px-3 py-2 rounded-lg border bg-white hover:bg-slate-50'>← Back</button>
            <button onClick={onSave} disabled={saving} className='px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </header>
      <main className='mx-auto max-w-5xl px-4 py-6'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {/* Logo */}
          <div className='md:col-span-1'>
            <div className='bg-white border border-slate-200 rounded-xl p-4'>
              <div className='aspect-square w-full rounded-xl border flex items-center justify-center overflow-hidden bg-slate-100'>
                {company.logoDataUrl ? (
                  <img src={company.logoDataUrl} alt='Logo' className='h-full w-full object-contain' />
                ) : (
                  <span className='text-slate-500'>No logo</span>
                )}
              </div>
              <div className='mt-3 flex gap-2'>
                <input ref={fileRef} type='file' accept='image/*' className='hidden' onChange={onLogoFile} />
                <button onClick={() => fileRef.current?.click()} className='px-3 py-2 rounded-lg border bg-white hover:bg-slate-50 w-full'>Upload Logo</button>
                <button onClick={() => setCompany((c) => ({ ...c, logoDataUrl: '' }))} className='px-3 py-2 rounded-lg border bg-white hover:bg-slate-50'>Clear</button>
              </div>
              <p className='text-xs text-slate-500 mt-2'>Tip: square PNG/JPG works best for print previews.</p>
            </div>
          </div>
          {/* Form */}
          <div className='md:col-span-2'>
            <div className='bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4'>
              <Labeled label='Company Name'>
                <input className='h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition' value={company.name || ''} onChange={onChange('name')} />
              </Labeled>
              <Labeled label='Website'>
                <input className='h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition' value={company.website || ''} onChange={onChange('website')} />
              </Labeled>
              <Labeled label='Phone'>
                <input className='h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition' value={company.phone || ''} onChange={onChange('phone')} />
              </Labeled>
              <Labeled label='Email'>
                <input className='h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition' value={company.email || ''} onChange={onChange('email')} />
              </Labeled>
              <Labeled label='Address Line 1'>
                <input className='h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition' value={(company.addressLines?.[0]) || ''} onChange={onAddressChange(0)} />
              </Labeled>
              <Labeled label='Address Line 2'>
                <input className='h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition' value={(company.addressLines?.[1]) || ''} onChange={onAddressChange(1)} />
              </Labeled>
              <Labeled label='State'>
                <input className='h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition' value={company.state || ''} onChange={onChange('state')} />
              </Labeled>
              <Labeled label='State Code'>
                <input className='h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition' value={company.stateCode || ''} onChange={onChange('stateCode')} />
              </Labeled>
              <Labeled label='GSTIN'>
                <input className='h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition' value={company.gstin || ''} onChange={onChange('gstin')} />
              </Labeled>
              <Labeled label='PAN'>
                <input className='h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition' value={company.pan || ''} onChange={onChange('pan')} />
              </Labeled>
              <Labeled label='Bank Name'>
                <input className='h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition' value={company.bankName || ''} onChange={onChange('bankName')} />
              </Labeled>
              <Labeled label='Account Number'>
                <input className='h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition' value={company.accNo || ''} onChange={onChange('accNo')} />
              </Labeled>
              <Labeled label='IFSC'>
                <input className='h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition' value={company.ifsc || ''} onChange={onChange('ifsc')} />
              </Labeled>
              <Labeled label='Branch'>
                <input className='h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition' value={company.branch || ''} onChange={onChange('branch')} />
              </Labeled>
            </div>
            <p className='text-sm text-slate-500 mt-3'>These details are used across invoice and purchase order previews. Taxes (CGST/SGST vs IGST) use your state.</p>
          </div>
        </div>
      </main>
    </div>
  )
}