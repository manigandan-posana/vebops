// src/utils/apiShape.js
//
// Utilities that normalise API responses returned by the backend. During the
// refactor to RTK Query a number of endpoints started returning either bare
// arrays or Spring `Page` objects depending on the controller. That made the
// front-end components defensive in many places (checking for `array`,
// `content`, `items`, etc.). The additional branching caused multiple pages to
// misbehave whenever the backend shape changed – a frequent scenario while the
// service layer is still evolving.
//
// The helpers below coerce every response into a predictable structure. They
// are intentionally tiny and dependency free so they can be reused across
// query endpoints without increasing bundle size.

/**
 * Normalise Spring Page/array/undefined responses into a standard object.
 *
 * @template T
 * @param {unknown} response
 * @returns {{
 *   content: T[],
 *   page: number,
 *   size: number,
 *   totalPages: number,
 *   totalElements: number
 * }}
 */
export function normalisePage (response) {
  if (!response) {
    return { content: [], page: 0, size: 0, totalPages: 0, totalElements: 0 }
  }

  if (Array.isArray(response)) {
    const size = response.length
    return { content: response, page: 0, size, totalPages: size ? 1 : 0, totalElements: size }
  }

  if (typeof response === 'object') {
    const page = typeof response.number === 'number' ? response.number : 0
    const size = typeof response.size === 'number' ? response.size : (Array.isArray(response.content) ? response.content.length : 0)
    const totalPages = typeof response.totalPages === 'number' ? response.totalPages : (size ? 1 : 0)
    const totalElements = typeof response.totalElements === 'number'
      ? response.totalElements
      : (Array.isArray(response.content) ? response.content.length : 0)
    const content = Array.isArray(response.content)
      ? response.content
      : Array.isArray(response.items)
        ? response.items
        : []
    return { content, page, size, totalPages, totalElements }
  }

  return { content: [], page: 0, size: 0, totalPages: 0, totalElements: 0 }
}

/**
 * Normalise API responses that should always be arrays. Some controllers still
 * wrap arrays in `{ items: [...] }` which previously required ad-hoc guards in
 * every component. The helper makes that behaviour consistent.
 *
 * @template T
 * @param {unknown} response
 * @returns {T[]}
 */
export function normaliseArray (response) {
  if (Array.isArray(response)) return response
  if (response && typeof response === 'object') {
    if (Array.isArray(response.items)) return response.items
    if (Array.isArray(response.content)) return response.content
  }
  return []
}
