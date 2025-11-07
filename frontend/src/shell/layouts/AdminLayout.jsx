import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";
import AdminDashboard from "../../views/admin/Dashboard";
import Tenants from "../../views/admin/Tenants";
import TenantProfile from "../../views/admin/TenantProfile";
import Subscriptions from "../../views/admin/Subscriptions"; // NEW

const items = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/tenants", label: "Tenants" },
  { to: "/admin/subscriptions", label: "Subscriptions" }, // NEW
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-light">
      <Sidebar items={items} open={open} onClose={() => setOpen(false)} />
      <Topbar onMenuClick={() => setOpen(true)} />
      {/* Content: full width on mobile, shifted on desktop with gutter */}
      <main className="p-4 sm:p-6 lg:pl-[18rem] lg:pr-8 lg:py-8 bg-background-light border-t lg:border-t-0 lg:border-l border-slate-200">
        <Routes>
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="tenants" element={<Tenants />} />
          <Route path="tenants/:id" element={<TenantProfile />} />
          <Route path="subscriptions" element={<Subscriptions />} /> {/* NEW */}
        </Routes>
      </main>
    </div>
  );
}
