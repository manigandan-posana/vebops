// features/office/officeApi.js
import { baseApi } from '../../api/baseApi'
import { requireFields } from '../../api/error'
import { downloadBlob, extractFilename } from '../../utils/file'
import { normaliseArray, normalisePage } from '../../utils/apiShape'


const normalizeFilename = (name, mime = 'application/pdf') => {
  if (!name) return null;
  const n = String(name).trim();
  if (!n) return null;
  if (mime.includes('pdf') && !/\.pdf$/i.test(n)) return `${n}.pdf`;
  return n;
};

const idem = (prefix, value = '') =>
  `${prefix}:${String(value || '').trim().toLowerCase()}`;

export const officeApi = baseApi.injectEndpoints({
  endpoints: (b) => ({

    /* ------------------------------ Field Engineers ------------------------------ */

    // GET /office/field-engineers?status=AVAILABLE
    getFieldEngineers: b.query({
      query: (params) => ({ url: '/office/field-engineers', method: 'GET', params }),
      transformResponse: (res) => normaliseArray(res),
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
        const res = await baseQuery({
          url: '/office/field-engineers',
          method: 'POST',
          body,
          headers: { 'Idempotency-Key': idem('fe', body.email) }     // << add
        })
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
      transformResponse: (res) => normalisePage(res),
      providesTags: (result) => {
        const rows = result?.content ?? []
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
      transformResponse: (res) => normalisePage(res),
      providesTags: (result) => {
        const rows = result?.content ?? []
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
        const res = await baseQuery({
          url: `/office/requests/${id}/create-wo`,
          method: 'POST',
          headers: { 'Idempotency-Key': `sr-${id}` }, // ✅ harmless if backend ignores; great if it supports
        })
        if (res.error) {
          const status = res.error.status
          const payload = res.error.data
          if (status === 409 && payload != null) {
            if (typeof payload === 'number') return { data: { id: payload } }
            if (typeof payload === 'object') return { data: payload }
          }
          return { error: res.error }
        }
        const d = res.data
        // Backend may return a raw Long or a WorkOrder object.
        // Normalize to { id, wan? } to keep UI happy.
        if (typeof d === 'number') return { data: { id: d } }
        if (d && typeof d === 'object') return { data: d }
        return { data: { id: null } }
      },
      invalidatesTags: [{ type:'WorkOrders', id:'LIST' }, { type:'ServiceRequests', id:'LIST' }]
    }),

    /* ----------------------------- Create Service ----------------------------- */
    // POST /office/services — create a new service. Accepts buyer, consignee,
    // meta, items and totals objects. Returns the created service entity.
    createService: b.mutation({
      query: (body) => ({ url: '/office/services', method: 'POST', body }),
      invalidatesTags: [{ type: 'Services', id: 'LIST' }]
    }),

    /* -------------------------------- Services (History & Autocomplete) ------------------------------- */
    /**
     * GET /office/services
     * Fetch a paginated list of services for the current tenant. Supports
     * optional search via the `q` parameter and custom page/size/sort. The
     * response is normalised into a consistent structure containing the
     * content array and pagination metadata.
     */
    getServices: b.query({
      query: (params = {}) => ({ url: '/office/services', method: 'GET', params }),
      transformResponse: (res) => normalisePage(res),
      providesTags: (result) => {
        const rows = result?.content ?? []
        return rows.length
          ? [...rows.map((s) => ({ type: 'Services', id: s.id })), { type: 'Services', id: 'LIST' }]
          : [{ type: 'Services', id: 'LIST' }]
      }
    }),

    /**
     * GET /office/services/{id}/invoice
     * Download the generated invoice PDF for a service. This uses the
     * browser to trigger a file download. The actual data is not
     * returned to the caller; instead a null payload is returned
     * once the download begins. Consumers can call this endpoint
     * directly from UI handlers without awaiting the result.
     */
    // features/office/officeApi.js (or .ts)
    downloadServiceInvoice: b.mutation({
      async queryFn(arg, _api, _extra, baseQuery) {
        const params = typeof arg === 'object' && arg !== null ? arg : { id: arg };
        const id = params?.id;
        const type = params?.type || 'INVOICE';
        if (!id) return { error: { status: 0, data: { message: 'id is required' } } };
        // Always fetch raw bytes; do not let RTK parse JSON/text
        const res = await baseQuery({
          url: `/office/services/${id}/invoice`,
          method: 'GET',
          headers: { Accept: 'application/pdf' },
          params: type && type !== 'INVOICE' ? { type } : undefined,
          // Force bytes; this works across RTKQ versions
          responseHandler: (r) => r.arrayBuffer(),
          cache: 'no-store',
        });

        if (res.error) return { error: res.error };

        try {
          const cd = res.meta?.response?.headers?.get('Content-Disposition');
          const fallback = type && type.toUpperCase() === 'PROFORMA'
            ? `service-${id}-proforma.pdf`
            : `service-invoice-${id}.pdf`;
          const filename = extractFilename(cd) || fallback;

          // Build a proper PDF Blob from the raw bytes
          const pdfBlob = new Blob([res.data], { type: 'application/pdf' });

          // (optional sanity check) first 4 bytes should be "%PDF"
          try {
            const head = new TextDecoder().decode(new Uint8Array(res.data).slice(0, 4));
            if (head !== '%PDF') {
              console.warn('Downloaded content is not a PDF. Content-Type:', res.meta?.response?.headers?.get('content-type'));
            }
          } catch {}

          downloadBlob(pdfBlob, filename, 'application/pdf');
          return { data: null };
        } catch (e) {
          return { error: { status: 0, data: { message: e.message || 'Download failed' } } };
        }
      }
    }),

    /**
     * POST /office/services/{id}/invoice/send
     * Send the stored invoice PDF for a service via email or WhatsApp.
     * Accepts a payload with optional toEmail and toWhatsapp fields.
     */
    sendServiceInvoice: b.mutation({
      async queryFn ({ id, toEmail, toWhatsapp, type = 'INVOICE' }, _api, _extra, baseQuery) {
        if (!id) return { error: { status: 0, data: { message: 'id is required' } } };
        const body = {};
        if (toEmail && toEmail.trim()) body.toEmail = toEmail;
        if (toWhatsapp && toWhatsapp.trim()) body.toWhatsapp = toWhatsapp;
        const res = await baseQuery({
          url: `/office/services/${id}/invoice/send`,
          method: 'POST',
          body,
          params: type && type !== 'INVOICE' ? { type } : undefined
        });
        return res.error ? { error: res.error } : { data: res.data };
      }
    }),

    shareServiceProposal: b.mutation({
      async queryFn ({ id, docType = 'PROFORMA' }, _api, _extra, baseQuery) {
        if (!id) return { error: { status: 0, data: { message: 'id is required' } } };
        const payload = {};
        if (docType) payload.docType = docType;
        const res = await baseQuery({
          url: `/office/services/${id}/proposal/share`,
          method: 'POST',
          body: payload
        });
        return res.error ? { error: res.error } : { data: res.data };
      },
      invalidatesTags: ['Proposals', { type: 'Services', id: 'LIST' }]
    }),

    /**
     * GET /office/services/{id}
     * Retrieve the details of a single service. The raw Service object is
     * returned; the caller can parse the JSON strings (itemsJson, metaJson,
     * totalsJson) as needed.
     */
    getService: b.query({
      query: (id) => ({ url: `/office/services/${id}`, method: 'GET' }),
      transformResponse: (res) => {
        if (!res || typeof res !== 'object') {
          return { service: null, workOrder: null, serviceRequest: null, progress: [], assignments: [] }
        }
        const progress = Array.isArray(res.progress) ? res.progress : []
        const assignments = Array.isArray(res.assignments) ? res.assignments : []
        return {
          service: res.service ?? res,
          workOrder: res.workOrder ?? null,
          serviceRequest: res.serviceRequest ?? null,
          progress,
          assignments
        }
      },
      providesTags: (_r,_e,id) => [{ type:'Services', id }]
    }),

    /**
     * GET /office/services/autocomplete
     * Suggest saved buyers for the service form. Accepts a search keyword
     * and returns a limited list of buyer details. Consumers should pass
     * { q: string, limit?: number } as the argument.
     */
    autocompleteServiceBuyers: b.query({
      query: ({ q, limit = 5 }) => ({ url: '/office/services/autocomplete', method: 'GET', params: { q, limit } }),
      transformResponse: (res) => Array.isArray(res) ? res : []
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
        try { requireFields(body, ['name','serviceType','price']) } catch (e) {
          return { error: { status: 0, data: { message: e.message } } }
        }
        // The tenant ID is derived on the server. Send all provided fields.
        const res = await baseQuery({ url: '/office/kits', method: 'POST', body })
        return res.error ? { error: res.error } : { data: res.data }
      },
      invalidatesTags: ['Kits']
    }),

    // PUT /office/kits/{id}
    updateKit: b.mutation({
      async queryFn ({ id, ...body }, _api, _extra, baseQuery) {
        if (!id) return { error: { status: 0, data: { message: 'id is required' } } }
        const res = await baseQuery({ url: `/office/kits/${id}`, method: 'PUT', body })
        return res.error ? { error: res.error } : { data: res.data }
      },
      invalidatesTags: (_r,_e,{ id }) => [{ type:'Kits', id }, { type:'Kits', id:'LIST' }]
    }),

    // DELETE /office/kits/{id}
    deleteKit: b.mutation({
      query: (id) => ({ url: `/office/kits/${id}`, method: 'DELETE', responseHandler: 'text' }),
      invalidatesTags: (_r,_e,id) => [{ type:'Kits', id }, { type:'Kits', id:'LIST' }]
    }),

    // PUT /office/kits/items/{id}
    updateKitItem: b.mutation({
      async queryFn ({ id, ...body }, _api, _extra, baseQuery) {
        if (!id) return { error: { status: 0, data: { message: 'id is required' } } }
        const res = await baseQuery({ url: `/office/kits/items/${id}`, method: 'PUT', body })
        return res.error ? { error: res.error } : { data: res.data }
      },
      invalidatesTags: ['Kits']
    }),

    // DELETE /office/kits/items/{id}
    deleteKitItem: b.mutation({
      query: (id) => ({ url: `/office/kits/items/${id}`, method: 'DELETE', responseHandler: 'text' }),
      invalidatesTags: ['Kits']
    }),

    /**
     * Bulk create kits. Sends an array of kit definitions to the backend to be
     * persisted in one request. See /office/kits/bulk in the backend for
     * supported fields. All entries will inherit the current tenant ID from the
     * server context.
     */
    bulkCreateKits: b.mutation({
      query: (body) => ({ url: '/office/kits/bulk', method: 'POST', body }),
      invalidatesTags: [{ type:'Kits', id:'LIST' }]
    }),

    // GET /office/company
    getCompany: b.query({
      query: () => ({ url: '/office/company', method: 'GET' }),
      providesTags: ['Company']
    }),

    // PUT /office/company
    updateCompany: b.mutation({
      async queryFn (body, _api, _extra, baseQuery) {
        const res = await baseQuery({ url: '/office/company', method: 'PUT', body })
        return res.error ? { error: res.error } : { data: res.data }
      },
      invalidatesTags: ['Company']
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

    // GET /office/kits
    getKits: b.query({
      query: (tenantId) => {
        // Only include the tenantId param if a truthy value is provided. The
        // backend derives the tenant from the security context so omitting the
        // param is safe.
        const params = tenantId ? { tenantId } : undefined;
        return { url: '/office/kits', method: 'GET', params };
      },
      transformResponse: (r) => Array.isArray(r?.content) ? r.content : (Array.isArray(r) ? r : []),
      providesTags: (res) =>
        res?.length
          ? [...res.map((k) => ({ type:'Kits', id:k.id })), { type:'Kits', id:'LIST' }]
          : [{ type:'Kits', id:'LIST' }]
    }),

    /* --------------------------------- Invoices ---------------------------------- */

    // POST /office/invoice/{invoiceId}/send  { toEmail?, toWhatsapp? }
    sendInvoice: b.mutation({
      async queryFn({ invoiceId, toEmail, toWhatsapp }, _api, _extra, baseQuery) {
        if (!invoiceId || (!toEmail && !toWhatsapp)) {
          return { error: { status: 0, data: { message: 'invoiceId and either toEmail or toWhatsapp required' } } }
        }
        const body = {};
        if (toEmail) body.toEmail = toEmail;
        if (toWhatsapp) body.toWhatsapp = toWhatsapp;
        const res = await baseQuery({ url: `/office/invoice/${invoiceId}/send`, method: 'POST', body })
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
        const res = await baseQuery({
          url: '/office/customers',
          method: 'POST',
          body,
          headers: { 'Idempotency-Key': idem('cust', body.email || body.mobile) }  // << add
        })
        return res.error ? { error: res.error } : { data: res.data }
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
      transformResponse: (res) => normalisePage(res),
      providesTags: (result) => {
        const rows = result?.content ?? []
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

    getWoProgressAttachment: b.query({
      query: ({ woId, progressId, attachmentId }) => ({
        url: `/office/wo/${woId}/progress/${progressId}/attachments/${attachmentId}`,
        method: 'GET',
        responseHandler: (response) => response.blob()
      })
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

    // POST /office/wo/{id}/progress { status, byFeId, remarks?, photoUrl?, photoName?, photoContentType?, photoSize?, photoData? }
    woProgress: b.mutation({
      async queryFn ({ id, photoFile, ...body }, _api, _extra, baseQuery) {
        if (!id) return { error: { status: 0, data: { message: 'id is required' } } }
        try { requireFields(body, ['status']) } catch (e) {
          return { error: { status: 0, data: { message: e.message } } }
        }
        let photoPayload = {}
        if (photoFile instanceof File) {
          try {
            const base64 = await new Promise((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => {
                const result = reader.result || ''
                const commaIndex = typeof result === 'string' ? result.indexOf(',') : -1
                resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
              }
              reader.onerror = () => reject(reader.error || new Error('Unable to read file'))
              reader.readAsDataURL(photoFile)
            })
            photoPayload = {
              photoName: photoFile.name,
              photoContentType: photoFile.type,
              photoSize: photoFile.size,
              photoData: base64
            }
          } catch (err) {
            return { error: { status: 0, data: { message: err?.message || 'Failed to read photo' } } }
          }
        }
        const res = await baseQuery({ url: `/office/wo/${id}/progress`, method: 'POST', body: {
          ...body,
          photoUrl: body.photoUrl || null,
          ...photoPayload
        } })
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
        const res = await baseQuery({
          url: `/office/wo/${woId}/complete`,
          method: 'POST',
          headers: { 'Idempotency-Key': `wo-complete-${woId}` }, // ✅ prevents double completion on retries
        })
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
      transformResponse: (res) => normaliseArray(res),
      providesTags: (_r,_e,id) => [{ type:'Proposals', id }]
    }),

    /* Generate PDF for a proposal (returns Document with download URL) */
    // POST /office/proposals/{id}/pdf
    generateProposalPdf: b.mutation({
      async queryFn ({ id, body }, _api, _extra, baseQuery) {
        if (!id) return { error: { status: 0, data: { message: 'id is required' } } }
        // minimal required fields from ProposalPdfRequest:
        // tenantName, tenantGstin, tenantAddressLine1, tenantStateName, tenantStateCode, placeOfSupply, taxPercent
        const res = await baseQuery({ url: `/office/proposals/${id}/pdf`, method: 'POST', body })
        return res.error ? { error: res.error } : { data: res.data }
      },
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Proposals', id }, { type: 'Proposals', id: 'LIST' }]
    }),

    /* Email proposal to customer (optionally attach latest PDF) */
    // POST /office/proposals/{id}/send-email?attachPdf=true|false
    sendProposalEmail: b.mutation({
      query: ({ id, attachPdf = true, share }) => {
        if (!id) throw new Error('id is required')
        const body = { ...(share || {}) }
        // Let server decide template (auto by serviceType) when blank
        if (!body.templateCode || !String(body.templateCode).trim()) {
          delete body.templateCode
        }
        return {
          url: `/office/proposals/${id}/send-email`,
          method: 'POST',
          params: { attachPdf },   // fetchBaseQuery will serialize boolean
          body
        }
      },
      invalidatesTags: ['Proposals']
    }),



    

    downloadProposalDocumentFile: b.mutation({
      async queryFn({ proposalId, docId, filename }, _api, _extra, baseQuery) {
        const res = await baseQuery({
          url: `/office/proposals/${proposalId}/documents/${docId}/download`,
          method: 'GET',
          responseHandler: (response) => response.blob(),
          headers: {
            Accept: 'application/pdf, application/json;q=0.9, */*;q=0.1',
          },
        })

        const resp = res?.meta?.response
        const status = resp?.status ?? 0
        const ct = (resp?.headers?.get('content-type') ?? '').toLowerCase()
        const cd = resp?.headers?.get('content-disposition') ?? null

        if (status >= 400) {
          let message = 'Download failed'
          try { message = await res?.error?.data?.text?.() || message } catch {}
          return { error: { status, data: { message } } }
        }

        if (!ct.includes('pdf')) {
          let message = 'Server did not return a PDF'
          try { message = await res?.data?.text?.() || message } catch {}
          return { error: { status: 400, data: { message } } }
        }

        const blob = /** @type {Blob} */ (res.data)
        const serverName = extractFilename(cd)
        const name = serverName || normalizeFilename(filename, blob.type) || `document-${proposalId}.pdf`
        downloadBlob(blob, name, blob.type)
        return { data: { ok: true } }
      },
    }),


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

  useCreateServiceMutation,

  useGetActivityQuery,

  useGetStoresQuery,
  useGetStocksQuery,
  useGetLedgerQuery,

  useCreateItemMutation,
  useCreateStoreMutation,
  useCreateKitMutation,
  useUpdateKitMutation,
  useDeleteKitMutation,
  useUpdateKitItemMutation,
  useDeleteKitItemMutation,
  useAddKitItemMutation,
  useGetItemsQuery,
  useGetKitsQuery,
  useGetCompanyQuery,
  useUpdateCompanyMutation,

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
  useLazyGetWoProgressAttachmentQuery,
  useWoIssueItemMutation,
  useWoCompleteMutation,
  useReceiveStockMutation,
  useWoReturnItemMutation,
  useAttachProposalDocumentMutation,
  useListProposalDocumentsQuery,
  useDownloadProposalDocumentFileMutation,
  useGetInvoiceForWOQuery,
  useLazyGetInvoiceForWOQuery,
  useGenerateProposalPdfMutation,
  useSendProposalEmailMutation,
  useBulkCreateKitsMutation,
  useAutocompleteServiceBuyersQuery,
  useGetServicesQuery,
  useGetServiceQuery,
  useDownloadServiceInvoiceMutation,
  useSendServiceInvoiceMutation,
  useShareServiceProposalMutation,
} = officeApi
