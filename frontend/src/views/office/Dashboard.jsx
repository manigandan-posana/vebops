import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Alert,
  Paper,
} from '@mui/material';
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import TaskRoundedIcon from '@mui/icons-material/TaskRounded';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded';
import { useGetOfficeSummaryQuery } from '../../features/admin/adminApi';
import { useGetActivityQuery } from '../../features/office/officeApi';

const numberFormatter = new Intl.NumberFormat('en-IN');
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const formatNumber = (value) => numberFormatter.format(Number.isFinite(+value) ? +value : 0);
const formatCurrency = (value) => {
  const num = typeof value === 'number' ? value : Number(value ?? 0);
  return currencyFormatter.format(Number.isFinite(num) ? num : 0);
};

const MetricCard = ({ icon, label, hint, value, tone = 'text.primary', loading = false }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'primary.light',
            color: 'primary.contrastText',
            boxShadow: '0 12px 24px rgba(27,77,140,0.18)',
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
            {label}
          </Typography>
          <Typography variant="h5" sx={{ mt: 0.5, color: tone }}>
            {loading ? <Skeleton width={120} /> : value}
          </Typography>
          {hint && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {hint}
            </Typography>
          )}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

const SectionCard = ({ title, action, children }) => (
  <Card>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {title}
        </Typography>
        {action && (
          <Typography variant="caption" color="text.secondary">
            {action}
          </Typography>
        )}
      </Stack>
      {children}
    </CardContent>
  </Card>
);

const StatusItem = ({ label, value, color = 'primary', loading = false }) => (
  <Paper
    variant="outlined"
    sx={{
      borderRadius: 3,
      px: 2.5,
      py: 1.5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}
  >
    <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.4 }}>
      {label}
    </Typography>
    {loading ? (
      <Skeleton width={40} />
    ) : (
      <Chip
        label={formatNumber(value)}
        color={color === 'default' ? 'default' : color}
        variant={color === 'default' ? 'outlined' : 'filled'}
        sx={{
          fontWeight: 600,
          borderRadius: 2,
          ...(color === 'default'
            ? { borderColor: 'divider', bgcolor: 'background.default' }
            : {}),
        }}
      />
    )}
  </Paper>
);

const ActivityStatus = ({ text }) => {
  if (!text) {
    return <Chip label="—" size="small" variant="outlined" />;
  }
  return (
    <Chip
      label={text}
      color="success"
      size="small"
      variant="filled"
      sx={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.4 }}
    />
  );
};

const formatTimestamp = (value) => {
  try {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  } catch {
    return String(value ?? '—');
  }
};

export default function OfficeDashboard () {
  const { data: summary, isLoading: summaryLoading, isError: summaryError, error: summaryErrorData } = useGetOfficeSummaryQuery();
  const { data: activity = [], isLoading: activityLoading, isError: activityError, error: activityErrorData } = useGetActivityQuery(15);

  const activityRows = Array.isArray(activity) ? activity : [];

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" fontWeight={600} color="text.primary">
          Operations dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Monitor today&apos;s workload, invoicing pipeline and recent account activity.
        </Typography>
      </Box>

      {summaryError && (
        <Alert severity="error" variant="outlined">
          Unable to load KPIs: {summaryErrorData?.data?.message || summaryErrorData?.error || 'Unknown error'}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} xl={3}>
          <MetricCard
            icon={<TaskRoundedIcon fontSize="small" />}
            label="New service requests"
            hint="Awaiting triage or assignment"
            value={formatNumber(summary?.newServiceRequests)}
            loading={summaryLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <MetricCard
            icon={<AccessTimeRoundedIcon fontSize="small" />}
            label="In-progress SRs"
            hint="Technicians currently working"
            value={formatNumber(summary?.inProgressServiceRequests)}
            loading={summaryLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <MetricCard
            icon={<AssignmentTurnedInRoundedIcon fontSize="small" />}
            label="Assigned work orders"
            hint="Scheduled and ready for execution"
            value={formatNumber(summary?.assignedWorkOrders)}
            loading={summaryLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <MetricCard
            icon={<CurrencyRupeeRoundedIcon fontSize="small" />}
            label="Outstanding receivables"
            hint="Invoices sent but not yet paid"
            value={formatCurrency(summary?.outstandingReceivables)}
            tone="success.main"
            loading={summaryLoading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={4}>
          <SectionCard title="Service request health" action="Last 30 days">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <StatusItem label="New" value={summary?.newServiceRequests} loading={summaryLoading} color="info" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <StatusItem label="In progress" value={summary?.inProgressServiceRequests} loading={summaryLoading} color="primary" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <StatusItem label="Completed" value={summary?.completedServiceRequests} loading={summaryLoading} color="success" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <StatusItem label="Closed" value={summary?.closedServiceRequests} loading={summaryLoading} color="default" />
              </Grid>
            </Grid>
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <SectionCard title="Proposal pipeline">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <StatusItem label="Draft" value={summary?.draftProposals} loading={summaryLoading} color="default" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <StatusItem label="Sent" value={summary?.sentProposals} loading={summaryLoading} color="info" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <StatusItem label="Approved" value={summary?.approvedProposals} loading={summaryLoading} color="success" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <StatusItem label="Rejected" value={summary?.rejectedProposals} loading={summaryLoading} color="error" />
              </Grid>
            </Grid>
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <SectionCard title="Invoice status" action={`Revenue: ${formatCurrency(summary?.totalRevenue)}`}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <StatusItem label="Draft" value={summary?.draftInvoices} loading={summaryLoading} color="default" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <StatusItem label="Sent" value={summary?.sentInvoices} loading={summaryLoading} color="info" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <StatusItem label="Paid" value={summary?.paidInvoices} loading={summaryLoading} color="success" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <StatusItem label="Overdue" value={summary?.overdueInvoices} loading={summaryLoading} color="warning" />
              </Grid>
            </Grid>
          </SectionCard>
        </Grid>
      </Grid>

      <SectionCard
        title="Recent activity"
        action={
          <Stack direction="row" alignItems="center" spacing={1} color="text.secondary">
            <ChecklistRoundedIcon fontSize="small" />
            <Typography variant="caption">Last 15 events</Typography>
          </Stack>
        }
      >
        {activityError && (
          <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
            Failed to load activity: {activityErrorData?.data?.message || activityErrorData?.error || 'Unknown error'}
          </Alert>
        )}

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, maxHeight: 420 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>Entity</TableCell>
                <TableCell>Event</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Tenant</TableCell>
                <TableCell align="right">Reference</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activityLoading &&
                [...Array(5)].map((_, idx) => (
                  <TableRow key={`skeleton-${idx}`}>
                    <TableCell colSpan={6}>
                      <Stack direction="row" spacing={2}>
                        <Skeleton width={160} />
                        <Skeleton width={200} />
                        <Skeleton width={120} />
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}

              {!activityLoading && activityRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Nothing yet. Complete a work order or send an invoice to start building your activity trail.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {activityRows.map((row) => (
                <TableRow key={`${row?.entity}-${row?.id}-${row?.timestamp}`} hover>
                  <TableCell>{formatTimestamp(row?.timestamp)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {row?.entity || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{row?.event || '—'}</TableCell>
                  <TableCell>
                    <ActivityStatus text={row?.status} />
                  </TableCell>
                  <TableCell>{row?.tenantName || row?.tenantId || '—'}</TableCell>
                  <TableCell align="right">{row?.id ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>

      {summary?.overdueInvoices > 0 && (
        <Alert
          severity="warning"
          icon={<WarningAmberRoundedIcon fontSize="small" />}
          sx={{ borderRadius: 3, alignItems: 'flex-start' }}
        >
          <Typography variant="subtitle2" fontWeight={600}>
            Follow up on overdue invoices
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {formatNumber(summary?.overdueInvoices)} invoice{summary?.overdueInvoices === 1 ? '' : 's'} have been in <strong>Sent</strong> status for more than 30 days. Call the customer or resend the invoice with updated payment instructions.
          </Typography>
        </Alert>
      )}
    </Stack>
  );
}
