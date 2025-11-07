// src/views/office/Kits.jsx
//
// Kit management page backed by the REST API. This page allows back office
// users to create, edit and delete kits. Kit items are not displayed or
// managed here; those can be added via proposal flows. Preloaded catalogues
// and localStorage are no longer used.

import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  useGetKitsQuery,
  useCreateKitMutation,
  useUpdateKitMutation,
  useDeleteKitMutation,
  useBulkCreateKitsMutation
} from '../../features/office/officeApi'
import toast from 'react-hot-toast'

export default function Kits () {
  const navigate = useNavigate()
  const tenantId = useSelector((state) => state.auth?.user?.tenantId)
  const { data: kits = [], isLoading } = useGetKitsQuery(undefined)
  const [createKit] = useCreateKitMutation()
  const [updateKit] = useUpdateKitMutation()
  const [deleteKit] = useDeleteKitMutation()
  const [bulkCreateKits] = useBulkCreateKitsMutation()

  const [editing, setEditing] = useState(null) // {id?, name, serviceType, price, description}
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 20

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return kits
    return (kits || []).filter((k) => {
      return [k.name, k.serviceType, k.price, k.code, k.hsnSac, k.brand].some((v) =>
        String(v || '').toLowerCase().includes(q)
      )
    })
  }, [kits, search])

  const paged = useMemo(() => {
    const start = page * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page])

  const totalPages = Math.ceil(filtered.length / pageSize) || 1

  const onSave = async () => {
    const form = editing
    if (!form.name || !form.serviceType) {
      toast.error('Name and service type are required')
      return
    }
    try {
      if (form.id) {
        await updateKit({
          id: form.id,
          name: form.name,
          serviceType: form.serviceType,
          price: Number(form.price || 0),
          description: form.description,
          code: form.code,
          hsnSac: form.hsnSac,
          brand: form.brand,
          voltageKV: form.voltageKV,
          cores: form.cores,
          sizeSqmm: form.sizeSqmm ? Number(form.sizeSqmm) : null,
          category: form.category,
          material: form.material
        }).unwrap()
        toast.success('Kit updated')
      } else {
        await createKit({
          name: form.name,
          serviceType: form.serviceType,
          price: Number(form.price || 0),
          description: form.description,
          code: form.code,
          hsnSac: form.hsnSac,
          brand: form.brand,
          voltageKV: form.voltageKV,
          cores: form.cores,
          sizeSqmm: form.sizeSqmm ? Number(form.sizeSqmm) : null,
          category: form.category,
          material: form.material
        }).unwrap()
        toast.success('Kit created')
      }
      setEditing(null)
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save kit')
    }
  }

  const onDelete = async (id) => {
    if (!window.confirm('Delete this kit?')) return
    try {
      await deleteKit(id).unwrap()
      toast.success('Kit deleted')
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete kit')
    }
  }

  const fmtINR = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      Number.isFinite(+n) ? +n : 0
    )

  return (
    <div className='mx-auto max-w-6xl p-6'>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <div className='text-xs uppercase tracking-wide text-emerald-700'>VebOps</div>
          <h1 className='text-2xl font-bold text-slate-800'>Kit Management</h1>
          <p className='mt-1 text-sm text-slate-600'>Manage kits defined for your organisation.</p>
        </div>
        <div className='flex gap-2'>
          <button onClick={() => navigate('/office/service')} className='rounded-lg border px-3 py-2 text-sm'>← Back</button>
          <button onClick={() => setEditing({ name: '', serviceType: 'SUPPLY', price: 0, description: '', code: '', hsnSac: '854690', brand: '', voltageKV: '', cores: '', sizeSqmm: '', category: '', material: '' })} className='rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700'>Add Kit</button>
          <label className='relative inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer'>
            Import JSON
            <input
              type='file'
              accept='.json,application/json'
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const text = await file.text()
                  const list = JSON.parse(text)
                  if (!Array.isArray(list)) throw new Error('JSON must be an array of kits')
                  // Normalise imported records. Some catalogues use basePrice instead of price; map it.
                  const normalised = list.map((it) => {
                    // Convert basePrice to price if present and price is missing
                    const price =
                      it.price !== undefined && it.price !== null && it.price !== ''
                        ? it.price
                        : it.basePrice !== undefined && it.basePrice !== null && it.basePrice !== ''
                          ? it.basePrice
                          : 0
                    return { ...it, price }
                  })
                  await bulkCreateKits(normalised).unwrap()
                  toast.success('Kits imported')
                } catch (err) {
                  console.error(err)
                  toast.error('Failed to import kits')
                }
                // reset input value so the same file can be selected again
                e.target.value = ''
              }}
              className='absolute inset-0 opacity-0'
            />
          </label>
        </div>
      </div>
      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='relative sm:max-w-md'>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search kits…'
            className='h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-3 text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
          />
        </div>
        <div className='text-sm text-slate-600'>Total kits: <span className='font-medium text-slate-900'>{kits?.length || 0}</span></div>
      </div>
      <div className='overflow-x-auto rounded-xl border border-slate-200'>
        <table className='min-w-full divide-y divide-slate-200'>
          <thead className='bg-slate-50'>
            <tr>
              <th className='px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>Code</th>
              <th className='px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>Name</th>
              <th className='px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>HSN</th>
              <th className='px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>Service Type</th>
              <th className='px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500'>Price</th>
              <th className='px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500'>Actions</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100 bg-white'>
            {paged.map((k) => (
              <tr key={k.id} className='hover:bg-slate-50'>
                <td className='px-3 py-2 text-sm text-slate-700'>{k.code}</td>
                <td className='px-3 py-2 text-sm text-slate-900'>{k.name}</td>
                <td className='px-3 py-2 text-sm text-slate-700'>{k.hsnSac || '854690'}</td>
                <td className='px-3 py-2 text-sm text-slate-700'>{k.serviceType}</td>
                <td className='px-3 py-2 text-right text-sm font-semibold text-slate-900'>{fmtINR(k.price)}</td>
                <td className='px-3 py-2 text-right'>
                  <button
                    type='button'
                    onClick={() => setEditing({
                      id: k.id,
                      name: k.name,
                      serviceType: k.serviceType,
                      price: k.price,
                      description: k.description,
                      code: k.code,
                      hsnSac: k.hsnSac || '854690',
                      brand: k.brand || '',
                      voltageKV: k.voltageKV || '',
                      cores: k.cores || '',
                      sizeSqmm: k.sizeSqmm || '',
                      category: k.category || '',
                      material: k.material || ''
                    })}
                    className='mr-2 rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50'
                  >Edit</button>
                  <button
                    type='button'
                    onClick={() => onDelete(k.id)}
                    className='rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50'
                  >Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !isLoading && (
              <tr><td colSpan={6} className='px-3 py-6 text-center text-sm text-slate-500'>No kits found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div className='mt-4 flex items-center justify-between'>
        <div className='text-sm text-slate-600'>Page {page + 1} of {totalPages}</div>
        <div className='flex gap-2'>
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className={`rounded-lg border px-3 py-1 text-sm ${page === 0 ? 'text-slate-400 border-slate-200' : 'text-slate-700 border-slate-300 hover:bg-slate-50'}`}
          >Previous</button>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className={`rounded-lg border px-3 py-1 text-sm ${page >= totalPages - 1 ? 'text-slate-400 border-slate-200' : 'text-slate-700 border-slate-300 hover:bg-slate-50'}`}
          >Next</button>
        </div>
      </div>
      {/* Modal */}
      {editing && (
        <div className='fixed inset-0 z-40 bg-black/50 flex items-start justify-center p-4'>
          <div className='w-full max-w-md rounded-xl bg-white shadow-lg border border-slate-200 overflow-hidden'>
            <div className='px-4 py-3 border-b border-slate-200 flex items-center justify-between'>
              <h2 className='text-lg font-semibold'>{editing.id ? 'Edit Kit' : 'Add Kit'}</h2>
              <button onClick={() => setEditing(null)} className='text-slate-500 hover:text-slate-700'>&times;</button>
            </div>
            <div className='p-4 flex flex-col gap-4'>
              <label className='flex flex-col gap-1'>
                <span className='text-sm font-medium text-slate-700'>Code</span>
                <input value={editing.code} onChange={(e) => setEditing((f) => ({ ...f, code: e.target.value }))} className='h-10 rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100' />
              </label>
              <label className='flex flex-col gap-1'>
                <span className='text-sm font-medium text-slate-700'>HSN/SAC</span>
                <input value={editing.hsnSac} onChange={(e) => setEditing((f) => ({ ...f, hsnSac: e.target.value }))} className='h-10 rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100' />
              </label>
              <label className='flex flex-col gap-1'>
                <span className='text-sm font-medium text-slate-700'>Name</span>
                <input value={editing.name} onChange={(e) => setEditing((f) => ({ ...f, name: e.target.value }))} className='h-10 rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100' />
              </label>
              <label className='flex flex-col gap-1'>
                <span className='text-sm font-medium text-slate-700'>Service Type</span>
                <select value={editing.serviceType} onChange={(e) => setEditing((f) => ({ ...f, serviceType: e.target.value }))} className='h-10 rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'>
                  <option value='SUPPLY'>Supply Only</option>
                  <option value='SUPPLY_INSTALL'>Supply &amp; Install</option>
                  <option value='INSTALL_ONLY'>Install Only</option>
                  <option value='ERECTION'>Erection</option>
                </select>
              </label>
              <label className='flex flex-col gap-1'>
                <span className='text-sm font-medium text-slate-700'>Price (INR)</span>
                <input type='number' value={editing.price} onChange={(e) => setEditing((f) => ({ ...f, price: e.target.value }))} className='h-10 rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100' />
              </label>
              <label className='flex flex-col gap-1'>
                <span className='text-sm font-medium text-slate-700'>Description</span>
                <textarea value={editing.description || ''} onChange={(e) => setEditing((f) => ({ ...f, description: e.target.value }))} className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100' rows={3} />
              </label>

              <div className='grid grid-cols-2 gap-4'>
                <label className='flex flex-col gap-1'>
                  <span className='text-sm font-medium text-slate-700'>Brand</span>
                  <input value={editing.brand} onChange={(e) => setEditing((f) => ({ ...f, brand: e.target.value }))} className='h-10 rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100' />
                </label>
                <label className='flex flex-col gap-1'>
                  <span className='text-sm font-medium text-slate-700'>Voltage (kV)</span>
                  <input value={editing.voltageKV} onChange={(e) => setEditing((f) => ({ ...f, voltageKV: e.target.value }))} className='h-10 rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100' />
                </label>
                <label className='flex flex-col gap-1'>
                  <span className='text-sm font-medium text-slate-700'>Cores</span>
                  <input value={editing.cores} onChange={(e) => setEditing((f) => ({ ...f, cores: e.target.value }))} className='h-10 rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100' />
                </label>
                <label className='flex flex-col gap-1'>
                  <span className='text-sm font-medium text-slate-700'>Size (sqmm)</span>
                  <input type='number' value={editing.sizeSqmm} onChange={(e) => setEditing((f) => ({ ...f, sizeSqmm: e.target.value }))} className='h-10 rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100' />
                </label>
                <label className='flex flex-col gap-1'>
                  <span className='text-sm font-medium text-slate-700'>Category</span>
                  <input value={editing.category} onChange={(e) => setEditing((f) => ({ ...f, category: e.target.value }))} className='h-10 rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100' />
                </label>
                <label className='flex flex-col gap-1'>
                  <span className='text-sm font-medium text-slate-700'>Material</span>
                  <input value={editing.material} onChange={(e) => setEditing((f) => ({ ...f, material: e.target.value }))} className='h-10 rounded-lg border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100' />
                </label>
              </div>
            </div>
            <div className='px-4 py-3 border-t border-slate-200 flex justify-end gap-2'>
              <button onClick={() => setEditing(null)} className='rounded-lg border px-4 py-2 text-slate-700 hover:bg-slate-50'>Cancel</button>
              <button onClick={onSave} className='rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}