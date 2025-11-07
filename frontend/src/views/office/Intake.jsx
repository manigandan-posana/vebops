import React, { useMemo, useState } from "react";
import { FileText, IndianRupee, Search, Trash2, Percent, Printer } from "lucide-react";
import KITS from "./data/htpower_kits.json";
/**
 * Sales & Purchase Docs — Service Request / PINV / Invoice / Purchase Order
 * React + Tailwind (copy-paste ready)
 *
 * ✅ Company + Bank details (+PIN)
 * ✅ Buyer (Bill To) + Consignee (Ship To) with State, PIN, GSTIN
 * ✅ Supplier (Bill From) for PO
 * ✅ HSN/SAC per line (editable; defaults: goods=854690, service=995461)
 * ✅ TN ⇒ CGST 9% + SGST 9% ; Other state ⇒ IGST 18%
 * ✅ Buyer’s order/PO/WO no + date, terms, narration
 * ✅ Delivery Challan No, Work Completion Cert No
 * ✅ Invoice No + Date; Proforma (PINV) No + Date
 * ✅ Print-ready preview (right)
 *
 * Replace DEFAULT_KITS with your API/JSON (code, name, basePrice, hsnSac?).
 */

const DEFAULT_KITS = [
  { id: 1, code: "HESL-1/4C", name: "1.1kV LT End Termination 4C (6–16 sqmm)", basePrice: 2600, hsnSac: "854690" },
  { id: 2, code: "HESL-2/4C", name: "1.1kV LT End Termination 4C (25–50 sqmm)", basePrice: 2820, hsnSac: "854690" },
  { id: 3, code: "HSLA-1/4C", name: "1.1kV LT Straight Through Joint (6–16 sqmm)", basePrice: 2770, hsnSac: "854690" },
  { id: 4, code: "MHI-3.3kV-3C-16-35", name: "3.3kV 3C Indoor Termination (16–35 sqmm)", basePrice: 9990, hsnSac: "854690" },
  { id: 5, code: "MHO-3.3kV-3C-16-35", name: "3.3kV 3C Outdoor Termination (16–35 sqmm)", basePrice: 10510, hsnSac: "854690" },
  { id: 6, code: "MHI-6.6kV-1C-16-35", name: "6.6kV 1C Indoor Termination (16–35 sqmm)", basePrice: 3000, hsnSac: "854690" },
  { id: 7, code: "MHO-6.6kV-1C-16-35", name: "6.6kV 1C Outdoor Termination (16–35 sqmm)", basePrice: 5440, hsnSac: "854690" },
  { id: 8, code: "MHS-6.6kV-1C-16-35", name: "6.6kV 1C Straight Through Joint (16–35 sqmm)", basePrice: 5510, hsnSac: "854690" },
  { id: 9, code: "MHI-11kV-1C-16-35", name: "11kV 1C Indoor Termination (16–35 sqmm)", basePrice: 3020, hsnSac: "854690" },
  { id: 10, code: "MHO-11kV-1C-16-35", name: "11kV 1C Outdoor Termination (16–35 sqmm)", basePrice: 5530, hsnSac: "854690" },
  { id: 11, code: "MHS-11kV-1C-16-35", name: "11kV 1C Straight Through Joint (16–35 sqmm)", basePrice: 12330, hsnSac: "854690" },
  // Example service line (defaults to SAC 995461):
  { id: 99, code: "INSTALL-11KV-INDOOR", name: "Installation of 11kV Indoor Termination", basePrice: 2000, hsnSac: "995461" },
];

/* --------------------------------- Helpers -------------------------------- */
const fmtINR = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    .format(Number.isFinite(n) ? n : 0);

const SERVICE_TYPES = [
  "Installation only",
  "Cable fault identification",
  "Hipot testing",
  "Supply only",
  "Supply with installation",
];

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh","Puducherry","Chandigarh","Andaman & Nicobar","Dadra & Nagar Haveli & Daman & Diu","Lakshadweep"
];

const isTN = (st) => (st || "").trim().toLowerCase() === "tamil nadu";

/* --------------------------------- UI bits -------------------------------- */
function Section({ title, children, right }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function Labeled({ label, children, hint }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className={"h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition " + (props.className || "")}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={"h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition " + (props.className || "")}
    />
  );
}

function NumberInput({ value, onChange, min = 0, step = 1, ...rest }) {
  const handle = (e) => {
    const v = e.target.value;
    const num = v === "" ? "" : Number(v);
    onChange(Number.isFinite(num) || num === "" ? num : 0);
  };
  return (
    <input
      type="number"
      min={min}
      step={step}
      value={value}
      onChange={handle}
      {...rest}
      className={"h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition " + (rest.className || "")}
    />
  );
}

function IconButton({ title, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 active:scale-[.98]"
    >
      {children}
    </button>
  );
}

/* --------------------------- Catalogue (with search) ---------------------- */
function KitCatalogue({ kits, onAdd, pageSize: initialPageSize = 20 }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return kits;
    return kits.filter(k =>
      [k.code, k.name].some(x => (x || "").toLowerCase().includes(qq))
    );
  }, [q, kits]);

  // reset to page 1 when query or pageSize changes
  React.useEffect(() => { setPage(1); }, [q, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, filtered.length);
  const pageItems = filtered.slice(start, end);

  const goFirst = () => setPage(1);
  const goPrev  = () => setPage(p => Math.max(1, p - 1));
  const goNext  = () => setPage(p => Math.min(totalPages, p + 1));
  const goLast  = () => setPage(totalPages);

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-md">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search kits by code/name…"
            className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span>Rows per page:</span>
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-2"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          <span className="hidden sm:inline">•</span>
          <span>
            Showing <span className="font-medium text-slate-900">{filtered.length ? start + 1 : 0}</span>–
            <span className="font-medium text-slate-900">{end}</span> of{" "}
            <span className="font-medium text-slate-900">{filtered.length}</span>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Code</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Base Price</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {pageItems.map(k => (
              <tr key={`${k.id}-${k.code}`} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-sm text-slate-700">{k.code}</td>
                <td className="px-3 py-2 text-sm text-slate-900">{k.name}</td>
                <td className="px-3 py-2 text-right text-sm font-semibold text-slate-900">{fmtINR(k.basePrice)}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onAdd(k)}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Add
                  </button>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">No kits match “{q}”.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="text-sm text-slate-600">
          Page <span className="font-medium text-slate-900">{page}</span> of{" "}
          <span className="font-medium text-slate-900">{totalPages}</span>
        </div>
        <div className="inline-flex items-center gap-2">
          <button onClick={goFirst} disabled={page===1} className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50">« First</button>
          <button onClick={goPrev}  disabled={page===1} className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50">‹ Prev</button>
          <button onClick={goNext}  disabled={page===totalPages} className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50">Next ›</button>
          <button onClick={goLast}  disabled={page===totalPages} className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50">Last »</button>
        </div>
      </div>
    </div>
  );
}


/* ------------------------- Selected Items (cart style) -------------------- */
function SelectedItems({ items, onChange, onRemove, onBulkDiscount }) {
  const chips = [0, 15, 30, 70, 85];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-600">{items.length} item(s) added</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Quick apply to all:</span>
          {chips.map((c) => (
            <IconButton key={c} title={`Set ${c}% for all`} onClick={() => onBulkDiscount(c)}>
              <Percent size={16} /> {c}%
            </IconButton>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Item</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">HSN/SAC</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Base</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Qty</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Disc %</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Line Total</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {items.map((it, idx) => {
              const line = Math.round(it.basePrice * it.qty * (1 - it.discount / 100));
              return (
                <tr key={it.key} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-sm">
                    <div className="font-medium text-slate-900">{it.code}</div>
                    <div className="text-slate-600">{it.name}</div>
                  </td>
                  <td className="px-3 py-2 text-left">
                    <TextInput
                      value={it.hsnSac || ""}
                      onChange={(e) => onChange(idx, { ...it, hsnSac: e.target.value })}
                      className="w-28"
                      placeholder="HSN/SAC"
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-mono">{fmtINR(it.basePrice)}</td>
                  <td className="px-3 py-2 text-right">
                    <NumberInput
                      value={it.qty}
                      min={1}
                      onChange={(v) => onChange(idx, { ...it, qty: v || 1 })}
                      className="w-20 text-right"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <NumberInput
                        value={it.discount}
                        min={0}
                        step={1}
                        onChange={(v) => onChange(idx, { ...it, discount: Math.max(0, Math.min(100, v || 0)) })}
                        className="w-20 text-right"
                      />
                      <div className="flex gap-1">
                        {[0,15,30,70,85].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => onChange(idx, { ...it, discount: d })}
                            className={`rounded-md border px-2 py-1 text-xs ${it.discount===d?"border-blue-600 bg-blue-50 text-blue-700":"border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-700"}`}
                          >
                            {d}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-semibold">{fmtINR(line)}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onRemove(idx)}
                      className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">No items added yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------- Preview Card ---------------------------- */
function PreviewCard({ docType, company, buyer, consignee, supplier, meta, items, totals }) {
  const heading = docType === "PINV" ? "PROFORMA INVOICE"
                 : docType === "INVOICE" ? "TAX INVOICE"
                 : docType === "PO" ? "PURCHASE ORDER"
                 : "SERVICE REQUEST PREVIEW";

  const rightPartyTitle = docType === "PO" ? "Supplier (Bill From)" : "Buyer (Bill To)";
  const rightParty = docType === "PO" ? supplier : buyer;

  return (
    <div className="sticky top-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:rounded-none print:border-0 print:shadow-none print:p-0">
      <div className="mb-3 flex items-center gap-2 text-slate-800">
        <FileText size={18} /> <span className="font-semibold">{heading}</span>
      </div>

      {/* Party blocks */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="text-slate-600">Company</div>
          <div className="font-semibold text-slate-900">{company.name || "Your Company"}</div>
          <div className="text-slate-700 whitespace-pre-line">{company.address}</div>
          <div className="text-slate-700">{company.pin ? `PIN: ${company.pin}` : ""}</div>
          <div className="text-slate-700">{company.state ? `State: ${company.state}` : ""}</div>
          <div className="text-slate-700">{company.gst ? `GSTIN: ${company.gst}` : ""}</div>
        </div>

        <div className="rounded-lg border border-slate-200 p-3">
          <div className="text-slate-600">{rightPartyTitle}</div>
          <div className="font-semibold text-slate-900">{rightParty.name || "—"}</div>
          <div className="text-slate-700 whitespace-pre-line">{rightParty.address}</div>
          <div className="text-slate-700">{rightParty.pin ? `PIN: ${rightParty.pin}` : ""}</div>
          <div className="text-slate-700">{rightParty.state ? `State: ${rightParty.state}` : ""}</div>
          <div className="text-slate-700">{rightParty.gst ? `GSTIN: ${rightParty.gst}` : ""}</div>
        </div>
      </div>

      {/* Consignee (only for sales docs) */}
      {docType !== "PO" && (
        <div className="mt-3 rounded-lg border border-slate-200 p-3 text-sm">
          <div className="text-slate-600">Consignee (Ship To)</div>
          <div className="font-semibold text-slate-900">{consignee.name || "—"}</div>
          <div className="text-slate-700 whitespace-pre-line">{consignee.address}</div>
          <div className="text-slate-700">{consignee.pin ? `PIN: ${consignee.pin}` : ""}</div>
          <div className="text-slate-700">{consignee.state ? `State: ${consignee.state}` : ""}</div>
          <div className="text-slate-700">{consignee.gst ? `GSTIN: ${consignee.gst}` : ""}</div>
        </div>
      )}

      {/* Meta row */}
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-slate-200 p-3 space-y-1">
          {docType !== "PO" && (
            <>
              <div><span className="text-slate-600">Invoice No:</span> <span className="font-medium">{meta.invoiceNo || (docType==="PINV" ? meta.pinvNo : "") || "—"}</span></div>
              <div><span className="text-slate-600">Invoice Date:</span> <span className="font-medium">{meta.invoiceDate || (docType==="PINV" ? meta.pinvDate : "") || "—"}</span></div>
            </>
          )}
          {docType === "PO" && (
            <>
              <div><span className="text-slate-600">PO No:</span> <span className="font-medium">{meta.poNo || "—"}</span></div>
              <div><span className="text-slate-600">PO Date:</span> <span className="font-medium">{meta.poDate || "—"}</span></div>
            </>
          )}
          <div><span className="text-slate-600">Buyer’s Order / PO / WO #:</span> <span className="font-medium">{meta.buyerOrderNo || "—"}</span></div>
          <div><span className="text-slate-600">Order Date:</span> <span className="font-medium">{meta.orderDate || "—"}</span></div>
          <div><span className="text-slate-600">Delivery Challan No:</span> <span className="font-medium">{meta.dcNo || "—"}</span></div>
          <div><span className="text-slate-600">Work Completion Cert No:</span> <span className="font-medium">{meta.wcNo || "—"}</span></div>
        </div>
        <div className="rounded-lg border border-slate-200 p-3 space-y-1">
          <div><span className="text-slate-600">Service Type:</span> <span className="font-medium">{meta.serviceType || "—"}</span></div>
          <div className="text-slate-600">Terms</div>
          <div className="text-slate-800 whitespace-pre-line">{meta.terms || "—"}</div>
          <div className="text-slate-600">Narration</div>
          <div className="text-slate-800 whitespace-pre-line">{meta.narration || "—"}</div>
        </div>
      </div>

      {/* Items table */}
      <div className="my-3 overflow-hidden rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Item</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">HSN/SAC</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Qty</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Base</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Disc%</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Line</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {items.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">No items selected.</td></tr>
            )}
            {items.map((it) => {
              const line = Math.round(it.basePrice * it.qty * (1 - it.discount / 100));
              return (
                <tr key={it.key}>
                  <td className="px-3 py-1 text-sm text-slate-800">
                    <div className="font-medium">{it.code}</div>
                    <div className="text-slate-600">{it.name}</div>
                  </td>
                  <td className="px-3 py-1 text-left text-sm">{it.hsnSac || ""}</td>
                  <td className="px-3 py-1 text-right text-sm">{it.qty}</td>
                  <td className="px-3 py-1 text-right text-sm font-mono">{fmtINR(it.basePrice)}</td>
                  <td className="px-3 py-1 text-right text-sm">{it.discount}%</td>
                  <td className="px-3 py-1 text-right text-sm font-semibold">{fmtINR(line)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><span className="font-medium">{fmtINR(totals.subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-slate-600">Discount Savings</span><span className="font-medium">{fmtINR(totals.discountSavings)}</span></div>
        <div className="flex justify-between"><span className="text-slate-600">Transportation</span><span className="font-medium">{fmtINR(totals.transport)}</span></div>

        {totals.cgst > 0 || totals.sgst > 0 ? (
          <>
            <div className="flex justify-between"><span className="text-slate-600">CGST {totals.cgstRate}%</span><span className="font-medium">{fmtINR(totals.cgst)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">SGST {totals.sgstRate}%</span><span className="font-medium">{fmtINR(totals.sgst)}</span></div>
          </>
        ) : (
          <div className="flex justify-between"><span className="text-slate-600">IGST {totals.igstRate}%</span><span className="font-medium">{fmtINR(totals.igst)}</span></div>
        )}

        <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
          <span>Total</span><span>{fmtINR(totals.grand)}</span>
        </div>
      </div>

      {/* Bank details (prints on invoice/PINV/PO) */}
      <div className="mt-4 rounded-lg border border-slate-200 p-3 text-sm">
        <div className="text-slate-600">Company’s Bank Details</div>
        <div className="text-slate-800">{company.bankName || "—"}</div>
        <div className="text-slate-700">{company.accNo ? `A/c No.: ${company.accNo}` : ""}</div>
        <div className="text-slate-700">{company.ifsc ? `IFSC: ${company.ifsc}` : ""}{company.branch ? ` | Branch: ${company.branch}` : ""}</div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 print:hidden">
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-900">
          <Printer size={16} /> Print
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- Main Page ------------------------------ */
export default function ServiceDocsPage() {
  // Document type: SERVICE (just prep), PINV, INVOICE, PO
  const [docType, setDocType] = useState("INVOICE");

  // Company (defaults shown, change as needed)
  const [company, setCompany] = useState({
    name: "",
    gst: "",
    address: "",
    pin: "",
    state: "Tamil Nadu",
    bankName: "",
    accNo: "",
    ifsc: "",
    branch: "",
  });

  // Buyer / Consignee (for sales docs)
  const [buyer, setBuyer] = useState({ name: "", gst: "", address: "", pin: "", state: "" });
  const [consignee, setConsignee] = useState({ name: "", gst: "", address: "", pin: "", state: "" });

  // Supplier (for PO)
  const [supplier, setSupplier] = useState({ name: "", gst: "", address: "", pin: "", state: "" });

  // Meta and misc
  const [meta, setMeta] = useState({
    serviceType: "",
    buyerOrderNo: "",
    orderDate: "",
    terms: "",
    narration: "",
    dcNo: "",
    wcNo: "",
    invoiceNo: "",
    invoiceDate: "",
    pinvNo: "",
    pinvDate: "",
    poNo: "",
    poDate: "",
  });

  const [catalog] = useState(KITS);
  const [items, setItems] = useState([]);
  const [transport, setTransport] = useState(0);

  // Add kit (default HSN/SAC guess from item or by name)
  const addKit = (k) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((p) => p.code === k.code && (p.hsnSac || k.hsnSac));
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = { ...copy[existingIdx], qty: copy[existingIdx].qty + 1 };
        return copy;
      }
      const defaultHSN = k.hsnSac || ((k.name || "").toLowerCase().includes("install") ? "995461" : "854690");
      return [
        ...prev,
        { key: `${k.code}-${Date.now()}`, code: k.code, name: k.name, basePrice: Number(k.basePrice) || 0, qty: 1, discount: 0, hsnSac: defaultHSN },
      ];
    });
  };

  const changeItem = (idx, next) => setItems((prev) => { const copy = [...prev]; copy[idx] = next; return copy; });
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const bulkDiscount = (d) => setItems((prev) => prev.map((it) => ({ ...it, discount: d })));

  // TAX LOGIC: TN ⇒ CGST 9 + SGST 9, else IGST 18
  const counterpartyState = (docType === "PO" ? supplier.state : buyer.state) || "";
  const useSplit = isTN(counterpartyState); // if counterparty is in Tamil Nadu
  const cgstRate = useSplit ? 9 : 0;
  const sgstRate = useSplit ? 9 : 0;
  const igstRate = useSplit ? 0 : 18;

  const totals = useMemo(() => {
    const raw = items.reduce((acc, it) => acc + it.basePrice * it.qty, 0);
    const afterDisc = items.reduce((acc, it) => acc + it.basePrice * it.qty * (1 - (it.discount || 0) / 100), 0);
    const discountSavings = Math.round(raw - afterDisc);
    const subtotal = Math.round(afterDisc);
    const t = Math.round(Number(transport) || 0);
    const base = subtotal + t;

    const cgst = Math.round(base * cgstRate / 100);
    const sgst = Math.round(base * sgstRate / 100);
    const igst = Math.round(base * igstRate / 100);
    const tax = cgst + sgst + igst;

    const grand = base + tax;
    return { raw, afterDisc, discountSavings, subtotal, transport: t, cgstRate, sgstRate, igstRate, cgst, sgst, igst, tax, grand };
  }, [items, transport, cgstRate, sgstRate, igstRate]);

  const submit = () => {
    const payload = {
      docType,
      company,
      party: docType === "PO" ? { supplier } : { buyer, consignee },
      meta,
      items: items.map(({ code, name, basePrice, qty, discount, hsnSac }) => ({ code, name, basePrice, qty, discount, hsnSac })),
      totals,
    };
    console.log("Submit payload:", payload);
    alert(`${docType} prepared. Check console for payload JSON.`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10 print:p-0">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-3">

        {/* LEFT: forms + catalogue + items */}
        <div className="space-y-6 lg:col-span-2">
          {/* Doc Type / Actions */}
          <Section
            title="Document Setup"
            right={
              <div className="flex gap-2">
                <button type="button" onClick={() => setDocType("PO")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${docType==="PO"?"bg-emerald-600 text-white":"bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}>Create Purchase Order</button>
                <button type="button" onClick={() => setDocType("PINV")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${docType==="PINV"?"bg-violet-600 text-white":"bg-violet-100 text-violet-700 hover:bg-violet-200"}`}>Proforma (PINV)</button>
                <button type="button" onClick={() => setDocType("INVOICE")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${docType==="INVOICE"?"bg-blue-600 text-white":"bg-blue-100 text-blue-700 hover:bg-blue-200"}`}>Tax Invoice</button>
              </div>
            }
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Labeled label="Document Type">
                <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
                  <option value="INVOICE">Tax Invoice</option>
                  <option value="PINV">Proforma (PINV)</option>
                  <option value="PO">Purchase Order (PO)</option>
                </Select>
              </Labeled>
              {docType !== "PO" ? (
                <>
                  <Labeled label={docType==="PINV" ? "PINV No." : "Invoice No."}>
                    <TextInput value={docType==="PINV"?meta.pinvNo:meta.invoiceNo} onChange={(e)=> setMeta(m => ({...m, [docType==="PINV"?"pinvNo":"invoiceNo"]: e.target.value }))} />
                  </Labeled>
                  <Labeled label={docType==="PINV" ? "PINV Date" : "Invoice Date"}>
                    <TextInput type="date" value={docType==="PINV"?meta.pinvDate:meta.invoiceDate} onChange={(e)=> setMeta(m => ({...m, [docType==="PINV"?"pinvDate":"invoiceDate"]: e.target.value }))} />
                  </Labeled>
                </>
              ) : (
                <>
                  <Labeled label="PO No.">
                    <TextInput value={meta.poNo} onChange={(e)=> setMeta(m => ({...m, poNo: e.target.value }))} />
                  </Labeled>
                  <Labeled label="PO Date">
                    <TextInput type="date" value={meta.poDate} onChange={(e)=> setMeta(m => ({...m, poDate: e.target.value }))} />
                  </Labeled>
                </>
              )}
            </div>
          </Section>

          {/* Company */}
          <Section title="Company Details">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Labeled label="Company Name"><TextInput value={company.name} onChange={(e)=> setCompany(c=>({...c, name:e.target.value}))} placeholder="e.g., HT POWER" /></Labeled>
              <Labeled label="GSTIN"><TextInput value={company.gst} onChange={(e)=> setCompany(c=>({...c, gst:e.target.value.toUpperCase()}))} placeholder="33XXXXXXXXX1Zx" /></Labeled>
              <Labeled label="Address"><TextInput value={company.address} onChange={(e)=> setCompany(c=>({...c, address:e.target.value}))} placeholder="Flat, Street, Area, City" /></Labeled>
              <Labeled label="PIN Code"><TextInput value={company.pin} onChange={(e)=> setCompany(c=>({...c, pin:e.target.value}))} placeholder="600050" /></Labeled>
              <Labeled label="State"><Select value={company.state} onChange={(e)=> setCompany(c=>({...c, state:e.target.value}))}>
                <option value="">Select state…</option>
                {INDIAN_STATES.map(s=> <option key={s} value={s}>{s}</option>)}
              </Select></Labeled>
              <div className="grid grid-cols-2 gap-3">
                <Labeled label="Bank Name"><TextInput value={company.bankName} onChange={(e)=> setCompany(c=>({...c, bankName:e.target.value}))} /></Labeled>
                <Labeled label="A/c No."><TextInput value={company.accNo} onChange={(e)=> setCompany(c=>({...c, accNo:e.target.value}))} /></Labeled>
                <Labeled label="IFSC"><TextInput value={company.ifsc} onChange={(e)=> setCompany(c=>({...c, ifsc:e.target.value.toUpperCase()}))} /></Labeled>
                <Labeled label="Branch"><TextInput value={company.branch} onChange={(e)=> setCompany(c=>({...c, branch:e.target.value}))} /></Labeled>
              </div>
            </div>
          </Section>

          {/* Parties */}
          {docType !== "PO" ? (
            <Section title="Buyer & Consignee">
              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Labeled label="Buyer (Bill To) Name"><TextInput value={buyer.name} onChange={(e)=> setBuyer(v=>({...v, name:e.target.value}))} /></Labeled>
                  <Labeled label="Buyer GSTIN"><TextInput value={buyer.gst} onChange={(e)=> setBuyer(v=>({...v, gst:e.target.value.toUpperCase()}))} /></Labeled>
                  <Labeled label="Buyer Address"><TextInput value={buyer.address} onChange={(e)=> setBuyer(v=>({...v, address:e.target.value}))} /></Labeled>
                  <Labeled label="Buyer PIN"><TextInput value={buyer.pin} onChange={(e)=> setBuyer(v=>({...v, pin:e.target.value}))} /></Labeled>
                  <Labeled label="Buyer State"><Select value={buyer.state} onChange={(e)=> setBuyer(v=>({...v, state:e.target.value}))}>
                    <option value="">Select state…</option>
                    {INDIAN_STATES.map(s=> <option key={s} value={s}>{s}</option>)}
                  </Select></Labeled>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Labeled label="Consignee (Ship To) Name"><TextInput value={consignee.name} onChange={(e)=> setConsignee(v=>({...v, name:e.target.value}))} /></Labeled>
                  <Labeled label="Consignee GSTIN (optional)"><TextInput value={consignee.gst} onChange={(e)=> setConsignee(v=>({...v, gst:e.target.value.toUpperCase()}))} /></Labeled>
                  <Labeled label="Consignee Address"><TextInput value={consignee.address} onChange={(e)=> setConsignee(v=>({...v, address:e.target.value}))} /></Labeled>
                  <Labeled label="Consignee PIN"><TextInput value={consignee.pin} onChange={(e)=> setConsignee(v=>({...v, pin:e.target.value}))} /></Labeled>
                  <Labeled label="Consignee State"><Select value={consignee.state} onChange={(e)=> setConsignee(v=>({...v, state:e.target.value}))}>
                    <option value="">Select state…</option>
                    {INDIAN_STATES.map(s=> <option key={s} value={s}>{s}</option>)}
                  </Select></Labeled>
                </div>
              </div>
            </Section>
          ) : (
            <Section title="Supplier (for Purchase Order)">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Labeled label="Supplier (Bill From) Name"><TextInput value={supplier.name} onChange={(e)=> setSupplier(v=>({...v, name:e.target.value}))} /></Labeled>
                <Labeled label="Supplier GSTIN"><TextInput value={supplier.gst} onChange={(e)=> setSupplier(v=>({...v, gst:e.target.value.toUpperCase()}))} /></Labeled>
                <Labeled label="Supplier Address"><TextInput value={supplier.address} onChange={(e)=> setSupplier(v=>({...v, address:e.target.value}))} /></Labeled>
                <Labeled label="Supplier PIN"><TextInput value={supplier.pin} onChange={(e)=> setSupplier(v=>({...v, pin:e.target.value}))} /></Labeled>
                <Labeled label="Supplier State"><Select value={supplier.state} onChange={(e)=> setSupplier(v=>({...v, state:e.target.value}))}>
                  <option value="">Select state…</option>
                  {INDIAN_STATES.map(s=> <option key={s} value={s}>{s}</option>)}
                </Select></Labeled>
              </div>
            </Section>
          )}

          {/* Meta fields */}
          <Section title="Order & Terms">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Labeled label="Buyer’s Order No / PO / WO #">
                <TextInput value={meta.buyerOrderNo} onChange={(e)=> setMeta(m=>({...m, buyerOrderNo:e.target.value}))} placeholder="e.g., REIPL/2025-26/PY035" />
              </Labeled>
              <Labeled label="Order / PO / WO Date">
                <TextInput type="date" value={meta.orderDate} onChange={(e)=> setMeta(m=>({...m, orderDate:e.target.value}))} />
              </Labeled>
              <Labeled label="Delivery Challan No.">
                <TextInput value={meta.dcNo} onChange={(e)=> setMeta(m=>({...m, dcNo:e.target.value}))} />
              </Labeled>
              <Labeled label="Work Completion Certificate No.">
                <TextInput value={meta.wcNo} onChange={(e)=> setMeta(m=>({...m, wcNo:e.target.value}))} />
              </Labeled>
              <Labeled label="Service Type">
                <Select value={meta.serviceType} onChange={(e)=> setMeta(m=>({...m, serviceType:e.target.value}))}>
                  <option value="">Select service…</option>
                  {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Labeled>
              <Labeled label="Terms (payment/delivery)">
                <TextInput value={meta.terms} onChange={(e)=> setMeta(m=>({...m, terms:e.target.value}))} placeholder="e.g., Immediate / 7 days..." />
              </Labeled>
              <Labeled label="Narration / Remarks">
                <TextInput value={meta.narration} onChange={(e)=> setMeta(m=>({...m, narration:e.target.value}))} placeholder="e.g., Site at: Jagalur / Karaikal ..." />
              </Labeled>
            </div>
          </Section>

          {/* Catalogue & items */}
          <Section
            title="Kits Catalogue"
            right={<div className="hidden text-xs text-slate-500 sm:block">Base price from list; set per-item HSN/SAC & discounts after adding.</div>}
          >
            <KitCatalogue kits={catalog} onAdd={addKit} />
          </Section>

          <Section title="Selected Items">
            <SelectedItems items={items} onChange={changeItem} onRemove={removeItem} onBulkDiscount={bulkDiscount} />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Labeled label="Transportation charges (₹)">
                <NumberInput value={transport} onChange={setTransport} min={0} step={100} placeholder="0" />
              </Labeled>
              <div className="grid grid-cols-2 gap-3">
                <Labeled label="CGST %"><NumberInput value={cgstRate} onChange={()=>{}} min={0} step={1} disabled className="bg-slate-100" /></Labeled>
                <Labeled label="SGST %"><NumberInput value={sgstRate} onChange={()=>{}} min={0} step={1} disabled className="bg-slate-100" /></Labeled>
                <Labeled label="IGST %"><NumberInput value={igstRate} onChange={()=>{}} min={0} step={1} disabled className="bg-slate-100" /></Labeled>
                <div className="text-xs text-slate-500 self-end">Tax split auto-sets from Buyer/Supplier State vs Company State.</div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-600">
                <div>Subtotal: <span className="font-semibold text-slate-900">{fmtINR(totals.subtotal)}</span></div>
                <div>Discount savings: <span className="font-semibold text-slate-900">{fmtINR(totals.discountSavings)}</span></div>
                <div>Transport: <span className="font-semibold text-slate-900">{fmtINR(totals.transport)}</span></div>
                {useSplit ? (
                  <>
                    <div>CGST {cgstRate}%: <span className="font-semibold text-slate-900">{fmtINR(totals.cgst)}</span></div>
                    <div>SGST {sgstRate}%: <span className="font-semibold text-slate-900">{fmtINR(totals.sgst)}</span></div>
                  </>
                ) : (
                  <div>IGST {igstRate}%: <span className="font-semibold text-slate-900">{fmtINR(totals.igst)}</span></div>
                )}
              </div>
              <div className="text-right text-lg font-bold text-slate-900 flex items-center gap-2">
                <IndianRupee size={18} /> {fmtINR(totals.grand)}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={submit} className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
                Prepare {docType}
              </button>
            </div>
          </Section>
        </div>

        {/* RIGHT: live preview */}
        <div className="lg:col-span-1">
          <PreviewCard
            docType={docType}
            company={company}
            buyer={buyer}
            consignee={consignee}
            supplier={supplier}
            meta={meta}
            items={items}
            totals={totals}
          />
        </div>
      </div>
    </div>
  );
}
