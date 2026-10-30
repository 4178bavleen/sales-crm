import { request } from "./api";
import { ENDPOINTS } from "./endpoints";
import { getSession } from "./auth";

function authToken(): string {
  const token = getSession()?.token;
  if (!token) throw new Error("Not signed in");
  return token;
}

export type AuditLogItem = {
  id: string;
  actorId: number | null;
  action: string;
  entityType: string;
  entityId: number;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  actor: {
    id: number;
    name: string;
    email: string;
    role?: { name: string } | null;
  } | null;
};

export type ListAuditLogsResponse = {
  items: AuditLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats?: {
    total: number;
    leads: number;
    deals: number;
    customers: number;
    users: number;
  };
};

export async function fetchAuditLogs(params?: {
  entityType?: string;
  entityId?: number;
  actorId?: number;
  action?: string;
  page?: number;
  limit?: number;
}): Promise<ListAuditLogsResponse> {
  const qs = new URLSearchParams();
  if (params?.entityType) qs.set("entityType", params.entityType);
  if (params?.entityId) qs.set("entityId", String(params.entityId));
  if (params?.actorId) qs.set("actorId", String(params.actorId));
  if (params?.action) qs.set("action", params.action);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));

  const url = qs.toString()
    ? `${ENDPOINTS.auditLogs.list}?${qs.toString()}`
    : ENDPOINTS.auditLogs.list;

  const res = await request<ListAuditLogsResponse>(url, {
    token: authToken(),
  });
  return res || { items: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } };
}

export function getActionBadgeClass(action: string): string {
  switch (action) {
    case "CREATE":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20";
    case "ASSIGN":
      return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20";
    case "STATUS_CHANGE":
    case "STAGE_CHANGE":
      return "bg-blue-50 text-[#1d61e7] ring-1 ring-[#1d61e7]/20";
    case "COMPLETE":
    case "CLOSE_WON":
      return "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20";
    case "DISQUALIFY":
    case "DELETE":
    case "CANCEL":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20";
    case "RESCHEDULE":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
    case "LOG_ACTIVITY":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-600/20";
    case "LOGIN":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20";
    case "LOGOUT":
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-600/20";
    case "LOGIN_FAILED":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20";
    case "UPDATE":
      return "bg-slate-100 text-slate-800 ring-1 ring-slate-400/20";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

export function formatAuditSummary(log: AuditLogItem): string {
  const after = (log.after && typeof log.after === "object" ? log.after : {}) as Record<string, unknown>;
  const before = (log.before && typeof log.before === "object" ? log.before : {}) as Record<string, unknown>;

  if (log.action === "LOGIN") {
    return `User signed in successfully${log.ipAddress ? ` from ${log.ipAddress}` : ""}`;
  }
  if (log.action === "LOGOUT") {
    return `User signed out of system`;
  }
  if (log.action === "LOGIN_FAILED") {
    return `Failed login attempt for ${after.attemptedEmail ? `"${String(after.attemptedEmail)}"` : "account"}`;
  }
  if (log.entityType === "CONTACT") {
    if (log.action === "CREATE") return `Contact created: ${String(after.fullName || `#${log.entityId}`)}${after.jobTitle ? ` (${String(after.jobTitle)})` : ""}${after.email ? ` • ${String(after.email)}` : ""}`;
    if (log.action === "UPDATE") return `Contact updated: ${String(after.fullName || before.fullName || `#${log.entityId}`)}`;
    if (log.action === "DELETE") return `Contact deleted: ${String(before.fullName || `#${log.entityId}`)}`;
  }
  if (log.entityType === "ACTIVITY" || log.entityType === "FOLLOWUP") {
    const actType = after.type ? String(after.type) : "activity";
    const outcome = after.outcome ? ` • Outcome: ${String(after.outcome)}` : "";
    const notes = after.notes ? ` • "${String(after.notes)}"` : "";
    return `Logged follow-up ${actType}${outcome}${notes}`;
  }
  if (log.entityType === "PRODUCT_SERVICE") {
    if (log.action === "CREATE") return `${after.type || "Product/Service"} created: "${String(after.name)}"`;
    if (log.action === "UPDATE") return `Product/Service updated: "${String(after.name || before.name || `#${log.entityId}`)}"${after.isActive !== undefined ? ` (Active: ${after.isActive})` : ""}`;
    if (log.action === "DELETE") return `Product/Service deleted: "${String(before.name || `#${log.entityId}`)}"`;
  }
  if (log.action === "STAGE_CHANGE" || (before.stageId !== undefined && after.stageId !== undefined)) {
    return `Stage moved from #${String(before.stageId ?? "?")} to #${String(after.stageId ?? "?")}`;
  }
  if (log.action === "STATUS_CHANGE" || (before.status !== undefined && after.status !== undefined)) {
    return `Status changed: ${String(before.status)} → ${String(after.status)}`;
  }
  if (log.action === "ASSIGN" || (before.ownerId !== undefined && after.ownerId !== undefined)) {
    return after.ownerId ? `Reassigned from User #${before.ownerId ?? "?"} to User #${after.ownerId}` : "Unassigned";
  }
  if (log.action === "DISQUALIFY" || after.reason !== undefined) {
    return `Disqualified${after.reason ? `: "${String(after.reason)}"` : ""}`;
  }
  if (log.action === "COMPLETE") {
    return `Completed${after.completionNote ? ` (${String(after.completionNote)})` : ""}${after.title ? `: "${String(after.title)}"` : ""}`;
  }
  if (log.action === "CANCEL") {
    return `Cancelled${after.cancelReason ? ` (${String(after.cancelReason)})` : ""}${after.title ? `: "${String(after.title)}"` : ""}`;
  }
  if (log.action === "RESCHEDULE") {
    return `Rescheduled${after.dueAt ? ` to ${new Date(String(after.dueAt)).toLocaleDateString()}` : ""}${after.title ? ` ("${String(after.title)}")` : ""}`;
  }
  if (log.entityType === "TARGET") {
    if (log.action === "CREATE") return `Target created: Quota ₹${Number(after.amount || 0).toLocaleString()} (${after.periodType || "PERIOD"})`;
    if (log.action === "UPDATE") return `Quota adjusted from ₹${Number(before.amount || 0).toLocaleString()} to ₹${Number(after.amount || 0).toLocaleString()}${after.reason ? ` (${String(after.reason)})` : ""}`;
    if (log.action === "DELETE") return `Target quota deleted: ₹${Number(before.amount || 0).toLocaleString()}`;
  }
  if (log.action === "CREATE") {
    if (after.name && after.estimatedValue !== undefined) return `Deal created: "${String(after.name)}" (₹${Number(after.estimatedValue).toLocaleString()})`;
    if (after.title) return `${log.entityType.toLowerCase()} created: "${String(after.title)}"`;
    if (after.fullName) return `Lead created: ${String(after.fullName)}${after.companyName ? ` (${String(after.companyName)})` : ""}`;
    if (after.companyId) return `Customer created for Company #${String(after.companyId)}`;
  }
  if (log.action === "DELETE") {
    return `${log.entityType} #${log.entityId} removed${before.title ? ` ("${String(before.title)}")` : ""}`;
  }

  const entries = Object.entries(after).filter(([k]) => k !== "id");
  if (entries.length > 0) {
    return entries
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
      .join(" • ");
  }
  return "State updated";
}
