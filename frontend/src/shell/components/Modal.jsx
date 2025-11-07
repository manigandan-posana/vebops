// src/components/Modal.jsx
import React, { useEffect, useRef } from 'react'

/**
 * Accessible, keyboard-friendly modal component. This modal will trap focus
 * when open, prevent the underlying page from scrolling, close on Escape
 * and provide a more polished visual style. Clicking outside the dialog
 * still closes it (optional), and pressing the close button will also
 * invoke the onClose callback.
 */
export default function Modal({ open, onClose, title, children, footer }) {
  const dialogRef = useRef(null);

  // Lock body scroll when the modal is open and clean up afterwards
  useEffect(() => {
    if (open) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => document.body.classList.remove('overflow-hidden');
  }, [open]);

  // Close on Escape key and trap focus inside the dialog
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Tab' && dialogRef.current) {
        // Focus trap: cycle focus within the modal
        const focusableElements = dialogRef.current.querySelectorAll(
          'a[href], button:not(:disabled), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        } else if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Focus the dialog when it opens
  useEffect(() => {
    if (open && dialogRef.current) {
      // give time for the dialog to be rendered
      setTimeout(() => dialogRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={dialogRef}
        tabIndex="-1"
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-brand text-white rounded-t-3xl">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1 text-white hover:bg-brand-dark focus:outline-none"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-4 text-slate-700 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer ? (
          <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50 rounded-b-3xl">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
