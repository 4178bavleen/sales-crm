import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  ChevronDown,
  UserRound,
  Settings,
  LogOut,
  Check,
  X,
  Command,
  UserCog,
} from "lucide-react";
import { signOut } from "../../lib/auth";
import { useSession } from "../../lib/useSession";
import SalesCrmLogo from "../ui/SalesCrmLogo";

export default function Topbar() {
  const navigate = useNavigate();
  const session = useSession();
  const userName = session?.user.name ?? "admin";
  const userRole = (session?.user.role ?? "ADMIN").toUpperCase();
  const avatarLetter = userName.charAt(0).toUpperCase() || "A";

  const [search, setSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const notifications = [
    {
      title: "New lead assigned",
      description: "Christopher Maclead has been assigned to you.",
      time: "5 min ago",
    },
    {
      title: "Deal update",
      description: "Rangoni Of Florence pipeline has been updated.",
      time: "30 min ago",
    },
    {
      title: "Task reminder",
      description: "Follow-up call with Carissa Kidman at 2:00 PM.",
      time: "1 hour ago",
    },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-8">
        {/* Left: Search input */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* Brand mark — the sidebar that carries the logo is hidden below md */}
          <NavLink to="/" aria-label="Vibrantick Sales CRM — home" className="md:hidden shrink-0">
            <SalesCrmLogo height="clamp(22px, 6.5vw, 30px)" />
          </NavLink>

          <div className="hidden w-full max-w-xl items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 sm:flex">
            <Search size={17} className="shrink-0 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search leads, contacts, deals, companies..."
              aria-label="Search leads, contacts, deals, companies"
              className="w-full bg-transparent text-xs sm:text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />

            <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-400">
              <Command size={11} /> K
            </span>
          </div>

          {/* Mobile search toggle */}
          <button
            type="button"
            aria-label="Toggle search"
            onClick={() => setShowMobileSearch((prev) => !prev)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 sm:hidden"
          >
            {showMobileSearch ? <X size={20} /> : <Search size={20} />}
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex shrink-0 items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              aria-label="Notifications"
              aria-expanded={showNotifications}
              onClick={() => {
                setShowNotifications((prev) => !prev);
                setShowProfile(false);
              }}
              className={`relative rounded-xl p-2 transition ${
                showNotifications
                  ? "bg-slate-100 text-blue-600"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Bell size={19} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-12 z-50 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Notifications
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      You have 3 updates
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    Close
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.title}
                      className="flex gap-3 px-4 py-3 transition hover:bg-slate-50"
                    >
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <Bell size={16} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800">
                          {notification.title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {notification.description}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="flex w-full items-center justify-center gap-2 border-t border-slate-100 px-4 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50"
                >
                  <Check size={15} />
                  Mark as read
                </button>
              </div>
            )}
          </div>

          {/* Profile Menu */}
          <div className="relative">
            <button
              type="button"
              aria-label="Open profile menu"
              aria-expanded={showProfile}
              onClick={() => {
                setShowProfile((prev) => !prev);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2.5 rounded-xl p-1 transition hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                {avatarLetter}
              </div>

              <div className="hidden text-left sm:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {userName}
                </p>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide leading-tight">
                  {userRole}
                </p>
              </div>

              <ChevronDown
                size={14}
                className="hidden text-slate-400 sm:block"
              />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-xl shadow-slate-200/60">
                <div className="border-b border-slate-100 px-4 py-2.5">
                  <p className="text-sm font-bold text-slate-900">
                    {userName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {userRole}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfile(false);
                    navigate("/profile");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-50"
                >
                  <UserRound size={15} />
                  My Profile
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfile(false);
                    navigate("/users");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-50"
                >
                  <UserCog size={15} />
                  User Management
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfile(false);
                    navigate("/settings");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-50"
                >
                  <Settings size={15} />
                  Account Settings
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setShowProfile(false);
                    navigate("/login", { replace: true });
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50"
                >
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable mobile search */}
      {showMobileSearch && (
        <div className="border-t border-slate-100 p-3 sm:hidden">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input
              type="search"
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search leads..."
              aria-label="Search CRM"
              className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      )}
    </header>
  );
}
