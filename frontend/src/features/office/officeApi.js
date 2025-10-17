// features/office/officeApi.js
import { baseApi } from '../../api/baseApi'
import { requireFields } from '../../api/error'
import { downloadBlob, extractFilename } from '../../utils/file'

/**
 * Make sure baseApi was created with these tagTypes:
 * export const baseApi = createApi({
 *   baseQuery, reducerPath: 'api',
 *   tagTypes: ['FieldEngineers','Proposals','ServiceRequests','WorkOrders','Activity','Stores','Stocks','Ledger','Items','Kits','Customers','Users','Invoices'],
 *   endpoints: () => ({})
 * })
 */

export const officeApi = baseApi.injectEndpoints({
  endpoints: (b) => ({

    /* ------------------------------ Field Engineers ------------------------------ */

    // GET /office/field-engineers?status=AVAILABLE
    getFieldEngineers: b.query({
      query: (params) => ({ url: '/office/field-engineers', method: 'GET', params }),
      transformResponse: (r) => Array.isArray(r?.content) ? r.content : (Array.isArray(r) ? r : []),
      providesTags: (res) =>
        res?.length
          ? [...res.map((fe) => ({ type: 'FieldEngineers', id: fe.id })), { type: 'FieldEngineers', id: 'LIST' }]
          : [{ type: 'FieldEngineers', id: 'LIST' }]
    }),

    // POST /office/field-engineers { displayName, email }
    createFieldEngineer: b.mutation({
      async queryFn (body, _api, _extra, baseQuery) {
        try { requireFields(body, ['displayName','email']) } catch (e) {
          return { error: { status: 0, data: { message: e.message } } }
        }
        const res = await baseQuery({ url: '/office/field-engineers', method: 'POST', body })
        return res.error ? { error: res.error } : { data: res.data }
      },
      invalidatesTags: [{ type: 'FieldEngineers', id: 'LIST' }]
    }),

    // PUT /office/field-engineers/{id} { displayName?, email?, status? }
    updateFieldEngineer: b.mutation({
      async queryFn ({ id, ...body }, _api, _extra, baseQuery) {
        if (!id) return { error: { status: 0, data: { message: 'id is required' } } }
        const res = await baseQuery({ url: `/office/field-engineers/${id}`, method: 'PUT', body })
        return res.error ? { error: res.error } : { data: null }
      },
      invalidatesTags: (_r,_e,{id}) => [{ type:'FieldEngineers', id }, { type:'FieldEngineers', id:'LIST' }]
    }),

    // DELETE /office/field-engineers/{id}?deleteUserIfOrphan=true
    officeDeleteFieldEngineer: b.mutation({
      query: ({ id, deleteUserIfOrphan = true }) => ({
        url: `/office/field-engineers/${id}?deleteUserIfOrphan=${!!deleteUserIfOrphan}`,
        method: 'DELETE',
        responseHandler: 'text'
      }),
      invalidatesTags: (_r,_e,{id}) => [{ type:'FieldEngineers', id }, { type:'FieldEngineers', id:'LIST' }]
    }),

    /* ----------------------------------- Intake ---------------------------------- */

    // POST /office/intake/call  (expects @RequestParam on backend)
    intakeCall: b.mutation({
      async queryFn (body, _api, _extra, baseQuery) {
        try { requireFields(body, ['customerName','serviceType']) } catch (e) {
          return { error: { status: 0, data: { message: e.message } } }
        }
        const res = await baseQuery({ url: '/office/intake/call', method: 'POST', params: body })
        return res.error ? { error: res.error } : { data: res.data } // returns intakeId or SR if auto-created
      }
    }),

    // POST /office/intake/email (raw text)
    intakeEmail: b.mutation({
      async queryFn ({ rawEmail }, _api, _extra, baseQuery) {
        try { requireFields({ rawEmail }, ['rawEmail']) } catch (e) {
          return { error: { status: 0, data: { message: e.message } } }
        }
        const res = await baseQuery({
          url: '/office/intake/email',
          method: 'POST',
          body: rawEmail,
          headers: { 'Content-Type': 'text/plain' }
        })
        return res.error ? { error: res.error } : { data: res.data } // returns intakeId
      }
    }),

    /* -------------------------------- Proposals ---------------------------------- */

    // POST /office/proposals/from-kit
    proposalFromKit: b.mutation({
      async queryFn (body, _api, _extra, baseQuery) {
        try {
          requireFields(body, ['serviceType','kitId'])
          if (!body.customerId && !body.customerName) {
            throw new Error('Either customerId or customerName is required')
          }
        } catch (e) {
          return { error: { status: 0, data: { message: e.message } } }
        }
        const res = await baseQuery({ url: '/office/proposals/from-kit', method: 'POST', body })
        return res.error ? { error: res.error } : { data: res.data } // Proposal draft
      }
    }),

    // POST /office/proposals/{id}/send { optional share object }
    proposalSend: b.mutation({
      async queryFn ({ id, share = {} }, _api, _extra, baseQuery) {
        if (!id) return { error: { status: 0, data: { message: 'id is required' } } }
        const res = await baseQuery({ url: `/office/proposals/${id}/send`, method: 'POST', body: share })
        return res.error ? { error: res.error } : { data: res.data }
      }
    }),

    // POST /office/proposals/{id}/approve { poNumber, approvedByUserId?, poUrl? }
    proposalApprove: b.mutation({
      async queryFn ({ id, poNumber, approvedByUserId, poUrl }, _api, _extra, baseQuery) {
        if (!id) return { error: { status: 0, data: { message: 'id is required' } } }
        if (!poNumber || !String(poNumber).trim()) {
          return { error: { status: 0, data: { message: 'poNumber is required' } } }
        }
        const body = { approvedByUserId, poNumber, poUrl }
        const res = await baseQuery({ url: `/office/proposals/${id}/approve`, method: 'POST', body })
        return res.error ? { error: res.error } : { data: res.data } // likely WO or status change
      }
    }),

    // POST /office/proposals/{id}/reject
    proposalReject: b.mutation({
      async queryFn ({ id }, _api, _extra, baseQuery) {
        if (!id) return { error: { status: 0, data: { message: 'id is required' } } }
        const res = await baseQuery({ url: `/office/proposals/${id}/reject`, method: 'POST' })
        return res.error ? { error: res.error } : { data: null }
      }
    }),

    // GET /office/proposals?status=&customerId=&page=&size=&sort=
    listProposals: b.query({
      query: (params) => ({ url: '/office/proposals', method: 'GET', params }),
      providesTags: (res) => {
        const rows = Array.isArray(res?.content) ? res.content : (Array.isArray(res) ? res : [])
        return rows.length
          ? [...rows.map((p) => ({ type: 'Proposals', id: p.id })), { type: 'Proposals', id: 'LIST' }]
          : [{ type: 'Proposals', id: 'LIST' }]
      }
    }),

    // GET /office/proposals/{id}
    getProposal: b.query({
      query: (id) => ({ url: `/office/proposals/${id}`, method: 'GET' }),
      providesTags: (_r,_e,id) => [{ type:'Proposals', id }]
    }),

    // GET /office/proposals/summary
    proposalsSummary: b.query({
      query: () => ({ url: '/office/proposals/summary', method: 'GET' }),
      providesTags: ['Proposals']
    }),

    /* ----------------------------- Service Requests ----------------------------- */

    // GET /office/requests?status=&customerId=&page=&size=&sort=
    getServiceRequests: b.query({
      query: (params = {}) => ({ url: '/office/requests', method: 'GET', params }),
      providesTags: (res) => {
        const rows = Array.isArray(res?.content) ? res.content : (Array.isArray(res) ? res : [])
        return rows.length
          ? [...rows.map((sr) => ({ type:'ServiceRequests', id: sr.id })), { type:'ServiceRequests', id:'LIST' }]
          : [{ type:'ServiceRequests', id:'LIST' }]
      }
    }),

    // GET /office/requests/{id}
    getServiceRequest: b.query({
      query: (id) => ({ url: `/office/requests/${id}`, method: 'GET' }),
      providesTags: (_r,_e,id) => [{ type:'ServiceRequests', id }]
    }),

    // POST /office/requests/{id}/create-wo
    createWorkOrderFromRequest: b.mutation({
      async queryFn ({ id }, _api, _extra, baseQuery) {
        if (!id) return { error: { status: 0, data: { message: 'id is required' } } }
        const res = await baseQuery({ url: `/office/requests/${id}/create-wo`, method: 'POST' })
        return res.error ? { error: res.error } : { data: res.data } // returns WO
      },
      invalidatesTags: [{ type:'WorkOrders', id:'LIST' }, { type:'ServiceRequests', id:'LIST' }]
    }),

    /* --------------------------------- Activity ---------------------------------- */

    // GET /office/activity?limit=10
    getActivity: b.query({
      query: (limit = 10) => ({ url: '/office/activity', method: 'GET', params: { limit } }),
      providesTags: ['Activity']
    }),

    /* ---------------------------- Inventory browse ------------------------------- */

    // GET /office/stores
    getStores: b.query({
      query: () => ({ url: '/office/stores', method: 'GET' }),
      transformResponse: (r) => Array.isArray(r?.content) ? r.content : (Array.isArray(r) ? r : []),
      providesTags: (res) =>
        res?.length
          ? [...res.map((s) => ({ type:'Stores', id:s.id })), { type:'Stores', id:'LIST' }]
          : [{ type:'Stores', id:'LIST' }]
    }),

    // GET /office/stocks?itemId=&storeId=
    getStocks: b.query({
      query: (params) => ({ url: '/office/stocks', method: 'GET', params }),
      transformResponse: (r) => Array.isArray(r?.content) ? r.content : (Array.isArray(r) ? r : []),
      providesTags: ['Stocks']
    }),

    // GET /office/ledger?itemId=
    getLedger: b.query({
      query: (params) => ({ url: '/office/ledger', method: 'GET', params }),
      transformResponse: (r) => Array.isArray(r?.content) ? r.content : (Array.isArray(r) ? r : []),
      providesTags: ['Ledger']
    }),

    /* ---------------------------- Catalog (Items/Kits) ---------------------------- */

    // POST /office/items
    createItem: b.mutation({
      async queryFn (body, _api, _extra, baseQuery) {
        try { requireFields(body, ['tenantId','code','name','uom','rate']) } catch (e) {
          return { error: { status: 0, data: { message: e.message } } }
        }
        const res = await baseQuery({ url: '/office/items', method: 'POST', body })
        return res.error ? { error: res.error } : { data: res.data }
      },
      invalidatesTags: ['Items','Stocks','Ledger']
    }),


    // POST /office/stores
    createStore: b.mutation({
      async queryFn (body, _api, _extra, baseQuery) {
        try { requireFields(body, ['tenantId','name','location']) } catch (e) {
          return { error: { status: 0, data: { message: e.message } } }
        }
        const res = await baseQuery({ url: '/office/stores', method: 'POST', body })
        return res.error ? { error: res.error } : { data: res.data }
      },
      invalidatesTags: [{ type:'Stores', id:'LIST' }]
    }),

    // POST /office/kits
    createKit: b.mutation({
      async queryFn (body, _api, _extra, baseQuery) {
        try { requireFields(body, ['tenantId','name','serviceType','price']) } catch (e) {
          return { error: { status: 0, data: { message: e.message } } }
        }
        const res = await baseQuery({ url: '/office/kits', method: 'POST', body })
        return res.error ? { error: res.error } : { data: res.data }
      },
      invalidatesTags: ['Kits']
    }),

    // POST /office/kits/items
    addKitItem: b.mutation({
      async queryFn (body, _api, _extra, baseQuery) {
        try { requireFields(body, ['tenantId','kitId','itemId','qty']) } catch (e) {
          return { error: { status: 0, data: { message: e.message } } }
        }
        const res = await baseQuery({ url: '/office/kits/items', method: 'POST', body })
        return res.error ? { error: res.error } : { data: res.data }
      },
      invalidatesTags: ['Kits']
    }),

    // GET /office/items?tenantId=
    getItems: b.query({
      query: (tenantId) => ({ url: '/office/items', method: 'GET', params: { tenantId } }),
      transformResponse: (r) => Array.isArray(r?.content) ? r.content : (Array.isArray(r) ? r : []),
      providesTags: (res) =>
        res?.length
          ? [...res.map((i) => ({ type:'Items', id:i.id })), { type:'Items', id:'LIST' }]
          : [{ type:'Items', id:'LIST' }]
    }),

    // GET /office/kits?tenantId=
    getKits: b.query({
      query: (tenantId) => ({ url: '/office/kits', method: 'GET', params: { tenantId } }),
      transformResponse: (r) => Array.isArray(r?.content) ? r.content : (Array.isArray(r) ? r : []),
      providesTags: (res) =>
        res?.length
          ? [...res.map((k) => ({ type:'Kits', id:k.id })), { type:'Kits', id:'LIST' }]
          : [{ type:'Kits', id:'LIST' }]
    }),

    /* --------------------------------- Invoices ---------------------------------- */

    // POST /office/invoice/{invoiceId}/send  { toEmail }
    sendInvoice: b.mutation({
      async queryFn({ invoiceId, toEmail }, _api, _extra, baseQuery) {
        if (!invoiceId || !toEmail) return { error: { status: 0, data: { message: 'invoiceId & toEmail required' } } }
        const res = await baseQuery({ url: `/office/invoice/${invoiceId}/send`, method: 'POST', body: { toEmail } })
        return res.error ? { error: res.error } : { data: null }
      }
    }),

    getInvoiceForWO: b.query({
      query: (woId) => ({ url: `/office/wo/${woId}/invoice`, method: 'GET' }),
      providesTags: (_res, _err, woId) => [{ type: 'Invoices', id: `WO-${woId}` }]
    }),

    /* -------------------------------- Customers ---------------------------------- */

    // POST /office/customers
    createCustomer: b.mutation({
      async queryFn (body, _api, _extra, baseQuery) {
        try { requireFields(body, ['name','email','mobile','address']) } catch (e) {
          return { error: { status: 0, data: { message: e.message } } }
        }
        const res = await baseQuery({ url: '/office/customers', method: 'POST', body })
        return res.error ? { error: res.error } : { data: res.data } // CreateCustomerResponse
      }
    }),

    // PUT /office/customers/{id}
    updateCustomer: b.mutation({
      query: ({ id, ...patch }) => ({
        url: `/office/customers/${id}`,
        method: 'PUT',
        body: patch
      }),
      invalidatesTags: (_r,_e,{id}) => [{ type:'Customers', id }, { type:'Customers', id:'LIST' }]
    }),

    // GET /office/customers?name=&email=&mobile=&hasPortal=&page=&size=&sort=
    getCustomers: b.query({
      query: (params = {}) => ({ url: '/office/customers', method: 'GET', params }),
      transformResponse: (r) => ({
        items: Array.isArray(r?.content)
          ? r.content.map(c => ({
              id: c?.id,
              name: c?.name ?? '',
              email: c?.email ?? '',
              mobile: c?.mobile ?? '',
              address: c?.address ?? '',
              portalUserId: c?.portalUserId ?? c?.portalUser?.id ?? null,
              portalUserEmail: c?.portalUserEmail ?? c?.portalUser?.email ?? null,
              portalUserDisplayName: c?.portalUserDisplayName ?? c?.portalUser?.displayName ?? null
            }))
          : [],
        total: r?.totalElements ?? 0,
        page: r?.number ?? 0,
        size: r?.size ?? 0,
        totalPages: r?.totalPages ?? 0
      }),
      providesTags: (res) =>
        res?.items?.length
          ? [...res.items.map((c) => ({ type:'Customers', id:c.id })), { type:'Customers', id:'LIST' }]
          : [{ type:'Customers', id:'LIST' }]
    }),

    // DELETE /office/customers/{id}?deletePortalUserIfOrphan=true
    officeDeleteCustomer: b.mutation({
      query: ({ id, deletePortalUserIfOrphan = true }) => ({
        url: `/office/customers/${id}?deletePortalUserIfOrphan=${!!deletePortalUserIfOrphan}`,
        method: 'DELETE',
        responseHandler: 'text'
      }),
      invalidatesTags: (_r,_e,{id}) => [{ type:'Customers', id }, { type:'Customers', id:'LIST' }]
    }),

    /* --------------- Tenant-scoped password reset for portal/user --------------- */

    // POST /office/users/{id}/reset-password?sendEmail=true
    officeResetPassword: b.mutation({
      query: ({ id, sendEmail = true }) => ({
        url: `/office/users/${id}/reset-password?sendEmail=${!!sendEmail}`,
        method: 'POST'
      }) // returns { tempPassword } or 204; handle in UI
    }),

    /* --------------------------------- Work Orders -------------------------------- */

    // GET /office/wo?status=&feId=&srId=&page=&size=&sort=
    listWOs: b.query({
      query: (params) => ({ url: '/office/wo', method: 'GET', params }),
      providesTags: (res) => {
        const rows = Array.isArray(res?.content) ? res.content : (Array.isArray(res) ? res : [])
        return rows.length
          ? [...rows.map((wo) => ({ type:'WorkOrders', id: wo.id })), { type:'WorkOrders', id:'LIST' }]
          : [{ type:'WorkOrders', id:'LIST' }]
      }
    }),

    // GET /office/wo/{id}
    getWO: b.query({
      query: (id) => ({ url: `/office/wo/${id}`, method: 'GET' }),
      providesTags: (_r,_e,id) => [{ type:'WorkOrders', id }]
    }),

    // GET /office/wo/{id}/timeline
    woTimeline: b.query({
      query: (id) => ({ url: `/office/wo/${id}/timeline`, method: 'GET' }),
      providesTags: (_r,_e,id) => [{ type:'WorkOrders', id }]
    }),

    // GET /office/wo/summary
    woSummary: b.query({
      query: () => ({ url: '/office/wo/summary', method: 'GET' }),
      providesTags: ['WorkOrders']
    }),

    // POST /office/wo/{id}/assign { feId, note? }
    woAssign: b.mutation({
      async queryFn ({ id, feId, note }, _api, _extra, baseQuery) {
        try { requireFields({ id, feId }, ['id','feId']) } catch (e) {
          return { error: { status: 0, data: { message: e.message } } }
        }
        const res = await baseQuery({ url: `/office/wo/${id}/assign`, method: 'POST', body: { feId, note } })
        return res.error ? { error: res.error } : { data: null }
      },
      invalidatesTags: ['WorkOrders','Stocks','Ledger']
    }),

    // POST /office/wo/{id}/progress { status, byFeId, remarks?, photoUrl? }
    woProgress: b.mutation({
      async queryFn ({ id, ...body }, _api, _extra, baseQuery) {
        if (!id) return { error: { status: 0, data: { message: 'id is required' } } }
        try { requireFields(body, ['status','byFeId']) } catch (e) {
          return { error: { status: 0, data: { message: e.message } } }
        }
        const res = await baseQuery({ url: `/office/wo/${id}/progress`, method: 'POST', body })
        return res.error ? { error: res.error } : { data: null }
      },
      invalidatesTags: ['WorkOrders']
    }),

    // POST /office/wo/{woId}/issue { itemId, storeId, qty }
    woIssueItem: b.mutation({
      async queryFn ({ woId, itemId, storeId, qty }, _api, _extra, baseQuery) {
        try { requireFields({ woId, itemId, storeId, qty }, ['woId','itemId','storeId','qty']) } catch (e) {
          return { error: { status: 0, data: { message: e.message } } }
        }
        const res = await baseQuery({ url: `/office/wo/${woId}/issue`, method: 'POST', body: { itemId, storeId, qty } })
        return res.error ? { error: res.error } : { data: null }
      },
      invalidatesTags: ['Stocks','Ledger','WorkOrders']
    }),

    // ✅ NEW: POST /office/wo/{woId}/return { itemId, storeId, qty }
    woReturnItem: b.mutation({
      async queryFn ({ woId, itemId, storeId, qty }, _api, _extra, baseQuery) {
        try { requireFields({ woId, itemId, storeId, qty }, ['woId','itemId','storeId','qty']) } catch (e) {
          return { error: { status: 0, data: { message: e.message } } }
        }
        const res = await baseQuery({ url: `/office/wo/${woId}/return`, method: 'POST', body: { itemId, storeId, qty } })
        return res.error ? { error: res.error } : { data: null }
      },
      invalidatesTags: ['Stocks','Ledger','WorkOrders']
    }),

    // POST /office/wo/{woId}/complete
    woComplete: b.mutation({
      async queryFn ({ woId }, _api, _extra, baseQuery) {
        if (!woId) return { error: { status: 0, data: { message: 'woId is required' } } }
        const res = await baseQuery({ url: `/office/wo/${woId}/complete`, method: 'POST' })
        return res.error ? { error: res.error } : { data: null }
      },
      invalidatesTags: ['WorkOrders','Invoices']
    }),

    receiveStock: b.mutation({
      async queryFn (body, _api, _extra, baseQuery) {
        try { requireFields(body, ['itemId','storeId','qty']) } catch (e) {
          return { error: { status: 0, data: { message: e.message } } }
        }
        const res = await baseQuery({ url: '/office/stock/receive', method: 'POST', body })
        return res.error ? { error: res.error } : { data: null }
      },
      invalidatesTags: ['Stocks','Ledger','Items']
    }),

    attachProposalDocument: b.mutation({
      async queryFn ({ id, body }, _api, _extra, baseQuery) {
        if (!id) return { error: { status: 0, data: { message: 'id is required' } } }
        const res = await baseQuery({ url: `/office/proposals/${id}/documents`, method: 'POST', body })
        return res.error ? { error: res.error } : { data: res.data }
      },
      invalidatesTags: (_r,_e,{id}) => [{ type:'Proposals', id }]
    }),
    listProposalDocuments: b.query({
      query: (id) => ({ url: `/office/proposals/${id}/documents`, method: 'GET' }),
      providesTags: (_r,_e,id) => [{ type:'Proposals', id }]
    }),
    // Download ANY proposal-document (Back Office) as Blob
     downloadProposalDocumentFile: b.mutation({
      async queryFn({ proposalId, docId, filename }, _api, _extra, baseQuery) {
            const res = await baseQuery({
            url: `/office/proposals/${proposalId}/documents/${docId}/download`,
            method: 'GET',
            // IMPORTANT: fetch as binary
            responseHandler: (response) => response.blob(),
            headers: { Accept: 'application/pdf' },
          })
        if (res.error) return { error: res.error }
        const cd = res?.meta?.response?.headers?.get('content-disposition') ?? null
        const ct = res?.meta?.response?.headers?.get('content-type') ?? ''
        if (!ct.toLowerCase().includes('pdf')) {
          try {
            const text = await res.data.text()
            return { error: { status: res?.meta?.response?.status ?? 400, data: { message: text || 'Download failed' } } }
          } catch {}
        }
        const serverName = extractFilename(cd);
        const blob = /** @type {Blob} */ (res.data); // binary Blob now
        const name = serverName || normalizeFilename(filename, blob.type) || `document-${proposalId}.pdf`;
        downloadBlob(blob, name, blob.type);
        return { data: { ok: true } } // nothing non-serializable stored
      },
    })


  })
})

export const {
  useGetFieldEngineersQuery,
  useCreateFieldEngineerMutation,
  useUpdateFieldEngineerMutation,
  useOfficeDeleteFieldEngineerMutation,

  useIntakeCallMutation,
  useIntakeEmailMutation,

  useProposalFromKitMutation,
  useProposalSendMutation,
  useProposalApproveMutation,
  useProposalRejectMutation,
  useListProposalsQuery,
  useGetProposalQuery,
  useProposalsSummaryQuery,

  useGetServiceRequestsQuery,
  useGetServiceRequestQuery,
  useCreateWorkOrderFromRequestMutation,

  useGetActivityQuery,

  useGetStoresQuery,
  useGetStocksQuery,
  useGetLedgerQuery,

  useCreateItemMutation,
  useCreateStoreMutation,
  useCreateKitMutation,
  useAddKitItemMutation,
  useGetItemsQuery,
  useGetKitsQuery,

  useSendInvoiceMutation,

  useCreateCustomerMutation,
  useGetCustomersQuery,
  useUpdateCustomerMutation,
  useOfficeDeleteCustomerMutation,

  useOfficeResetPasswordMutation,

  useListWOsQuery,
  useGetWOQuery,
  useWoTimelineQuery,
  useWoSummaryQuery,
  useWoAssignMutation,
  useWoProgressMutation,
  useWoIssueItemMutation,
  useWoCompleteMutation,
  useReceiveStockMutation,
  useWoReturnItemMutation,
  useAttachProposalDocumentMutation,
  useListProposalDocumentsQuery,
  useDownloadProposalDocumentFileMutation,
  useGetInvoiceForWOQuery,
  useLazyGetInvoiceForWOQuery,
} = officeApi
