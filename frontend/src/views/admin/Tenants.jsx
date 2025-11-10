import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useGetTenantsQuery,
  useUpdateTenantMutation,
  useCreateBackOfficeMutation,
  useDeleteTenantMutation,
  useUpdateBackOfficeProfileMutation,
  useGetUsersQuery,
  useResetPasswordMutation,
} from "../../features/admin/adminApi";
import {
  Box,
  Stack,
  Typography,
  Button,
  TextField,
  Card,
  CardHeader,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Switch,
  FormControlLabel,
  InputAdornment,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import HighlightOffRoundedIcon from "@mui/icons-material/HighlightOffRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";

const emailValid = (x) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(String(x || "").trim());

export default function Tenants() {
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [statusFilter] = useState("ALL");
  const [subFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  const queryArgs = useMemo(
    () => ({ page, size, q, status: statusFilter, sub: subFilter, sort: "name,asc" }),
    [page, size, q, statusFilter, subFilter]
  );

  const { data, isLoading, isError, error, refetch } = useGetTenantsQuery(queryArgs);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const [updateTenant, { isLoading: updating }] = useUpdateTenantMutation();
  const [createBackOffice, { isLoading: creating }] = useCreateBackOfficeMutation();
  const [deleteTenant, { isLoading: deleting }] = useDeleteTenantMutation();
  const [updateBackoffice, { isLoading: patching }] = useUpdateBackOfficeProfileMutation();
  const { data: allUsers = [] } = useGetUsersQuery();
  const [resetPassword, { isLoading: resetting }] = useResetPasswordMutation();

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [showCreateSuccess, setShowCreateSuccess] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [code, setCode] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

  const [resetTarget, setResetTarget] = useState(null);
  const [sendResetEmail, setSendResetEmail] = useState(true);
  const [resetResult, setResetResult] = useState(null);
  const [resetErr, setResetErr] = useState("");

  const codeSet = useMemo(() => new Set(items.map((t) => (t.code || "").toLowerCase())), [items]);
  const codeExists = code && codeSet.has(code.trim().toLowerCase());

  const validateCreate = () => {
    const c = code.trim();
    const n = tenantName.trim();
    const dn = displayName.trim();
    const em = email.trim();
    if (!c) return "Tenant code is required.";
    if (!/^[A-Za-z0-9._-]+$/.test(c)) return "Code may include letters, numbers, dot, underscore, hyphen.";
    if (!codeExists && !n) return "Tenant name is required.";
    if (!dn) return "Display name is required.";
    if (!emailValid(em)) return "Enter a valid email address.";
    return null;
  };

  async function onCreateTenant() {
    setMsg("");
    setErr("");
    setLastAction("create");
    const v = validateCreate();
    if (v) {
      setErr(v);
      setShowErrorDialog(true);
      return;
    }
    try {
      await createBackOffice({
        code: code.trim(),
        name: codeExists ? undefined : tenantName.trim(),
        displayName: displayName.trim(),
        email: email.trim(),
      }).unwrap();
      setMsg("Tenant created. Primary Back Office user password emailed.");
      setShowCreate(false);
      setShowCreateSuccess(true);
      setCode("");
      setTenantName("");
      setDisplayName("");
      setEmail("");
      refetch();
    } catch (e) {
      setErr(e?.data?.message || "Failed to create tenant.");
      setShowErrorDialog(true);
    }
  }

  async function toggleActive(t) {
    setMsg("");
    setErr("");
    try {
      await updateTenant({ id: t.id, active: !t.active }).unwrap();
      refetch();
    } catch (e) {
      setErr(e?.data?.message || "Failed to update active status.");
      setShowErrorDialog(true);
    }
  }

  const [confirmDlg, setConfirmDlg] = useState(null);
  function askConfirm({ title, text, danger = false, onConfirm }) {
    setConfirmDlg({ title, text, danger, onConfirm });
  }

  async function onDeleteTenant(t, e) {
    e?.stopPropagation?.();
    setLastAction("delete");
    askConfirm({
      title: "Delete tenant",
      text: `Are you sure you want to delete “${t.name || t.code}”? This action cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        try {
          await deleteTenant({ id: t.id }).unwrap();
          setMsg("Tenant deleted.");
          refetch();
        } catch (e2) {
          setErr(e2?.data?.message || "Failed to delete tenant.");
          setShowErrorDialog(true);
        } finally {
          setConfirmDlg(null);
        }
      },
    });
  }

  const start = total === 0 ? 0 : page * size + 1;
  const end = Math.min(total, page * size + (items?.length || 0));

  const pagesToShow = useMemo(() => {
    const out = [];
    const N = totalPages;
    if (N <= 1) return [0];
    const push = (p) => out.includes(p) || out.push(p);
    push(0);
    if (page > 2) push(page - 1);
    if (page > 1) push(page);
    if (page + 1 < N) push(page + 1);
    push(N - 1);
    return [...new Set(out.filter((p) => p >= 0 && p < N))].sort((a, b) => a - b);
  }, [page, totalPages]);

  const [editing, setEditing] = useState(null);
  const [eCode, setECode] = useState("");
  const [eName, setEName] = useState("");
  const [eDisplay, setEDisplay] = useState("");
  const [eEmail, setEEmail] = useState("");
  const [resolvedBoUserId, setResolvedBoUserId] = useState(null);

  const norm = (s) => (s ?? "").trim();
  const eqIC = (a, b) => norm(a).toLowerCase() === norm(b).toLowerCase();

  const findUserIdByEmail = (emailLike) => {
    if (!emailLike || !Array.isArray(allUsers)) return null;
    const match = allUsers.find((u) => eqIC(u?.email, emailLike));
    return match?.id ?? null;
  };

  const resolveBoUserIdFromRow = (row) => {
    if (!row) return null;
    const hint = row.backOfficeEmail || row.primaryEmail || row.email || "";
    return findUserIdByEmail(hint);
  };

  function openEdit(t, e) {
    e?.stopPropagation?.();
    setErr("");
    setMsg("");
    setEditing(t);
    setECode(t.code || "");
    setEName(t.name || "");
    setEDisplay(t.backOfficeDisplayName || t.primaryContactName || "");
    setEEmail(t.backOfficeEmail || t.primaryEmail || t.email || "");
  }

  function closeEdit() {
    setEditing(null);
    setResolvedBoUserId(null);
  }

  useEffect(() => {
    if (editing) {
      const id = editing.backOfficeUserId || resolveBoUserIdFromRow(editing);
      setResolvedBoUserId(id ?? null);
    } else {
      setResolvedBoUserId(null);
    }
  }, [editing, allUsers]);

  async function saveEdit() {
    if (!editing) return;
    setErr("");
    setMsg("");

    const code = norm(eCode) || undefined;
    const name = norm(eName) || undefined;
    const displayName = norm(eDisplay) || undefined;
    const email = norm(eEmail) || undefined;

    const origCode = editing.code || "";
    const origName = editing.name || "";
    const origDisplay = editing.backOfficeDisplayName || editing.primaryContactName || "";
    const origEmail = editing.backOfficeEmail || editing.primaryEmail || editing.email || "";

    const codeChanged = code !== undefined && !eqIC(code, origCode);
    const nameChanged = name !== undefined && !eqIC(name, origName);
    const displayChanged = displayName !== undefined && !eqIC(displayName, origDisplay);
    const emailChanged = email !== undefined && !eqIC(email, origEmail);

    const uid =
      editing.backOfficeUserId ||
      resolvedBoUserId ||
      findUserIdByEmail(email) ||
      resolveBoUserIdFromRow(editing) ||
      null;

    if (!codeChanged && !nameChanged && !displayChanged && !emailChanged) {
      setMsg("No changes to save.");
      return;
    }

    try {
      if (codeChanged || nameChanged) {
        const patch = { id: editing.id };
        if (codeChanged) patch.code = code;
        if (nameChanged) patch.name = name;
        await updateTenant(patch).unwrap();
      }

      if (displayChanged || emailChanged) {
        if (!uid) {
          if (!(codeChanged || nameChanged)) {
            setErr("Cannot update Back Office user (no linked user found).");
            setShowErrorDialog(true);
            return;
          }
          setMsg("Tenant updated. User fields were skipped (no linked user).");
        } else {
          const body = { userId: uid, tenantId: editing.id };
          if (displayChanged) body.displayName = displayName;
          if (emailChanged) body.email = email;
          await updateBackoffice(body).unwrap();
        }
      }

      setMsg(
        (codeChanged || nameChanged) && (displayChanged || emailChanged)
          ? "Tenant and Back Office user updated."
          : codeChanged || nameChanged
          ? "Tenant updated."
          : "Back Office user updated."
      );

      closeEdit();
      refetch();
    } catch (e) {
      setErr(e?.data?.message || "Failed to save changes.");
      setShowErrorDialog(true);
    }
  }

  function openReset(t, e) {
    e?.stopPropagation?.();
    setResetErr("");
    setResetResult(null);
    setSendResetEmail(true);
    const hint = t.backOfficeEmail || t.primaryEmail || t.email || "";
    const uid = t.backOfficeUserId || findUserIdByEmail(hint) || null;
    setResetTarget({
      tenant: t,
      userId: uid,
      email: hint,
      displayName: t.backOfficeDisplayName || t.primaryContactName || "",
    });
  }

  function closeReset() {
    setResetTarget(null);
    setResetResult(null);
    setResetErr("");
  }

  async function doReset() {
    if (!resetTarget?.userId) {
      setResetErr("No linked Back Office user found for this tenant.");
      return;
    }
    setResetErr("");
    try {
      const res = await resetPassword({ id: resetTarget.userId, sendEmail: sendResetEmail }).unwrap();
      setResetResult({ tempPassword: res?.tempPassword || "" });
    } catch (e) {
      setResetErr(e?.data?.message || "Failed to reset password.");
    }
  }

  const saving = patching || updating;

  return (
    <Stack spacing={4}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={600}>
            Tenant Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage tenant accounts, roles, and permissions.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => setShowCreate(true)}
          sx={{ borderRadius: 2, px: 3, py: 1.25, boxShadow: "0px 16px 32px rgba(27,77,140,0.24)" }}
        >
          Add New Tenant
        </Button>
      </Stack>

      {(msg || err) && (
        <Alert severity={err ? "error" : "success"} icon={err ? <ErrorOutlineRoundedIcon /> : <CheckCircleRoundedIcon />}>
          {err || msg}
        </Alert>
      )}

      <Card sx={{ borderRadius: 3 }}>
        <CardHeader
          title={
            <TextField
              value={q}
              onChange={(e) => {
                setPage(0);
                setQ(e.target.value);
              }}
              placeholder="Search tenants by code, name or email"
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon color="action" />
                  </InputAdornment>
                ),
              }}
              fullWidth
            />
          }
          sx={{
            px: 3,
            py: 2,
            '& .MuiCardHeader-title': { width: '100%' },
          }}
        />
        <Divider />
        {isLoading ? (
          <Box sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">
              Loading tenants…
            </Typography>
          </Box>
        ) : isError ? (
          <Box sx={{ p: 4 }}>
            <Alert severity="error" icon={<ErrorOutlineRoundedIcon />}>
              {error?.data?.message || error?.error || 'Failed to fetch tenants.'}
            </Alert>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 520 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Back Office</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          No tenants found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((t) => (
                      <TableRow key={t.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {t.code || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>{t.name || '—'}</TableCell>
                        <TableCell>{t.backOfficeDisplayName || t.primaryContactName || '—'}</TableCell>
                        <TableCell>{t.backOfficeEmail || t.primaryEmail || t.email || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={t.active ? 'Active' : 'Inactive'}
                            color={t.active ? 'success' : 'default'}
                            variant={t.active ? 'filled' : 'outlined'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title={t.active ? 'Deactivate tenant' : 'Activate tenant'}>
                              <Switch
                                size="small"
                                checked={Boolean(t.active)}
                                onChange={() => toggleActive(t)}
                                disabled={updating}
                                inputProps={{ 'aria-label': 'Toggle active status' }}
                              />
                            </Tooltip>
                            <Tooltip title="Reset password">
                              <IconButton color="secondary" onClick={(e) => openReset(t, e)}>
                                <LockResetRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit tenant">
                              <IconButton color="primary" onClick={(e) => openEdit(t, e)}>
                                <EditRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete tenant">
                              <IconButton color="error" onClick={(e) => onDeleteTenant(t, e)}>
                                <DeleteOutlineRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Divider />
            <Box sx={{ px: 3, py: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Showing {start} – {end} of {total} tenants
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconButton size="small" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                  <ChevronLeftRoundedIcon fontSize="small" />
                </IconButton>
                {pagesToShow.map((p, idx) => {
                  const showEllipsis = idx > 0 && p - pagesToShow[idx - 1] > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <Typography variant="body2" color="text.disabled">…</Typography>}
                      <Button
                        size="small"
                        variant={p === page ? 'contained' : 'outlined'}
                        onClick={() => setPage(p)}
                        sx={{ minWidth: 40, borderRadius: 1.5 }}
                      >
                        {p + 1}
                      </Button>
                    </React.Fragment>
                  );
                })}
                <IconButton
                  size="small"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= totalPages}
                >
                  <ChevronRightRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>
          </>
        )}
      </Card>

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create a New Tenant</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {err && (
              <Alert severity="error" icon={<ErrorOutlineRoundedIcon />}>
                {err}
              </Alert>
            )}
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Code"
                  value={code}
                  onChange={(e) => {
                    setErr("");
                    setCode(e.target.value);
                  }}
                  placeholder="e.g., t-123"
                />
              </Grid>
              {!codeExists && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Name"
                    value={tenantName}
                    onChange={(e) => {
                      setErr("");
                      setTenantName(e.target.value);
                    }}
                    placeholder="e.g., Acme Corp"
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  label="Primary Back Office – Display Name"
                  value={displayName}
                  onChange={(e) => {
                    setErr("");
                    setDisplayName(e.target.value);
                  }}
                  placeholder="e.g., John Doe"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Primary Back Office – Email"
                  value={email}
                  onChange={(e) => {
                    setErr("");
                    setEmail(e.target.value);
                  }}
                  placeholder="e.g., john.doe@acme.com"
                  type="email"
                />
              </Grid>
            </Grid>
            {creating && (
              <Alert severity="info" icon={<InfoOutlinedIcon />}>
                Creating tenant… This may take a few moments. Please don’t close this window.
              </Alert>
            )}
            {!codeExists && code && (
              <Typography variant="caption" color="warning.main">
                Code <strong>{code}</strong> doesn’t exist. We’ll create a new tenant with this name.
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              A temporary password is auto-generated & emailed to the Back Office user.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreate(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={onCreateTenant} variant="contained" disabled={creating}>
            {creating ? <CircularProgress size={20} color="inherit" /> : 'Create Tenant'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editing)} onClose={closeEdit} fullWidth maxWidth="sm">
        <DialogTitle>Edit tenant</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField label="Code" value={eCode} onChange={(e) => setECode(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Name" value={eName} onChange={(e) => setEName(e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Primary Back Office – Display Name"
                  value={eDisplay}
                  onChange={(e) => setEDisplay(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Primary Back Office – Email"
                  value={eEmail}
                  onChange={(e) => setEEmail(e.target.value)}
                  type="email"
                />
              </Grid>
            </Grid>
            {saving && (
              <Alert severity="info" icon={<InfoOutlinedIcon />}>
                Saving changes…
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={saveEdit} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Save changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(resetTarget)} onClose={closeReset} fullWidth maxWidth="sm">
        <DialogTitle>Reset password</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Reset the password for {resetTarget?.displayName || resetTarget?.email || 'this user'}.
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={sendResetEmail}
                  onChange={(e) => setSendResetEmail(e.target.checked)}
                />
              }
              label="Email the new password to the Back Office user"
            />
            {resetErr && (
              <Alert severity="error" icon={<ErrorOutlineRoundedIcon />}>
                {resetErr}
              </Alert>
            )}
            {resetResult?.tempPassword && (
              <Alert severity="success" icon={<CheckCircleRoundedIcon />}>
                Temporary password: <strong>{resetResult.tempPassword}</strong>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeReset}>
            Close
          </Button>
          <Button onClick={doReset} variant="contained" disabled={resetting}>
            {resetting ? <CircularProgress size={20} color="inherit" /> : 'Reset password'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmDlg)} onClose={() => setConfirmDlg(null)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {confirmDlg?.danger ? <HighlightOffRoundedIcon color="error" /> : <InfoOutlinedIcon color="primary" />}
          {confirmDlg?.title}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            {confirmDlg?.text}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDlg(null)}>Cancel</Button>
          <Button
            onClick={() => confirmDlg?.onConfirm?.()}
            color={confirmDlg?.danger ? 'error' : 'primary'}
            variant="contained"
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={20} color="inherit" /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showCreateSuccess} onClose={() => setShowCreateSuccess(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleRoundedIcon color="success" />
          Tenant created
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            The tenant and primary Back Office user were created successfully. An email with temporary credentials has been sent.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateSuccess(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              setShowCreateSuccess(false);
              if (items?.length) {
                const newest = items[0];
                if (newest?.id) navigate(`/admin/tenants/${newest.id}`);
              }
            }}
          >
            View tenant details
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showErrorDialog} onClose={() => setShowErrorDialog(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ErrorOutlineRoundedIcon color="error" />
          {lastAction === 'delete' ? 'Unable to delete tenant' : 'Something went wrong'}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            {err || 'An unexpected error occurred. Please try again.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowErrorDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
