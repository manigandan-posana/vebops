import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";
import OfficeDashboard from "../../views/office/Dashboard";
// Note: Intake and Inventory pages have been removed. Import the new Service and Kits pages instead.
import Service from "../../views/office/Service";
import ServiceHistory from "../../views/office/ServiceHistory";
import ServiceDetail from "../../views/office/ServiceDetail";
import Kits from "../../views/office/Kits";
import Preview from "../../views/office/Preview";
import Users from "../../views/office/Users";
import Operations from "../../views/office/Operations";
import Company from "../../views/office/Company";

// Define the sidebar navigation items. Inventory and the old Intake page have been
// removed. A dedicated Service page and Kits management page have been added.
// Navigation items for the office. Inventory/intake routes have been removed.
const items = [
  { to: "/office/dashboard", label: "Activity" },
  { to: "/office/service", label: "New Service" },
  { to: "/office/service-history", label: "Service History" },
  { to: "/office/kits", label: "Kits" },
  { to: "/office/company", label: "Company" },
  { to: "/office/operations", label: "Operations" },
  { to: "/office/users", label: "Users" },
];

export default function OfficeLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-light">
      <Sidebar items={items} open={open} onClose={() => setOpen(false)} />
      <Topbar onMenuClick={() => setOpen(true)} />
      <main className="lg:pl-[16rem] border-t lg:border-t-0 lg:border-l border-slate-200">
        <Routes>
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<OfficeDashboard />} />
          {/* Service creation page */}
          <Route path="service" element={<Service />} />
          {/* Service history listing */}
          <Route path="service-history" element={<ServiceHistory />} />
          {/* Service detail */}
          <Route path="service-history/:id" element={<ServiceDetail />} />
          {/* Kit management page */}
          <Route path="kits" element={<Kits />} />
          {/* Company profile page */}
          <Route path="company" element={<Company />} />
          {/* Invoice / Proforma preview */}
          <Route path="preview" element={<Preview />} />
          <Route path="preview-proforma" element={<Preview />} />
          <Route path="users" element={<Users />} />
          <Route path="operations" element={<Operations />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
