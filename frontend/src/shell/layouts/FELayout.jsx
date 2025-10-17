import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";
import Assigned from "../../views/fe/Assigned";
import JobDetail from "../../views/fe/JobDetail";

const items = [{ to: "/fe/assigned", label: "Assigned Jobs" }];

export default function FELayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <Sidebar items={items} open={open} onClose={() => setOpen(false)} />
      <Topbar onMenuClick={() => setOpen(true)} />
      <main className="p-4 sm:p-6 lg:pl-[18rem] lg:pr-8 lg:py-8 border-t lg:border-t-0 lg:border-l border-slate-200">
        <Routes>
          <Route path="/" element={<Navigate to="assigned" replace />} />
          <Route path="assigned" element={<Assigned />} />
          <Route path="job/:id" element={<JobDetail />} />
        </Routes>
      </main>
    </div>
  );
}
