import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { CheckSquare, Bell, X, ArrowRight } from "lucide-react";
import type { NotificationItem } from "../types/notification";
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationMetadata,
} from "../lib/notifications";
import { useSession } from "../lib/useSession";

type ToastNotification = {
  id: number;
  title: string;
  body: string | null;
  targetUrl: string | null;
  entityType?: string | null;
  entityId?: number | null;
};

type NotificationContextValue = {
  unreadCount: number;
  notifications: NotificationItem[];
  loading: boolean;
  filter: "all" | "unread";
  setFilter: (filter: "all" | "unread") => void;
  refreshNotifications: (unreadOnly?: boolean) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  removeNotification: (id: number) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const navigate = useNavigate();
  const isAuthenticated = Boolean(session?.token);

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [activeToast, setActiveToast] = useState<ToastNotification | null>(null);

  // Store known notification IDs to detect brand new incoming notifications
  const knownNotificationIds = useRef<Set<number>>(new Set());
  const initialLoadDone = useRef(false);
  const toastTimeoutRef = useRef<number | null>(null);

  const triggerToast = useCallback((toast: ToastNotification) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setActiveToast(toast);
    toastTimeoutRef.current = window.setTimeout(() => {
      setActiveToast(null);
    }, 6500);
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    try {
      const count = await fetchUnreadCount();
      setUnreadCount(count);
    } catch {
      // Ignore background count errors
    }
  }, [isAuthenticated]);

  const refreshNotifications = useCallback(
    async (unreadOnly?: boolean) => {
      if (!isAuthenticated) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      setLoading(true);
      try {
        const isUnread = unreadOnly ?? (filter === "unread");
        const data = await fetchNotifications({
          page: 1,
          limit: 20,
          unreadOnly: isUnread,
        });

        setNotifications(data.items);
        setUnreadCount(data.unreadCount);

        // Check for new notifications to trigger toast
        if (initialLoadDone.current) {
          const newUnreadItems = data.items.filter(
            (item) => !item.isRead && !knownNotificationIds.current.has(item.id)
          );
          if (newUnreadItems.length > 0) {
            // Pick latest new item
            const latest = newUnreadItems[0];
            const meta = getNotificationMetadata(latest);
            triggerToast({
              id: latest.id,
              title: latest.title,
              body: latest.body,
              targetUrl: meta.targetUrl,
              entityType: latest.entityType,
              entityId: latest.entityId,
            });
          }
        }

        // Update known IDs
        data.items.forEach((item) => knownNotificationIds.current.add(item.id));
        initialLoadDone.current = true;
      } catch (err) {
        console.error("Failed to load notifications", err);
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, filter, triggerToast]
  );

  // Handle Mark Read
  const markRead = useCallback(
    async (id: number) => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await markNotificationAsRead(id);
      } catch (err) {
        // Rollback on failure
        void refreshNotifications();
        throw err;
      }
    },
    [refreshNotifications]
  );

  // Handle Mark All Read
  const markAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, isRead: true, readAt: new Date().toISOString() }))
    );
    setUnreadCount(0);

    try {
      await markAllNotificationsAsRead();
    } catch (err) {
      void refreshNotifications();
      throw err;
    }
  }, [refreshNotifications]);

  // Handle Delete
  const removeNotification = useCallback(
    async (id: number) => {
      const itemToDelete = notifications.find((item) => item.id === id);
      // Optimistic update
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      if (itemToDelete && !itemToDelete.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      try {
        await deleteNotification(id);
      } catch (err) {
        void refreshNotifications();
        throw err;
      }
    },
    [notifications, refreshNotifications]
  );

  // Initial fetch and session reaction
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      knownNotificationIds.current.clear();
      initialLoadDone.current = false;
      return;
    }
    void refreshNotifications();
  }, [isAuthenticated, filter, refreshNotifications]);

  // Polling for updates (every 20s) and on window focus
  useEffect(() => {
    if (!isAuthenticated) return;

    const intervalId = window.setInterval(() => {
      // Poll unread count; if it differs from current unreadCount, refresh full list
      fetchUnreadCount()
        .then((newCount) => {
          setUnreadCount((oldCount) => {
            if (newCount !== oldCount) {
              void refreshNotifications();
            }
            return newCount;
          });
        })
        .catch(() => {});
    }, 20000);

    function onWindowFocus() {
      void refreshUnreadCount();
      void refreshNotifications();
    }

    window.addEventListener("focus", onWindowFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onWindowFocus);
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [isAuthenticated, refreshUnreadCount, refreshNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        loading,
        filter,
        setFilter,
        refreshNotifications,
        refreshUnreadCount,
        markRead,
        markAllRead,
        removeNotification,
      }}
    >
      {children}

      {/* Real-time Toast Banner for incoming task & CRM notifications */}
      {activeToast && (
        <div
          role="alert"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex max-w-md items-start gap-3 rounded-2xl border border-blue-200/80 bg-white/95 p-4 shadow-2xl shadow-blue-900/15 backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-sm shadow-blue-500/10">
            {activeToast.title.toLowerCase().includes("task") ? (
              <CheckSquare size={20} />
            ) : (
              <Bell size={20} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                New Notification
              </span>
              <button
                type="button"
                onClick={() => setActiveToast(null)}
                aria-label="Dismiss toast"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>

            <p className="mt-0.5 text-sm font-semibold text-slate-900 line-clamp-1">
              {activeToast.title}
            </p>

            {activeToast.body && (
              <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                {activeToast.body}
              </p>
            )}

            {activeToast.targetUrl && (
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void markRead(activeToast.id);
                    setActiveToast(null);
                    if (activeToast.targetUrl) {
                      navigate(activeToast.targetUrl);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition cursor-pointer"
                >
                  <span>View Details</span>
                  <ArrowRight size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void markRead(activeToast.id);
                    setActiveToast(null);
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                >
                  Mark as read
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
