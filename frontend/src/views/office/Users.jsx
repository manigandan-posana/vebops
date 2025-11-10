// src/pages/office/Users.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  // Office-scoped data & upserts (from your snippet)
  useGetFieldEngineersQuery,
  useCreateFieldEngineerMutation,
  useUpdateFieldEngineerMutation,
  useCreateCustomerMutation,
  useGetCustomersQuery,
  useUpdateCustomerMutation,
  useOfficeDeleteFieldEngineerMutation,
  useOfficeDeleteCustomerMutation,
  useOfficeResetPasswordMutation,
} from "../../features/office/officeApi";

// lucide icons
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Info,
  Pencil,
  Trash2,
  KeyRound,
} from "lucide-react";

import { focusNextOnEnter } from "../../utils/formNavigation";

/* ------------------------ tiny base UI (same vibe as Tenants) ------------------------ */
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

const Input = ({ onKeyDown, className = "", ...rest }) => (
  <input
    {...rest}
    onKeyDown={(event) => {
      if (typeof onKeyDown === "function") {
        onKeyDown(event);
      }
      if (!event.defaultPrevented) {
        focusNextOnEnter(event);
      }
    }}
    className={
      "w-full h-10 rounded-sm border border-gray-300 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 " +
      className
    }
  />
);

const Label = ({ children }) => (
  <label className="text-xs font-medium text-gray-700">{children}</label>
);

const StatusPill = ({ value }) => {
  const map = {
    AVAILABLE:
      "text-emerald-700 bg-emerald-50 border border-emerald-200",
    BUSY: "text-amber-700 bg-amber-50 border border-amber-200",
    INACTIVE: "text-slate-700 bg-slate-50 border border-slate-200",
  };
  const cls = map[value] || "text-slate-700 bg-slate-50 border border-slate-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${cls}`}>
      {value || "UNKNOWN"}
    </span>
  );
};

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

/* ------------------------ constants ------------------------ */
const FE_STATUSES = ["AVAILABLE", "BUSY", "INACTIVE"];
const TABS = {
  FE: "FIELD_ENGINEERS",
  CUST: "CUSTOMERS",
};

/* ------------------------ page ------------------------ */
export default function Users() {
  const [tab, setTab] = useState(TABS.FE);

  // Alerts
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  /* --------------------------------- FIELD ENGINEERS --------------------------------- */
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

  // FE local search (client-side, since your FE list API has no filters)
  const [feQ, setFeQ] = useState("");
  const feFiltered = useMemo(() => {
    const q = feQ.trim().toLowerCase();
    if (!q) return feRows || [];
    return (feRows || []).filter((fe) => {
      const name = fe?.user?.displayName || fe?.userName || "";
      const email = fe?.user?.email || fe?.userEmail || "";
      return (
        String(name).toLowerCase().includes(q) ||
        String(email).toLowerCase().includes(q) ||
        String(fe?.status || "").toLowerCase().includes(q)
      );
    });
  }, [feRows, feQ]);

  // Create FE modal
  const [showCreateFE, setShowCreateFE] = useState(false);
  const [feDisplayName, setFeDisplayName] = useState("");
  const [feEmail, setFeEmail] = useState("");
  const [feSubmitting, setFeSubmitting] = useState(false);

  async function handleCreateFE() {
    setMsg(""); setErr("");
    if (feSubmitting) return;                   // local guard
    if (!feDisplayName.trim()) return setErr("Please enter Field Engineer name.");
    if (!feEmail.trim()) return setErr("Please enter Field Engineer email.");
    try {
      setFeSubmitting(true);
      await createFE({ displayName: feDisplayName.trim(), email: feEmail.trim() }).unwrap();
      setShowCreateFE(false);
      setFeDisplayName(""); setFeEmail("");
      setMsg("Field Engineer created (or already linked).");
      refetchFE();
    } catch (e) {
      setErr(e?.data?.message || "Failed to create Field Engineer.");
    } finally {
      setFeSubmitting(false);
    }
  }

  // FE edit modal
  const [editingFE, setEditingFE] = useState(null); // row
  const [efeDisplay, setEfeDisplay] = useState("");
  const [efeEmail, setEfeEmail] = useState("");
  const [efeStatus, setEfeStatus] = useState("AVAILABLE");

  function openEditFE(row) {
    setEditingFE(row);
    setEfeDisplay(row?.user?.displayName || row?.userName || "");
    setEfeEmail(row?.user?.email || row?.userEmail || "");
    setEfeStatus(row?.status || "AVAILABLE");
    setErr(""); setMsg("");
  }
  function closeEditFE() {
    setEditingFE(null);
  }
  async function saveEditFE() {
    if (!editingFE) return;
    setMsg(""); setErr("");
    try {
      // Your updateFE earlier accepted {id, status}; we also pass display/email if backend supports (safe no-op otherwise).
      await updateFE({
        id: editingFE.id,
        status: efeStatus,
        displayName: efeDisplay,
        email: efeEmail,
      }).unwrap();
      setMsg("Field Engineer updated.");
      closeEditFE();
      refetchFE();
    } catch (e) {
      setErr(e?.data?.message || "Failed to update Field Engineer.");
    }
  }

  // FE delete confirm
  const [confirmDlg, setConfirmDlg] = useState(null);
  function confirmDeleteFE(row) {
    if (!row) return;
    const name = row?.user?.displayName || row?.userName || "this field engineer";
    setErr("");
    setMsg("");
    setConfirmDlg({
      danger: true,
      title: "Delete Field Engineer",
      message: `Deleting ${name} will remove their login and detach related assignments. This action cannot be undone.`,
      confirmLabel: "Delete",
      loading: false,
      onConfirm: async () => {
        await deleteFE({ id: row.id, deleteUserIfOrphan: true }).unwrap();
        setMsg("Field Engineer deleted.");
        refetchFE();
      },
    });
  }

  // FE reset password
  const [resetTarget, setResetTarget] = useState(null); // { userId, email, displayName }
  const [sendResetEmail, setSendResetEmail] = useState(true);
  const [resetResult, setResetResult] = useState(null);
  const [resetErr, setResetErr] = useState("");

  function openResetForFE(row) {
    const userId = row?.user?.id || row?.userId || null;
    const email = row?.user?.email || row?.userEmail || "";
    const displayName = row?.user?.displayName || row?.userName || "";
    setResetErr("");
    setResetResult(null);
    if (!userId) {
      setErr("No linked user id found for this Field Engineer.");
      return;
    }
    setResetTarget({ userId, email, displayName });
  }
  function closeReset() {
    setResetTarget(null);
    setResetResult(null);
    setResetErr("");
  }
  async function doReset() {
    if (!resetTarget?.userId) return setResetErr("Missing user id.");
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

  /* --------------------------------- CUSTOMERS --------------------------------- */
  const [cPage, setCPage] = useState(0);
  const [cSize, setCSize] = useState(10);
  const [cQ, setCQ] = useState(""); // name/email quick search (server-side according to your params)
  const [cHasPortal, setCHasPortal] = useState("ALL"); // ALL | YES | NO

  const customerParams = useMemo(() => {
    const params = { page: cPage, size: cSize };
    const s = cQ.trim();
    if (s) {
      if (s.includes("@")) params.email = s;
      else params.name = s;
    }
    if (cHasPortal === "YES") params.hasPortal = true;
    if (cHasPortal === "NO") params.hasPortal = false;
    return params;
  }, [cPage, cSize, cQ, cHasPortal]);

  const {
    data: customersData,
    isFetching: isCustFetching,
    refetch: refetchCustomers,
  } = useGetCustomersQuery(customerParams);

  const [createCustomer, { isLoading: creatingCust }] = useCreateCustomerMutation();
  // If your officeApi has it, keep. Otherwise remove and the Customer Edit modal will be hidden automatically.
  const [updateCustomer, { isLoading: updatingCust }] =
    typeof useUpdateCustomerMutation === "function"
      ? useUpdateCustomerMutation()
      : [{}, { isLoading: false }]; // harmless fallback

  const [deleteCustomer, { isLoading: deletingCust }] = useOfficeDeleteCustomerMutation();

  // Create Customer modal
  const [showCreateCust, setShowCreateCust] = useState(false);
  const [custName, setCustName] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custMobile, setCustMobile] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [custCreatePortal, setCustCreatePortal] = useState(true);
  const [custSubmitting, setCustSubmitting] = useState(false);

  async function handleCreateCustomer() {
    setMsg(""); setErr("");
    if (custSubmitting) return;
    if (!custName.trim() || !custEmail.trim() || !custMobile.trim() || !custAddress.trim()) {
      setErr("Fill all customer fields (name, email, mobile, address).");
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
      setCustName(""); setCustEmail(""); setCustMobile(""); setCustAddress("");
      setMsg(custCreatePortal ? "Customer + Portal created (or reused)." : "Customer created (or reused).");
      refetchCustomers();
    } catch (e) {
      setErr(e?.data?.message || "Failed to create Customer.");
    } finally {
      setCustSubmitting(false);
    }
  }

  // Customer edit modal
  const [editingCust, setEditingCust] = useState(null);
  const [ecName, setEcName] = useState("");
  const [ecEmail, setEcEmail] = useState("");
  const [ecMobile, setEcMobile] = useState("");
  const [ecAddress, setEcAddress] = useState("");
  const [ecEnablePortal, setEcEnablePortal] = useState(false);

  function openEditCustomer(row) {
    setEditingCust(row);
    setEcName(row?.name || "");
    setEcEmail(row?.email || "");
    setEcMobile(row?.mobile || "");
    setEcAddress(row?.address || "");
    setErr(""); setMsg("");
  }
  function closeEditCustomer() {
    setEditingCust(null);
  }
  async function saveEditCustomer() {
    if (!editingCust) return;
    if (typeof useUpdateCustomerMutation !== "function") {
      setErr("Update customer API not available in officeApi. Please add useUpdateCustomerMutation or remove Edit.");
      return;
    }
    setMsg(""); setErr("");
    try {
      await updateCustomer({
        id: editingCust.id,
        name: ecName?.trim(),
        email: ecEmail?.trim(),
        mobile: ecMobile?.trim(),
        address: ecAddress?.trim(),
        enablePortal: ecEnablePortal ? true : undefined,
      }).unwrap();
      setMsg("Customer updated.");
      closeEditCustomer();
      refetchCustomers();
    } catch (e) {
      setErr(e?.data?.message || "Failed to update Customer.");
    }
  }

  // Customer delete confirm
  function confirmDeleteCustomer(row) {
    if (!row) return;
    const name = row?.name || row?.email || "this customer";
    setErr("");
    setMsg("");
    setConfirmDlg({
      danger: true,
      title: "Delete Customer",
      message: `Deleting ${name} removes their portal access and related records. This cannot be undone.`,
      confirmLabel: "Delete",
      loading: false,
      onConfirm: async () => {
        await deleteCustomer({ id: row.id, deletePortalUserIfOrphan: true }).unwrap();
        setMsg("Customer deleted.");
        refetchCustomers();
      },
    });
  }

  const runConfirm = useCallback(async () => {
    if (!confirmDlg?.onConfirm) return;
    try {
      setConfirmDlg((prev) => (prev ? { ...prev, loading: true } : prev));
      await confirmDlg.onConfirm();
    } catch (error) {
      const message =
        error?.data?.message ||
        error?.error ||
        error?.message ||
        "Failed to complete the action.";
      setErr(message);
    } finally {
      setConfirmDlg(null);
    }
  }, [confirmDlg]);

  // Customer reset password (for linked portal user)
  function openResetForCustomer(row) {
    const userId = row?.portalUserId || null;
    const email = row?.portalUserEmail || row?.email || "";
    const displayName = row?.portalUserDisplayName || row?.name || "";
    setResetErr("");
    setResetResult(null);
    if (!userId) {
      setErr("No linked portal user found for this customer.");
      return;
    }
    setResetTarget({ userId, email, displayName });
  }

  /* ------------------------ page header + tabs ------------------------ */
  const header = (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500">Manage Field Engineers & Customers.</p>
      </div>
      {tab === TABS.FE ? (
        <Button onClick={() => setShowCreateFE(true)}>
          <span className="mr-2 inline-flex -ml-1 h-5 w-5 items-center justify-center rounded bg-white/20">
            <Plus className="h-4 w-4" />
          </span>
          Create Field Engineer
        </Button>
      ) : (
        <Button onClick={() => setShowCreateCust(true)}>
          <span className="mr-2 inline-flex -ml-1 h-5 w-5 items-center justify-center rounded bg-white/20">
            <Plus className="h-4 w-4" />
          </span>
          Create Customer
        </Button>
      )}
    </div>
  );

  const tabs = (
    <div className="flex items-center gap-2 border-b border-gray-200">
      <button
        type="button"
        onClick={() => setTab(TABS.FE)}
        className={
          "h-10 px-3 text-sm -mb-px border-b-2 " +
          (tab === TABS.FE
            ? "border-blue-600 text-blue-700 font-medium"
            : "border-transparent text-gray-600 hover:text-gray-800")
        }
      >
        Field Engineers
      </button>
      <button
        type="button"
        onClick={() => setTab(TABS.CUST)}
        className={
          "h-10 px-3 text-sm -mb-px border-b-2 " +
          (tab === TABS.CUST
            ? "border-blue-600 text-blue-700 font-medium"
            : "border-transparent text-gray-600 hover:text-gray-800")
        }
      >
        Customers
      </button>
    </div>
  );

  /* ------------------------ FE table ------------------------ */
  const feTable = (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* search row */}
      <div className="p-4">
        <div className="relative max-w-xs">
          <span className="absolute left-3 top-2.5 text-gray-400">
            <Search className="h-4 w-4" />
          </span>
          <Input
            className="pl-9 rounded-sm"
            placeholder="Search by name, email, or status"
            value={feQ}
            onChange={(e) => setFeQ(e.target.value)}
          />
        </div>
      </div>

      {/* table */}
      {(isFeLoading || isFeFetching) ? (
        <div className="p-4">Loading field engineers…</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">NAME</th>
                  <th className="px-4 py-3 text-left font-medium">EMAIL</th>
                  <th className="px-4 py-3 text-left font-medium">STATUS</th>
                  <th className="px-4 py-3 text-left font-medium">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(feFiltered || []).map((fe) => {
                  const name = fe?.user?.displayName || fe?.userName || "—";
                  const email = fe?.user?.email || fe?.userEmail || "—";
                  const userId = fe?.user?.id || fe?.userId || null;

                  return (
                    <tr key={fe.id} className="bg-white hover:bg-gray-50">
                      <td className="px-4 py-3">{name}</td>
                      <td className="px-4 py-3">{email}</td>
                      <td className="px-4 py-3">
                        <StatusPill value={fe?.status || "AVAILABLE"} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 text-sm">
                          <button
                            type="button"
                            className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                            onClick={() => openEditFE(fe)}
                          >
                            <Pencil className="h-4 w-4" /> Edit
                          </button>
                          <span className="text-gray-300">|</span>
                          {userId ? (
                            <button
                              type="button"
                              className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                              onClick={() => openResetForFE(fe)}
                            >
                              <KeyRound className="h-4 w-4" /> Reset Password
                            </button>
                          ) : (
                            <span className="text-gray-400 inline-flex items-center gap-1">
                              <KeyRound className="h-4 w-4" /> Reset Password
                            </span>
                          )}
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1"
                            onClick={() => confirmDeleteFE(fe)}
                            disabled={deletingFE}
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {(!feFiltered || feFiltered.length === 0) && (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-500" colSpan={4}>
                      No field engineers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );

  /* ------------------------ Customers table ------------------------ */
  const custTable = (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* filters + search */}
      <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative max-w-xs">
          <span className="absolute left-3 top-2.5 text-gray-400">
            <Search className="h-4 w-4" />
          </span>
          <Input
            className="pl-9 rounded-sm"
            placeholder="Search by name or email"
            value={cQ}
            onChange={(e) => { setCQ(e.target.value); setCPage(0); }}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-10 rounded-sm border border-gray-300 px-2 text-sm"
            value={cHasPortal}
            onChange={(e) => { setCHasPortal(e.target.value); setCPage(0); }}
            title="Portal status filter"
            onKeyDown={focusNextOnEnter}
          >
            <option value="ALL">All</option>
            <option value="YES">Portal linked</option>
            <option value="NO">No portal</option>
          </select>
          <span className="text-xs text-gray-500">
            {isCustFetching ? "Loading customers…" : ""}
          </span>
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">NAME</th>
              <th className="px-4 py-3 text-left font-medium">EMAIL</th>
              <th className="px-4 py-3 text-left font-medium">MOBILE</th>
              <th className="px-4 py-3 text-left font-medium">ADDRESS</th>
              <th className="px-4 py-3 text-left font-medium">PORTAL</th>
              <th className="px-4 py-3 text-left font-medium">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(customersData?.items ?? []).map((c) => {
              const portalBadge = c.portalUserId ? "Linked" : "No Portal";
              const portalCls = c.portalUserId
                ? "text-indigo-700 bg-indigo-50 ring-1 ring-indigo-600/20"
                : "text-slate-700 bg-slate-50 ring-1 ring-slate-600/20";

              return (
                <tr key={c.id} className="bg-white hover:bg-gray-50">
                  <td className="px-4 py-3">{c.name || "—"}</td>
                  <td className="px-4 py-3">{c.email || "—"}</td>
                  <td className="px-4 py-3">{c.mobile || "—"}</td>
                  <td className="px-4 py-3">{c.address || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${portalCls}`}>
                      {portalBadge}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 text-sm">
                      {typeof useUpdateCustomerMutation === "function" ? (
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                          onClick={() => openEditCustomer(c)}
                        >
                          <Pencil className="h-4 w-4" /> Edit
                        </button>
                      ) : (
                        <span className="text-gray-400 inline-flex items-center gap-1">
                          <Pencil className="h-4 w-4" /> Edit
                        </span>
                      )}
                      <span className="text-gray-300">|</span>
                      {c.portalUserId ? (
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                          onClick={() => openResetForCustomer(c)}
                        >
                          <KeyRound className="h-4 w-4" /> Reset Password
                        </button>
                      ) : (
                        <span className="text-gray-400 inline-flex items-center gap-1">
                          <KeyRound className="h-4 w-4" /> Reset Password
                        </span>
                      )}
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1"
                        onClick={() => confirmDeleteCustomer(c)}
                        disabled={deletingCust}
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {(!customersData?.items || customersData.items.length === 0) && !isCustFetching && (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={6}>
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* pager */}
      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <span>Items per page:</span>
          <select
            className="border border-gray-300 rounded-md px-2 py-1 bg-white"
            value={cSize}
            onChange={(e) => { setCPage(0); setCSize(Number(e.target.value)); }}
            onKeyDown={focusNextOnEnter}
          >
            <option>5</option>
            <option>10</option>
            <option>20</option>
            <option>50</option>
          </select>
        </div>
        <div className="flex items-center gap-4">
          {(() => {
            const total = customersData?.total ?? 0;
            const page = customersData?.page ?? 0;
            const size = customersData?.size ?? cSize;
            const itemsOnPage = customersData?.items?.length ?? 0;
            const start = total ? page * size + 1 : 0;
            const end = Math.min(total, page * size + itemsOnPage);
            const totalPages = customersData?.totalPages ?? 0;
            const pagesToShow = (() => {
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
            })();

            return (
              <>
                <span>{total ? `${start}–${end} of ${total}` : "0 of 0"}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
                    aria-label="Prev"
                    disabled={page <= 0}
                    onClick={() => setCPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {pagesToShow.map((p, idx) => {
                    const showEllipsis =
                      idx > 0 && p - pagesToShow[idx - 1] > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="px-1 text-gray-400">…</span>}
                        <button
                          type="button"
                          onClick={() => setCPage(p)}
                          className={
                            "min-w-[36px] h-9 px-2 rounded-md border " +
                            (p === page
                              ? "border-blue-600 text-blue-700 bg-blue-50"
                              : "border-gray-300 hover:bg-gray-50")
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
                    onClick={() => setCPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );

  /* ------------------------ render ------------------------ */
  return (
    <div className="space-y-6 select-none">
      {/* header + tabbar */}
      {header}
      {tabs}

      {/* alerts */}
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

      {/* bodies */}
      {tab === TABS.FE ? feTable : custTable}

      {/* ========================== CREATE FE MODAL ========================== */}
      {showCreateFE && (
        <ModalShell onClose={() => setShowCreateFE(false)}>
          <DialogCard title="Create Field Engineer" variant="info">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>Display Name</Label>
                <Input
                  placeholder="e.g., John Doe"
                  value={feDisplayName}
                  onChange={(e) => setFeDisplayName(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Email</Label>
                <Input
                  placeholder="e.g., john.doe@acme.com"
                  value={feEmail}
                  onChange={(e) => setFeEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                className="h-10 px-4 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
                onClick={() => setShowCreateFE(false)}
                disabled={creatingFE}
              >
                Cancel
              </button>
              <Button onClick={handleCreateFE} disabled={creatingFE || feSubmitting} className="min-w-[140px]">
                {creatingFE || feSubmitting ? "Creating…" : "Create Field Engineer"}
              </Button>
            </div>
          </DialogCard>
        </ModalShell>
      )}

      {/* ========================== EDIT FE MODAL ========================== */}
      {editingFE && (
        <ModalShell onClose={() => { if (!updatingFE) closeEditFE(); }}>
          <DialogCard title="Edit Field Engineer" variant="info">
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Display Name</Label>
                  <Input
                    value={efeDisplay}
                    onChange={(e) => setEfeDisplay(e.target.value)}
                    placeholder="e.g., Harish Kumar"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={efeEmail}
                    onChange={(e) => setEfeEmail(e.target.value)}
                    placeholder="harish.kumar@acme.com"
                  />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <select
                  className="h-10 rounded-sm border border-gray-300 px-2 text-sm w-full"
                  value={efeStatus}
                  onChange={(e) => setEfeStatus(e.target.value)}
                  onKeyDown={focusNextOnEnter}
                >
                  {FE_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="pt-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="h-10 px-4 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
                  onClick={closeEditFE}
                  disabled={updatingFE}
                >
                  Cancel
                </button>
                <Button
                  type="button"
                  onClick={saveEditFE}
                  disabled={updatingFE}
                >
                  {updatingFE ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          </DialogCard>
        </ModalShell>
      )}

      {/* ========================== CREATE CUSTOMER MODAL ========================== */}
      {showCreateCust && (
        <ModalShell onClose={() => setShowCreateCust(false)}>
          <DialogCard title="Create Customer" variant="info">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>Name</Label>
                <Input
                  placeholder="e.g., ACME Industries"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  placeholder="e.g., contact@acme.com"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                />
              </div>
              <div>
                <Label>Mobile</Label>
                <Input
                  placeholder="e.g., +91-9876543210"
                  value={custMobile}
                  onChange={(e) => setCustMobile(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Address</Label>
                <Input
                  placeholder="e.g., 123, Industrial Area, Pune"
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                />
              </div>
              <label className="sm:col-span-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={custCreatePortal}
                  onChange={(e) => setCustCreatePortal(e.target.checked)}
                  onKeyDown={focusNextOnEnter}
                />
                Create Portal (password auto-generated & emailed)
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                className="h-10 px-4 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
                onClick={() => setShowCreateCust(false)}
                disabled={creatingCust}
              >
                Cancel
              </button>
              <Button onClick={handleCreateCustomer} disabled={creatingCust || custSubmitting} className="min-w-[120px]">
                {creatingCust || custSubmitting ? "Creating…" : "Create Customer"}
              </Button>
            </div>
          </DialogCard>
        </ModalShell>
      )}

      {/* ========================== EDIT CUSTOMER MODAL ========================== */}
      {editingCust && (
        <ModalShell onClose={() => { if (!updatingCust) closeEditCustomer(); }}>
          <DialogCard title="Edit Customer" variant="info">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>Name</Label>
                <Input value={ecName} onChange={(e) => setEcName(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={ecEmail} onChange={(e) => setEcEmail(e.target.value)} />
              </div>
              <div>
                <Label>Mobile</Label>
                <Input value={ecMobile} onChange={(e) => setEcMobile(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Address</Label>
                <Input value={ecAddress} onChange={(e) => setEcAddress(e.target.value)} />
              </div>
              <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={ecEnablePortal}
                  onChange={(e) => setEcEnablePortal(e.target.checked)}
                  disabled={!!(editingCust?.portalUserId)}
                  onKeyDown={focusNextOnEnter}
                />
                Enable Customer Portal (send credentials)
                {editingCust?.portalUserId ? " — already enabled" : ""}
            </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                className="h-10 px-4 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
                onClick={closeEditCustomer}
                disabled={updatingCust}
              >
                Cancel
              </button>
              <Button onClick={saveEditCustomer} disabled={updatingCust}>
                {updatingCust ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </DialogCard>
        </ModalShell>
      )}

      {/* ========================== RESET PASSWORD MODAL (shared) ========================== */}
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
                  onKeyDown={focusNextOnEnter}
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

      {/* ========================== CONFIRMATION DIALOG (delete) ========================== */}
      {confirmDlg && (
        <ModalShell onClose={() => { if (!confirmDlg.loading) setConfirmDlg(null); }}>
          <DialogCard
            title={confirmDlg.title || (confirmDlg.danger ? "Confirm deletion" : "Are you sure?")}
            subtitle={confirmDlg.subtitle}
            variant={confirmDlg.danger ? "danger" : "info"}
            compact
            footer={(
              <>
                <button
                  type="button"
                  className="h-10 px-4 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  onClick={() => setConfirmDlg(null)}
                  disabled={confirmDlg.loading}
                >
                  {confirmDlg.cancelLabel || "Cancel"}
                </button>
                <Button
                  type="button"
                  className={(confirmDlg.danger ? "bg-rose-600 hover:bg-rose-700 " : "") + (confirmDlg.loading ? "pointer-events-none" : "")}
                  onClick={runConfirm}
                  disabled={confirmDlg.loading}
                >
                  {confirmDlg.loading
                    ? "Processing…"
                    : confirmDlg.confirmLabel || (confirmDlg.danger ? "Delete" : "Confirm")}
                </Button>
              </>
            )}
          >
            {confirmDlg.message ? (
              <p className="text-sm text-slate-700 whitespace-pre-line">{confirmDlg.message}</p>
            ) : null}
          </DialogCard>
        </ModalShell>
      )}
    </div>
  );
}
