// features/fe/feApi.js
import { baseApi } from '../../api/baseApi'
import { requireFields } from '../../api/error'
import { normaliseArray } from '../../utils/apiShape'

export const feApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    // accepts optional { feId }; when omitted the backend resolves from the session
    getAssigned: b.query({
      query: ({ feId } = {}) => ({
        url: '/fe/assigned',
        method: 'GET',
        params: feId ? { feId } : undefined
      }),
      transformResponse: (res) => normaliseArray(res),
      providesTags: (result) =>
        result
          ? [
              ...result.map(w => ({ type: 'WorkOrders', id: w.id })),
              { type: 'WorkOrders', id: 'LIST' },
            ]
          : [{ type: 'WorkOrders', id: 'LIST' }],
    }),

    getDashboard: b.query({
      query: () => ({ url: '/fe/dashboard', method: 'GET' }),
      transformResponse: (res) => ({
        totalAssignments: Number(res?.totalAssignments ?? res?.assigned ?? 0),
        inProgress: Number(res?.inProgress ?? 0),
        dueToday: Number(res?.dueToday ?? 0),
        overdue: Number(res?.overdue ?? 0),
        awaitingMaterials: Number(res?.awaitingMaterials ?? 0),
        lastProgressAt: res?.lastProgressAt ?? null,
      }),
      providesTags: ['WorkOrders'],
    }),

    // body must be { status, byFeId, remarks, photoUrl?, photoName?, photoContentType?, photoSize?, photoData? }
    postProgress: b.mutation({
      async queryFn (payload, _api, _extra, baseQuery) {
        const { woId, status, byFeId, remarks, photoUrl, photoFile } = payload || {}
        try {
          requireFields({ woId, status }, ['woId', 'status'])
        } catch (e) {
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
        const res = await baseQuery({
          url: `/fe/wo/${woId}/progress`,
          method: 'POST',
          body: {
            status,
            byFeId: byFeId || undefined,
            remarks: remarks || '',
            photoUrl: photoUrl || null,
            ...photoPayload
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

    getProgressAttachment: b.query({
      query: ({ woId, progressId, attachmentId }) => ({
        url: `/fe/wo/${woId}/progress/${progressId}/attachments/${attachmentId}`,
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
  useGetDashboardQuery,
  useLazyGetCompletionReportPdfQuery,
  usePostProgressMutation,
  useGetWorkOrderDetailQuery,
  useLazyGetProgressAttachmentQuery,
} = feApi
