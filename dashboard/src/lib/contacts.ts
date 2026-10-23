import { request, ApiError } from "./api";
import { ENDPOINTS } from "./endpoints";
import { getSession } from "./auth";
import type { Contact } from "../types/contact";

export type BackendContact = {
  id: number;
  fullName: string;
  companyId?: number | null;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  company?: {
    id: number;
    name: string;
  } | null;
};

export type FetchContactsParams = {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: number;
  createdFrom?: string;
  createdTo?: string;
};

export type CreateContactInput = {
  fullName: string;
  companyId?: number | null;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

export type UpdateContactInput = Partial<CreateContactInput>;

export function toContact(b: BackendContact): Contact {
  return {
    id: b.id,
    fullName: b.fullName,
    company: b.company?.name || "",
    companyId: b.companyId ?? b.company?.id ?? null,
    jobTitle: b.jobTitle || "",
    email: b.email || "",
    phone: b.phone || "",
    notes: b.notes || "",
    createdAt: b.createdAt ? b.createdAt.slice(0, 10) : "",
    updatedAt: b.updatedAt ? b.updatedAt.slice(0, 10) : "",
  };
}

function authToken(): string {
  const session = getSession();
  if (!session?.token) throw new ApiError("Not signed in", 401);
  return session.token;
}

export async function fetchContacts(params?: FetchContactsParams): Promise<{
  contacts: Contact[];
  total: number;
  totalPages: number;
}> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.search?.trim()) query.set("search", params.search.trim());
  if (params?.companyId) query.set("companyId", String(params.companyId));
  if (params?.createdFrom) query.set("createdFrom", params.createdFrom);
  if (params?.createdTo) query.set("createdTo", params.createdTo);

  const qs = query.toString();
  const path = `${ENDPOINTS.contacts.list}${qs ? `?${qs}` : ""}`;

  type FetchResponse = {
    contacts?: BackendContact[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    data?: {
      contacts?: BackendContact[];
      pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
  };

  const res = await request<FetchResponse>(path, {
    token: authToken(),
  });

  const list = res.contacts ?? res.data?.contacts ?? [];
  const pagination = res.pagination ?? res.data?.pagination;
  return {
    contacts: list.map(toContact),
    total: pagination?.total ?? list.length,
    totalPages: pagination?.totalPages ?? 1,
  };
}

export async function getContactById(id: number): Promise<Contact> {
  type SingleResponse = {
    contact?: BackendContact;
    data?: { contact?: BackendContact };
  };

  const res = await request<SingleResponse>(ENDPOINTS.contacts.byId(id), {
    token: authToken(),
  });

  const contact = res.contact ?? res.data?.contact;
  if (!contact) throw new ApiError("Contact not found in response", 500);

  return toContact(contact);
}

export async function createContact(input: CreateContactInput): Promise<Contact> {
  type SingleResponse = {
    contact?: BackendContact;
    data?: { contact?: BackendContact };
  };

  const res = await request<SingleResponse>(ENDPOINTS.contacts.create, {
    method: "POST",
    token: authToken(),
    body: {
      fullName: input.fullName.trim(),
      companyId: input.companyId || null,
      jobTitle: input.jobTitle?.trim() || null,
      email: input.email?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
    },
  });

  const contact = res.contact ?? res.data?.contact;
  if (!contact) throw new ApiError("Failed to parse created contact", 500);

  return toContact(contact);
}

export async function updateContact(
  id: number,
  input: UpdateContactInput,
): Promise<Contact> {
  const payload: Record<string, unknown> = {};
  if (input.fullName !== undefined) payload.fullName = input.fullName.trim();
  if (input.companyId !== undefined) payload.companyId = input.companyId;
  if (input.jobTitle !== undefined) payload.jobTitle = input.jobTitle?.trim() || null;
  if (input.email !== undefined) payload.email = input.email?.trim() || null;
  if (input.phone !== undefined) payload.phone = input.phone?.trim() || null;
  if (input.notes !== undefined) payload.notes = input.notes?.trim() || null;

  type SingleResponse = {
    contact?: BackendContact;
    data?: { contact?: BackendContact };
  };

  const res = await request<SingleResponse>(ENDPOINTS.contacts.update(id), {
    method: "PATCH",
    token: authToken(),
    body: payload,
  });

  const contact = res.contact ?? res.data?.contact;
  if (!contact) throw new ApiError("Failed to parse updated contact", 500);

  return toContact(contact);
}

export async function deleteContact(id: number): Promise<void> {
  await request<{ id: number; deleted: boolean } | { data: { id: number; deleted: boolean } }>(
    ENDPOINTS.contacts.delete(id),
    {
      method: "DELETE",
      token: authToken(),
    },
  );
}
