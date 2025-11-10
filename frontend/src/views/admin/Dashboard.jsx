import React from "react";
import { useGetAdminSummaryQuery, useGetTenantSignupsQuery } from "../../features/admin/adminApi";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
  Divider,
  Chip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import CurrencyRupeeRoundedIcon from "@mui/icons-material/CurrencyRupeeRounded";

const StatCard = ({ icon, label, value, color = "primary" }) => (
  <Card sx={{ height: "100%" }}>
    <CardContent>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={(theme) => ({
            width: 48,
            height: 48,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            color: theme.palette[color].main,
            backgroundColor: alpha(theme.palette[color].main, 0.12),
          })}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
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
    <Stack spacing={5}>
      <Stack spacing={1.5}>
        <Typography variant="h4" fontWeight={600}>
          Admin overview
        </Typography>
        <Typography variant="body2" color="text.secondary">
          A quick snapshot of tenant health, user activity and revenue performance.
        </Typography>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Total Tenants"
            value={sumLoading ? "—" : sum?.totalTenants ?? 0}
            icon={<GroupsRoundedIcon fontSize="small" />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Active Users"
            value={sumLoading ? "—" : sum?.activeUsers ?? 0}
            icon={<PeopleAltRoundedIcon fontSize="small" />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Signups (30d)"
            value={sumLoading ? "—" : sum?.signups30d ?? signups30 ?? 0}
            icon={<LoginRoundedIcon fontSize="small" />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Revenue (MTD)"
            value={sumLoading ? "—" : `${sum?.revenueMTD ?? 0}`}
            icon={<CurrencyRupeeRoundedIcon fontSize="small" />}
            color="warning"
          />
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ borderStyle: "dashed", borderColor: (theme) => alpha(theme.palette.primary.main, 0.2) }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between" spacing={3}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Need deeper analytics?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Connect Looker Studio or download the latest tenant onboarding report for further analysis.
              </Typography>
            </Box>
            <Chip label="Insights coming soon" color="default" variant="outlined" />
          </Stack>
        </CardContent>
        <Divider />
        <CardContent>
          <Typography variant="caption" color="text.secondary">
            Export detailed reports from the Tenants tab to share with business stakeholders.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
