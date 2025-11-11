import React, { useMemo, useState } from 'react';
import {
  useGetFieldEngineersQuery,
  useCreateFieldEngineerMutation,
  useUpdateFieldEngineerMutation,
  useCreateCustomerMutation,
  useGetCustomersQuery,
  useUpdateCustomerMutation,
  useOfficeDeleteFieldEngineerMutation,
  useOfficeDeleteCustomerMutation,
  useOfficeResetPasswordMutation,
} from '../../features/office/officeApi';
import { focusNextInputOnEnter } from '../../utils/enterKeyNavigation';
import {
  Box,
  Stack,
  Typography,
  Tabs,
  Tab,
  Card,
  CardHeader,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  MenuItem,
  Chip,
  Alert,
  Switch,
  FormControlLabel,
  LinearProgress,
  Divider,
  TablePagination,
  Tooltip,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { alpha } from '@mui/material/styles';
import Modal from '../../shell/components/Modal';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';

const FE_STATUSES = ['AVAILABLE', 'BUSY', 'INACTIVE'];
const TABS = {
  FE: 'FIELD_ENGINEERS',
  CUST: 'CUSTOMERS',
};

export default function Users() {
  const [tab, setTab] = useState(TABS.FE);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const {
    data: feRows = [],
    isLoading: isFeLoading,
    isFetching: isFeFetching,
    refetch: refetchFE,
  } = useGetFieldEngineersQuery();

  const [createFE, { isLoading: creatingFE }] = useCreateFieldEngineerMutation();
  const [updateFE, { isLoading: updatingFE }] = useUpdateFieldEngineerMutation();
  const [deleteFE, { isLoading: deletingFE }] = useOfficeDeleteFieldEngineerMutation();
  const [resetPassword, { isLoading: resetting }] = useOfficeResetPasswordMutation();

  const [feQ, setFeQ] = useState('');
  const feFiltered = useMemo(() => {
    const q = feQ.trim().toLowerCase();
    if (!q) return feRows || [];
    return (feRows || []).filter((fe) => {
      const name = fe?.user?.displayName || fe?.userName || '';
      const email = fe?.user?.email || fe?.userEmail || '';
      return (
        String(name).toLowerCase().includes(q) ||
        String(email).toLowerCase().includes(q) ||
        String(fe?.status || '').toLowerCase().includes(q) ||
        String(fe?.id || '').toLowerCase().includes(q)
      );
  });
  }, [feRows, feQ]);

  const [showCreateFE, setShowCreateFE] = useState(false);
  const [feDisplayName, setFeDisplayName] = useState('');
  const [feEmail, setFeEmail] = useState('');
  const [feSubmitting, setFeSubmitting] = useState(false);

  const [editingFE, setEditingFE] = useState(null);
  const [efeDisplay, setEfeDisplay] = useState('');
  const [efeEmail, setEfeEmail] = useState('');
  const [efeStatus, setEfeStatus] = useState('AVAILABLE');

  const [confirmDlg, setConfirmDlg] = useState(null);

  const [resetTarget, setResetTarget] = useState(null);
  const [sendResetEmail, setSendResetEmail] = useState(true);
  const [resetResult, setResetResult] = useState(null);
  const [resetErr, setResetErr] = useState('');

  const [showCreateCust, setShowCreateCust] = useState(false);
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custMobile, setCustMobile] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custCreatePortal, setCustCreatePortal] = useState(true);
  const [custSubmitting, setCustSubmitting] = useState(false);

  const [editingCust, setEditingCust] = useState(null);
  const [ecName, setEcName] = useState('');
  const [ecEmail, setEcEmail] = useState('');
  const [ecMobile, setEcMobile] = useState('');
  const [ecAddress, setEcAddress] = useState('');
  const [ecEnablePortal, setEcEnablePortal] = useState(false);

  const [cPage, setCPage] = useState(0);
  const [cSize, setCSize] = useState(10);
  const [cQ, setCQ] = useState('');
  const [cHasPortal, setCHasPortal] = useState('ALL');

  const customerParams = useMemo(() => {
    const params = { page: cPage, size: cSize };
    const s = cQ.trim();
    if (s) {
      if (s.includes('@')) params.email = s;
      else params.name = s;
    }
    if (cHasPortal === 'YES') params.hasPortal = true;
    if (cHasPortal === 'NO') params.hasPortal = false;
    return params;
  }, [cPage, cSize, cQ, cHasPortal]);

  const {
    data: customersData,
    isFetching: isCustFetching,
    refetch: refetchCustomers,
  } = useGetCustomersQuery(customerParams);

  const [createCustomer, { isLoading: creatingCust }] = useCreateCustomerMutation();
  const updateCustomerHook = typeof useUpdateCustomerMutation === 'function' ? useUpdateCustomerMutation : null;
  const [updateCustomer, { isLoading: updatingCust }] = updateCustomerHook ? updateCustomerHook() : [null, { isLoading: false }];
  const [deleteCustomer, { isLoading: deletingCust }] = useOfficeDeleteCustomerMutation();

  const canUpdateCustomer = Boolean(updateCustomerHook);

  const totalCustomers = customersData?.total ?? customersData?.items?.length ?? 0;
  const customerItems = customersData?.items ?? [];

  async function handleCreateFE() {
    setMsg('');
    setErr('');
    if (feSubmitting) return;
    if (!feDisplayName.trim()) return setErr('Please enter Field Engineer name.');
    if (!feEmail.trim()) return setErr('Please enter Field Engineer email.');
    try {
      setFeSubmitting(true);
      await createFE({ displayName: feDisplayName.trim(), email: feEmail.trim() }).unwrap();
      setShowCreateFE(false);
      setFeDisplayName('');
      setFeEmail('');
      setMsg('Field Engineer created (or already linked).');
      refetchFE();
    } catch (e) {
      setErr(e?.data?.message || 'Failed to create Field Engineer.');
    } finally {
      setFeSubmitting(false);
    }
  }

  function openEditFE(row) {
    setEditingFE(row);
    setEfeDisplay(row?.user?.displayName || row?.userName || '');
    setEfeEmail(row?.user?.email || row?.userEmail || '');
    setEfeStatus(row?.status || 'AVAILABLE');
    setErr('');
    setMsg('');
  }
  function closeEditFE() {
    setEditingFE(null);
  }
  async function saveEditFE() {
    if (!editingFE) return;
    setMsg('');
    setErr('');
    try {
      await updateFE({
        id: editingFE.id,
        status: efeStatus,
        displayName: efeDisplay,
        email: efeEmail,
      }).unwrap();
      setMsg('Field Engineer updated.');
      closeEditFE();
      refetchFE();
    } catch (e) {
      setErr(e?.data?.message || 'Failed to update Field Engineer.');
    }
  }

  function confirmDeleteFE(row) {
    if (!row) return;
    const name = row?.user?.displayName || row?.userName || 'this field engineer';
    setConfirmDlg({
      type: 'fe-delete',
      title: 'Delete Field Engineer',
      message: `Deleting ${name} will remove their login and detach related assignments. This action cannot be undone.`,
      payload: row,
      loading: false,
    });
  }

  async function copyFeId(fe) {
    if (!fe?.id) return;
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        throw new Error('Clipboard not available');
      }
      await navigator.clipboard.writeText(String(fe.id));
      setMsg(`Copied field engineer ID ${fe.id} to clipboard.`);
    } catch (e) {
      setErr('Unable to copy ID to clipboard.');
    }
  }

  async function runConfirmDeleteFE(row) {
    if (!row) return;
    setConfirmDlg((dlg) => (dlg ? { ...dlg, loading: true } : dlg));
    try {
      await deleteFE({ id: row.id, deleteUserIfOrphan: true }).unwrap();
      setMsg('Field Engineer deleted.');
      refetchFE();
      setConfirmDlg(null);
    } catch (e) {
      setErr(e?.data?.message || 'Unable to delete Field Engineer.');
      setConfirmDlg(null);
    }
  }

  function openResetForFE(row) {
    const userId = row?.user?.id || row?.userId || null;
    const email = row?.user?.email || row?.userEmail || '';
    const displayName = row?.user?.displayName || row?.userName || '';
    setResetErr('');
    setResetResult(null);
    if (!userId) {
      setErr('No linked user id found for this Field Engineer.');
      return;
    }
    setResetTarget({ userId, email, displayName });
  }

  function closeReset() {
    setResetTarget(null);
    setResetResult(null);
    setResetErr('');
  }

  async function doReset() {
    if (!resetTarget?.userId) return setResetErr('Missing user id.');
    setResetErr('');
    try {
      const res = await resetPassword({ id: resetTarget.userId, sendEmail: sendResetEmail }).unwrap();
      setResetResult({ tempPassword: res?.tempPassword || '' });
    } catch (e) {
      setResetErr(e?.data?.message || 'Failed to reset password.');
    }
  }

  async function handleCreateCustomer() {
    setMsg('');
    setErr('');
    if (custSubmitting) return;
    if (!custName.trim() || !custEmail.trim() || !custMobile.trim() || !custAddress.trim()) {
      setErr('Fill all customer fields (name, email, mobile, address).');
      return;
    }
    try {
      setCustSubmitting(true);
      await createCustomer({
        name: custName.trim(),
        email: custEmail.trim(),
        mobile: custMobile.trim(),
        address: custAddress.trim(),
        createPortal: !!custCreatePortal,
      }).unwrap();
      setShowCreateCust(false);
      setCustName('');
      setCustEmail('');
      setCustMobile('');
      setCustAddress('');
      setMsg(custCreatePortal ? 'Customer + Portal created (or reused).' : 'Customer created (or reused).');
      refetchCustomers();
    } catch (e) {
      setErr(e?.data?.message || 'Failed to create Customer.');
    } finally {
      setCustSubmitting(false);
    }
  }

  function openEditCustomer(row) {
    setEditingCust(row);
    setEcName(row?.name || '');
    setEcEmail(row?.email || '');
    setEcMobile(row?.mobile || '');
    setEcAddress(row?.address || '');
    setEcEnablePortal(false);
    setErr('');
    setMsg('');
  }

  function closeEditCustomer() {
    setEditingCust(null);
  }

  async function saveEditCustomer() {
    if (!editingCust) return;
    if (!canUpdateCustomer) {
      setErr('Update customer API not available in officeApi.');
      return;
    }
    setMsg('');
    setErr('');
    try {
      await updateCustomer({
        id: editingCust.id,
        name: ecName?.trim(),
        email: ecEmail?.trim(),
        mobile: ecMobile?.trim(),
        address: ecAddress?.trim(),
        enablePortal: ecEnablePortal ? true : undefined,
      }).unwrap();
      setMsg('Customer updated.');
      closeEditCustomer();
      refetchCustomers();
    } catch (e) {
      setErr(e?.data?.message || 'Failed to update Customer.');
    }
  }

  function confirmDeleteCustomer(row) {
    if (!row) return;
    setConfirmDlg({
      type: 'customer-delete',
      title: 'Delete customer',
      message: `Deleting ${row?.name || 'this customer'} will remove their records. Continue?`,
      payload: row,
      loading: false,
    });
  }

  async function runConfirmDeleteCustomer(row) {
    if (!row) return;
    setConfirmDlg((dlg) => (dlg ? { ...dlg, loading: true } : dlg));
    try {
      await deleteCustomer({ id: row.id }).unwrap();
      setMsg('Customer deleted.');
      refetchCustomers();
      setConfirmDlg(null);
    } catch (e) {
      setErr(e?.data?.message || 'Unable to delete customer.');
      setConfirmDlg(null);
    }
  }

  function openResetForCustomer(row) {
    if (!row?.portalUserId) {
      setErr('No portal login exists for this customer.');
      return;
    }
    setResetErr('');
    setResetResult(null);
    setResetTarget({ userId: row.portalUserId, email: row.email, displayName: row.name });
  }

  const feLoading = isFeLoading || isFeFetching;

  const headerAction = tab === TABS.FE
    ? (
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => { setShowCreateFE(true); setErr(''); setMsg(''); }}
        >
          Add field engineer
        </Button>
      )
    : (
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => { setShowCreateCust(true); setErr(''); setMsg(''); }}
        >
          Add customer
        </Button>
      );

  return (
    <Stack spacing={4}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={600} color="text.primary">
            People & customers
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage field engineers, customer contacts and portal access from a single view.
          </Typography>
        </Box>
        {headerAction}
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{
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
        <Tab value={TABS.FE} label="Field engineers" icon={<PeopleAltRoundedIcon fontSize="small" />} iconPosition="start" disableRipple />
        <Tab value={TABS.CUST} label="Customers" icon={<BusinessRoundedIcon fontSize="small" />} iconPosition="start" disableRipple />
      </Tabs>

      {(msg || err) && (
        <Alert
          severity={err ? 'error' : 'success'}
          icon={err ? <WarningAmberRoundedIcon fontSize="inherit" /> : <CheckCircleRoundedIcon fontSize="inherit" />}
          onClose={() => { setMsg(''); setErr(''); }}
        >
          {err || msg}
        </Alert>
      )}

      {tab === TABS.FE ? (
        <Card>
          {feLoading && <LinearProgress />}
          <CardHeader
            title="Field engineers"
            subheader={`${feFiltered.length} record${feFiltered.length === 1 ? '' : 's'}`}
          />
          <CardContent>
            <TextField
              placeholder="Search by name, email, or status"
              value={feQ}
              onChange={(e) => setFeQ(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <TableContainer sx={{ mt: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!feLoading && feFiltered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No field engineers found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {feFiltered.map((fe) => {
                    const name = fe?.user?.displayName || fe?.userName || '—';
                    const email = fe?.user?.email || fe?.userEmail || '—';
                    const userId = fe?.user?.id || fe?.userId || null;
                    return (
                      <TableRow key={fe.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label={fe?.id ? `FE-${fe.id}` : '—'} size="small" variant="outlined" />
                            {fe?.id && (
                              <TooltipIconButton title="Copy ID" onClick={() => copyFeId(fe)}>
                                <ContentCopyRoundedIcon fontSize="inherit" />
                              </TooltipIconButton>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>{name}</TableCell>
                        <TableCell>{email}</TableCell>
                        <TableCell>
                          <Chip label={fe?.status || 'AVAILABLE'} size="small" color="primary" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <TooltipIconButton title="Edit" onClick={() => openEditFE(fe)}>
                              <EditRoundedIcon fontSize="small" />
                            </TooltipIconButton>
                            <TooltipIconButton
                              title={userId ? 'Reset password' : 'No linked login'}
                              onClick={() => userId && openResetForFE(fe)}
                              disabled={!userId}
                            >
                              <VpnKeyRoundedIcon fontSize="small" />
                            </TooltipIconButton>
                            <TooltipIconButton
                              title="Delete"
                              color="error"
                              onClick={() => confirmDeleteFE(fe)}
                              disabled={deletingFE}
                            >
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </TooltipIconButton>
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
      ) : (
        <Card>
          {isCustFetching && <LinearProgress />}
          <CardHeader
            title="Customers"
            subheader={`${totalCustomers} record${totalCustomers === 1 ? '' : 's'}`}
          />
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField
                placeholder="Search by name or email"
                value={cQ}
                onChange={(e) => {
                  setCQ(e.target.value);
                  setCPage(0);
                }}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                select
                label="Portal access"
                value={cHasPortal}
                onChange={(e) => {
                  setCHasPortal(e.target.value);
                  setCPage(0);
                }}
                sx={{ minWidth: { xs: '100%', md: 220 } }}
                onKeyDown={focusNextInputOnEnter}
              >
                <MenuItem value="ALL">All</MenuItem>
                <MenuItem value="YES">Portal linked</MenuItem>
                <MenuItem value="NO">No portal</MenuItem>
              </TextField>
            </Stack>

            <TableContainer sx={{ mt: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Mobile</TableCell>
                    <TableCell>Address</TableCell>
                    <TableCell>Portal</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!isCustFetching && customerItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No customers found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {customerItems.map((c) => {
                    const portalLabel = c.portalUserId ? 'Linked' : 'No portal';
                    return (
                      <TableRow key={c.id} hover>
                        <TableCell>{c.name || '—'}</TableCell>
                        <TableCell>{c.email || '—'}</TableCell>
                        <TableCell>{c.mobile || '—'}</TableCell>
                        <TableCell>{c.address || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={portalLabel}
                            size="small"
                            color={c.portalUserId ? 'primary' : 'default'}
                            variant={c.portalUserId ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <TooltipIconButton
                              title="Edit"
                              onClick={() => canUpdateCustomer && openEditCustomer(c)}
                              disabled={!canUpdateCustomer}
                            >
                              <EditRoundedIcon fontSize="small" />
                            </TooltipIconButton>
                            <TooltipIconButton
                              title={c.portalUserId ? 'Reset portal password' : 'No portal login'}
                              onClick={() => c.portalUserId && openResetForCustomer(c)}
                              disabled={!c.portalUserId}
                            >
                              <VpnKeyRoundedIcon fontSize="small" />
                            </TooltipIconButton>
                            <TooltipIconButton
                              title="Delete"
                              color="error"
                              onClick={() => confirmDeleteCustomer(c)}
                              disabled={deletingCust}
                            >
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </TooltipIconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ mt: 2 }} />
            <TablePagination
              component="div"
              count={totalCustomers}
              page={cPage}
              onPageChange={(_, newPage) => setCPage(newPage)}
              rowsPerPage={cSize}
              onRowsPerPageChange={(event) => {
                setCSize(parseInt(event.target.value, 10));
                setCPage(0);
              }}
              rowsPerPageOptions={[5, 10, 20, 50]}
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${count}`}
            />
          </CardContent>
        </Card>
      )}

      <Modal open={showCreateFE} onClose={() => setShowCreateFE(false)} title="Create field engineer">
        <Stack spacing={3}>
          <TextField
            label="Display name"
            value={feDisplayName}
            onChange={(e) => setFeDisplayName(e.target.value)}
            onKeyDown={focusNextInputOnEnter}
            fullWidth
          />
          <TextField
            label="Email"
            type="email"
            value={feEmail}
            onChange={(e) => setFeEmail(e.target.value)}
            onKeyDown={focusNextInputOnEnter}
            fullWidth
          />
          <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
            <Button variant="text" color="inherit" onClick={() => setShowCreateFE(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreateFE}
              disabled={creatingFE || feSubmitting}
            >
              {creatingFE || feSubmitting ? 'Creating…' : 'Create field engineer'}
            </Button>
          </Stack>
        </Stack>
      </Modal>

      <Modal open={Boolean(editingFE)} onClose={() => { if (!updatingFE) closeEditFE(); }} title="Edit field engineer">
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Display name"
              value={efeDisplay}
              onChange={(e) => setEfeDisplay(e.target.value)}
              onKeyDown={focusNextInputOnEnter}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={efeEmail}
              onChange={(e) => setEfeEmail(e.target.value)}
              onKeyDown={focusNextInputOnEnter}
              fullWidth
            />
          </Stack>
          <TextField
            select
            label="Status"
            value={efeStatus}
            onChange={(e) => setEfeStatus(e.target.value)}
            onKeyDown={focusNextInputOnEnter}
          >
            {FE_STATUSES.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
            <Button variant="text" color="inherit" onClick={closeEditFE} disabled={updatingFE}>
              Cancel
            </Button>
            <Button variant="contained" onClick={saveEditFE} disabled={updatingFE}>
              {updatingFE ? 'Saving…' : 'Save changes'}
            </Button>
          </Stack>
        </Stack>
      </Modal>

      <Modal open={showCreateCust} onClose={() => setShowCreateCust(false)} title="Create customer">
        <Stack spacing={3}>
          <TextField
            label="Name"
            value={custName}
            onChange={(e) => setCustName(e.target.value)}
            onKeyDown={focusNextInputOnEnter}
            fullWidth
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Email"
              type="email"
              value={custEmail}
              onChange={(e) => setCustEmail(e.target.value)}
              onKeyDown={focusNextInputOnEnter}
              fullWidth
            />
            <TextField
              label="Mobile"
              value={custMobile}
              onChange={(e) => setCustMobile(e.target.value)}
              onKeyDown={focusNextInputOnEnter}
              fullWidth
            />
          </Stack>
          <TextField
            label="Address"
            value={custAddress}
            onChange={(e) => setCustAddress(e.target.value)}
            onKeyDown={focusNextInputOnEnter}
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                checked={custCreatePortal}
                onChange={(e) => setCustCreatePortal(e.target.checked)}
              />
            }
            label="Create portal and email credentials"
          />
          <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
            <Button variant="text" color="inherit" onClick={() => setShowCreateCust(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreateCustomer}
              disabled={creatingCust || custSubmitting}
            >
              {creatingCust || custSubmitting ? 'Creating…' : 'Create customer'}
            </Button>
          </Stack>
        </Stack>
      </Modal>

      <Modal open={Boolean(editingCust)} onClose={() => { if (!updatingCust) closeEditCustomer(); }} title="Edit customer">
        <Stack spacing={3}>
          <TextField
            label="Name"
            value={ecName}
            onChange={(e) => setEcName(e.target.value)}
            onKeyDown={focusNextInputOnEnter}
            fullWidth
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Email"
              type="email"
              value={ecEmail}
              onChange={(e) => setEcEmail(e.target.value)}
              onKeyDown={focusNextInputOnEnter}
              fullWidth
            />
            <TextField
              label="Mobile"
              value={ecMobile}
              onChange={(e) => setEcMobile(e.target.value)}
              onKeyDown={focusNextInputOnEnter}
              fullWidth
            />
          </Stack>
          <TextField
            label="Address"
            value={ecAddress}
            onChange={(e) => setEcAddress(e.target.value)}
            onKeyDown={focusNextInputOnEnter}
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                checked={ecEnablePortal}
                onChange={(e) => setEcEnablePortal(e.target.checked)}
                disabled={Boolean(editingCust?.portalUserId)}
              />
            }
            label={editingCust?.portalUserId ? 'Portal already enabled' : 'Enable customer portal'}
          />
          <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
            <Button variant="text" color="inherit" onClick={closeEditCustomer} disabled={updatingCust}>
              Cancel
            </Button>
            <Button variant="contained" onClick={saveEditCustomer} disabled={updatingCust}>
              {updatingCust ? 'Saving…' : 'Save changes'}
            </Button>
          </Stack>
        </Stack>
      </Modal>

      <Modal open={Boolean(resetTarget)} onClose={() => { if (!resetting) closeReset(); }} title="Reset password">
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            Reset password for{' '}
            <Typography component="span" color="text.primary" fontWeight={600}>
              {resetTarget?.displayName || resetTarget?.email || 'this user'}
            </Typography>
            ?
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={sendResetEmail}
                onChange={(e) => setSendResetEmail(e.target.checked)}
              />
            }
            label="Send email with temporary password"
          />
          {resetErr && <Alert severity="error">{resetErr}</Alert>}
          {resetResult?.tempPassword && (
            <Alert severity="success" icon={<VpnKeyRoundedIcon fontSize="inherit" />}>
              Temporary password:{' '}
              <Typography component="span" fontWeight={600}>
                {resetResult.tempPassword}
              </Typography>
            </Alert>
          )}
          <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
            <Button variant="text" color="inherit" onClick={closeReset} disabled={resetting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={doReset}
              disabled={resetting || Boolean(resetResult)}
            >
              {resetting ? 'Resetting…' : resetResult ? 'Done' : 'Reset password'}
            </Button>
          </Stack>
        </Stack>
      </Modal>

      <Modal
        open={Boolean(confirmDlg)}
        onClose={() => { if (!confirmDlg?.loading) setConfirmDlg(null); }}
        title={confirmDlg?.title || 'Confirm action'}
        footer={
          confirmDlg && (
            <>
              <Button
                variant="text"
                color="inherit"
                onClick={() => setConfirmDlg(null)}
                disabled={confirmDlg.loading}
                startIcon={<CloseRoundedIcon fontSize="small" />}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={() => {
                  if (confirmDlg.type === 'fe-delete') {
                    runConfirmDeleteFE(confirmDlg.payload);
                  } else if (confirmDlg.type === 'customer-delete') {
                    runConfirmDeleteCustomer(confirmDlg.payload);
                  }
                }}
                disabled={confirmDlg.loading}
                startIcon={<DeleteOutlineRoundedIcon fontSize="small" />}
              >
                {confirmDlg.loading ? 'Processing…' : 'Delete'}
              </Button>
            </>
          )
        }
      >
        {confirmDlg && (
          <Typography variant="body2" color="text.secondary">
            {confirmDlg.message}
          </Typography>
        )}
      </Modal>
    </Stack>
  );
}

function TooltipIconButton({ title, color = 'default', disabled, onClick, children }) {
  return (
    <Tooltip title={title} placement="top" arrow>
      <span>
        <Button
          variant="outlined"
          size="small"
          color={color === 'error' ? 'error' : 'inherit'}
          onClick={onClick}
          disabled={disabled}
          sx={{ minWidth: 0, p: 1, borderRadius: 2 }}
        >
          {children}
        </Button>
      </span>
    </Tooltip>
  );
}

