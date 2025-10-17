// src/pages/inventory/Inventory.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import Modal from "../../shell/components/Modal";
import {
  useGetStoresQuery,
  useGetStocksQuery,
  useGetLedgerQuery,
  useGetItemsQuery,
  useCreateStoreMutation,
  useCreateItemMutation,
  useWoIssueItemMutation,
  useWoReturnItemMutation,
  useReceiveStockMutation,
  useGetKitsQuery,
  useCreateKitMutation,
  useAddKitItemMutation,
} from "../../features/office/officeApi";

import {
  RefreshCw,
  FileDown,
  Search,
  Store,
  PackagePlus,
  Upload,
  Download,
  Undo2,
  BadgeCheck,
  Boxes,
  ReceiptText,
  Package,
  Store as StoreIcon,
  Layers,
  Info,
  Filter,
  ChevronDown,
} from "lucide-react";

/* ---------- tiny helpers (unchanged logic) ---------- */
const asInt = (v) => (v === "" || v === undefined || v === null ? undefined : Number(v));
const fmt = (v) => (v ?? "") + "";
const toNum = (n) => (typeof n === "number" ? n : Number(n ?? 0));
const toDec = (n, d = 2) => Number.parseFloat(n ?? 0).toFixed(d);

/* ---------- styles tuned to the reference ---------- */
const cls = {
  page: "space-y-6",
  card: "bg-white border border-slate-200 rounded-2xl shadow-sm",
  headerBtn:
    "inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
  primary:
    "inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50",
  pill:
    "inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
  input:
    "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300",
  select:
    "h-10 rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100",
  th: "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50",
  td: "px-3 py-2 text-sm text-slate-700",
  tab(active) {
    return (
      "inline-flex items-center gap-2 px-3 py-2 -mb-px border-b-2 " +
      (active
        ? "border-indigo-600 text-indigo-700 font-medium"
        : "border-transparent text-slate-600 hover:text-slate-900")
    );
  },
  qty(n) {
    if (n <= 0) return "text-rose-600";
    if (n < 100) return "text-amber-600";
    return "text-emerald-600";
  },
};

/* ---------- UI bits ---------- */
const Badge = ({ tone = "slate", children }) => {
  const map = {
    green: "text-emerald-700 bg-emerald-50 border-emerald-200",
    red: "text-rose-700 bg-rose-50 border-rose-200",
    amber: "text-amber-700 bg-amber-50 border-amber-200",
    slate: "text-slate-700 bg-slate-50 border-slate-200",
    blue: "text-blue-700 bg-blue-50 border-blue-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${map[tone]}`}>
      {children}
    </span>
  );
};

export default function Inventory() {
  const tenantId = useSelector((s) => s?.auth?.tenantId);

  /* ---------- data ---------- */
  const { data: stores = [], isLoading: storesLoading, error: storesError, refetch: refetchStores } = useGetStoresQuery();
  const { data: items = [], isLoading: itemsLoading, error: itemsError, refetch: refetchItems } =
    useGetItemsQuery(tenantId, { skip: !tenantId });
  const { data: kits = [], isLoading: kitsLoading, error: kitsError, refetch: refetchKits } =
    useGetKitsQuery(tenantId, { skip: !tenantId });

  const [tab, setTab] = useState("stocks"); // stocks | ledger | items | stores | kits

  const [storeId, setStoreId] = useState();
  const [itemId, setItemId] = useState();
  const [itemSearch, setItemSearch] = useState("");
  const [ledgerStoreId, setLedgerStoreId] = useState();

  const [openIssue, setOpenIssue] = useState(false);
  const [openReceive, setOpenReceive] = useState(false);
  const [openReturn, setOpenReturn] = useState(false);
  const [openCheck, setOpenCheck] = useState(false);

  const [openNewItem, setOpenNewItem] = useState(false);
  const [openNewStore, setOpenNewStore] = useState(false);

  const [openNewKit, setOpenNewKit] = useState(false);
  const [openAddKitItem, setOpenAddKitItem] = useState(false);

  const firstStoreId = useMemo(() => stores?.[0]?.id, [stores]);
  useEffect(() => {
    if (!storeId && firstStoreId) setStoreId(firstStoreId);
  }, [firstStoreId]); // eslint-disable-line

  /* ---------- queries depending on filters ---------- */
  const stocksParams = (storeId || itemId) ? { storeId, itemId } : {};
  const { data: stocks = [], isLoading: stocksLoading, error: stocksError, refetch: refetchStocks } =
    useGetStocksQuery(stocksParams);

  const ledgerParams = itemId ? { itemId, storeId: ledgerStoreId || undefined } : undefined;
  const { data: ledger = [], isLoading: ledgerLoading, error: ledgerError, refetch: refetchLedger } =
    useGetLedgerQuery(ledgerParams, { skip: !itemId });

  /* ---------- mutations ---------- */
  const [createStore, { isLoading: creatingStore }] = useCreateStoreMutation();
  const [createItem, { isLoading: creatingItem }] = useCreateItemMutation();
  const [issueItem, { isLoading: issuing }] = useWoIssueItemMutation();
  const [returnItem, { isLoading: returning }] = useWoReturnItemMutation();
  const [receiveStock, { isLoading: receiving }] = useReceiveStockMutation();

  const [createKit, { isLoading: creatingKit }] = useCreateKitMutation();
  const [addKitItem, { isLoading: addingKitItem }] = useAddKitItemMutation();

  /* ---------- filters ---------- */
  const filteredItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    const q = itemSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        fmt(i.code).toLowerCase().includes(q) ||
        fmt(i.name).toLowerCase().includes(q) ||
        fmt(i.hsnSac).toLowerCase().includes(q)
    );
  }, [items, itemSearch]);

  /* ---------- aggregate across stores (for cards & kits) ---------- */
  const stocksByItem = useMemo(() => {
    if (!stocks?.length) return [];
    const m = new Map();
    stocks.forEach((row) => {
      const id = row?.item?.id ?? row?.itemId ?? row?.id ?? `${row?.itemName}`;
      const name = row?.item?.name ?? row?.itemName ?? row?.itemId ?? "Unknown";
      const code = row?.item?.code ?? row?.itemCode ?? "";
      const qoh = toNum(row?.qtyOnHand);
      if (!m.has(id)) m.set(id, { id, code, name, qty: 0 });
      m.get(id).qty += qoh;
    });
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [stocks]);

  /* ---------- availability (for Check modal) ---------- */
  const [checkQty, setCheckQty] = useState("");
  const findAvailable = (iid, sid) => {
    const rows = Array.isArray(stocks) ? stocks : [];
    const inStore = rows.find(
      (s) => (s?.item?.id === iid || s?.itemId === iid) && (s?.store?.id === sid || s?.storeId === sid)
    );
    const allRowsForItem = rows.filter((s) => s?.item?.id === iid || s?.itemId === iid);
    const storeAvail = toNum(inStore?.qtyOnHand) - toNum(inStore?.qtyReserved);
    const totalAvail = allRowsForItem.reduce((sum, s) => sum + (toNum(s?.qtyOnHand) - toNum(s?.qtyReserved)), 0);
    return { storeAvail, totalAvail };
  };
  const availability = useMemo(() => {
    if (!itemId) return null;
    const { storeAvail, totalAvail } = findAvailable(itemId, storeId);
    const need = Number(checkQty || 0);
    return { storeAvail, totalAvail, need, okStore: storeAvail >= need, okAny: totalAvail >= need };
  }, [itemId, storeId, stocks, checkQty]); // eslint-disable-line

  /* ---------- kits helpers (unchanged from your logic) ---------- */
  const extractKitLines = (k) => {
    const raw = k?.lines || k?.items || k?.kitItems || [];
    const norm = Array.isArray(raw)
      ? raw
          .map((ln) => {
            const itemId = ln?.itemId ?? ln?.item?.id ?? ln?.id ?? undefined;
            const qtyReq = toNum(ln?.qty ?? ln?.quantity ?? 0);
            const name = ln?.item?.name ?? ln?.itemName ?? "";
            const code = ln?.item?.code ?? ln?.itemCode ?? "";
            return itemId ? { itemId, qty: qtyReq, name, code } : null;
          })
          .filter(Boolean)
      : [];
    return norm;
  };
  const buildableCountForKit = (k, sid) => {
    const lines = extractKitLines(k);
    if (!lines.length) return null;
    if (sid) {
      let min = Infinity;
      for (const ln of lines) {
        const rows = Array.isArray(stocks) ? stocks : [];
        const inStore = rows.find(
          (s) => (s?.item?.id === ln.itemId || s?.itemId === ln.itemId) && (s?.store?.id === sid || s?.storeId === sid)
        );
        const storeAvail = (toNum(inStore?.qtyOnHand) - toNum(inStore?.qtyReserved)) | 0;
        if (ln.qty <= 0) continue;
        const possible = Math.floor(storeAvail / ln.qty);
        min = Math.min(min, possible);
      }
      return Number.isFinite(min) ? min : 0;
    } else {
      let min = Infinity;
      for (const ln of lines) {
        const agg = stocksByItem.find((r) => r.id === ln.itemId);
        const total = toNum(agg?.qty);
        if (ln.qty <= 0) continue;
        const possible = Math.floor(total / ln.qty);
        min = Math.min(min, possible);
      }
      return Number.isFinite(min) ? min : 0;
    }
  };

  /* ---------- actions ---------- */
  const onRefresh = () => {
    refetchStores();
    refetchStocks();
    if (tenantId) {
      refetchItems();
      refetchKits();
    }
    if (itemId) refetchLedger();
  };
  const ErrorNote = ({ err }) =>
    err ? <div className="text-sm text-rose-600">{err?.data?.message || err?.error || "Something went wrong."}</div> : null;

  /* ---------- form handlers (your logic preserved) ---------- */
  const onCreateStore = async (e) => {
    e.preventDefault();
    if (!tenantId) return alert("Tenant is required to create a store.");
    const f = new FormData(e.currentTarget);
    const name = f.get("name")?.toString().trim();
    const location = f.get("location")?.toString().trim();
    if (!name || !location) return alert("Store name and location are required.");
    const res = await createStore({ tenantId, name, location });
    if (res?.error) alert(res.error?.data?.message || "Failed to create store");
    else {
      e.currentTarget.reset();
      setOpenNewStore(false);
      refetchStores();
    }
  };

  const onCreateItem = async (e) => {
    e.preventDefault();
    if (!tenantId) return alert("Tenant is required to create an item.");
    const f = new FormData(e.currentTarget);
    const code = f.get("code")?.toString().trim();
    const name = f.get("name")?.toString().trim();
    const uom = f.get("uom")?.toString().trim();
    const rate = Number(f.get("rate"));
    const spec = f.get("spec")?.toString().trim() || undefined;
    const taxPercent = f.get("taxPercent") ? Number(f.get("taxPercent")) : undefined;
    const hsnSac = f.get("hsnSac")?.toString().trim() || undefined;
    const rateType = f.get("rateType")?.toString().trim() || undefined;
    if (!code || !name || !uom || !rate) return alert("code, name, uom and rate are required.");
    const res = await createItem({ tenantId, code, name, uom, rate, spec, taxPercent, hsnSac, rateType });
    if (res?.error) alert(res.error?.data?.message || "Failed to create item");
    else {
      e.currentTarget.reset();
      setOpenNewItem(false);
      tenantId && refetchItems();
    }
  };

  const onIssueItem = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const woId = asInt(f.get("woId"));
    const itemIdF = asInt(f.get("itemId"));
    const storeIdF = asInt(f.get("storeId"));
    const qty = Number(f.get("qty"));
    if (!woId || !itemIdF || !storeIdF || !qty) return alert("All fields are required to issue an item.");
    const res = await issueItem({ woId, itemId: itemIdF, storeId: storeIdF, qty });
    if (res?.error) {
      const msg = res.error?.data?.message || "Failed to issue item";
      if (res.error?.status === 409) alert(`Insufficient stock — a Procurement Request has been raised automatically.\n\n${msg}`);
      else alert(msg);
    } else {
      alert("Item issued.");
      onRefresh();
      e.currentTarget.reset();
      setOpenIssue(false);
    }
  };

  const onReturnItem = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const woId = asInt(f.get("woId"));
    const itemIdF = asInt(f.get("itemId"));
    const storeIdF = asInt(f.get("storeId"));
    const qty = Number(f.get("qty"));
    if (!woId || !itemIdF || !storeIdF || !qty) return alert("All fields are required.");
    const res = await returnItem({ woId, itemId: itemIdF, storeId: storeIdF, qty });
    if (res?.error) alert(res.error?.data?.message || "Failed to return item");
    else {
      alert("Return posted.");
      onRefresh();
      e.currentTarget.reset();
      setOpenReturn(false);
    }
  };

  const onReceiveStock = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const itemIdF = asInt(f.get("itemId"));
    const storeIdF = asInt(f.get("storeId"));
    const qty = Number(f.get("qty"));
    const unitCost = f.get("unitCost") ? Number(f.get("unitCost")) : undefined;
    const refProcId = f.get("refProcId") ? asInt(f.get("refProcId")) : undefined;
    if (!itemIdF || !storeIdF || !qty) return alert("Item, store and qty are required.");
    const res = await receiveStock({ itemId: itemIdF, storeId: storeIdF, qty, unitCost, refProcId });
    if (res?.error) alert(res.error?.data?.message || "Failed to receive stock");
    else {
      alert("Stock received.");
      onRefresh();
      e.currentTarget.reset();
      setOpenReceive(false);
    }
  };

  const exportStocksCSV = () => {
    const rows = stocks?.length ? stocks : [];
    const header = ["Item Code", "Item Name", "Store", "On Hand", "Committed", "Available"];
    const csvRows = [header.join(",")];
    rows.forEach((r) => {
      const code = fmt(r?.item?.code ?? r?.itemCode ?? "");
      const name = fmt(r?.item?.name ?? r?.itemName ?? r?.itemId ?? "");
      const store = fmt(r?.store?.name ?? r?.storeName ?? r?.storeId ?? "");
      const qoh = toNum(r?.qtyOnHand);
      const qres = toNum(r?.qtyReserved);
      const avail = qoh - qres;
      csvRows.push([code, name, store, qoh, qres, avail].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stocks.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportLedgerCSV = () => {
    const rows = ledger?.length ? ledger : [];
    const header = ["Date", "Item ID", "Item Name", "Type", "Qty Change", "Balance", "Store", "Reference"];
    const csvRows = [header.join(",")];
    rows.forEach((l) => {
      const ref = `${l?.refType ?? ""}${l?.refId ? `#${l.refId}` : ""}`;
      const qty = toNum(l?.qty);
      const tx = l?.txType;
      const change = tx === "OUT" ? -Math.abs(qty) : qty;
      csvRows.push(
        [l?.occurredAt || l?.date || "", l?.itemId || l?.item?.id || "", l?.itemName || l?.item?.name || "", tx, change, l?.balanceAfter ?? "", l?.store?.name || l?.storeName || "", ref]
          .map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`)
          .join(",")
      );
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ledger.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------- header ---------- */
  return (
    <div className={cls.page}>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inventory Dashboard</h1>
        <div className="flex items-center gap-3">
          <button className={cls.headerBtn} onClick={onRefresh}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          {tab === "ledger" ? (
            <button className={cls.primary} onClick={exportLedgerCSV} disabled={!ledger?.length}>
              <FileDown className="w-4 h-4" />
              Export Ledger CSV
            </button>
          ) : (
            <button className={cls.primary} onClick={exportStocksCSV} disabled={!stocks?.length}>
              <FileDown className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      <div className={`${cls.card}`}>
        {/* Tabs */}
        <div className="flex gap-4 px-6 pt-4 border-b border-slate-200">
          <button className={cls.tab(tab === "stocks")} onClick={() => setTab("stocks")}>
            <Boxes className="w-4 h-4" /> Stocks
          </button>
          <button className={cls.tab(tab === "ledger")} onClick={() => setTab("ledger")}>
            <ReceiptText className="w-4 h-4" /> Ledger
          </button>
          <button className={cls.tab(tab === "items")} onClick={() => setTab("items")}>
            <Package className="w-4 h-4" /> Item Master
          </button>
          <button className={cls.tab(tab === "stores")} onClick={() => setTab("stores")}>
            <StoreIcon className="w-4 h-4" /> Stores
          </button>
          <button className={cls.tab(tab === "kits")} onClick={() => setTab("kits")}>
            <Layers className="w-4 h-4" /> Kits
          </button>
        </div>

        {/* Actions row under tabs (matches reference) */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-slate-200">
          {tab === "stocks" && (
            <>
              <button className={cls.pill} onClick={() => setOpenIssue(true)}>
                <Upload className="w-4 h-4" /> Issue Item
              </button>
              <button className={cls.pill} onClick={() => setOpenReceive(true)}>
                <Download className="w-4 h-4" /> Receive Stock
              </button>
              <button className={cls.pill} onClick={() => setOpenReturn(true)}>
                <Undo2 className="w-4 h-4" /> Return Stock
              </button>
              <button className={cls.pill} onClick={() => setOpenCheck(true)}>
                <BadgeCheck className="w-4 h-4" /> Check Availability
              </button>
            </>
          )}

          {tab === "items" && (
            <button className={cls.pill} onClick={() => setOpenNewItem(true)}>
              <PackagePlus className="w-4 h-4" /> Add New Item
            </button>
          )}

          {tab === "stores" && (
            <button className={cls.pill} onClick={() => setOpenNewStore(true)}>
              <Store className="w-4 h-4" /> Add New Store
            </button>
          )}

          {tab === "kits" && (
            <>
              <button className={cls.pill} onClick={() => setOpenNewKit(true)}>
                <PackagePlus className="w-4 h-4" /> Create Kit
              </button>
              <button className={cls.pill} onClick={() => setOpenAddKitItem(true)}>
                <PackagePlus className="w-4 h-4" /> Add Kit Item
              </button>
            </>
          )}

          {/* right side controls (search + filter) */}
          <div className="ml-auto flex items-center gap-2 min-w-[280px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className={`${cls.input} pl-9 bg-slate-50`}
                placeholder={tab === "stores" ? "Search stores..." : "Search items..."}
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
              />
            </div>
            <button className={cls.headerBtn}>
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>

        {/* Filter strip (Store/Item) */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Store:</span>
            <select className={cls.select} value={storeId ?? ""} onChange={(e) => setStoreId(asInt(e.target.value))}>
              <option value="">All Stores</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Item:</span>
            <select className={cls.select} value={itemId ?? ""} onChange={(e) => setItemId(asInt(e.target.value))}>
              <option value="">All Items</option>
              {filteredItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code ? `${i.code} — ${i.name}` : i.name}
                </option>
              ))}
            </select>
          </div>

          {tab === "ledger" && (
            <>
              <div className="flex items-center gap-2 ml-2">
                <span className="text-sm text-slate-600">Store (Ledger):</span>
                <select
                  className={cls.select}
                  value={ledgerStoreId ?? ""}
                  onChange={(e) => setLedgerStoreId(asInt(e.target.value))}
                >
                  <option value="">All Stores</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Time Range:</span>
                <input className={cls.input} placeholder="mm/dd/yyyy" />
                <ChevronDown className="w-4 h-4 text-slate-400 -ml-8 pointer-events-none" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Type:</span>
                <select className={cls.select} defaultValue="">
                  <option value="">All Types</option>
                  <option value="IN">Stock In</option>
                  <option value="OUT">Stock Out</option>
                  <option value="RETURN">Return</option>
                  <option value="ADJUST">Adjustment</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Main content per tab */}
        <div className="p-6">
          {/* STOCKS TAB */}
          {tab === "stocks" && (
            <>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">
                  Stocks {storeId ? `— ${stores.find((s) => s.id === storeId)?.name || storeId}` : "— All Stores"}
                </h3>
                {(stocksLoading || creatingStore || creatingItem || issuing || receiving || returning || creatingKit || addingKitItem) && (
                  <div className="text-sm text-slate-500">Working…</div>
                )}
              </div>
              <ErrorNote err={stocksError} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className={cls.th}>Item</th>
                      <th className={cls.th}>SKU</th>
                      <th className={cls.th}>Store</th>
                      <th className={`${cls.th} text-right`}>Available</th>
                      <th className={`${cls.th} text-right`}>On Hand</th>
                      <th className={`${cls.th} text-right`}>Committed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocksLoading ? (
                      <tr>
                        <td className={cls.td} colSpan={6}>
                          Loading stocks…
                        </td>
                      </tr>
                    ) : stocks?.length ? (
                      stocks.map((s) => {
                        const key = s.id ?? `${s?.item?.id}-${s?.store?.id}`;
                        const code = s?.item?.code ?? s?.itemCode ?? "";
                        const name = s?.item?.name ?? s?.itemName ?? s?.itemId ?? "";
                        const storeName = s?.store?.name ?? s?.storeName ?? s?.storeId ?? "";
                        const qoh = toNum(s?.qtyOnHand);
                        const qres = toNum(s?.qtyReserved);
                        const avail = qoh - qres;
                        return (
                          <tr key={key} className="border-t border-slate-200">
                            <td className={cls.td}>{fmt(name)}</td>
                            <td className={cls.td}>{fmt(code)}</td>
                            <td className={cls.td}>{fmt(storeName)}</td>
                            <td className={`${cls.td} text-right ${cls.qty(avail)}`}>{avail}</td>
                            <td className={`${cls.td} text-right`}>{qoh}</td>
                            <td className={`${cls.td} text-right`}>{qres}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className={cls.td} colSpan={6}>
                          No data to display.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Aggregated cards (like the reference) */}
              {!storeId && stocksByItem.length > 0 && (
                <div className="mt-8">
                  <h4 className="font-semibold mb-3">Aggregated Stock View (All Stores)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stocksByItem.map((r) => (
                      <div key={r.id} className="p-4 rounded-2xl border border-slate-200 bg-white">
                        <div className="text-slate-600">{r.name}</div>
                        <div className={`text-4xl font-bold mt-1 ${cls.qty(r.qty)}`}>{r.qty}</div>
                        <div className="text-xs text-emerald-700 mt-1">Available</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* LEDGER TAB */}
          {tab === "ledger" && (
            <>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Stock Ledger</h3>
              </div>
              <ErrorNote err={ledgerError} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className={cls.th}>Date</th>
                      <th className={cls.th}>Item ID</th>
                      <th className={cls.th}>Item Name</th>
                      <th className={cls.th}>Transaction Type</th>
                      <th className={`${cls.th} text-right`}>Qty Change</th>
                      <th className={`${cls.th} text-right`}>Balance</th>
                      <th className={cls.th}>Store</th>
                      <th className={cls.th}>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerLoading ? (
                      <tr>
                        <td className={cls.td} colSpan={8}>
                          Loading ledger…
                        </td>
                      </tr>
                    ) : itemId && ledger?.length ? (
                      ledger.map((l) => {
                        const time = l?.occurredAt || l?.date || "";
                        const item = l?.item?.name || l?.itemName || l?.itemId || "";
                        const tx = l?.txType; // IN | OUT | ADJUST | TRANSFER
                        const qty = toNum(l?.qty);
                        const change = tx === "OUT" ? -Math.abs(qty) : qty;
                        const tone = tx === "IN" ? "green" : tx === "RETURN" ? "amber" : tx === "OUT" ? "red" : "slate";
                        const ref = `${l?.refType ?? ""}${l?.refId ? `#${l.refId}` : ""}`;
                        return (
                          <tr key={l.id} className="border-t border-slate-200">
                            <td className={cls.td}>{fmt(time)}</td>
                            <td className={cls.td}>{fmt(l?.itemId ?? "")}</td>
                            <td className={cls.td}>{fmt(item)}</td>
                            <td className={cls.td}>
                              <Badge tone={tone}>{tx === "IN" ? "Stock In" : tx === "OUT" ? "Stock Out" : tx || "—"}</Badge>
                            </td>
                            <td className={`${cls.td} text-right ${change < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                              {change > 0 ? `+${change}` : change}
                            </td>
                            <td className={`${cls.td} text-right`}>{l?.balanceAfter ?? ""}</td>
                            <td className={cls.td}>{fmt(l?.store?.name || l?.storeName || l?.storeId || "")}</td>
                            <td className={cls.td}>{ref}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className={cls.td} colSpan={8}>
                          {itemId ? "No ledger rows." : "Select an Item (filters above) to view ledger."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ITEM MASTER */}
          {tab === "items" && (
            <>
              <h3 className="font-semibold mb-2">Items</h3>
              <ErrorNote err={itemsError} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className={cls.th}>Code</th>
                      <th className={cls.th}>Name</th>
                      <th className={cls.th}>UoM</th>
                      <th className={`${cls.th} text-right`}>Rate</th>
                      <th className={cls.th}>Rate Type</th>
                      <th className={`${cls.th} text-right`}>Tax %</th>
                      <th className={cls.th}>HSN/SAC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(filteredItems) && filteredItems.length ? (
                      filteredItems.map((i) => (
                        <tr key={i.id} className="border-t border-slate-200">
                          <td className={cls.td}>{i.code}</td>
                          <td className={cls.td}>{i.name}</td>
                          <td className={cls.td}>{i.uom}</td>
                          <td className={`${cls.td} text-right`}>{toDec(i.rate)}</td>
                          <td className={cls.td}>{i.rateType || "STANDARD"}</td>
                          <td className={`${cls.td} text-right`}>{i.taxPercent != null ? toDec(i.taxPercent) : ""}</td>
                          <td className={cls.td}>{i.hsnSac || ""}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className={cls.td} colSpan={7}>
                          No items.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* STORES */}
          {tab === "stores" && (
            <>
              <h3 className="font-semibold mb-2">Stores</h3>
              <ErrorNote err={storesError} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className={cls.th}>ID</th>
                      <th className={cls.th}>Name</th>
                      <th className={cls.th}>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storesLoading ? (
                      <tr>
                        <td className={cls.td} colSpan={3}>
                          Loading…
                        </td>
                      </tr>
                    ) : stores?.length ? (
                      stores.map((s) => (
                        <tr key={s.id} className="border-t border-slate-200">
                          <td className={cls.td}>{s.id}</td>
                          <td className={cls.td}>{s.name}</td>
                          <td className={cls.td}>{s.location}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className={cls.td} colSpan={3}>
                          No stores.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* KITS */}
          {tab === "kits" && (
            <>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold">Kits</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Info className="w-4 h-4" />
                  <span>
                    Buildable count is estimated from current stock
                    {storeId ? ` in "${stores.find((s) => s.id === storeId)?.name || storeId}"` : " across all stores"}.
                  </span>
                </div>
              </div>
              <ErrorNote err={kitsError} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className={cls.th}>Kit Name</th>
                      <th className={cls.th}>Service Type</th>
                      <th className={`${cls.th} text-right`}>Price</th>
                      <th className={`${cls.th} text-right`}>Components</th>
                      <th className={`${cls.th} text-right`}>Buildable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kitsLoading ? (
                      <tr>
                        <td className={cls.td} colSpan={5}>
                          Loading kits…
                        </td>
                      </tr>
                    ) : Array.isArray(kits) && kits.length ? (
                      kits.map((k) => {
                        const lines = extractKitLines(k);
                        const components = lines.length || (k?.componentCount ?? 0);
                        const buildable = buildableCountForKit(k, storeId);
                        return (
                          <tr key={k.id} className="border-t border-slate-200 align-top">
                            <td className={cls.td}>{k.name}</td>
                            <td className={cls.td}>{k.serviceType || "SUPPLY"}</td>
                            <td className={`${cls.td} text-right`}>{k.price != null ? toDec(k.price) : ""}</td>
                            <td className={`${cls.td} text-right`}>{components || ""}</td>
                            <td className={`${cls.td} text-right`}>{buildable ?? "—"}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className={cls.td} colSpan={5}>
                          No kits.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* inline BOM sections (accordion-like simple blocks) */}
              {Array.isArray(kits) && kits.some((k) => extractKitLines(k).length) && (
                <div className="mt-6 space-y-4">
                  {kits.map((k) => {
                    const lines = extractKitLines(k);
                    if (!lines.length) return null;
                    return (
                      <div key={`bom-${k.id}`} className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-4 py-2 bg-slate-50 text-sm font-medium flex items-center justify-between">
                          <span>{k.name} — Components</span>
                          <span className="text-slate-500">Count: {lines.length}</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr>
                                <th className={cls.th}>Item Code</th>
                                <th className={cls.th}>Item</th>
                                <th className={`${cls.th} text-right`}>Qty / Kit</th>
                                <th className={`${cls.th} text-right`}>Available {storeId ? "@Store" : "All"}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lines.map((ln, idx) => {
                                const rows = Array.isArray(stocks) ? stocks : [];
                                const inStore = rows.find(
                                  (s) =>
                                    (s?.item?.id === ln.itemId || s?.itemId === ln.itemId) &&
                                    (s?.store?.id === storeId || s?.storeId === storeId)
                                );
                                const storeAvail = toNum(inStore?.qtyOnHand) - toNum(inStore?.qtyReserved);
                                const totalAvail = stocksByItem.find((r) => r.id === ln.itemId)?.qty ?? 0;
                                const avail = storeId ? storeAvail : totalAvail;
                                return (
                                  <tr key={`${k.id}-${ln.itemId}-${idx}`} className="border-t border-slate-200">
                                    <td className={cls.td}>{ln.code || ""}</td>
                                    <td className={cls.td}>{ln.name || ln.itemId}</td>
                                    <td className={`${cls.td} text-right`}>{toDec(ln.qty)}</td>
                                    <td className={`${cls.td} text-right ${cls.qty(avail)}`}>{toDec(avail)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ========== MODALS (use your Modal component) ========== */}
      {/* Issue */}
      <Modal open={openIssue} onClose={() => setOpenIssue(false)} title="Issue Item to Work Order">
        <form className="space-y-3" onSubmit={onIssueItem}>
          <input name="woId" type="number" className={cls.input} placeholder="WO ID" />
          <select name="itemId" className={cls.select} defaultValue="">
            <option value="">Select Item</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.code ? `${i.code} — ${i.name}` : i.name}
              </option>
            ))}
          </select>
          <select name="storeId" className={cls.select} defaultValue="">
            <option value="">Select Store</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input name="qty" type="number" step="0.01" className={cls.input} placeholder="Quantity" />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className={cls.headerBtn} onClick={() => setOpenIssue(false)}>
              Cancel
            </button>
            <button className={cls.primary} disabled={issuing}>
              {issuing ? "Issuing…" : "Issue"}
            </button>
          </div>
          <div className="text-xs text-slate-500">
            If stock is insufficient, a <b>Procurement Request</b> will be raised automatically (409).
          </div>
        </form>
      </Modal>

      {/* Receive */}
      <Modal open={openReceive} onClose={() => setOpenReceive(false)} title="Receive Stock">
        <form className="space-y-3" onSubmit={onReceiveStock}>
          <select name="itemId" className={cls.select} defaultValue="">
            <option value="">Select Item</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.code ? `${i.code} — ${i.name}` : i.name}
              </option>
            ))}
          </select>
          <select name="storeId" className={cls.select} defaultValue="">
            <option value="">Select Store</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input name="qty" type="number" step="0.01" className={cls.input} placeholder="Quantity" />
          <div className="grid grid-cols-2 gap-2">
            <input name="unitCost" type="number" step="0.01" className={cls.input} placeholder="Unit Cost (optional)" />
            <input name="refProcId" type="number" className={cls.input} placeholder="PR/PO Ref (optional)" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className={cls.headerBtn} onClick={() => setOpenReceive(false)}>
              Cancel
            </button>
            <button className={cls.primary} disabled={receiving}>
              {receiving ? "Receiving…" : "Receive"}
            </button>
          </div>
          <div className="text-xs text-slate-500">
            If Item’s Rate Type is <b>AVG</b>, backend updates rolling average using this Unit Cost.
          </div>
        </form>
      </Modal>

      {/* Return */}
      <Modal open={openReturn} onClose={() => setOpenReturn(false)} title="Return Unused Item">
        <form className="space-y-3" onSubmit={onReturnItem}>
          <input name="woId" type="number" className={cls.input} placeholder="WO ID" />
          <select name="itemId" className={cls.select} defaultValue="">
            <option value="">Item</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.code ? `${i.code} — ${i.name}` : i.name}
              </option>
            ))}
          </select>
          <select name="storeId" className={cls.select} defaultValue="">
            <option value="">Store</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input name="qty" type="number" step="0.01" className={cls.input} placeholder="Qty" />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className={cls.headerBtn} onClick={() => setOpenReturn(false)}>
              Cancel
            </button>
            <button className={cls.primary} disabled={returning}>
              {returning ? "Posting…" : "Return"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Check Availability */}
      <Modal open={openCheck} onClose={() => setOpenCheck(false)} title="Check Availability">
        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-1">Item</label>
            <select className={cls.select} value={itemId ?? ""} onChange={(e) => setItemId(asInt(e.target.value))}>
              <option value="">Pick an Item</option>
              {filteredItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code ? `${i.code} — ${i.name}` : i.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1">Store</label>
            <select className={cls.select} value={storeId ?? ""} onChange={(e) => setStoreId(asInt(e.target.value))}>
              <option value="">All Stores</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1">Required Qty</label>
            <input className={cls.input} value={checkQty} onChange={(e) => setCheckQty(e.target.value)} placeholder="e.g. 12.5" />
          </div>
          {availability && (
            <div className="p-3 rounded-xl border border-slate-200">
              <div>
                Store Available: <b>{toDec(availability.storeAvail)}</b>
              </div>
              <div>
                All Stores Available: <b>{toDec(availability.totalAvail)}</b>
              </div>
              {availability.need > 0 && (
                <div className="mt-1">
                  <span className={availability.okAny ? "text-emerald-700" : "text-rose-700"}>
                    {availability.okAny ? "Sufficient across stores." : "Insufficient — issuing will auto-raise PR."}
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end">
            <button className={cls.headerBtn} onClick={() => setOpenCheck(false)}>
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* New Item */}
      <Modal open={openNewItem} onClose={() => setOpenNewItem(false)} title="Add New Item">
        <form className="space-y-3" onSubmit={onCreateItem}>
          {!tenantId && <div className="text-xs text-amber-600">Tenant is required to create an item.</div>}
          <input name="code" className={cls.input} placeholder="Code (e.g., CBL-2.5SQMM)" />
          <input name="name" className={cls.input} placeholder="Name" />
          <input name="uom" className={cls.input} placeholder="UoM (e.g., MTR, NOS)" />
          <input name="rate" type="number" step="0.01" className={cls.input} placeholder="Rate" />
          <textarea name="spec" className={`${cls.input} h-20`} placeholder="Spec (optional)"></textarea>
          <div className="grid grid-cols-3 gap-2">
            <select name="rateType" className={cls.select} defaultValue="STANDARD">
              <option value="STANDARD">STANDARD</option>
              <option value="AVG">AVG (rolling)</option>
            </select>
            <input name="taxPercent" type="number" step="0.01" className={cls.input} placeholder="Tax %" />
            <input name="hsnSac" className={cls.input} placeholder="HSN/SAC" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className={cls.headerBtn} onClick={() => setOpenNewItem(false)}>
              Cancel
            </button>
            <button className={cls.primary} disabled={!tenantId || creatingItem}>
              {creatingItem ? "Creating…" : "Create Item"}
            </button>
          </div>
          {itemsLoading && <div className="text-xs text-slate-500">Loading items…</div>}
          <ErrorNote err={itemsError} />
        </form>
      </Modal>

      {/* New Store */}
      <Modal open={openNewStore} onClose={() => setOpenNewStore(false)} title="Add New Store">
        <form className="space-y-3" onSubmit={onCreateStore}>
          {!tenantId && <div className="text-xs text-amber-600">Tenant is required to create a store.</div>}
          <input name="name" className={cls.input} placeholder="Store name" />
          <input name="location" className={cls.input} placeholder="Location" />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className={cls.headerBtn} onClick={() => setOpenNewStore(false)}>
              Cancel
            </button>
            <button className={cls.primary} disabled={!tenantId || creatingStore}>
              {creatingStore ? "Creating…" : "Add Store"}
            </button>
          </div>
          {storesLoading && <div className="text-xs text-slate-500">Loading stores…</div>}
          <ErrorNote err={storesError} />
        </form>
      </Modal>

      {/* New Kit */}
      <Modal open={openNewKit} onClose={() => setOpenNewKit(false)} title="Create Kit">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!tenantId) return alert("Tenant is required to create a kit.");
            const f = new FormData(e.currentTarget);
            const name = f.get("name")?.toString().trim();
            const description = f.get("description")?.toString().trim() || undefined;
            const serviceType = f.get("serviceType")?.toString().trim() || "SUPPLY";
            const price = f.get("price") ? Number(f.get("price")) : 0;
            if (!name) return alert("Kit name is required.");
            const res = await createKit({ tenantId, name, description, serviceType, price });
            if (res?.error) alert(res.error?.data?.message || "Failed to create kit");
            else {
              alert("Kit created.");
              e.currentTarget.reset();
              setOpenNewKit(false);
              refetchKits();
            }
          }}
        >
          {!tenantId && <div className="text-xs text-amber-600">Tenant is required to create a kit.</div>}
          <input name="name" className={cls.input} placeholder="Kit Name" />
          <input name="description" className={cls.input} placeholder="Description (optional)" />
          <select name="serviceType" className={cls.select} defaultValue="SUPPLY">
            {["SUPPLY", "SUPPLY_INSTALL", "INSTALL_ONLY", "ERECTION"].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <input name="price" type="number" step="0.01" className={cls.input} placeholder="Price (optional)" />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className={cls.headerBtn} onClick={() => setOpenNewKit(false)}>
              Cancel
            </button>
            <button className={cls.primary} disabled={!tenantId || creatingKit}>
              {creatingKit ? "Creating…" : "Create Kit"}
            </button>
          </div>
          {kitsLoading && <div className="text-xs text-slate-500">Loading kits…</div>}
          <ErrorNote err={kitsError} />
        </form>
      </Modal>

      {/* Add Kit Item */}
      <Modal open={openAddKitItem} onClose={() => setOpenAddKitItem(false)} title="Add Item to Kit">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!tenantId) return alert("Tenant is required.");
            const f = new FormData(e.currentTarget);
            const kitId = asInt(f.get("kitId"));
            const itemIdV = asInt(f.get("itemId"));
            const qty = Number(f.get("qty"));
            if (!kitId || !itemIdV || !qty) return alert("Kit, item and qty are required.");
            const res = await addKitItem({ tenantId, kitId, itemId: itemIdV, qty });
            if (res?.error) alert(res.error?.data?.message || "Failed to add item to kit");
            else {
              alert("Kit item added.");
              e.currentTarget.reset();
              setOpenAddKitItem(false);
              refetchKits();
            }
          }}
        >
          {!tenantId && <div className="text-xs text-amber-600">Tenant is required.</div>}
          <select name="kitId" className={cls.select} defaultValue="">
            <option value="">Select Kit</option>
            {Array.isArray(kits) && kits.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
          <select name="itemId" className={cls.select} defaultValue="">
            <option value="">Select Item</option>
            {Array.isArray(items) &&
              items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code ? `${i.code} — ${i.name}` : i.name}
                </option>
              ))}
          </select>
          <input name="qty" type="number" step="0.01" className={cls.input} placeholder="Qty per kit" />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className={cls.headerBtn} onClick={() => setOpenAddKitItem(false)}>
              Cancel
            </button>
            <button className={cls.primary} disabled={!tenantId || addingKitItem}>
              {addingKitItem ? "Adding…" : "Add to Kit"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
