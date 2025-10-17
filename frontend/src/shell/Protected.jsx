import React from 'react'
import { useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

export default function Protected({ roles }){
  const auth = useSelector(s => s.auth)
  const location = useLocation()
  const isAdmin = auth?.role === 'ADMIN'

  if (!auth?.jwt) {
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
          <a href="/login" className="btn">Back to Login</a>
        </div>
      </div>
    )
  }
  return <Outlet/>
}