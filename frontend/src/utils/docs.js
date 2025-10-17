// src/utils/docs.js
export function isPurchaseOrderDoc(doc) {
  const t = String(doc?.type || doc?.docType || doc?.category || '').toUpperCase();
  if (['CUSTOMER_PO', 'PO', 'PURCHASE_ORDER', 'CUSTOMER_PO_PDF'].includes(t)) return true;

  if (doc?.meta && (doc.meta.isPO === true || String(doc.meta.kind).toUpperCase() === 'PO')) {
    return true;
  }

  const name = String(doc?.originalName || doc?.filename || '').toLowerCase();
  return /\bpo\b/.test(name) || /purchase[_-\s]?order/.test(name);
}

export function docLabel(doc) {
  return isPurchaseOrderDoc(doc) ? 'PO' : 'Proposal';
}
