import React, { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import Modal from '../../shell/components/Modal';
import {
  useListWOsQuery,
  useWoAssignMutation,
  useWoCompleteMutation,
  useGetFieldEngineersQuery,
  useCreateWorkOrderFromRequestMutation,
  useGetServiceRequestsQuery,
  useListProposalsQuery,
  useProposalApproveMutation,
  useProposalRejectMutation,
  useWoTimelineQuery,
} from '../../features/office/officeApi';
import { focusNextOnEnter } from '../../utils/formNavigation';
import {
  Box,
  Stack,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardHeader,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  LinearProgress,
  IconButton,
  Tooltip,
  Divider,
  TextField,
  MenuItem,
  Alert,
  Link,
} from '@mui/material';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import AssignmentIndRoundedIcon from '@mui/icons-material/AssignmentIndRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import NoteAltRoundedIcon from '@mui/icons-material/NoteAltRounded';
import { alpha } from '@mui/material/styles';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'NEW', label: 'New' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

const STATUS_LABELS = {
  STARTED: 'Started',
  MATERIAL_RECEIVED: 'Material received',
  INSTALLATION_STARTED: 'Installation started',
  COMPLETED: 'Completed',
  ON_HOLD: 'On hold',
  RESUMED: 'Resumed',
};

const srParams = { status: 'NEW', size: 15 };
const proposalParams = { status: 'SENT', size: 20 };

const emptyArray = [];

export default function WorkOrders() {
  const [statusFilter, setStatusFilter] = useState('NEW');
  const [assignModal, setAssignModal] = useState({ open: false, wo: null });
  const [assignNote, setAssignNote] = useState('');
  const [poModal, setPoModal] = useState({ open: false, proposal: null });
  const [poNumber, setPoNumber] = useState('');
  const [poUrl, setPoUrl] = useState('');
  const [timelineModal, setTimelineModal] = useState({ open: false, wo: null });

  const woQueryParams = useMemo(
    () => (statusFilter === 'ALL' ? { size: 50, sort: 'updatedAt,desc' } : { status: statusFilter, size: 50, sort: 'updatedAt,desc' }),
    [statusFilter]
  );

  const { data: woData, isFetching: woLoading, refetch: refetchWos } = useListWOsQuery(woQueryParams);
  const { data: feData } = useGetFieldEngineersQuery({ status: 'AVAILABLE', size: 100 });
  const { data: srData, isFetching: srLoading, refetch: refetchSrs } = useGetServiceRequestsQuery(srParams);
  const { data: proposalData, isFetching: proposalLoading, refetch: refetchProposals } = useListProposalsQuery(proposalParams);

  const [assignWo] = useWoAssignMutation();
  const [completeWo, { isLoading: completing }] = useWoCompleteMutation();
  const [createWoFromRequest, { isLoading: creatingWO }] = useCreateWorkOrderFromRequestMutation();
  const [approveProposal, { isLoading: approving }] = useProposalApproveMutation();
  const [rejectProposal, { isLoading: rejecting }] = useProposalRejectMutation();

  const workOrders = useMemo(() => {
    if (Array.isArray(woData?.content)) return woData.content;
    if (Array.isArray(woData?.items)) return woData.items;
    if (Array.isArray(woData)) return woData;
    return emptyArray;
  }, [woData]);

  const fieldEngineers = useMemo(() => {
    if (Array.isArray(feData?.content)) return feData.content;
    if (Array.isArray(feData?.items)) return feData.items;
    if (Array.isArray(feData)) return feData;
    return emptyArray;
  }, [feData]);

  const serviceRequests = useMemo(() => {
    if (Array.isArray(srData?.content)) return srData.content;
    if (Array.isArray(srData?.items)) return srData.items;
    if (Array.isArray(srData)) return srData;
    return emptyArray;
  }, [srData]);

  const proposals = useMemo(() => {
    if (Array.isArray(proposalData?.content)) return proposalData.content;
    if (Array.isArray(proposalData?.items)) return proposalData.items;
    if (Array.isArray(proposalData)) return proposalData;
    return emptyArray;
  }, [proposalData]);

  const pendingProposals = proposals.filter((p) => p.status === 'SENT');

  const availableFEs = fieldEngineers.filter((fe) => (fe.status ? fe.status === 'AVAILABLE' : true));

  const openAssignModal = (wo) => {
    setAssignModal({ open: true, wo });
    setAssignNote('');
  };

  const closeAssignModal = () => {
    setAssignModal({ open: false, wo: null });
    setAssignNote('');
  };

  const openTimelineModal = (wo) => {
    setTimelineModal({ open: true, wo });
  };

  const closeTimelineModal = () => {
    setTimelineModal({ open: false, wo: null });
  };

  const openPoModal = (proposal) => {
    setPoModal({ open: true, proposal });
    setPoNumber('');
    setPoUrl('');
  };

  const closePoModal = () => {
    setPoModal({ open: false, proposal: null });
    setPoNumber('');
    setPoUrl('');
  };

  async function handleAssign(feId) {
    if (!assignModal.wo?.id || !feId) return;
    try {
      await assignWo({ id: assignModal.wo.id, feId, note: assignNote || undefined }).unwrap();
      toast.success('Work order assigned');
      closeAssignModal();
      refetchWos();
    } catch (err) {
      toast.error(String(err?.data?.message || err?.error || 'Unable to assign work order'));
    }
  }

  async function handleComplete(woId) {
    if (!woId) return;
    try {
      await completeWo({ woId }).unwrap();
      toast.success('Marked as completed');
      refetchWos();
    } catch (err) {
      toast.error(String(err?.data?.message || err?.error || 'Unable to complete work order'));
    }
  }

  async function handleCreateFromRequest(srId) {
    if (!srId) return;
    try {
      const res = await createWoFromRequest({ id: srId }).unwrap();
      const wan = typeof res === 'object' ? res?.wan || res?.code || (res?.id ? `#${res.id}` : null) : null;
      const label = wan || `#${srId}`;
      toast.success(`Work order ${label} created`);
      refetchWos();
      refetchSrs();
    } catch (err) {
      const message = String(err?.data?.message || err?.error || 'Unable to create work order');
      if (message.toLowerCase().includes('exist')) {
        toast.success('Work order already exists for this request');
        refetchWos();
      } else {
        toast.error(message);
      }
    }
  }

  async function handleApproveProposal() {
    if (!poModal.proposal?.id) return;
    try {
      await approveProposal({ id: poModal.proposal.id, poNumber, poUrl: poUrl || undefined }).unwrap();
      toast.success('Proposal approved. Work order created automatically.');
      closePoModal();
      refetchProposals();
      refetchSrs();
      refetchWos();
    } catch (err) {
      toast.error(String(err?.data?.message || err?.error || 'Unable to approve proposal'));
    }
  }

  async function handleRejectProposal(proposalId) {
    if (!proposalId) return;
    try {
      await rejectProposal({ id: proposalId }).unwrap();
      toast.success('Proposal rejected');
      refetchProposals();
    } catch (err) {
      toast.error(String(err?.data?.message || err?.error || 'Unable to reject proposal'));
    }
  }

  return (
    <Box>
      <Toaster position="top-right" />
      <Stack spacing={4}>
        <Stack spacing={1.5}>
          <Typography variant="h4" fontWeight={600} color="text.primary">
            Work orders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track proposals, convert approved requests and coordinate live jobs from one workspace.
          </Typography>
        </Stack>

        <Card>
          {woLoading && <LinearProgress />} 
          <CardHeader
            title={<Typography variant="h6">Active work orders</Typography>}
            subheader={
              <Typography variant="body2" color="text.secondary">
                {woLoading ? 'Refreshing data…' : `${workOrders.length} result${workOrders.length === 1 ? '' : 's'}`}
              </Typography>
            }
          />
          <CardContent>
            <Tabs
              value={statusFilter}
              onChange={(_, value) => setStatusFilter(value)}
              variant="scrollable"
              allowScrollButtonsMobile
              sx={{
                mb: 3,
                '& .MuiTab-root': {
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  bgcolor: 'background.paper',
                  color: 'text.secondary',
                },
                '& .Mui-selected': {
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                  color: 'primary.main',
                  borderColor: 'transparent',
                },
              }}
            >
              {STATUS_FILTERS.map((opt) => (
                <Tab key={opt.value} value={opt.value} label={opt.label} disableRipple />
              ))}
            </Tabs>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>WAN</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Service</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Assigned</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!woLoading && workOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No work orders in this view yet.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}

                  {workOrders.map((wo) => {
                    const sr = wo.serviceRequest || {};
                    const customer = sr.customer || {};
                    const fe = wo.assignedFE || {};
                    return (
                      <TableRow key={wo.id} hover>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={600} color="text.primary">
                            {wo.wan || `WO-${wo.id}`}
                          </Typography>
                        </TableCell>
                        <TableCell>{customer.name || customer.displayName || '—'}</TableCell>
                        <TableCell>{sr.serviceType || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={wo.status || '—'}
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{fe.user?.displayName || fe.name || 'Unassigned'}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="Preview work order">
                              <span>
                                <IconButton
                                  component={RouterLink}
                                  to={`/office/preview?woId=${wo.id}`}
                                  color="primary"
                                >
                                  <OpenInNewRoundedIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="View timeline">
                              <IconButton color="secondary" onClick={() => openTimelineModal(wo)}>
                                <TimelineRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Assign engineer">
                              <IconButton color="info" onClick={() => openAssignModal(wo)}>
                                <AssignmentIndRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Mark as complete">
                              <span>
                                <IconButton
                                  color="success"
                                  disabled={completing}
                                  onClick={() => handleComplete(wo.id)}
                                >
                                  <CheckCircleRoundedIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={4} alignItems="stretch">
          <Card sx={{ flex: 1 }}>
            {proposalLoading && <LinearProgress />}
            <CardHeader
              title={<Typography variant="h6">Proposals awaiting approval</Typography>}
              subheader={
                <Typography variant="body2" color="text.secondary">
                  Approve proposals to instantly raise a work order.
                </Typography>
              }
            />
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Proposal</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {!proposalLoading && pendingProposals.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No proposals awaiting approval.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {pendingProposals.map((proposal) => {
                      const totalDisplay =
                        typeof proposal.total === 'number'
                          ? proposal.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })
                          : proposal.total ?? '—';
                      return (
                        <TableRow key={proposal.id} hover>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight={600} color="text.primary">
                              #{proposal.id}
                            </Typography>
                          </TableCell>
                          <TableCell>{proposal.customer?.name || '—'}</TableCell>
                          <TableCell>₹{totalDisplay}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => openPoModal(proposal)}
                                startIcon={<NoteAltRoundedIcon fontSize="small" />}
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="inherit"
                                disabled={rejecting}
                                onClick={() => handleRejectProposal(proposal.id)}
                              >
                                Reject
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1 }}>
            {srLoading && <LinearProgress />}
            <CardHeader
              title={<Typography variant="h6">New service requests</Typography>}
              subheader={
                <Typography variant="body2" color="text.secondary">
                  Convert qualified requests into work orders in a single step.
                </Typography>
              }
            />
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>SRN</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Service</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {!srLoading && serviceRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No pending service requests.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {serviceRequests.map((sr) => (
                      <TableRow key={sr.id} hover>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={600} color="text.primary">
                            {sr.srn}
                          </Typography>
                        </TableCell>
                        <TableCell>{sr.customer?.name || '—'}</TableCell>
                        <TableCell>{sr.serviceType}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleCreateFromRequest(sr.id)}
                            disabled={creatingWO}
                            startIcon={<LaunchRoundedIcon fontSize="small" />}
                          >
                            Create work order
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Stack>
      </Stack>

      <AssignModal
        open={assignModal.open}
        workOrder={assignModal.wo}
        onClose={closeAssignModal}
        onAssign={handleAssign}
        note={assignNote}
        onNoteChange={setAssignNote}
        engineers={availableFEs}
      />

      <ApproveModal
        open={poModal.open}
        proposal={poModal.proposal}
        onClose={closePoModal}
        poNumber={poNumber}
        poUrl={poUrl}
        onPoNumberChange={setPoNumber}
        onPoUrlChange={setPoUrl}
        onSubmit={handleApproveProposal}
        submitting={approving}
      />

      <TimelineModal
        open={timelineModal.open}
        workOrder={timelineModal.wo}
        onClose={closeTimelineModal}
      />
    </Box>
  );
}

function AssignModal({ open, onClose, workOrder, engineers, note, onNoteChange, onAssign }) {
  const [selectedFe, setSelectedFe] = useState('');

  React.useEffect(() => {
    if (open) {
      setSelectedFe('');
    }
  }, [open, workOrder?.id]);

  const handleAssign = () => {
    if (!selectedFe) return;
    const numeric = Number(selectedFe);
    const value = Number.isFinite(numeric) && numeric > 0 ? numeric : selectedFe;
    onAssign(value);
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Assign ${workOrder?.wan || 'work order'}`}>
      <Stack spacing={3}>
        <TextField
          select
          label="Field engineer"
          value={selectedFe}
          onChange={(event) => setSelectedFe(event.target.value)}
          onKeyDown={focusNextOnEnter}
          fullWidth
          SelectProps={{ displayEmpty: true }}
        >
          <MenuItem value="" disabled>
            Select engineer
          </MenuItem>
          {engineers.map((fe) => (
            <MenuItem key={fe.id} value={fe.id}>
              {fe.user?.displayName || fe.name || `FE #${fe.id}`}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Note to engineer"
          multiline
          minRows={3}
          placeholder="Optional instructions"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          onKeyDown={focusNextOnEnter}
          fullWidth
        />

        <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
          <Button variant="text" color="inherit" onClick={onClose} startIcon={<CloseRoundedIcon fontSize="small" />}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAssign}
            startIcon={<AssignmentIndRoundedIcon fontSize="small" />}
            disabled={!selectedFe}
          >
            Assign
          </Button>
        </Stack>
      </Stack>
    </Modal>
  );
}

function TimelineModal({ open, onClose, workOrder }) {
  const woId = workOrder?.id;
  const skip = !open || !woId;
  const { data, isFetching, error, refetch } = useWoTimelineQuery(woId, { skip });

  if (!open) return null;

  const timelineWo = data?.workOrder || workOrder || {};
  const sr = timelineWo?.serviceRequest || workOrder?.serviceRequest || {};
  const fe = timelineWo?.assignedFE || workOrder?.assignedFE || {};
  const progress = Array.isArray(data?.progress) ? data.progress : [];
  const assignments = Array.isArray(data?.assignments) ? data.assignments : [];

  const statusLabel = (status) => {
    if (!status) return 'Update';
    const upper = String(status).toUpperCase();
    if (STATUS_LABELS[upper]) return STATUS_LABELS[upper];
    return upper
      .split('_')
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ');
  };

  const statusColor = (status) => {
    switch (String(status || '').toUpperCase()) {
      case 'COMPLETED':
        return 'success';
      case 'MATERIAL_RECEIVED':
        return 'warning';
      case 'INSTALLATION_STARTED':
        return 'info';
      case 'STARTED':
        return 'primary';
      case 'ON_HOLD':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (value) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString('en-IN');
    } catch (e) {
      return String(value);
    }
  };

  const footer = (
    <>
      <Button
        variant="outlined"
        color="inherit"
        onClick={() => refetch()}
        disabled={isFetching || skip}
        startIcon={<RefreshRoundedIcon fontSize="small" />}
      >
        {isFetching ? 'Refreshing…' : 'Refresh'}
      </Button>
      <Button variant="contained" onClick={onClose}>
        Close
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={timelineWo?.wan ? `Timeline • ${timelineWo.wan}` : 'Work order timeline'}
      footer={footer}
    >
      <Stack spacing={3}>
        {isFetching && <LinearProgress />}
        {error && (
          <Alert severity="error">
            {String(error?.data?.message || error?.error || 'Unable to load timeline')}
          </Alert>
        )}

        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardHeader
            avatar={<EventNoteRoundedIcon color="primary" />}
            title="Current status"
            subheader={statusLabel(timelineWo?.status || workOrder?.status)}
          />
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Assigned to {fe?.user?.displayName || fe?.name || '—'}
            </Typography>
            {sr?.srn && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Service request {sr.srn}
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardHeader title="Progress updates" />
          <CardContent>
            {progress.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No updates posted yet.
              </Typography>
            ) : (
              <Stack spacing={2.5}>
                {progress.map((entry, index) => {
                  const key = entry.id || `${entry.status || 'status'}-${entry.createdAt || index}`;
                  return (
                    <Box
                      key={key}
                      sx={{
                        border: (theme) => `1px solid ${theme.palette.divider}`,
                        borderRadius: 2,
                        p: 2,
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02),
                      }}
                    >
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                        <Chip
                          label={statusLabel(entry.status)}
                          size="small"
                          color={statusColor(entry.status)}
                          variant={statusColor(entry.status) === 'default' ? 'outlined' : 'filled'}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(entry.createdAt)}
                        </Typography>
                      </Stack>
                      {entry.remarks && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {entry.remarks}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                        {entry.byFE?.user?.displayName && (
                          <Typography variant="caption" color="text.secondary">
                            By {entry.byFE.user.displayName}
                          </Typography>
                        )}
                        {entry.photoUrl && (
                          <Link href={entry.photoUrl} target="_blank" rel="noreferrer" variant="caption">
                            View photo evidence
                          </Link>
                        )}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardHeader title="Assignments & notes" />
          <CardContent>
            {assignments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No assignment history recorded.
              </Typography>
            ) : (
              <Stack spacing={2.5}>
                {assignments.map((assignment, index) => {
                  const key = assignment.id || `${assignment.assignedAt || index}-${assignment.fieldEngineer?.id || assignment.team?.id || 'assignee'}`;
                  return (
                    <Box
                      key={key}
                      sx={{
                        border: (theme) => `1px solid ${theme.palette.divider}`,
                        borderRadius: 2,
                        p: 2,
                      }}
                    >
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {assignment.fieldEngineer?.user?.displayName || assignment.fieldEngineer?.name || assignment.team?.name || 'Unassigned'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(assignment.assignedAt)}
                        </Typography>
                      </Stack>
                      {assignment.note && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {assignment.note}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Modal>
  );
}

function ApproveModal({
  open,
  onClose,
  proposal,
  poNumber,
  onPoNumberChange,
  poUrl,
  onPoUrlChange,
  onSubmit,
  submitting,
}) {
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        const input = document.getElementById('po-number-input');
        if (input) input.focus();
      }, 80);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open]);

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Approve proposal #${proposal?.id}` }>
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Stack spacing={3}>
          <TextField
            id="po-number-input"
            label="Purchase order number"
            value={poNumber}
            onChange={(event) => onPoNumberChange(event.target.value)}
            onKeyDown={focusNextOnEnter}
            placeholder="PO number"
            autoComplete="on"
            required
            fullWidth
          />
          <TextField
            label="PO document URL (optional)"
            value={poUrl}
            onChange={(event) => onPoUrlChange(event.target.value)}
            onKeyDown={focusNextOnEnter}
            placeholder="https://…"
            autoComplete="on"
            type="url"
            fullWidth
          />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Button
              type="button"
              variant="text"
              color="inherit"
              onClick={() => onPoUrlChange('')}
              startIcon={<DownloadRoundedIcon fontSize="small" />}
            >
              Clear attachment
            </Button>
            <Stack direction="row" spacing={1.5}>
              <Button type="button" variant="text" color="inherit" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={submitting || !poNumber.trim()}>
                {submitting ? 'Approving…' : 'Approve & create work order'}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Box>
    </Modal>
  );
}
