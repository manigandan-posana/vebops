// features/fe/feApi.js
import { baseApi } from '../../api/baseApi'
import { requireFields } from '../../api/error'

export const feApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    // expects { feId }
    getAssigned: b.query({
      query: ({ feId }) => ({
        url: '/fe/assigned',
        method: 'GET',
        params: { feId }
      }),
      // Backend returns bare List<WorkOrder>; normalize to array
      transformResponse: (res) =>
        Array.isArray(res) ? res : (res?.items || []),
      providesTags: (result) =>
        result
          ? [
              ...result.map(w => ({ type: 'WorkOrders', id: w.id })),
              { type: 'WorkOrders', id: 'LIST' },
            ]
          : [{ type: 'WorkOrders', id: 'LIST' }],
    }),

    // body must be { status, byFeId, remarks, photoUrl }
    postProgress: b.mutation({
      async queryFn (payload, _api, _extra, baseQuery) {
        const { woId, status, byFeId, remarks, photoUrl } = payload || {}
        try {
          requireFields({ woId, status, byFeId }, ['woId', 'status', 'byFeId'])
        } catch (e) {
          return { error: { status: 0, data: { message: e.message } } }
        }
        const res = await baseQuery({
          url: `/fe/wo/${woId}/progress`,
          method: 'POST',
          body: {
            status,
            byFeId,
            remarks: remarks || '',
            photoUrl: photoUrl || null
          }
        })
        return res.error ? { error: res.error } : { data: true }
      },
      invalidatesTags: (_res, _err, arg) => [
        { type: 'WorkOrders', id: arg?.woId },
        { type: 'WorkOrders', id: 'LIST' },
      ],
    }),

    getCompletionReportPdf: b.query({
      query: (id) => ({
        url: `/fe/wo/${id}/completion-report.pdf`,
        method: 'GET',
        responseHandler: (response) => response.blob()
      })
    }),

    getWorkOrderDetail: b.query({
      query: (id) => ({ url: `/fe/wo/${id}`, method: 'GET' }),
      providesTags: (_r, _e, id) => [{ type: 'WorkOrders', id }]
    }),
  }),
  overrideExisting: true
})

// (tip) ensure baseApi.createApi({ tagTypes: ['WorkOrders'] }) at root
export const {
  useGetAssignedQuery,
  useLazyGetCompletionReportPdfQuery,
  usePostProgressMutation,
  useGetWorkOrderDetailQuery,
} = feApi
