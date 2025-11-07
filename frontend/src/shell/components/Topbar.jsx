import React from "react";
import { useSelector } from "react-redux";
import { Bell, Menu } from "lucide-react";

export default function Topbar({ onMenuClick }) {
  const { user } = useSelector((s) => s.auth);
  const initial = (user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase();

  return (
    // On mobile: no left offset; On desktop: shift by 18rem (16rem sidebar + 2rem gutter)
    <div className="sticky top-0 z-40 ml-0 bg-brand text-white shadow-md">
      <div className="h-16 px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger (hidden on desktop) */}
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-brand-dark focus:outline-none"
          aria-label="Open sidebar"
          title="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Spacer to keep right items aligned when button hidden */}
        <div className="hidden lg:block" />

        {/* Right: Notifications + Avatar */}
        <div className="flex items-center gap-3">
          <button
            className="rounded-full p-2 hover:bg-brand-dark focus:outline-none"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>

          <div className="h-9 w-9 rounded-full bg-white text-brand font-semibold grid place-items-center text-sm">
            {initial}
          </div>
        </div>
      </div>
    </div>
  );
}
