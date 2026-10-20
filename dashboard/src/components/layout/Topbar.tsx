
import { useState } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  UserRound,
  Settings,
  LogOut,
  Check,
  X,
} from "lucide-react";

export default function Topbar() {
  const [search, setSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const notifications = [
    {
      title: "New lead assigned",
      description: "A new lead has been added to your pipeline.",
      time: "5 min ago",
    },
    {
      title: "Deal update",
      description: "Your sales pipeline has been updated.",
      time: "30 min ago",
    },
    {
      title: "Task reminder",
      description: "You have follow-ups scheduled for today.",
      time: "1 hour ago",
    },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-8">
        {/* Left: Search */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="hidden w-full max-w-md items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50 sm:flex">
            <Search size={18} className="shrink-0 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search leads, contacts, deals..."
              aria-label="Search CRM"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />

            <kbd className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-400">
              /
            </kbd>
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
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">

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
              className={`relative rounded-xl p-2.5 transition ${
                showNotifications
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Bell size={20} />
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
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
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
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
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
                  className="flex w-full items-center justify-center gap-2 border-t border-slate-100 px-4 py-3 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                >
                  <Check size={15} />
                  Mark as read
                </button>
              </div>
            )}
          </div>

          {/* Profile menu */}
          <div className="relative border-l border-slate-200 pl-3">
            <button
              type="button"
              aria-label="Open profile menu"
              aria-expanded={showProfile}
              onClick={() => {
                setShowProfile((prev) => !prev);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 ring-2 ring-white">
                GD
              </div>

              <div className="hidden text-left lg:block">
                <p className="text-sm font-semibold text-slate-800">
                  Gabriel Deora
                </p>
                <p className="text-xs text-slate-400">Sales Manager</p>
              </div>

              <ChevronDown
                size={15}
                className="hidden text-slate-400 lg:block"
              />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-xl shadow-slate-200/60">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">
                    Gabriel Deora
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    Sales Manager
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowProfile(false)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <UserRound size={16} />
                  My Profile
                </button>

                <button
                  type="button"
                  onClick={() => setShowProfile(false)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <Settings size={16} />
                  Account Settings
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => setShowProfile(false)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} />
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
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-indigo-300">
            <Search size={18} className="shrink-0 text-slate-400" />
            <input
              type="search"
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search CRM..."
              aria-label="Search CRM"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      )}
    </header>
  );
}
