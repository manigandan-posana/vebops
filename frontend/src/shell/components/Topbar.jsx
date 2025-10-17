import React from "react";
import { useSelector } from "react-redux";
import { Bell, Menu } from "lucide-react";

export default function Topbar({ onMenuClick }) {
  const { user } = useSelector((s) => s.auth);
  const initial = (user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();

  return (
    // On mobile: no left offset; On desktop: shift by 18rem (16rem sidebar + 2rem gutter)
    <div className="sticky top-0 z-40 ml-0  bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="h-16 px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger (hidden on desktop) */}
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-slate-100"
          aria-label="Open sidebar"
          title="Menu"
        >
          <Menu className="h-5 w-5 text-slate-700" />
        </button>

        {/* Spacer to keep right items aligned when button hidden */}
        <div className="hidden lg:block" />

        {/* Right: Notifications + Avatar */}
        <div className="flex items-center gap-3">
          <button
            className="rounded-full p-2 hover:bg-slate-100"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-5 w-5 text-slate-600" />
          </button>

          <div className="h-9 w-9 rounded-full bg-slate-900 text-white grid place-items-center text-sm font-medium">
            {initial}
          </div>
        </div>
      </div>
    </div>
  );
}
