import React from "react";
import { useGetAdminSummaryQuery, useGetTenantSignupsQuery } from "../../features/admin/adminApi";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
} from "@mui/material";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import CurrencyRupeeRoundedIcon from "@mui/icons-material/CurrencyRupeeRounded";

const StatCard = ({ icon, label, value, gradient }) => (
  <Card sx={{ borderRadius: 3, boxShadow: "0px 16px 40px rgba(16, 42, 67, 0.12)" }}>
    <CardContent>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            color: "primary.contrastText",
            backgroundImage: gradient,
            boxShadow: "0 12px 24px rgba(16, 42, 67, 0.18)",
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.6 }}>
            {label}
          </Typography>
          <Typography variant="h5" fontWeight={600} color="text.primary" sx={{ mt: 0.5 }}>
            {value}
          </Typography>
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

export default function AdminDashboard() {
  const { data: sum, isLoading: sumLoading } = useGetAdminSummaryQuery();
  const { data: signups30 } = useGetTenantSignupsQuery(30);

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" fontWeight={600}>
          Admin Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Welcome back, here&apos;s a summary of your application.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Total Tenants"
            value={sumLoading ? "—" : sum?.totalTenants ?? 0}
            icon={<GroupsRoundedIcon fontSize="small" />}
            gradient="linear-gradient(135deg, #3A6FB8 0%, #1B4D8C 100%)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Active Users"
            value={sumLoading ? "—" : sum?.activeUsers ?? 0}
            icon={<PeopleAltRoundedIcon fontSize="small" />}
            gradient="linear-gradient(135deg, #4BAEAE 0%, #0F7C7D 100%)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Signups (30d)"
            value={sumLoading ? "—" : sum?.signups30d ?? signups30 ?? 0}
            icon={<LoginRoundedIcon fontSize="small" />}
            gradient="linear-gradient(135deg, #8A8CF7 0%, #5458D6 100%)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Revenue (MTD)"
            value={sumLoading ? "—" : `${sum?.revenueMTD ?? 0}`}
            icon={<CurrencyRupeeRoundedIcon fontSize="small" />}
            gradient="linear-gradient(135deg, #F88282 0%, #D64562 100%)"
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
