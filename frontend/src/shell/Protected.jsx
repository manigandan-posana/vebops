import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LS_USER_KEY, LS_jwt_KEY, setCredentials } from '../features/auth/authSlice'

export default function Protected({ roles }){
  const auth = useSelector(s => s.auth)
  const dispatch = useDispatch()
  const location = useLocation()
  const [rehydrated, setRehydrated] = React.useState(() => Boolean(auth?.jwt))

  React.useEffect(() => {
    if (auth?.jwt) {
      if (!rehydrated) setRehydrated(true)
      return
    }
    if (rehydrated) return
    if (typeof localStorage === 'undefined') {
      setRehydrated(true)
      return
    }
    const storedJwt = localStorage.getItem(LS_jwt_KEY)
    if (storedJwt) {
      let storedUser = null
      try {
        const rawUser = localStorage.getItem(LS_USER_KEY)
        storedUser = rawUser ? JSON.parse(rawUser) : null
      } catch (err) {
        storedUser = null
      }
      dispatch(setCredentials({ jwt: storedJwt, user: storedUser }))
    }
    setRehydrated(true)
  }, [auth?.jwt, dispatch, rehydrated])
  const isAdmin = auth?.role === 'ADMIN'

  if (!auth?.jwt) {
    if (!rehydrated) return null
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (roles && roles.length && !roles.includes(auth?.role)) {
    return <Navigate to="/login" replace />
  }
  // Subscription lock
  if (auth?.user && auth?.user.subscriptionActive === false && !isAdmin) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-2">Subscription Inactive</h2>
          <p className="text-slate-600 mb-4">Your tenant subscription is inactive. Please contact your administrator.</p>
        <a href="/login" className="btn-secondary">Back to Login</a>
        </div>
      </div>
    )
  }
  return <Outlet/>
}