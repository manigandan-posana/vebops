import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, Container, useMediaQuery, useTheme } from "@mui/material";
import Topbar from "../components/Topbar";
import Sidebar, { SIDEBAR_WIDTH } from "../components/Sidebar";
import Assigned from "../../views/fe/Assigned";
import JobDetail from "../../views/fe/JobDetail";

const items = [{ to: "/fe/assigned", label: "Assigned Jobs" }];

export default function FELayout() {
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
              <Route path="/" element={<Navigate to="assigned" replace />} />
              <Route path="assigned" element={<Assigned />} />
              <Route path="job/:id" element={<JobDetail />} />
            </Routes>
          </Container>
        </Box>
      </Box>
    </Box>
  );
}
