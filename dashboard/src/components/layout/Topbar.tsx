import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  ChevronDown,
  UserRound,
  LogOut,
  Check,
  CheckCheck,
  X,
  Command,
  UserCog,
  CheckSquare,
  Users,
  GitFork,
  CalendarDays,
  Trash2,
  RotateCw,
  ExternalLink,
  Inbox,
} from "lucide-react";
import { signOut } from "../../lib/auth";
import { useSession } from "../../lib/useSession";
import { useNotifications } from "../../context/NotificationContext";
import {
  formatNotificationTime,
  getNotificationMetadata,
} from "../../lib/notifications";
import type { NotificationItem } from "../../types/notification";
import SalesCrmLogo from "../ui/SalesCrmLogo";

export default function Topbar() {
  const navigate = useNavigate();
  const session = useSession();
  const userName = session?.user.name ?? "admin";
  const userRole = (session?.user.role ?? "ADMIN").toUpperCase();
  const avatarLetter = userName.charAt(0).toUpperCase() || "A";

  const {
    unreadCount,
    notifications,
    loading,
    refreshNotifications,
    markRead,
    markAllRead,
    removeNotification,
  } = useNotifications();

  const [search, setSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [dropdownFilter, setDropdownFilter] = useState<"all" | "unread">("all");
  const [showProfile, setShowProfile] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter items in dropdown
  const displayedNotifications =
    dropdownFilter === "unread"
      ? notifications.filter((item) => !item.isRead)
      : notifications;

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await markRead(item.id);
      } catch (err) {
        console.error(err);
      }
    }
    setShowNotifications(false);

    const meta = getNotificationMetadata(item);
    if (meta.targetUrl) {
      navigate(meta.targetUrl);
    }
  };

  const getIconForNotification = (item: NotificationItem) => {
    const meta = getNotificationMetadata(item);
    switch (meta.category) {
      case "task":
        return <CheckSquare size={16} className="text-blue-600" />;
      case "lead":
        return <Users size={16} className="text-emerald-600" />;
      case "deal":
        return <GitFork size={16} className="text-amber-600" />;
      case "meeting":
        return <CalendarDays size={16} className="text-purple-600" />;
      default:
        return <Bell size={16} className="text-slate-600" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-8">
        {/* Left: Search input */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* Brand mark — the sidebar that carries the logo is hidden below md */}
          <NavLink
            to="/"
            aria-label="Vibrantick Sales CRM — home"
            className="md:hidden shrink-0"
          >
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
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Notifications Dropdown */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              aria-label="Notifications"
              aria-expanded={showNotifications}
              onClick={() => {
                setShowNotifications((prev) => !prev);
                setShowProfile(false);
                if (!showNotifications) {
                  void refreshNotifications();
                }
              }}
              className={`relative rounded-xl p-2 transition cursor-pointer ${
                showNotifications
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white shadow-xs animate-in zoom-in-50">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Notifications
                    </h3>
                    {unreadCount > 0 ? (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200/60">
                        {unreadCount} unread
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
                        All caught up
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void refreshNotifications()}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                      title="Refresh"
                    >
                      <RotateCw
                        size={14}
                        className={loading ? "animate-spin text-blue-600" : ""}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                      title="Close"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 bg-slate-50/50">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDropdownFilter("all")}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                        dropdownFilter === "all"
                          ? "bg-white text-blue-600 font-semibold shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      All ({notifications.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDropdownFilter("unread")}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                        dropdownFilter === "unread"
                          ? "bg-white text-blue-600 font-semibold shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Unread ({unreadCount})
                    </button>
                  </div>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => void markAllRead()}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      <CheckCheck size={13} />
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                  {loading && notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <RotateCw
                        size={20}
                        className="mx-auto animate-spin text-blue-600"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Checking notifications...
                      </p>
                    </div>
                  ) : displayedNotifications.length === 0 ? (
                    <div className="py-12 px-4 text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Inbox size={20} />
                      </div>
                      <p className="mt-2 text-xs font-semibold text-slate-700">
                        {dropdownFilter === "unread"
                          ? "No unread notifications"
                          : "No notifications yet"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        When tasks are assigned to you, they'll appear here.
                      </p>
                    </div>
                  ) : (
                    displayedNotifications.map((item) => {
                      const meta = getNotificationMetadata(item);
                      return (
                        <div
                          key={item.id}
                          onClick={() => void handleNotificationClick(item)}
                          className={`group flex items-start gap-3 px-4 py-3 transition cursor-pointer hover:bg-slate-50 ${
                            !item.isRead ? "bg-blue-50/20" : ""
                          }`}
                        >
                          {/* Type icon */}
                          <div
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-xs ${meta.iconBgClass}`}
                          >
                            {getIconForNotification(item)}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <p
                                className={`text-xs ${
                                  !item.isRead
                                    ? "font-bold text-slate-900"
                                    : "font-medium text-slate-800"
                                } line-clamp-1`}
                              >
                                {item.title}
                              </p>
                              {!item.isRead && (
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full bg-blue-600"
                                  title="Unread"
                                />
                              )}
                            </div>

                            {item.body && (
                              <p className="mt-0.5 text-[11px] leading-4 text-slate-500 line-clamp-2">
                                {item.body}
                              </p>
                            )}

                            <div className="mt-1.5 flex items-center gap-2">
                              <span
                                className={`rounded px-1.5 py-0.2 text-[9px] font-bold border ${meta.badgeClass}`}
                              >
                                {meta.categoryLabel}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {formatNotificationTime(item.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Quick row actions on hover */}
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
                            {!item.isRead && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void markRead(item.id);
                                }}
                                title="Mark read"
                                className="rounded p-1 text-slate-400 hover:bg-white hover:text-blue-600 transition"
                              >
                                <Check size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void removeNotification(item.id);
                              }}
                              title="Delete"
                              className="rounded p-1 text-slate-400 hover:bg-white hover:text-rose-600 transition"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifications(false);
                      navigate("/notifications");
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer"
                  >
                    <span>View all notifications</span>
                    <ExternalLink size={12} />
                  </button>

                  <span className="text-[11px] text-slate-400">
                    Auto-updates live
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Profile Menu */}
          <div className="relative" ref={profileRef}>
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
              <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-xl shadow-slate-200/60 animate-in fade-in zoom-in-95 duration-150">
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
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <UserRound size={15} />
                  My Profile
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfile(false);
                    navigate("/notifications");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <Bell size={15} />
                  Notifications
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfile(false);
                    navigate("/users");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <UserCog size={15} />
                  User Management
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setShowProfile(false);
                    navigate("/login", { replace: true });
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 cursor-pointer"
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
