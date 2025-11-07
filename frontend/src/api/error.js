export function parseError(error) {
  if (!error) return { status: 0, message: 'Unknown error' }
  if (typeof error === 'string') return { status: 0, message: error }
  if (error?.data?.message) return { status: error.status || 0, message: error.data.message }
  if (error?.error) return { status: 0, message: error.error }
  try {
    if (typeof error?.data === 'string') {
      return { status: error.status || 0, message: error.data }
    }
  } catch {}
  return { status: error.status || 0, message: 'Request failed' }
}

export function requireFields(obj, fields) {
  const missing = []
  for (const k of fields) {
    const val = obj?.[k]
    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
      missing.push(k)
    }
  }
  if (missing.length) {
    const err = new Error('Missing required field' + (missing.length>1?'s':'') + ': ' + missing.join(', '))
    err.code = 'VALIDATION_ERROR'
    throw err
  }
}
