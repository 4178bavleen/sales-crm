import { request } from "./api";
import { ENDPOINTS } from "./endpoints";
import { getSession } from "./auth";
import type {
  CreateTargetPayload,
  ListTargetsParams,
  TargetDetail,
  TargetItem,
  TargetListResponse,
  TargetOptions,
  UpdateTargetPayload,
} from "../types/target";

function authToken(): string | undefined {
  return getSession()?.token;
}

export async function fetchTargets(params?: ListTargetsParams): Promise<TargetListResponse> {
  const query = new URLSearchParams();
  if (params?.periodType) query.set("periodType", params.periodType);
  if (params?.year) query.set("year", String(params.year));
  if (params?.month) query.set("month", String(params.month));
  if (params?.quarter) query.set("quarter", String(params.quarter));
  if (params?.userId) query.set("userId", String(params.userId));
  if (params?.teamId) query.set("teamId", String(params.teamId));
  if (params?.search?.trim()) query.set("search", params.search.trim());

  const qs = query.toString();
  const url = qs ? `${ENDPOINTS.targets.list}?${qs}` : ENDPOINTS.targets.list;

  return await request<TargetListResponse>(url, {
    method: "GET",
    token: authToken(),
  });
}

export async function fetchTargetById(id: number): Promise<TargetDetail> {
  return await request<TargetDetail>(ENDPOINTS.targets.byId(id), {
    method: "GET",
    token: authToken(),
  });
}

export async function createTarget(payload: CreateTargetPayload): Promise<TargetItem> {
  return await request<TargetItem>(ENDPOINTS.targets.create, {
    method: "POST",
    body: payload,
    token: authToken(),
  });
}

export async function updateTarget(id: number, payload: UpdateTargetPayload): Promise<TargetItem> {
  return await request<TargetItem>(ENDPOINTS.targets.update(id), {
    method: "PATCH",
    body: payload,
    token: authToken(),
  });
}

export async function deleteTarget(id: number): Promise<{ success: boolean }> {
  return await request<{ success: boolean }>(ENDPOINTS.targets.delete(id), {
    method: "DELETE",
    token: authToken(),
  });
}

export async function fetchTargetOptions(): Promise<TargetOptions> {
  return await request<TargetOptions>(ENDPOINTS.targets.options, {
    method: "GET",
    token: authToken(),
  });
}
