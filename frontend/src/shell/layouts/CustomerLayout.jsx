import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";
import CProposals from "../../views/customer/Proposals";
import Invoices from "../../views/customer/Invoices";

const items = [
  { to: "/customer/proposals", label: "Proposals" },
  { to: "/customer/invoices", label: "Invoices" },
];

export default function CustomerLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-light">
      <Sidebar items={items} open={open} onClose={() => setOpen(false)} />
      <Topbar onMenuClick={() => setOpen(true)} />
      <main className="p-4 sm:p-6 lg:pl-[18rem] lg:pr-8 lg:py-8 border-t lg:border-t-0 lg:border-l border-slate-200">
        <Routes>
          <Route path="/" element={<Navigate to="proposals" replace />} />
          <Route path="proposals" element={<CProposals />} />
          <Route path="invoices" element={<Invoices />} />
        </Routes>
      </main>
    </div>
  );
}
