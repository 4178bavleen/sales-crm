import type { Lead, LeadStatus, Priority } from "../types/lead";
import { ApiError, request } from "./api";
import { ENDPOINTS } from "./endpoints";
import { getSession } from "./auth";

/** Shape of a Lead row returned by the backend API. */
export type BackendLead = {
  id: number;
  contactName: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  priority: Priority;
  status: LeadStatus;
  notes: string | null;
  sourceId: number | null;
  productServiceId: number | null;
  createdById: number;
  ownerId: number | null;
  nextFollowUpAt: string | null;
  noFollowUpReasonId?: number | null;
  disqualifyReasonId: number | null;
  disqualifyNote: string | null;
  disqualifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  source: { id: number; name: string } | null;
  productService: { id: number; name: string } | null;
  createdBy: { id: number; name: string; email: string } | null;
  owner: { id: number; name: string; email: string } | null;
};

export type ListLeadsResponse = {
  leads: BackendLead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/** Convert backend lead record to frontend Lead view model. */
export function toLead(backendLead: BackendLead): Lead {
  const parts = (backendLead.contactName || "").trim().split(/\s+/);
  const firstName = parts[0] || "Unknown";
  const lastName = parts.slice(1).join(" ");

  return {
    id: backendLead.id,
    firstName,
    lastName,
    company: backendLead.companyName || "",
    email: backendLead.email || "",
    phone: backendLead.phone || "",
    source: backendLead.source?.name || "Unknown",
    sourceId: backendLead.sourceId ?? backendLead.source?.id ?? null,
    productService: backendLead.productService?.name || undefined,
    owner: backendLead.owner?.name || "Unassigned",
    ownerId: backendLead.ownerId ?? backendLead.owner?.id ?? null,
    status: backendLead.status,
    priority: backendLead.priority,
    createdAt: backendLead.createdAt ? backendLead.createdAt.slice(0, 10) : "",
    notes: backendLead.notes || undefined,
    nextFollowUpAt: backendLead.nextFollowUpAt || undefined,
    noFollowUp: !backendLead.nextFollowUpAt && !!backendLead.noFollowUpReasonId,
    noFollowUpReasonId: backendLead.noFollowUpReasonId ?? null,
  };
}

/** Parameters supported by GET /api/v1/leads */
export type FetchLeadsParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string[];
  priority?: string[];
  ownerId?: (number | null)[];
  sourceId?: number[];
  createdFrom?: string;
  createdTo?: string;
};

/**
 * Fetch leads from the backend API.
 */
export async function fetchLeads(params?: FetchLeadsParams): Promise<{ leads: Lead[]; total: number }> {
  const session = getSession();
  if (!session) throw new ApiError("Not signed in", 401);

  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.search) query.set("search", params.search);
  if (params?.status && params.status.length > 0) {
    query.set("status", params.status.join(","));
  }
  if (params?.priority && params.priority.length > 0) {
    query.set("priority", params.priority.join(","));
  }
  if (params?.sourceId && params.sourceId.length > 0) {
    query.set("sourceId", params.sourceId.join(","));
  }
  if (params?.ownerId && params.ownerId.length > 0) {
    query.set("ownerId", params.ownerId.map(id => (id === null ? "none" : id)).join(","));
  }
  if (params?.createdFrom) query.set("createdFrom", params.createdFrom);
  if (params?.createdTo) query.set("createdTo", params.createdTo);

  const qs = query.toString();
  const path = `${ENDPOINTS.leads.list}${qs ? `?${qs}` : ""}`;

  const data = await request<ListLeadsResponse>(path, {
    token: session.token,
  });

  return {
    leads: (data.leads || []).map(toLead),
    total: data.pagination?.total ?? (data.leads || []).length,
  };
}

/**
 * Fetch single lead details by id.
 */
export async function getLeadById(id: number): Promise<Lead> {
  const session = getSession();
  if (!session) throw new ApiError("Not signed in", 401);

  const res = await request<{ lead: BackendLead }>(ENDPOINTS.leads.byId(id), {
    token: session.token,
  });

  return toLead(res.lead);
}

export type CreateLeadInput = {
  firstName: string;
  lastName?: string;
  company?: string;
  email?: string;
  phone?: string;
  source?: string;
  sourceId?: number | null;
  productService?: string;
  owner?: string;
  ownerId?: number | null;
  priority?: Priority;
  status?: LeadStatus;
  notes?: string;
  nextFollowUpAt?: string;
  noFollowUp?: boolean;
  noFollowUpReasonId?: number | null;
};

/**
 * Create a new lead via POST /api/v1/leads.
 */
export async function createLead(lead: CreateLeadInput): Promise<Lead> {
  const session = getSession();
  if (!session) throw new ApiError("Not signed in", 401);

  const contactName = `${lead.firstName} ${lead.lastName || ""}`.trim();

  let sourceId = lead.sourceId;
  if (sourceId === undefined && lead.source) {
    const s = lead.source.toLowerCase().trim();
    if (s.includes("web") && !s.includes("webinar")) sourceId = 1;
    else if (s.includes("referral")) sourceId = 2;
    else if (s.includes("linkedin") || s.includes("social")) sourceId = 3;
    else if (s.includes("ad") || s.includes("google")) sourceId = 4;
    else if (s.includes("cold")) sourceId = 5;
    else if (s.includes("webinar") || s.includes("seminar")) sourceId = 6;
  }

  let ownerId = lead.ownerId;
  if (ownerId === undefined) {
    if (lead.owner) {
      const o = lead.owner.toLowerCase().trim();
      if (o === "unassigned") ownerId = null;
      else if (o.includes("marcus")) ownerId = 3;
      else if (o.includes("priya")) ownerId = 2;
      else if (o.includes("admin")) ownerId = 1;
      else ownerId = session.user?.id ?? 1;
    } else {
      ownerId = session.user?.id ?? 1;
    }
  }

  const payload: Record<string, unknown> = {
    contactName,
    priority: lead.priority || "MEDIUM",
    status: lead.status === "DISQUALIFIED" ? "NEW" : (lead.status || "NEW"),
  };

  if (lead.company?.trim()) payload.companyName = lead.company.trim();
  if (lead.phone?.trim()) payload.phone = lead.phone.trim();
  if (lead.email?.trim()) payload.email = lead.email.trim();
  if (lead.notes?.trim()) payload.notes = lead.notes.trim();
  if (sourceId !== undefined && sourceId !== null) payload.sourceId = sourceId;
  if (ownerId !== undefined) payload.ownerId = ownerId;

  if (lead.nextFollowUpAt) {
    payload.nextFollowUpAt = new Date(lead.nextFollowUpAt).toISOString();
  } else if (lead.noFollowUp || lead.noFollowUpReasonId) {
    payload.noFollowUpReasonId = lead.noFollowUpReasonId ?? 7;
  }

  const res = await request<{ lead: BackendLead }>(ENDPOINTS.leads.list, {
    method: "POST",
    token: session.token,
    body: payload,
  });

  return toLead(res.lead);
}

/**
 * Update general lead details via PATCH /api/v1/leads/:id.
 */
export async function updateLead(id: number, updates: Partial<CreateLeadInput>): Promise<Lead> {
  const session = getSession();
  if (!session) throw new ApiError("Not signed in", 401);

  const payload: Record<string, unknown> = {};
  if (updates.firstName !== undefined || updates.lastName !== undefined) {
    payload.contactName = `${updates.firstName || ""} ${updates.lastName || ""}`.trim();
  }
  if (updates.company !== undefined) payload.companyName = updates.company.trim() || null;
  if (updates.phone !== undefined) payload.phone = updates.phone.trim() || null;
  if (updates.email !== undefined) payload.email = updates.email.trim() || null;
  if (updates.notes !== undefined) payload.notes = updates.notes.trim() || null;
  if (updates.priority !== undefined) payload.priority = updates.priority;
  if (updates.sourceId !== undefined) payload.sourceId = updates.sourceId;

  if (updates.nextFollowUpAt) {
    payload.nextFollowUpAt = new Date(updates.nextFollowUpAt).toISOString();
    payload.noFollowUpReasonId = null;
  } else if (updates.noFollowUp || updates.noFollowUpReasonId) {
    payload.nextFollowUpAt = null;
    payload.noFollowUpReasonId = updates.noFollowUpReasonId ?? 7;
  }

  if (Object.keys(payload).length > 0) {
    await request<{ lead: BackendLead }>(ENDPOINTS.leads.byId(id), {
      method: "PATCH",
      token: session.token,
      body: payload,
    });
  }

  // If status is provided and changed
  if (updates.status) {
    await updateLeadStatus(id, updates.status);
  }

  // If ownerId is provided and changed
  if (updates.ownerId !== undefined) {
    await assignLead(id, updates.ownerId);
  }

  return getLeadById(id);
}

/**
 * Assign lead to an owner via PATCH /api/v1/leads/:id/assign.
 */
export async function assignLead(id: number, ownerId: number | null): Promise<Lead> {
  const session = getSession();
  if (!session) throw new ApiError("Not signed in", 401);

  const res = await request<{ lead: BackendLead }>(`${ENDPOINTS.leads.byId(id)}/assign`, {
    method: "PATCH",
    token: session.token,
    body: { ownerId },
  });

  return toLead(res.lead);
}

/**
 * Update lead status via PATCH /api/v1/leads/:id/status.
 */
export async function updateLeadStatus(
  id: number,
  status: LeadStatus,
  disqualifyReasonId?: number,
  disqualifyNote?: string,
): Promise<Lead> {
  const session = getSession();
  if (!session) throw new ApiError("Not signed in", 401);

  const body: Record<string, unknown> = { status };
  if (status === "DISQUALIFIED") {
    body.disqualifyReasonId = disqualifyReasonId ?? 1;
    body.disqualifyNote = disqualifyNote ?? "Disqualified";
  }

  const res = await request<{ lead: BackendLead }>(ENDPOINTS.leads.status(id), {
    method: "PATCH",
    token: session.token,
    body,
  });

  return toLead(res.lead);
}

/**
 * Delete a lead via DELETE /api/v1/leads/:id.
 */
export async function deleteLead(id: number): Promise<void> {
  const session = getSession();
  if (!session) throw new ApiError("Not signed in", 401);

  await request<{ id: number; deleted: boolean }>(ENDPOINTS.leads.byId(id), {
    method: "DELETE",
    token: session.token,
  });
}

export type LeadOptionsData = {
  sources: { id: number; name: string }[];
  owners: { id: number; name: string; email?: string }[];
  statuses?: LeadStatus[];
  priorities?: Priority[];
  noFollowUpReasons?: { id: number; name: string }[];
};

/**
 * Fetch lead options (sources and owners) from the backend API.
 */
export async function fetchLeadOptions(): Promise<LeadOptionsData> {
  const session = getSession();
  if (!session) throw new ApiError("Not signed in", 401);

  return request<LeadOptionsData>(ENDPOINTS.leads.options, {
    token: session.token,
  });
}
