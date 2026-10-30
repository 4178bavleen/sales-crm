import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCheck,
  CheckSquare,
  Search,
  Trash2,
  RotateCw,
  ExternalLink,
  Users,
  GitFork,
  CalendarDays,
  Inbox,
  Filter,
} from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";
import {
  fetchNotifications,
  formatNotificationTime,
  getNotificationMetadata,
} from "../../lib/notifications";
import type { NotificationItem } from "../../types/notification";

export default function Notifications() {
  const navigate = useNavigate();
  const {
    unreadCount,
    refreshUnreadCount,
    markRead,
    markAllRead,
    removeNotification,
  } = useNotifications();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "unread" | "task" | "other">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications({
        page,
        limit,
        unreadOnly: categoryFilter === "unread",
      });
      setItems(data.items);
      setTotalPages(data.pagination.totalPages || 1);
      setTotalCount(data.pagination.total);
    } catch (err) {
      console.error("Failed to fetch notifications page", err);
    } finally {
      setLoading(false);
    }
  }, [page, categoryFilter]);

  useEffect(() => {
    void loadData();
    void refreshUnreadCount();
  }, [loadData, refreshUnreadCount]);

  // Client-side filtering for search & category
  const filteredItems = useMemo(() => {
    let result = items;

    if (categoryFilter === "task") {
      result = result.filter(
        (i) =>
          i.type.toUpperCase().includes("TASK") ||
          (i.entityType && i.entityType.toLowerCase() === "task")
      );
    } else if (categoryFilter === "other") {
      result = result.filter(
        (i) =>
          !i.type.toUpperCase().includes("TASK") &&
          (!i.entityType || i.entityType.toLowerCase() !== "task")
      );
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(query) ||
          (i.body && i.body.toLowerCase().includes(query))
      );
    }

    return result;
  }, [items, categoryFilter, search]);

  const taskCount = useMemo(() => {
    return items.filter(
      (i) =>
        i.type.toUpperCase().includes("TASK") ||
        (i.entityType && i.entityType.toLowerCase() === "task")
    ).length;
  }, [items]);

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await markRead(item.id);
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, isRead: true } : i))
        );
      } catch (e) {
        console.error(e);
      }
    }

    const meta = getNotificationMetadata(item);
    if (meta.targetUrl) {
      navigate(meta.targetUrl);
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await markRead(id);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, isRead: true } : i))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await removeNotification(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllRead();
      setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const getIconForNotification = (item: NotificationItem) => {
    const meta = getNotificationMetadata(item);
    switch (meta.category) {
      case "task":
        return <CheckSquare size={18} className="text-blue-600" />;
      case "lead":
        return <Users size={18} className="text-emerald-600" />;
      case "deal":
        return <GitFork size={18} className="text-amber-600" />;
      case "meeting":
        return <CalendarDays size={18} className="text-purple-600" />;
      default:
        return <Bell size={18} className="text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Notifications
            </h1>
            {unreadCount > 0 ? (
              <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200/60">
                {unreadCount} unread
              </span>
            ) : (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                All caught up
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Real-time alerts for task assignments, updates, and CRM activities.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
            title="Refresh notifications"
          >
            <RotateCw size={14} className={loading ? "animate-spin text-blue-600" : "text-slate-500"} />
            <span>Refresh</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void handleMarkAll()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition cursor-pointer"
            >
              <CheckCheck size={15} />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Alerts</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Bell size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totalCount}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Unread</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{unreadCount}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Task Notifications</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <CheckSquare size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{taskCount}</p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notifications..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 mr-1 hidden sm:inline flex items-center gap-1">
            <Filter size={12} />
            Filter:
          </span>
          {(
            [
              { key: "all", label: "All" },
              { key: "unread", label: `Unread (${unreadCount})` },
              { key: "task", label: "Tasks" },
              { key: "other", label: "Other" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setCategoryFilter(tab.key);
                setPage(1);
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                categoryFilter === tab.key
                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                  : "bg-slate-100/70 text-slate-600 hover:bg-slate-200/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications list */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="p-8 text-center">
            <RotateCw size={24} className="mx-auto animate-spin text-blue-600" />
            <p className="mt-2 text-xs text-slate-500">Loading notifications...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <Inbox size={28} />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-800">
              No notifications found
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {search
                ? "No notifications matching your search criteria."
                : categoryFilter === "unread"
                ? "You have no unread notifications right now."
                : "When tasks are assigned or reassigned to you, alerts will appear right here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredItems.map((item) => {
              const meta = getNotificationMetadata(item);
              return (
                <div
                  key={item.id}
                  onClick={() => void handleItemClick(item)}
                  className={`group flex items-start gap-3.5 p-4 transition cursor-pointer hover:bg-slate-50/80 ${
                    !item.isRead ? "bg-blue-50/20" : ""
                  }`}
                >
                  {/* Type Icon */}
                  <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs ${meta.iconBgClass}`}
                  >
                    {getIconForNotification(item)}
                  </div>

                  {/* Body Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border ${meta.badgeClass}`}
                      >
                        {meta.categoryLabel}
                      </span>

                      {!item.isRead && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                          Unread
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400">
                        {formatNotificationTime(item.createdAt)}
                      </span>
                    </div>

                    <h4
                      className={`mt-1.5 text-sm ${
                        !item.isRead
                          ? "font-bold text-slate-900"
                          : "font-medium text-slate-800"
                      }`}
                    >
                      {item.title}
                    </h4>

                    {item.body && (
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                        {item.body}
                      </p>
                    )}

                    {meta.targetUrl && (
                      <div className="mt-2.5">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                          {meta.category === "task" ? "Open Task Details" : "View Details"}
                          <ExternalLink size={12} />
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition">
                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={(e) => void handleMarkAsRead(e, item.id)}
                        title="Mark as read"
                        className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-blue-600 hover:shadow-xs transition cursor-pointer"
                      >
                        <Check size={16} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => void handleDelete(e, item.id)}
                      title="Delete notification"
                      className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-rose-600 hover:shadow-xs transition cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
