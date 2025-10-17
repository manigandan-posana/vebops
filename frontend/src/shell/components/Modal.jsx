// src/components/Modal.jsx
import React from 'react'

export default function Modal({ open, onClose, title, children, footer }){
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-slate-200" onClick={e=>e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded-full px-2 py-1 text-slate-500 hover:bg-slate-100">×</button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}
