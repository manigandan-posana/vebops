// src/pages/admin/Tenants.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useGetTenantsQuery,
  useUpdateTenantMutation,
  useCreateBackOfficeMutation,
  useDeleteTenantMutation,
  useUpdateBackOfficeProfileMutation,
  useGetUsersQuery, // resolve BO user id by email
  useResetPasswordMutation,
} from "../../features/admin/adminApi";

// 🔁 lucide-react icons (replacing inline svgs only)
import {
  Plus,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Info,
} from "lucide-react";

/* ------------------------ tiny base UI (unchanged behavior) ------------------------ */
const Button = ({ children, className = "", type = "button", ...rest }) => (
  <button
    type={type}
    {...rest}
    className={
      "inline-flex items-center justify-center h-10 px-4 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed " +
      className
    }
  >
    {children}
  </button>
);

const Input = (props) => (
  <input
    {...props}
    className={
      "w-full h-10 rounded-sm border border-gray-300 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 " +
      (props.className || "")
    }
  />
);

const Label = ({ children }) => (
  <label className="text-xs font-medium text-gray-700">{children}</label>
);

const StatusDot = ({ active }) => (
  <span
    className={
      "inline-block w-2.5 h-2.5 rounded-full " +
      (active ? "bg-emerald-500" : "bg-red-500")
    }
  />
);

/* ------------------------ Dialog building blocks (UI only) ------------------------ */

const ModalShell = ({ children, onClose, dim = true }) => (
  <div
    className={
      "fixed inset-0 z-50 flex items-center justify-center p-4 " +
      (dim ? "bg-black/40" : "")
    }
    onClick={onClose}
  >
    <div
      className="w-full max-w-lg"
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {children}
    </div>
  </div>
);

const topStripe = {
  success: "from-emerald-500 via-emerald-500 to-emerald-400",
  danger: "from-rose-500 via-rose-500 to-orange-400",
  info: "from-blue-600 via-blue-600 to-indigo-500",
};

const IconCircle = ({ variant = "info", children }) => {
  const ring =
    variant === "success"
      ? "text-emerald-600 bg-emerald-50 ring-1 ring-emerald-200"
      : variant === "danger"
      ? "text-rose-600 bg-rose-50 ring-1 ring-rose-200"
      : "text-blue-600 bg-blue-50 ring-1 ring-blue-200";
  return (
    <div
      className={
        "mx-auto mb-3 h-10 w-10 rounded-full flex items-center justify-center " +
        ring
      }
    >
      {children}
    </div>
  );
};

const DialogCard = ({
  title,
  subtitle,
  variant = "info",
  children,
  footer,
  compact = false,
}) => (
  <div className="bg-white shadow-xl border border-gray-100 overflow-hidden">
    <div className={`h-1 w-full bg-gradient-to-r ${topStripe[variant]}`} />
    <div className={`px-6 ${compact ? "pt-5" : "pt-7"} pb-1 text-center`}>
      {variant === "success" && (
        <IconCircle variant="success">
          <Check className="h-5 w-5" />
        </IconCircle>
      )}
      {variant === "danger" && (
        <IconCircle variant="danger">
          <AlertCircle className="h-5 w-5" />
        </IconCircle>
      )}
      {variant === "info" && (
        <IconCircle variant="info">
          <Info className="h-5 w-5" />
        </IconCircle>
      )}

      <h3 className="text-[17px] font-semibold text-slate-900">{title}</h3>
      {subtitle ? (
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      ) : null}
    </div>
    <div className="px-6 pt-4 pb-5">{children}</div>
    {footer ? (
      <div className="px-6 pb-6 flex items-center justify-center gap-3">
        {footer}
      </div>
    ) : null}
  </div>
);

/* ------------------------ Page ------------------------ */

export default function Tenants() {
  const navigate = useNavigate();

  // list controls (server-side)
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

  // Pull all users once; used to resolve BO user id by email
  const { data: allUsers = [] } = useGetUsersQuery();
  const [resetPassword, { isLoading: resetting }] = useResetPasswordMutation();

  // alerts
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // to control fancy overlays specifically for create + delete flows
  const [showCreateSuccess, setShowCreateSuccess] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [lastAction, setLastAction] = useState(null); // 'create' | 'delete' | null

  // Create Tenant modal state
  const [showCreate, setShowCreate] = useState(false);
  const [code, setCode] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

  // Reset Password modal state
  const [resetTarget, setResetTarget] = useState(null); // { tenant, userId, email, displayName }
  const [sendResetEmail, setSendResetEmail] = useState(true);
  const [resetResult, setResetResult] = useState(null); // { tempPassword }
  const [resetErr, setResetErr] = useState("");

  const codeSet = useMemo(
    () => new Set(items.map((t) => (t.code || "").toLowerCase())),
    [items]
  );
  const codeExists = code && codeSet.has(code.trim().toLowerCase());
  const emailValid = (x) => /^\S+@\S+\.\S+$/.test(String(x || "").trim());

  const validateCreate = () => {
    const c = code.trim();
    const n = tenantName.trim();
    const dn = displayName.trim();
    const em = email.trim();
    if (!c) return "Tenant code is required.";
    if (!/^[A-Za-z0-9._-]+$/.test(c))
      return "Code may include letters, numbers, dot, underscore, hyphen.";
    if (!codeExists && !n) return "Tenant name is required.";
    if (!dn) return "Display name is required.";
    if (!emailValid(em)) return "Enter a valid email address.";
    return null;
  };

  async function onCreateTenant() {
    setMsg(""); setErr("");
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
      setShowCreate(false); // behavior preserved
      setShowCreateSuccess(true); // pretty success dialog
      setCode(""); setTenantName(""); setDisplayName(""); setEmail("");
      refetch();
    } catch (e) {
      setErr(e?.data?.message || "Failed to create tenant.");
      setShowErrorDialog(true);
    }
  }

  async function toggleActive(t) {
    setMsg(""); setErr("");
    try {
      await updateTenant({ id: t.id, active: !t.active }).unwrap();
      refetch();
    } catch (e) {
      setErr(e?.data?.message || "Failed to update active status.");
      setShowErrorDialog(true);
    }
  }

  /* ---------------- fancy confirm dialog (UI only; logic same) ---------------- */
  const [confirmDlg, setConfirmDlg] = useState(null);
  function askConfirm({ title, text, danger = false, onConfirm }) {
    setConfirmDlg({
      title,
      text,
      danger,
      onConfirm,
    });
  }

  async function onDeleteTenant(t, e) {
    e?.stopPropagation?.();
    setLastAction("delete");
    askConfirm({
      title: "You are about to delete tenant",
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

  /* ----------------------- EDIT MODAL ----------------------- */
  const [editing, setEditing] = useState(null); // row object
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
    setErr(""); setMsg("");
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

  // Resolve BO user once editing row is set and/or users list arrives
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
    setErr(""); setMsg("");

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

    // Resolve a BO user id robustly
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
      // STEP 1: update tenant code/name first (if changed)
      if (codeChanged || nameChanged) {
        const patch = { id: editing.id };
        if (codeChanged) patch.code = code;
        if (nameChanged) patch.name = name;
        await updateTenant(patch).unwrap();
      }

      // STEP 2: update user display/email (if we have a BO user id and those fields changed)
      if ((displayChanged || emailChanged)) {
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
          : (codeChanged || nameChanged)
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

  // reset password handler
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
      const res = await resetPassword({
        id: resetTarget.userId,
        sendEmail: sendResetEmail,
      }).unwrap();
      setResetResult({ tempPassword: res?.tempPassword || "" });
    } catch (e) {
      setResetErr(e?.data?.message || "Failed to reset password.");
    }
  }

  const saving = patching || updating;

  return (
    <div className="space-y-6 select-none">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tenant Management</h1>
          <p className="text-sm text-gray-500">Manage tenant accounts, roles, and permissions.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <span className="mr-2 inline-flex -ml-1 h-5 w-5 items-center justify-center rounded bg-white/20">
            <Plus className="h-4 w-4" />
          </span>
          Add New Tenant
        </Button>
      </div>

      {(msg || err) && (
        <div
          className={
            "text-sm px-3 py-2 rounded-lg " +
            (err
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-emerald-50 text-emerald-800 border-emerald-200")
          }
        >
          {err || msg}
        </div>
      )}

      {/* Search card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4">
          <div className="relative max-w-xs">
            <span className="absolute left-3 top-2.5 text-gray-400">
              <Search className="h-4 w-4" />
            </span>
            <Input
              className="pl-9 rounded-sm"
              placeholder="Search tenants by code, name or email"
              value={q}
              onChange={(e) => { setPage(0); setQ(e.target.value); }}
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-4">Loading tenants…</div>
        ) : isError ? (
          <div className="p-4 text-red-600">
            Error loading tenants {error?.status ? `(${error.status})` : ""}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">TENANT INFORMATION</th>
                    <th className="px-4 py-3 text-left font-medium">CODE</th>
                    <th className="px-4 py-3 text-left font-medium">STATUS</th>
                    <th className="px-4 py-3 text-left font-medium">VIEW MEMBERS</th>
                    <th className="px-4 py-3 text-left font-medium">DISABLE/ENABLE</th>
                    <th className="px-4 py-3 text-left font-medium">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((t) => (
                    <tr
                      key={t.id}
                      className="bg-white hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                            {(t.name || t.code || "?").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-gray-900 font-medium">{t.name || t.code}</div>
                            <div className="text-gray-500 text-xs">
                              {t.backOfficeEmail || t.primaryEmail || t.email || "—"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md border border-gray-300 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {t.code}
                        </span>
                      </td>

                      <td className="px-4 py-3"><StatusDot active={t.active} /></td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                          onClick={() => navigate(`/admin/tenants/${t.id}`)}
                        >
                          <Users className="h-4 w-4" />
                          View Members
                        </button>
                      </td>

                      <td className="px-4 py-3">
                        {t.active ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); if (!updating) toggleActive(t); }}
                            className="text-amber-600 hover:text-amber-700 font-medium"
                            disabled={updating}
                          >
                            Disable
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); if (!updating) toggleActive(t); }}
                            className="text-emerald-600 hover:text-emerald-700 font-medium"
                            disabled={updating}
                          >
                            Enable
                          </button>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 text-sm">
                          <button
                            type="button"
                            onClick={(e) => openEdit(t, e)}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Edit
                          </button>
                          <span className="text-gray-300">|</span>
                          {(t.backOfficeUserId || findUserIdByEmail(t.backOfficeEmail || t.primaryEmail || t.email)) ? (
                            <button
                              type="button"
                              onClick={(e) => openReset(t, e)}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Reset Password
                            </button>
                          ) : (
                            <span className="text-gray-400">Reset Password</span>
                          )}

                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={(e) => onDeleteTenant(t, e)}
                            className="text-red-600 hover:text-red-700 font-medium"
                            disabled={deleting}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {items.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-gray-500" colSpan={6}>
                        No tenants found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span>Items per page:</span>
                <select
                  className="border border-gray-300 rounded-md px-2 py-1 bg-white"
                  value={size}
                  onChange={(e) => { setPage(0); setSize(Number(e.target.value)); }}
                >
                  <option>5</option>
                  <option>10</option>
                  <option>20</option>
                  <option>50</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <span>{total ? `${start}–${end} of ${total} tenants` : "0 of 0"}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
                    aria-label="Prev"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {pagesToShow.map((p, idx) => {
                    const showEllipsis = idx > 0 && p - pagesToShow[idx - 1] > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="px-1 text-gray-400">…</span>}
                        <button
                          type="button"
                          onClick={() => setPage(p)}
                          className={
                            "min-w-[36px] h-9 px-2 rounded-md border " +
                            (p === page ? "border-blue-600 text-blue-700 bg-blue-50" : "border-gray-300 hover:bg-gray-50")
                          }
                        >
                          {p + 1}
                        </button>
                      </React.Fragment>
                    );
                  })}
                  <button
                    type="button"
                    className="p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
                    aria-label="Next"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ========================== CREATE TENANT (inputs + progress) ========================== */}
      {showCreate && (
        <ModalShell onClose={() => setShowCreate(false)}>
          <DialogCard
            title="Create a New Tenant"
            subtitle="Fill in the details below to create a new tenant."
            variant="info"
          >
            {err && (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {err}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Code</Label>
                <Input
                  placeholder="e.g., t-123"
                  value={code}
                  onChange={(e) => { setErr(""); setCode(e.target.value); }}
                />
              </div>
              {!codeExists && (
                <div>
                  <Label>Name</Label>
                  <Input
                    placeholder="e.g., Acme Corp"
                    value={tenantName}
                    onChange={(e) => { setErr(""); setTenantName(e.target.value); }}
                  />
                </div>
              )}
              <div className="sm:col-span-2">
                <Label>Primary Back Office – Display Name</Label>
                <Input
                  placeholder="e.g., John Doe"
                  value={displayName}
                  onChange={(e) => { setErr(""); setDisplayName(e.target.value); }}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Primary Back Office – Email</Label>
                <Input
                  placeholder="e.g., john.doe@acme.com"
                  value={email}
                  onChange={(e) => { setErr(""); setEmail(e.target.value); }}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                className="h-10 px-4 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
                onClick={() => setShowCreate(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <Button onClick={onCreateTenant} disabled={creating} className="min-w-[120px]">
                {creating ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                    Creating…
                  </span>
                ) : (
                  "Create Tenant"
                )}
              </Button>
            </div>

            {creating && (
              <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-600">
                <span className="inline-flex h-4 w-4 animate-pulse rounded-full bg-blue-500/20" />
                Creating tenant… This may take a few moments. Please don’t close this window.
              </div>
            )}

            {!codeExists && code && (
              <p className="text-xs text-amber-700 mt-3">
                Code <b>{code}</b> doesn’t exist. We’ll create a new tenant with this name.
              </p>
            )}
            <p className="text-[11px] text-gray-500 mt-1">
              A temporary password is auto-generated & emailed to the Back Office user.
            </p>
          </DialogCard>
        </ModalShell>
      )}

      {/* ========================== EDIT TENANT ========================== */}
      {editing && (
        <ModalShell onClose={() => { if (!saving) closeEdit(); }}>
          <DialogCard title="Edit Tenant" variant="info">
            <div className="space-y-3">
              <div>
                <Label>Tenant Code</Label>
                <Input value={eCode} onChange={(e) => setECode(e.target.value)} placeholder="e.g., POSANA-ACME" />
              </div>
              <div>
                <Label>Tenant Name</Label>
                <Input value={eName} onChange={(e) => setEName(e.target.value)} placeholder="Legal name" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Back Office — Display Name</Label>
                  <Input value={eDisplay} onChange={(e) => setEDisplay(e.target.value)} placeholder="e.g., Harish Kumar" />
                </div>
                <div>
                  <Label>Back Office — Email</Label>
                  <Input value={eEmail} onChange={(e) => setEEmail(e.target.value)} placeholder="harish.kumar@acme.com" />
                </div>
              </div>

              {!(
                editing?.backOfficeUserId ||
                resolvedBoUserId ||
                allUsers.some(u => eqIC(u?.email, eEmail) || eqIC(u?.email, (editing?.backOfficeEmail || editing?.primaryEmail || editing?.email)))
              ) && (
                <p className="text-[11px] text-amber-700">
                  Note: No linked Back Office user found. We can update code/name, but user fields require a linked user.
                </p>
              )}

              <div className="pt-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="h-10 px-4 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeEdit(); }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <Button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveEdit(); }}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          </DialogCard>
        </ModalShell>
      )}

      {/* ========================== RESET PASSWORD ========================== */}
      {resetTarget && (
        <ModalShell onClose={() => { if (!resetting) closeReset(); }}>
          <DialogCard title="Reset Password" variant="info" compact>
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to reset the password for{" "}
                <b>{resetTarget.displayName || resetTarget.email || "this user"}</b>?
              </p>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sendResetEmail}
                  onChange={(e) => setSendResetEmail(e.target.checked)}
                />
                Send email with the temporary password
              </label>

              {resetErr && (
                <div className="text-sm px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200">
                  {resetErr}
                </div>
              )}

              {resetResult?.tempPassword && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-sm text-emerald-800 font-medium">Temporary password</div>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="px-2 py-1 bg-white border border-emerald-200 rounded">
                      {resetResult.tempPassword}
                    </code>
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded border border-emerald-300 hover:bg-emerald-100"
                      onClick={() => navigator.clipboard?.writeText(resetResult.tempPassword)}
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    {sendResetEmail
                      ? "An email has been sent to the user with this password."
                      : "Email was not sent; please share this password with the user manually."}
                  </p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="h-10 px-4 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  onClick={closeReset}
                  disabled={resetting}
                >
                  Cancel
                </button>
                <Button
                  type="button"
                  onClick={doReset}
                  disabled={resetting || !!resetResult}
                >
                  {resetting ? "Resetting…" : (resetResult ? "Done" : "Yes, reset")}
                </Button>
              </div>
            </div>
          </DialogCard>
        </ModalShell>
      )}

      {/* ========================== SUCCESS OVERLAY (green) ========================== */}
      {showCreateSuccess && (
        <ModalShell onClose={() => setShowCreateSuccess(false)}>
          <DialogCard
            title="Tenant Created Successfully!"
            subtitle="The tenant has been created and is ready for configuration."
            variant="success"
          >
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-left">
              <div className="text-xs font-semibold text-slate-700 mb-1">Next Steps</div>
              <p className="text-xs text-slate-600">
                A temporary password has been generated and sent to the primary back-office email address (<b>{email || "provided email"}</b>).
                The user will be prompted to change this password upon their first login.
              </p>
            </div>
          </DialogCard>
          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              type="button"
              className="h-10 px-4 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
              onClick={() => setShowCreateSuccess(false)}
            >
              Close
            </button>
            <Button
              type="button"
              className="min-w-[170px]"
              onClick={() => { setShowCreateSuccess(false); setShowCreate(true); }}
            >
              Create Another Tenant
            </Button>
          </div>
        </ModalShell>
      )}

      {/* ========================== ERROR OVERLAY (red) ========================== */}
      {showErrorDialog && err && (
        <ModalShell onClose={() => setShowErrorDialog(false)}>
          <DialogCard
            title={lastAction === "create" ? "Tenant Creation Failed" : "Action Failed"}
            subtitle="We were unable to complete the request. Please review the details below."
            variant="danger"
          >
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <div className="font-semibold mb-1">Error Details &amp; Suggestions</div>
              <p>{err}</p>
            </div>
          </DialogCard>
          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              type="button"
              className="h-10 px-4 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
              onClick={() => setShowErrorDialog(false)}
            >
              Contact Support
            </button>
            <Button
              type="button"
              className="min-w-[100px]"
              onClick={() => {
                setShowErrorDialog(false);
                if (lastAction === "create") setShowCreate(true);
              }}
            >
              Try Again
            </Button>
          </div>
        </ModalShell>
      )}

      {/* ========================== CONFIRMATION OVERLAY ========================== */}
      {confirmDlg && (
        <ModalShell onClose={() => setConfirmDlg(null)}>
          <DialogCard
            title={
              confirmDlg.danger
                ? "You are about to delete"
                : "Are you sure?"
            }
            subtitle={confirmDlg.text}
            variant={confirmDlg.danger ? "danger" : "info"}
          />
          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              type="button"
              className="h-10 px-4 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
              onClick={() => setConfirmDlg(null)}
            >
              Cancel
            </button>
            <Button
              type="button"
              className={confirmDlg.danger ? "bg-rose-600 hover:bg-rose-700" : ""}
              onClick={() => confirmDlg?.onConfirm?.()}
            >
              {confirmDlg.danger ? "Delete" : "Confirm"}
            </Button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
