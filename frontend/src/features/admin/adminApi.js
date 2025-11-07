// src/features/admin/adminApi.js
import { baseApi } from '../../api/baseApi'

/**
 * Admin API — fully aligned with your AdminController
 * Notes / fixes:
 * - Endpoints that return 204/empty bodies use `responseHandler: 'text'` to avoid JSON parse errors.
 * - CSV & template-render endpoints also use `responseHandler: 'text'`.
 * - Transform responses add safe defaults so UI never crashes on null/undefined.
 */

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({

    /* --------------------------- Dashboard / Analytics --------------------------- */

    getAdminSummary: builder.query({
      query: () => '/admin/dashboard/summary',
      transformResponse: (r) => ({
        totalTenants: r?.totalTenants ?? 0,
        activeUsers: r?.activeUsers ?? 0,
        signups30d: r?.signups30d ?? 0,
        revenueMTD: r?.revenueMTD ?? 0,
        subscriptions: r?.subscriptions ?? { active: 0, inactive: 0 },
      }),
      providesTags: ['AdminSummary'],
    }),

    getSubscriptionBreakdown: builder.query({
      query: () => '/admin/subscriptions/breakdown',
      transformResponse: (r) => ({
        active: r?.active ?? 0,
        inactive: r?.inactive ?? 0,
      }),
      providesTags: ['SubBreakdown'],
    }),

    getTenantSignups: builder.query({
      query: (sinceDays = 30) => `/admin/tenants/signups?sinceDays=${sinceDays}`,
    }),

    getHealth: builder.query({
      query: () => '/admin/health',
      transformResponse: (r) => ({
        status: r?.status ?? 'UNKNOWN',
        database: r?.database ?? 'UNKNOWN',
        version: r?.version ?? 'unknown',
        details: r?.details ?? {},
      }),
      providesTags: ['Health'],
    }),

    getRevenueSeries: builder.query({
      query: (months = 6) => `/admin/billing/revenue-series?months=${months}`,
      transformResponse: (r) => Array.isArray(r?.items) ? r.items : [],
      providesTags: ['Billing'],
    }),

    /* --------------------------------- Tenants ---------------------------------- */


    /* --------------------------------- Exports ---------------------------------- */

    getUsersCsv: builder.query({
      query: () => ({
        url: '/admin/export/users.csv',
        // server returns text/csv
        responseHandler: 'text',
      }),
    }),

    getTenantsCsv: builder.query({
      query: () => ({
        url: '/admin/export/tenants.csv',
        responseHandler: 'text',
      }),
    }),

    /* ---------------------------- Users / Back Office ---------------------------- */

    // Creates tenant if code is new, creates Back Office user with generated password + email
    createBackOffice: builder.mutation({
      query: (body) => ({
        url: '/admin/users/backoffice',
        method: 'POST',
        body, // { code, name, displayName, email, password? } // password ignored server-side, random is generated
      }),
      invalidatesTags: ['Tenants', 'Users', 'AdminSummary'],
    }),

    getUsers: builder.query({
      query: () => '/admin/users',
      transformResponse: (rows) =>
        Array.isArray(rows)
          ? rows.map(u => ({ ...u, roles: Array.isArray(u?.roles) ? u.roles : [] }))
          : [],
      providesTags: ['Users'],
    }),


    updateUser: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/admin/users/${id}`,
        method: 'PATCH',
        body: patch, // { displayName?, email?, active? }
        responseHandler: 'text', // 204 no content
      }),
      invalidatesTags: ['Users', 'AdminSummary'],
    }),

    disableUser: builder.mutation({
      query: ({ id }) => ({
        url: `/admin/users/${id}`,
        method: 'DELETE',
        responseHandler: 'text', // 204 no content
      }),
      invalidatesTags: ['Users', 'AdminSummary'],
    }),

    // Invite a user to a tenant with a specific role
    inviteUser: builder.mutation({
      query: (body) => ({
        url: '/admin/users/invite',
        method: 'POST',
        body, // { tenantId, displayName, email, role, primaryRole? }
      }),
      invalidatesTags: ['Users', 'AdminSummary'],
    }),

    // Reset password (optionally suppress email)
    resetPassword: builder.mutation({
      query: ({ id, sendEmail = true }) => ({
        url: `/admin/users/${id}/reset-password`,
        method: 'POST',
        body: { sendEmail },
      }),
      // returns { tempPassword }
      invalidatesTags: ['Users'],
    }),

    // Assign a role to a user for a tenant
    addUserRole: builder.mutation({
      query: ({ id, tenantId, role, primary = false }) => ({
        url: `/admin/users/${id}/roles`,
        method: 'POST',
        body: { tenantId, role, primary },
        responseHandler: 'text', // 204 no content
      }),
      invalidatesTags: ['Users'],
    }),

    // Remove a role from a user for a tenant
    removeUserRole: builder.mutation({
      query: ({ id, tenantId, role }) => ({
        url: `/admin/users/${id}/roles?tenantId=${tenantId}&role=${encodeURIComponent(role)}`,
        method: 'DELETE',
        responseHandler: 'text', // 204 no content
      }),
      invalidatesTags: ['Users'],
    }),

    /* ------------------------------ Email Templates ----------------------------- */

    getEmailTemplates: builder.query({
      query: (tenantId) => `/admin/email/templates?tenantId=${tenantId}`,
      transformResponse: (r) => Array.isArray(r) ? r : [],
      providesTags: ['EmailTemplates'],
    }),

    upsertEmailTemplate: builder.mutation({
      query: (body) => ({
        url: '/admin/email/templates',
        method: 'PUT',
        body, // { tenantId, code, subject, bodyWithVars }
      }),
      invalidatesTags: ['EmailTemplates'],
    }),

    // Render a template (HTML string). viaAi is optional on server.
    renderEmailTemplate: builder.mutation({
      query: (body) => ({
        url: '/admin/email/templates/render',
        method: 'POST',
        body, // { tenantId, code, vars?, viaAi? }
        responseHandler: 'text',
      }),
    }),

    /* ------------------------------- Impersonation ------------------------------ */

    getImpersonationToken: builder.mutation({
      query: (body) => ({
        url: '/admin/impersonate',
        method: 'POST',
        body, // { userId, tenantId, role }
      }),
      // returns { token }
    }),

    /* ------------------------------- Office Summary ----------------------------- */

    getOfficeSummary: builder.query({
      query: () => '/admin/office',
      providesTags: ['Office'],
    }),

    
    // NEW: paginated + filters
    getTenants: builder.query({
      query: ({ page=0, size=10, q='', status='ALL', sub='ALL', sort='name,asc' } = {}) => {
        // status -> active flag mapping
        const active =
          status === 'ALL' ? undefined :
          status === 'ACTIVE' ? true :
          status === 'INACTIVE' ? false : undefined;

        // sub -> ACTIVE | INACTIVE | EXPIRED | '' (server expects '' or missing for ALL)
        const subParam = (sub && sub !== 'ALL') ? sub : '';

        return {
          url: '/admin/tenants',
          params: { page, size, q, sort, sub: subParam, active },
        };
      },
      transformResponse: (r) => ({
        items: Array.isArray(r?.content) ? r.content : [],
        page: r?.page ?? 0,
        size: r?.size ?? 10,
        total: r?.totalElements ?? 0,
        totalPages: r?.totalPages ?? 0,
        hasNext: r?.hasNext ?? false,
      }),
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((t) => ({ type: 'Tenants', id: t.id })),
              { type: 'Tenants', id: 'LIST' },
            ]
          : [{ type: 'Tenants', id: 'LIST' }],
    }),

    // NEW: tenant profile data
    getTenant: builder.query({
      query: (id) => `/admin/tenants/${id}`,
      providesTags: (_res, _err, id) => [{ type: 'Tenants', id }],
    }),

    updateTenant: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/admin/tenants/${id}`,
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'Tenants', id },
        { type: 'Tenants', id: 'LIST' },
        'AdminSummary',
      ],
    }),


    upsertSubscription: builder.mutation({
      query: (body) => ({
        url: '/admin/subscription',
        method: 'PUT',
        body, // { tenantId, startsAt, endsAt, status }
      }),
      invalidatesTags: ['AdminSummary', 'SubBreakdown'],
    }),

    extendSubscription: builder.mutation({
      query: (body) => ({
        url: '/admin/subscription/extend',
        method: 'PUT',
        body, // { tenantId, days }
      }),
      invalidatesTags: ['AdminSummary', 'SubBreakdown', 'Billing'],
    }),


    //new getfieldenginner and getcustomers
    getTenantCustomers: builder.query({
      query: ({ tenantId, page = 0, size = 10, q = '', hasPortal, sort = 'id,desc' }) => ({
        url: `/admin/tenants/${tenantId}/customers`,
        params: { page, size, q, sort, hasPortal },
      }),
      transformResponse: (r) => ({
        items: Array.isArray(r?.content)
          ? r.content.map((c) => ({
              id: c?.id,
              name: c?.name ?? '',
              email: c?.email ?? '',
              mobile: c?.mobile ?? '',
              address: c?.address ?? '',
              portalUserId: c?.portalUserId ?? null,
              portalUserEmail: c?.portalUserEmail ?? null,
              portalUserDisplayName: c?.portalUserDisplayName ?? null,
            }))
          : [],
        total: r?.totalElements ?? 0,
        page: r?.number ?? 0,
        size: r?.size ?? 10,
        totalPages: r?.totalPages ?? 0,
      }),
      providesTags: (res, _err, args) =>
        res?.items
          ? [
              ...res.items.map((c) => ({ type: 'TenantCustomers', id: c.id })),
              { type: 'TenantCustomers', id: `LIST:${args.tenantId}` },
            ]
          : [{ type: 'TenantCustomers', id: `LIST:${args.tenantId}` }],
    }),

    // Field Engineers of a tenant (optional status filter, q matches FE user name/email)
    getTenantFieldEngineers: builder.query({
      query: ({ tenantId, page = 0, size = 10, q = '', status = 'ALL', sort = 'id,desc' }) => ({
        url: `/admin/tenants/${tenantId}/field-engineers`,
        params: { page, size, q, status, sort },
      }),
      transformResponse: (r) => ({
        items: Array.isArray(r?.content)
          ? r.content.map((fe) => ({
              id: fe?.id,
              status: fe?.status ?? 'AVAILABLE',
              userId: fe?.userId ?? null,
              userName: fe?.userName ?? '',
              userEmail: fe?.userEmail ?? '',
            }))
          : [],
        total: r?.totalElements ?? 0,
        page: r?.number ?? 0,
        size: r?.size ?? 10,
        totalPages: r?.totalPages ?? 0,
      }),
      providesTags: (res, _err, args) =>
        res?.items
          ? [
              ...res.items.map((fe) => ({ type: 'TenantFEs', id: fe.id })),
              { type: 'TenantFEs', id: `LIST:${args.tenantId}` },
            ]
          : [{ type: 'TenantFEs', id: `LIST:${args.tenantId}` }],
    }),

    updateBackOfficeProfile: builder.mutation({
      // args: { userId, tenantId?, code?, name?, displayName?, email? }
      query: ({ userId, ...body }) => ({
        url: `/admin/users/backoffice/${userId}`,
        method: 'PATCH',
        body, // { tenantId?, code?, name?, displayName?, email? }
        responseHandler: 'text',
      }),
      invalidatesTags: ['Tenants', 'Users', 'AdminSummary'],
    }),

    /* Tenants Deletions*/
    previewTenantDeletion: builder.query({
      query: (tenantId) => `/admin/tenants/${tenantId}/delete-preview`,
    }),

    deleteTenant: builder.mutation({
      query: ({ id, deleteOrphanUsers = true }) => ({
        url: `/admin/tenants/${id}?deleteOrphanUsers=${!!deleteOrphanUsers}`,
        method: 'DELETE',
        responseHandler: 'text',
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Tenants', id }, { type: 'Tenants', id: 'LIST' }],
    }),

    /* NEW deletes */
    deleteCustomer: builder.mutation({
      query: ({ id, tenantId, deletePortalUserIfOrphan = true }) => ({
        url: `/admin/customers/${id}?deletePortalUserIfOrphan=${!!deletePortalUserIfOrphan}`,
        method: 'DELETE',
        responseHandler: 'text',
      }),
      invalidatesTags: (_r, _e, { tenantId, id }) => [
        { type: 'TenantCustomers', id }, { type: 'TenantCustomers', id: `LIST:${tenantId}` },
      ],
    }),
    deleteFieldEngineer: builder.mutation({
      query: ({ id, tenantId, deleteUserIfOrphan = true }) => ({
        url: `/admin/field-engineers/${id}?deleteUserIfOrphan=${!!deleteUserIfOrphan}`,
        method: 'DELETE',
        responseHandler: 'text',
      }),
      invalidatesTags: (_r, _e, { tenantId, id }) => [
        { type: 'TenantFEs', id }, { type: 'TenantFEs', id: `LIST:${tenantId}` },
      ],
    }),
    

  }),


  overrideExisting: true,
})

export const {
  /* Dashboard / analytics */
  useGetAdminSummaryQuery,
  useGetSubscriptionBreakdownQuery,
  useGetTenantSignupsQuery,
  useGetHealthQuery,
  useGetRevenueSeriesQuery,

  /* Exports */
  useGetUsersCsvQuery,
  useGetTenantsCsvQuery,

  /* Users & Back Office */
  useCreateBackOfficeMutation,
  useGetUsersQuery,
  useUpdateUserMutation,
  useDisableUserMutation,
  useInviteUserMutation,
  useResetPasswordMutation,
  useAddUserRoleMutation,
  useRemoveUserRoleMutation,

  /* Email templates */
  useGetEmailTemplatesQuery,
  useUpsertEmailTemplateMutation,
  useRenderEmailTemplateMutation,

  /* Impersonation */
  useGetImpersonationTokenMutation,

  /* Office Summary */
  useGetOfficeSummaryQuery,

  /* Tenants */
  useGetTenantsQuery,
  useGetTenantQuery,
  useUpdateTenantMutation,
  useUpsertSubscriptionMutation,
  useExtendSubscriptionMutation,
  // NEW hooks
  useGetTenantCustomersQuery,
  useGetTenantFieldEngineersQuery,
  useUpdateBackOfficeProfileMutation,
  // Deletions
  usePreviewTenantDeletionQuery,
  useDeleteTenantMutation,
  useDeleteCustomerMutation,
  useDeleteFieldEngineerMutation,
} = adminApi
