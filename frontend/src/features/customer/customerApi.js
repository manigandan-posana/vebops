import { baseApi } from '../../api/baseApi'
import { downloadBlob, extractFilename } from '../../utils/file'
import { normaliseArray, normalisePage } from '../../utils/apiShape'

const normalizeFilename = (name, mime = 'application/pdf') => {
  if (!name) return null
  const n = String(name).trim()
  if (!n) return null
  if (mime.includes('pdf') && !/\.pdf$/i.test(n)) return `${n}.pdf`
  return n
}


export const customerApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    /** List proposals for the logged-in customer */
    getMyProposals: b.query({
      query: (params) => ({
        url: '/customer/proposals',
        method: 'GET',
        params,
      }),
      transformResponse: (res) => normalisePage(res),
      providesTags: ['Proposals'],
    }),

    /** Customer uploads a PO NUMBER (and optional URL) for a proposal. */
    uploadPO: b.mutation({
      query: ({ id, poNumber, url }) => {
        if (!id) throw new Error('id is required')
        if (!poNumber || !String(poNumber).trim()) throw new Error('poNumber is required')
        return {
          url: `/customer/proposals/${id}/po-upload`,
          method: 'POST',
          params: { poNumber, ...(url ? { url } : {}) },
        }
      },
      invalidatesTags: ['Proposals', 'Invoices'],
    }),

    /** Download invoice PDF as Blob */
    getInvoicePdf: b.query({
      query: (invoiceId) => ({
        url: `/customer/invoices/${invoiceId}/pdf`,    // ✅ keep singular `/customer`
        method: 'GET',
        headers: { Accept: 'application/pdf' },
        responseHandler: (r) => r.blob(),              // ✅ force Blob
      }),
      providesTags: [],
    }),

    /** List invoices for the logged-in customer */
    getMyInvoices: b.query({
      query: (params) => ({
        url: '/customer/invoices',
        method: 'GET',
        params
      }),
      transformResponse: (res) => normalisePage(res),
      providesTags: ['Invoices']
    }),

    /** List proposal documents (ownership enforced server-side) */
    getProposalDocuments: b.query({
      query: ({ id, customerId }) => {
        if (!id) throw new Error('id is required')
        return {
          url: `/customer/proposals/${id}/documents`,
          method: 'GET',
          params: customerId ? { customerId } : undefined,
        }
      },
      transformResponse: (res) => normaliseArray(res),
      providesTags: ['Proposals'],
    }),

    // Customer uploads a PO PDF (multipart)
    uploadPOFile: b.mutation({
      query: ({ id, file }) => {
        if (!id) throw new Error('id is required')
        if (!file) throw new Error('file is required')
        const fd = new FormData()
        fd.append('file', file)
        // tell backend this is a customer PO type
        fd.append('type', 'CUSTOMER_PO')
        return {
          url: `/customer/proposals/${id}/documents`,
          method: 'POST',
          body: fd,
        }
      },
      invalidatesTags: ['Proposals', 'Invoices'],
    }),

    // Download a single proposal document (customer-visible) as Blob
    customerDownloadProposalDocumentFile: b.mutation({
      async queryFn ({ proposalId, docId, filename }, _api, _extra, baseQuery) {
        const res = await baseQuery({
          url: `/customer/proposals/${proposalId}/documents/${docId}/download`,
          method: 'GET',
          responseHandler: (response) => response.blob(),
          headers: { Accept: 'application/pdf' },
        })
        if (res.error) return { error: res.error }
        const cd = res?.meta?.response?.headers?.get('content-disposition') ?? null
        const ct = res?.meta?.response?.headers?.get('content-type') ?? ''
        // Optional: if it isn't a PDF (likely an error page), surface it
        if (!ct.toLowerCase().includes('pdf')) {
          try {
            const text = await res.data.text()
            return { error: { status: res?.meta?.response?.status ?? 400, data: { message: text || 'Download failed' } } }
          } catch {}
        }
        const serverName = extractFilename(cd);
        const blob = /** @type {Blob} */ (res.data)
        const name = serverName || normalizeFilename(filename, blob.type) || `document-${proposalId}.pdf`;
        downloadBlob(blob, name, blob.type);
        return { data: { ok: true } }
      }
    }),

    /** Download the latest generated PDF for a proposal (customer portal) */
    customerDownloadLatestProposalPdf: b.mutation({
      async queryFn ({ id, filename }, _api, _extra, baseQuery) {
        if (!id) return { error: { status: 0, data: { message: 'id is required' } } }
        const res = await baseQuery({
          url: `/customer/proposals/${id}/pdf/latest`, // ✅ singular `/customer`
          method: 'GET',
          responseHandler: (r) => r.blob(),
          headers: { Accept: 'application/pdf' }
        })
        if (res.error) return { error: res.error }

        const cd = res?.meta?.response?.headers?.get('content-disposition') ?? null
        const ct = res?.meta?.response?.headers?.get('content-type') ?? ''

        // Guard non-PDF responses
        if (!ct.toLowerCase().includes('pdf')) {
          try {
            const text = await res.data.text()
            return { error: { status: res?.meta?.response?.status ?? 400, data: { message: text || 'Download failed' } } }
          } catch {}
        }

        const serverName = extractFilename(cd)
        const name = serverName || normalizeFilename(filename, 'application/pdf') || `proposal-${id}.pdf`
        downloadBlob(res.data, name, ct || 'application/pdf')
        return { data: { ok: true } }
      }
    }),

    /** Customer approves a proposal with optional PO number/note and optional PO file (single step) */
    // POST /customer/proposals/{id}/approve (multipart)
    approveProposal: b.mutation({
      async queryFn ({ id, poNumber, note, poFile }, _api, _extra, baseQuery) {
        if (!id) return { error: { status: 0, data: { message: 'id is required' } } }
        const fd = new FormData()
        if (poNumber) fd.append('poNumber', poNumber)
        if (note) fd.append('note', note)
        if (poFile) fd.append('poFile', poFile)
        const res = await baseQuery({
          url: `/customers/proposals/${id}/approve`,
          method: 'POST',
          body: fd
        })
        return res.error ? { error: res.error } : { data: res.data }
      },
      invalidatesTags: (_r,_e,{id}) => [{ type: 'Proposals', id }, { type: 'Proposals', id: 'LIST' }]
    }),

    rejectProposal: b.mutation({
      async queryFn ({ id, note }, _api, _extra, baseQuery) {
        if (!id) return { error: { status: 0, data: { message: 'id is required' } } }
        const params = note ? { note } : undefined
        const res = await baseQuery({
          url: `/customers/proposals/${id}/reject`,
          method: 'POST',
          params
        })
        return res.error ? { error: res.error } : { data: res.data }
      },
      invalidatesTags: (_r,_e,{id}) => [{ type: 'Proposals', id }, { type: 'Proposals', id: 'LIST' }]
    }),

    

    
  }),
})

export const {
  useGetMyProposalsQuery,
  useUploadPOMutation,
  useGetInvoicePdfQuery,
  useGetMyInvoicesQuery,
  useGetProposalDocumentsQuery,
  useUploadPOFileMutation,
  useCustomerDownloadProposalDocumentFileMutation,
  useLazyGetInvoicePdfQuery,
  useCustomerDownloadLatestProposalPdfMutation,
  useApproveProposalMutation,
  useRejectProposalMutation,
} = customerApi
