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
    invoices?: number;
    proposals?: number;
    expenses?: number;
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
    case "CREATE_EXPENSE_TRANSACTION":
    case "PAYMENT":
    case "APPROVE":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20";
    case "ASSIGN":
      return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20";
    case "STATUS_CHANGE":
    case "STAGE_CHANGE":
    case "SUBMIT_FOR_APPROVAL":
      return "bg-blue-50 text-[#1d61e7] ring-1 ring-[#1d61e7]/20";
    case "COMPLETE":
    case "CLOSE_WON":
      return "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20";
    case "DISQUALIFY":
    case "DELETE":
    case "DELETE_EXPENSE_TRANSACTION":
    case "CANCEL":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20";
    case "RESCHEDULE":
    case "APPROVAL_CHANGES_REQUESTED":
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
    case "UPDATE_EXPENSE_TRANSACTION":
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
  if (log.entityType === "INVOICE") {
    if (log.action === "CREATE") return `Invoice generated: ${String(after.invoiceNumber || `#${log.entityId}`)} (₹${Number(after.totalAmount || 0).toLocaleString()})`;
    if (log.action === "PAYMENT") return `Payment recorded for Invoice ${String(after.invoiceNumber || `#${log.entityId}`)}: ₹${Number(after.amount || 0).toLocaleString()} via ${String(after.paymentMethod || 'PAYMENT')}`;
    if (log.action === "UPDATE") return `Updated Invoice ${String(after.invoiceNumber || before.invoiceNumber || `#${log.entityId}`)}${after.status ? ` • Status: ${String(after.status)}` : ''}`;
    if (log.action === "DELETE") return `Deleted Invoice #${log.entityId}`;
  }
  if (log.entityType === "INVOICESETTING") {
    return `Company billing settings and bank details updated`;
  }
  if (log.entityType === "PROPOSAL") {
    if (log.action === "CREATE") return `Proposal created: "${String(after.title || `#${log.entityId}`)}"${after.proposalNumber ? ` (${String(after.proposalNumber)})` : ''}`;
    if (log.action === "SUBMIT_FOR_APPROVAL") return `Proposal submitted for approval: "${String(after.title || `#${log.entityId}`)}"`;
    if (log.action === "APPROVE") return `Proposal approved: "${String(after.title || `#${log.entityId}`)}"`;
    if (log.action === "APPROVAL_CHANGES_REQUESTED") return `Changes requested on proposal: "${String(after.title || `#${log.entityId}`)}"`;
    if (log.action === "STATUS_CHANGE") return `Proposal moved to ${String(after.status || 'updated')}`;
    if (log.action === "DELETE") return `Deleted Proposal #${log.entityId}`;
  }
  if (log.entityType === "FINANCIAL_TRANSACTION" || log.entityType === "EXPENSE") {
    if (log.action === "CREATE_EXPENSE_TRANSACTION" || log.action === "CREATE") {
      return `Expense recorded: ₹${Number(after.amount || 0).toLocaleString()} • ${String(after.category || 'Expense')}${after.title ? ` ("${String(after.title)}")` : ''}`;
    }
    if (log.action === "UPDATE_EXPENSE_TRANSACTION" || log.action === "UPDATE") {
      return `Expense record updated: ${String(after.title || before.title || `#${log.entityId}`)}`;
    }
    if (log.action === "DELETE_EXPENSE_TRANSACTION" || log.action === "DELETE") {
      return `Deleted expense record #${log.entityId}`;
    }
  }
  if (log.entityType === "WHATSAPP_SETTING") {
    return `WhatsApp Meta Cloud API integration settings updated`;
  }
  if (log.entityType === "EMAIL_SETTING") {
    return `SMTP email integration settings updated`;
  }
  if (log.entityType === "USER") {
    if (log.action === "CREATE") return `User account created: ${String(after.name || '')} (${String(after.email || '')}) • Role: ${String(after.role || 'USER')}`;
    if (log.action === "UPDATE") return `User account updated: ${String(after.name || before.name || `#${log.entityId}`)}${after.role ? ` • Role: ${String(after.role)}` : ''}`;
    if (log.action === "DELETE") return `User account deleted: ${String(before.name || before.email || `#${log.entityId}`)}`;
  }
  if (log.entityType === "CONTACT") {
    if (log.action === "CREATE") return `Contact created: ${String(after.fullName || `#${log.entityId}`)}${after.jobTitle ? ` (${String(after.jobTitle)})` : ""}${after.email ? ` • ${String(after.email)}` : ""}`;
    if (log.action === "UPDATE") return `Contact updated: ${String(after.fullName || before.fullName || `#${log.entityId}`)}`;
    if (log.action === "DELETE") return `Contact deleted: ${String(before.fullName || `#${log.entityId}`)}`;
  }
  if (log.entityType === "DOCUMENT") {
    if (after.action === "NEW_VERSION") {
      return `New version v${String(after.versionNo || "")} uploaded for document #${log.entityId}${after.fileName ? ` (${String(after.fileName)})` : ""}${after.note ? ` • "${String(after.note)}"` : ""}`;
    }
    if (log.action === "CREATE") {
      return `Uploaded document "${String(after.name || `#${log.entityId}`)}"${after.category ? ` [${String(after.category)}]` : ""}${after.fileName ? ` • ${String(after.fileName)}` : ""}`;
    }
    if (log.action === "UPDATE") {
      return `Updated document "${String(after.name || before.name || `#${log.entityId}`)}"`;
    }
    if (log.action === "DELETE") {
      return `Deleted document "${String(before.name || `#${log.entityId}`)}"`;
    }
  }
  if (log.entityType === "ACTIVITY" || log.entityType === "FOLLOWUP") {
    const actType = after.type ? String(after.type).toUpperCase() : "ACTIVITY";
    const label = actType === "CALL" ? "Daily Call" : actType === "MESSAGE" ? "Message" : actType === "EMAIL" ? "Email" : actType.toLowerCase();
    const outcome = after.outcome ? ` • Outcome: ${String(after.outcome)}` : "";
    const notes = after.notes ? ` • "${String(after.notes)}"` : "";
    return `Logged ${label}${outcome}${notes}`;
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
