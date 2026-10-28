import { request } from "./api";
import { ENDPOINTS } from "./endpoints";
import { getSession } from "./auth";
import type { Customer } from "../types/customer";

function authToken(): string | undefined {
  return getSession()?.token;
}

export interface CustomerListResponse {
  customers: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CustomerOptionsResponse {
  companies: Array<{ id: number; name: string; industry?: string | null }>;
  contacts: Array<{ id: number; fullName: string; email?: string | null; companyId?: number | null }>;
  users: Array<{ id: number; name: string; email: string }>;
}

export interface FetchCustomersParams {
  page?: number;
  limit?: number;
  search?: string;
  industry?: string;
  ownerId?: number;
  createdFrom?: string;
  createdTo?: string;
}

export async function fetchCustomers(
  params?: FetchCustomersParams
): Promise<CustomerListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.search?.trim()) query.set("search", params.search.trim());
  if (params?.industry?.trim()) query.set("industry", params.industry.trim());
  if (params?.ownerId) query.set("ownerId", String(params.ownerId));
  if (params?.createdFrom) query.set("createdFrom", params.createdFrom);
  if (params?.createdTo) query.set("createdTo", params.createdTo);

  const qs = query.toString();
  const url = qs ? `${ENDPOINTS.customers.list}?${qs}` : ENDPOINTS.customers.list;

  return await request<CustomerListResponse>(url, {
    method: "GET",
    token: authToken(),
  });
}

export async function fetchCustomerById(id: number): Promise<Customer> {
  return await request<Customer>(ENDPOINTS.customers.byId(id), {
    method: "GET",
    token: authToken(),
  });
}

export async function fetchCustomerOptions(): Promise<CustomerOptionsResponse> {
  return await request<CustomerOptionsResponse>(ENDPOINTS.customers.options, {
    method: "GET",
    token: authToken(),
  });
}

export async function createCustomer(payload: {
  companyId?: number | null;
  primaryContactId?: number | null;
  ownerId?: number | null;
  convertedAt?: string;
  notes?: string;
}): Promise<Customer> {
  return await request<Customer>(ENDPOINTS.customers.create, {
    method: "POST",
    body: payload,
    token: authToken(),
  });
}

export async function updateCustomer(
  id: number,
  payload: {
    companyId?: number | null;
    primaryContactId?: number | null;
    ownerId?: number | null;
    convertedAt?: string;
    notes?: string;
  }
): Promise<Customer> {
  return await request<Customer>(ENDPOINTS.customers.update(id), {
    method: "PATCH",
    body: payload,
    token: authToken(),
  });
}

export async function deleteCustomer(id: number): Promise<{ success: boolean }> {
  return await request<{ success: boolean }>(ENDPOINTS.customers.delete(id), {
    method: "DELETE",
    token: authToken(),
  });
}
