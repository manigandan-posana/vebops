import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { logout } from '../features/auth/authSlice'

const API_BASE_URL = (import.meta?.env?.VITE_API_BASE_URL) || 'http://localhost:8080'
const LS_jwt_KEY = 'vebops.jwt'
const LS_USER_KEY = 'vebops.user'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    let jwt = getState()?.auth?.jwt
    if (!jwt && typeof localStorage !== 'undefined') {
      jwt = localStorage.getItem(LS_jwt_KEY) || null
    }
    if (jwt) headers.set('Authorization', `Bearer ${jwt}`)
    return headers
  },
  responseHandler: async (response) => {
    const ct = response.headers.get('Content-Type') || ''
    if (ct.includes('application/pdf') || ct.includes('octet-stream')) {
      return await response.blob()
    }
    // try json, then fallback to text
    const text = await response.text()
    try { return JSON.parse(text) } catch { return text }
  }
})

const baseQueryWithAuth = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions)
  if (result?.error?.status === 401) {
    api.dispatch(logout())
  }
  return result
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: [
    'Tenants','Users','Items','Kits','Stores','Stocks','Ledger',
    'Proposals','WorkOrders','Invoices','Dashboard','FieldEngineers'
  ],
  endpoints: () => ({})
})

export { API_BASE_URL, LS_jwt_KEY, LS_USER_KEY }
