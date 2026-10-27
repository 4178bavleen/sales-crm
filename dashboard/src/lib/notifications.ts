import { ApiError, request } from "./api";
import { ENDPOINTS } from "./endpoints";
import { getSession } from "./auth";
import type {
  NotificationItem,
  NotificationListData,
} from "../types/notification";

/**
 * Fetch paginated notifications for the current authenticated user.
 */
export async function fetchNotifications(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<NotificationListData> {
  const session = getSession();
  if (!session) throw new ApiError("Not signed in", 401);

  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.unreadOnly !== undefined) query.set("unreadOnly", String(params.unreadOnly));

  const qs = query.toString();
  const path = `${ENDPOINTS.notifications.list}${qs ? `?${qs}` : ""}`;

  return request<NotificationListData>(path, {
    token: session.token,
  });
}

/**
 * Fetch total unread notifications count for the current user.
 */
export async function fetchUnreadCount(): Promise<number> {
  const session = getSession();
  if (!session) return 0;

  try {
    const res = await request<{ unreadCount: number }>(ENDPOINTS.notifications.unreadCount, {
      token: session.token,
    });
    return res?.unreadCount ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Mark a single notification as read by ID.
 */
export async function markNotificationAsRead(id: number): Promise<NotificationItem> {
  const session = getSession();
  if (!session) throw new ApiError("Not signed in", 401);

  return request<NotificationItem>(ENDPOINTS.notifications.read(id), {
    method: "PATCH",
    token: session.token,
  });
}

/**
 * Mark all notifications as read for current user.
 */
export async function markAllNotificationsAsRead(): Promise<{ updatedCount: number }> {
  const session = getSession();
  if (!session) throw new ApiError("Not signed in", 401);

  return request<{ updatedCount: number }>(ENDPOINTS.notifications.readAll, {
    method: "PATCH",
    token: session.token,
  });
}

/**
 * Delete a notification by ID.
 */
export async function deleteNotification(id: number): Promise<void> {
  const session = getSession();
  if (!session) throw new ApiError("Not signed in", 401);

  await request<{ message?: string }>(ENDPOINTS.notifications.delete(id), {
    method: "DELETE",
    token: session.token,
  });
}

/**
 * Format timestamp into relative human-friendly time.
 */
export function formatNotificationTime(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 0 || diffInSeconds < 45) {
    return "Just now";
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return "Yesterday";
  }
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  // Format as short date (e.g. "Oct 27")
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export type NotificationMetadata = {
  category: "task" | "lead" | "deal" | "meeting" | "general";
  categoryLabel: string;
  targetUrl: string | null;
  badgeClass: string;
  iconBgClass: string;
  iconTextClass: string;
};

/**
 * Determine display metadata, icon styling, and target destination URL for a notification.
 */
export function getNotificationMetadata(item: NotificationItem): NotificationMetadata {
  const typeUpper = (item.type || "").toUpperCase();
  const entityType = (item.entityType || "").toLowerCase();

  // Task notifications (assigned, reassigned, due, etc.)
  if (typeUpper.includes("TASK") || entityType === "task") {
    return {
      category: "task",
      categoryLabel: "Task",
      targetUrl: item.entityId ? `/tasks?taskId=${item.entityId}` : "/tasks",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      iconBgClass: "bg-blue-50",
      iconTextClass: "text-blue-600",
    };
  }

  // Lead notifications
  if (typeUpper.includes("LEAD") || entityType === "lead") {
    return {
      category: "lead",
      categoryLabel: "Lead",
      targetUrl: item.entityId ? `/leads?leadId=${item.entityId}` : "/leads",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      iconBgClass: "bg-emerald-50",
      iconTextClass: "text-emerald-600",
    };
  }

  // Deal notifications
  if (typeUpper.includes("DEAL") || entityType === "deal") {
    return {
      category: "deal",
      categoryLabel: "Deal",
      targetUrl: item.entityId ? `/deals?dealId=${item.entityId}` : "/deals",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      iconBgClass: "bg-amber-50",
      iconTextClass: "text-amber-600",
    };
  }

  // Meeting notifications
  if (typeUpper.includes("MEETING") || entityType === "meeting") {
    return {
      category: "meeting",
      categoryLabel: "Meeting",
      targetUrl: "/meetings",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
      iconBgClass: "bg-purple-50",
      iconTextClass: "text-purple-600",
    };
  }

  // Default / system notifications
  return {
    category: "general",
    categoryLabel: "Update",
    targetUrl: null,
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    iconBgClass: "bg-slate-100",
    iconTextClass: "text-slate-600",
  };
}
