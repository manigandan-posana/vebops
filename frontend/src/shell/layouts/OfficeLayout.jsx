import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";
import OfficeDashboard from "../../views/office/Dashboard";
import Intake from "../../views/office/Intake";
import Inventory from "../../views/office/Inventory";
import Users from "../../views/office/Users";
import Operations from "../../views/office/Operations";

const items = [
  { to: "/office/dashboard", label: "Activity" },
  { to: "/office/intake", label: "Service" },
  { to: "/office/operations", label: "Operations" },
  { to: "/office/inventory", label: "Inventory" },
  { to: "/office/users", label: "Users" },
];

export default function OfficeLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <Sidebar items={items} open={open} onClose={() => setOpen(false)} />
      <Topbar onMenuClick={() => setOpen(true)} />
      <main className="p-4 sm:p-6 lg:pl-[18rem] lg:pr-8 lg:py-8 border-t lg:border-t-0 lg:border-l border-slate-200">
        <Routes>
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<OfficeDashboard />} />
          <Route path="intake" element={<Intake />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="users" element={<Users />} />
          <Route path="operations" element={<Operations />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
