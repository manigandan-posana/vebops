// src/utils/docNumbers.js
// Utility helpers to normalise document numbers (invoice, proforma, etc.).
// Many legacy records prefix identifiers with the '#' character. These helpers
// strip such prefixes and collapse surrounding whitespace so the UI and PDFs
// display clean professional codes.

export function normalizeDocNumber(value) {
  if (value === null || value === undefined) return ''
  let s = String(value).trim()
  if (!s) return ''
  // Remove any leading hash characters and whitespace that sometimes sneak in
  // when users copy numbers from WhatsApp/email threads.
  s = s.replace(/^#+\s*/, '')
  return s.trim()
}

export function displayDocNumber(value, fallback = '—') {
  const cleaned = normalizeDocNumber(value)
  return cleaned || fallback
}
