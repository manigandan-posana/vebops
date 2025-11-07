import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from '../views/auth/Login'
import AdminLayout from './layouts/AdminLayout'
import OfficeLayout from './layouts/OfficeLayout'
import FELayout from './layouts/FELayout'
import CustomerLayout from './layouts/CustomerLayout'
import Protected from './Protected'

export default function App(){
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login/>} />
      
      <Route element={<Protected roles={['ADMIN']}/>}>
        <Route path="/admin/*" element={<AdminLayout/>} />
      </Route>

      <Route element={<Protected roles={['BACK_OFFICE','OFFICE']} />}>
        <Route path="/office/*" element={<OfficeLayout/>} />
      </Route>

      <Route element={<Protected roles={['FE']} />}>
        <Route path="/fe/*" element={<FELayout/>} />
      </Route>

      <Route element={<Protected roles={['CUSTOMER']} />}>
        <Route path="/customer/*" element={<CustomerLayout/>} />
      </Route>

      <Route path="*" element={<div className="p-6">Not Found</div>} />
    </Routes>
  )
}