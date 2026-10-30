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
