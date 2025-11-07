import React from "react";
import { NavLink } from "react-router-dom";
import useLogout from "./hooks/useLogout";
import {
  LayoutDashboard,
  Building2,
  Users as UsersIcon,
  Receipt,
  Settings as SettingsIcon,
  Activity,
  FileText,
  ClipboardList,
  Package,
  BookOpen,
  Inbox,
  Briefcase,
  LogOut,
  Dot,
  X,
  Layers2,
  Ticket,
  TicketPlus,
  CreditCard,
  Users,
} from "lucide-react";

export default function Sidebar({ items = [], open = false, onClose }) {
  const doLogout = useLogout();

  const logoSrc =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_LOGO_URL) ||
    "/VebOps.png";

  const iconFor = (label = "") => {
    const key = label.toLowerCase();
    if (key.includes("dashboard")) return LayoutDashboard;
    if (key.includes("tenant")) return Users;
    if (key.includes("user")) return UsersIcon;
    if (key.includes("billing") || key.includes("invoice")) return Receipt;
    if (key.includes("setting")) return SettingsIcon;
    if (key.includes("health") || key.includes("activity")) return Activity;
    if (key.includes("proposal")) return FileText;
    if (key.includes("assigned")) return ClipboardList;
    if (key.includes("inventory")) return Package;
    if (key.includes("catalog")) return BookOpen;
    if (key.includes("service")) return TicketPlus;
    if (key.includes("job")) return Briefcase;
    if (key.includes("operations")) return Layers2;
    if (key.includes("subscription")) return CreditCard;
    return Dot;
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/40 lg:hidden ${open ? 'block' : 'hidden'}`}
      />

      {/* Sidebar panel (drawer on mobile, fixed on desktop) */}
      <aside
        className={[
          // position & size
          'fixed inset-y-0 left-0 z-50 w-72 lg:w-64 border-r border-slate-200 bg-brand-light flex flex-col',
          // animation (mobile)
          'transform transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
          // desktop: always visible, no translate
          'lg:translate-x-0',
        ].join(' ')}
      >
        {/* Header */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-slate-200 bg-brand text-white">
          <img src={logoSrc} alt="Logo" className="w-24" />
          {/* Close on mobile */}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto lg:hidden rounded-md p-2 hover:bg-brand-dark focus:outline-none"
            aria-label="Close sidebar"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav (scrollable) */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {items.map((it) => {
            const Icon = iconFor(it.label);
            return (
              <NavLink
                key={it.to}
                to={it.to}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-brand text-white'
                      : 'text-slate-700 hover:bg-brand-light hover:text-brand-dark',
                  ].join(' ')
                }
                end={it.end}
                onClick={onClose /* close drawer after navigation on mobile */}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span>{it.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer (Logout) */}
        <div className="p-3 border-t border-slate-200">
          <button
            onClick={doLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-red-100 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
