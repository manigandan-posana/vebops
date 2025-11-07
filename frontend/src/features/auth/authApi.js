import { baseApi } from '../../api/baseApi'
import { setCredentials } from './authSlice'
import { requireFields } from '../../api/error'

export const authApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    login: b.mutation({
      async queryFn (body, _api, _extra, baseQuery) {
        try { requireFields(body, ['email','password']) } catch (e) {
          return { error: { status: 0, data: { message: e.message } } }
        }
        const res = await baseQuery({ url: '/auth/login', method: 'POST', body })
        return res.error ? { error: res.error } : { data: res.data }
      },
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          if (data?.jwt) {
            dispatch(setCredentials({ jwt: data.jwt, user: data.user || null }))
          } else if (typeof data === 'string') {
            dispatch(setCredentials({ jwt: data }))
          }
        } catch {}
      }
    }),
    forgotPassword: b.mutation({
      async queryFn (body, _api, _extra, baseQuery) {
        try { requireFields(body, ['email']) } catch (e) {
          return { error: { status: 0, data: { message: e.message } } }
        }
        const res = await baseQuery({ url: '/auth/forgot-password', method: 'POST', body })
        return res.error ? { error: res.error } : { data: res.data }
      }
    }),
    resetPassword: b.mutation({
      async queryFn (body, _api, _extra, baseQuery) {
        try { requireFields(body, ['jwt','newPassword']) } catch (e) {
          return { error: { status: 0, data: { message: e.message } } }
        }
        const res = await baseQuery({ url: '/auth/reset-password', method: 'POST', body })
        return res.error ? { error: res.error } : { data: res.data }
      }
    })
  })
})

export const { useLoginMutation, useForgotPasswordMutation, useResetPasswordMutation } = authApi
