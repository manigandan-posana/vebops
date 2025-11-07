import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLoginMutation } from '../../features/auth/authApi'
import { useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(4, 'Password required')
})

export default function Login(){
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })
  const [login, { isLoading, error }] = useLoginMutation()
  const nav = useNavigate()
  const loc = useLocation()
  const auth = useSelector(s => s.auth)

  // match the reference background photo (replace if you have your own asset)
  const SIDE_IMAGE =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuC86RzcYV65UFbzxDZ1vvNAgySZHvyt2tx7Ddpxc_ivtf8JIFNavoztyymZ6_NltC7eLXH2ysy06H5qs_swubQxL_N8eTXQMmkpnC0kKG1bZfrGJU6_89_7s8-fGS2Y9JzhQ-D7lxZ0ICBQ_nIkbfzEN4RuNq_0FvqQ6gKvMXjYSTNX-UP17KNHmxGoSyZGpYxq7CLbMyIs1L7aehOX0rmINMN04eR9UQaEC8s0-dYzwwlzdSQIoSuUPWXHOpaUdPjDQ_3MOp1Ft1Y'

  const onSubmit = async (data) => {
    const res = await login(data)
    if (res?.error) return
    const role = res?.data?.role || auth?.role || 'BACK_OFFICE'
    if (role === 'ADMIN') nav('/admin/dashboard', { replace: true })
    else if (role === 'BACK_OFFICE' || role === 'OFFICE') nav('/office/dashboard', { replace: true })
    else if (role === 'FE') nav('/fe/assigned', { replace: true })
    else if (role === 'CUSTOMER') nav('/customer/proposals', { replace: true })
    else nav((loc.state?.from?.pathname) || '/office/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-white grid lg:grid-cols-12">
      {/* LEFT: form panel */}
      <section className="lg:col-span-5 xl:col-span-4 flex">
        <div className="w-full flex items-center">
          <div className="w-full max-w-sm sm:max-w-md mx-auto px-6 sm:px-8 lg:pl-16 lg:pr-10 py-12">
            {/* Brand row */}
            <div className="flex items-center gap-3">
              {/* If you have a wordmark image, replace this span with an <img> */}
              <img src='/VebOps.png' className='w-40 object-contain'/>
            </div>

            <h1 className="mt-8 text-3xl font-bold tracking-tight text-slate-900">
              Sign in to your account
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Welcome back! Please enter your details to access your Vebops dashboard.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700">Email address</label>
                <input
                  className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-[#1173d4] focus:ring-2 focus:ring-[#1173d4] sm:text-sm"
                  placeholder="you@company.com"
                  autoComplete="email"
                  {...register('email')}
                />
                {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <input
                  type="password"
                  className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-[#1173d4] focus:ring-2 focus:ring-[#1173d4] sm:text-sm"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password')}
                />
                {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>}
              </div>

              {error && (
                <div className="text-red-700 text-sm bg-red-50 border border-red-200 p-2 rounded-md">
                  Login failed
                </div>
              )}

              <button
                className="flex w-full justify-center rounded-md bg-[#1173d4] py-2.5 px-4 text-sm font-medium text-white shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-transparent focus:ring-offset-2 disabled:opacity-70"
                disabled={isLoading || isSubmitting}
              >
                {(isLoading || isSubmitting) ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

          </div>
        </div>
      </section>

      {/* RIGHT: full-bleed photo */}
      <aside className="relative hidden lg:block lg:col-span-7 xl:col-span-8">
        <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-cyan-100 to-blue-200 opacity-50" />
        <img
          src={SIDE_IMAGE}
          alt="Power lines under a blue sky"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
      </aside>
    </div>
  )
}
