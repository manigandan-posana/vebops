import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, Container, useMediaQuery, useTheme } from "@mui/material";
import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";
import AdminDashboard from "../../views/admin/Dashboard";
import Tenants from "../../views/admin/Tenants";
import TenantProfile from "../../views/admin/TenantProfile";
import Subscriptions from "../../views/admin/Subscriptions";

const items = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/tenants", label: "Tenants" },
  { to: "/admin/subscriptions", label: "Subscriptions" },
];

const drawerWidth = 280;

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Sidebar items={items} open={open} onClose={() => setOpen(false)} />
      <Box sx={{ ml: isDesktop ? `${drawerWidth}px` : 0, transition: theme.transitions.create("margin") }}>
        <Topbar onMenuClick={() => setOpen(true)} />
        <Box component="main" sx={{ py: 4, px: { xs: 2, sm: 3, lg: 6 } }}>
          <Container maxWidth="xl" disableGutters>
            <Routes>
              <Route path="/" element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="tenants" element={<Tenants />} />
              <Route path="tenants/:id" element={<TenantProfile />} />
              <Route path="subscriptions" element={<Subscriptions />} />
            </Routes>
          </Container>
        </Box>
      </Box>
    </Box>
  );
}
