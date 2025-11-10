import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, Container, useMediaQuery, useTheme } from "@mui/material";
import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";
import CProposals from "../../views/customer/Proposals";
import Invoices from "../../views/customer/Invoices";

const items = [
  { to: "/customer/proposals", label: "Proposals" },
  { to: "/customer/invoices", label: "Invoices" },
];

const drawerWidth = 280;

export default function CustomerLayout() {
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
              <Route path="/" element={<Navigate to="proposals" replace />} />
              <Route path="proposals" element={<CProposals />} />
              <Route path="invoices" element={<Invoices />} />
            </Routes>
          </Container>
        </Box>
      </Box>
    </Box>
  );
}
