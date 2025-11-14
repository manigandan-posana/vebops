import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, Container, useMediaQuery, useTheme } from "@mui/material";
import Topbar from "../components/Topbar";
import Sidebar, { SIDEBAR_WIDTH } from "../components/Sidebar";
import OfficeDashboard from "../../views/office/Dashboard";
import Service from "../../views/office/Service";
import ServiceHistory from "../../views/office/ServiceHistory";
import ServiceDetail from "../../views/office/ServiceDetail";
import ProposalHistory from "../../views/office/ProposalHistory";
import Kits from "../../views/office/Kits";
import Preview from "../../views/office/Preview";
import Users from "../../views/office/Users";
import WorkOrders from "../../views/office/WorkOrders";
import Company from "../../views/office/Company";
import PurchaseOrders from "../../views/office/PurchaseOrders";
import PurchaseOrderCreate from "../../views/office/purchaseOrders/PurchaseOrderCreate";

const items = [
  { to: "/office/dashboard", label: "Activity" },
  { to: "/office/service", label: "New Service" },
  { to: "/office/service-history", label: "Service History" },
  { to: "/office/proposal-history", label: "Proposal History" },
  { to: "/office/purchase-orders", label: "Purchase Orders" },
  { to: "/office/kits", label: "Kits" },
  { to: "/office/company", label: "Company" },
  { to: "/office/work-orders", label: "Work Orders" },
  { to: "/office/users", label: "Users" },
];

export default function OfficeLayout() {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Sidebar items={items} open={open} onClose={() => setOpen(false)} />
      <Box
        sx={{
          ml: isDesktop ? `${SIDEBAR_WIDTH}px` : 0,
          transition: theme.transitions.create("margin"),
        }}
      >
        <Topbar onMenuClick={() => setOpen(true)} />
        <Box
          component="main"
          sx={{
            py: 2,
            px: { xs: 1.25, sm: 2, lg: 3.5 },
          }}
        >
          <Container maxWidth="xl" disableGutters>
            <Routes>
              <Route path="/" element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<OfficeDashboard />} />
              <Route path="service" element={<Service />} />
              <Route path="service/:id" element={<ServiceDetail />} />
              <Route path="service-history" element={<ServiceHistory />} />
              <Route path="service-history/:id" element={<ServiceDetail />} />
              <Route path="proposal-history" element={<ProposalHistory />} />
              <Route path="purchase-orders" element={<PurchaseOrders />} />
              <Route path="purchase-orders/new" element={<PurchaseOrderCreate />} />
              <Route path="kits" element={<Kits />} />
              <Route path="company" element={<Company />} />
              <Route path="preview" element={<Preview />} />
              <Route path="preview-proforma" element={<Preview />} />
              <Route path="users" element={<Users />} />
              <Route path="work-orders" element={<WorkOrders />} />
              <Route path="operations" element={<Navigate to="../office/work-orders" replace />} />
              <Route path="*" element={<Navigate to="/office/dashboard" replace />} />
            </Routes>
          </Container>
        </Box>
      </Box>
    </Box>
  );
}
