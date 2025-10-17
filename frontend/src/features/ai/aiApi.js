import { baseApi } from '../../api/baseApi'

export const aiApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    generateEmail: b.mutation({
      query: (body) => ({ url: '/ai/generate-email', method: 'POST', body })
    })
  })
})

export const { useGenerateEmailMutation } = aiApi