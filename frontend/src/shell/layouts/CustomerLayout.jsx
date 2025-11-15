import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, Container, useMediaQuery, useTheme } from "@mui/material";
import Topbar from "../components/Topbar";
import Sidebar, { SIDEBAR_WIDTH } from "../components/Sidebar";
import CProposals from "../../views/customer/Proposals";
import WorkOrders from "../../views/customer/WorkOrders";
import WorkOrderDetail from "../../views/customer/WorkOrderDetail";
import Invoices from "../../views/customer/Invoices";

const items = [
  { to: "/customer/proposals", label: "Proposals" },
  { to: "/customer/work-orders", label: "Work Orders" },
  { to: "/customer/invoices", label: "Invoices" },
];

export default function CustomerLayout() {
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
              <Route path="/" element={<Navigate to="proposals" replace />} />
              <Route path="proposals" element={<CProposals />} />
              <Route path="work-orders" element={<WorkOrders />} />
              <Route path="work-orders/:id" element={<WorkOrderDetail />} />
              <Route path="invoices" element={<Invoices />} />
            </Routes>
          </Container>
        </Box>
      </Box>
    </Box>
  );
}
