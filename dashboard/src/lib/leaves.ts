import { getSession } from "./auth";
import { request } from "./api";
import { ENDPOINTS } from "./endpoints";
import type {
  LeaveRecord,
  LeaveStats,
  ApplyLeavePayload,
  ReviewLeavePayload,
  LeaveFilters,
  LeaveListResponse,
  LeaveType,
  LeaveStatus,
} from "../types/leave";

function authToken(): string {
  const token = getSession()?.token;
  if (!token) throw new Error("Not signed in");
  return token;
}

export function leaveQuery(filters: LeaveFilters): string {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.userId) params.set("userId", String(filters.userId));
  if (filters.status) params.set("status", filters.status);
  if (filters.leaveType) params.set("leaveType", filters.leaveType);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchMyLeaves(
  filters: LeaveFilters = {},
): Promise<LeaveListResponse> {
  return request<LeaveListResponse>(
    `${ENDPOINTS.leaves.my}${leaveQuery(filters)}`,
    { token: authToken() },
  );
}

export async function fetchMyLeaveStats(year?: number): Promise<LeaveStats> {
  const query = year ? `?year=${year}` : "";
  return request<LeaveStats>(`${ENDPOINTS.leaves.myStats}${query}`, {
    token: authToken(),
  });
}

export async function applyLeave(payload: ApplyLeavePayload): Promise<LeaveRecord> {
  const res = await request<{ leave: LeaveRecord }>(ENDPOINTS.leaves.apply, {
    method: "POST",
    body: payload,
    token: authToken(),
  });
  return res.leave;
}

export async function cancelMyLeave(id: number): Promise<LeaveRecord> {
  const res = await request<{ leave: LeaveRecord }>(ENDPOINTS.leaves.cancel(id), {
    method: "POST",
    token: authToken(),
  });
  return res.leave;
}

export async function fetchAllLeaves(
  filters: LeaveFilters = {},
): Promise<LeaveListResponse> {
  return request<LeaveListResponse>(
    `${ENDPOINTS.leaves.list}${leaveQuery(filters)}`,
    { token: authToken() },
  );
}

export async function reviewLeave(
  id: number,
  payload: ReviewLeavePayload,
): Promise<LeaveRecord> {
  const res = await request<{ leave: LeaveRecord }>(ENDPOINTS.leaves.review(id), {
    method: "PATCH",
    body: payload,
    token: authToken(),
  });
  return res.leave;
}

export function formatLeaveDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function calculateDaysBetween(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  if (diffTime < 0) return 0;
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

export function getLeaveTypeDetails(type: LeaveType): {
  label: string;
  badgeClass: string;
} {
  switch (type) {
    case "CASUAL":
      return {
        label: "Casual Leave",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      };
    case "SICK":
      return {
        label: "Sick Leave",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      };
    case "EARNED":
      return {
        label: "Earned / Privilege",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "UNPAID":
      return {
        label: "Loss of Pay (LWP)",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
      };
    case "MATERNITY":
      return {
        label: "Maternity Leave",
        badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
      };
    case "PATERNITY":
      return {
        label: "Paternity Leave",
        badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
      };
    case "COMP_OFF":
      return {
        label: "Compensatory Off",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      };
    case "OTHER":
    default:
      return {
        label: "Other Special",
        badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
      };
  }
}

export function getLeaveStatusBadge(status: LeaveStatus): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case "PENDING":
      return {
        label: "Pending Review",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      };
    case "APPROVED":
      return {
        label: "Approved",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "REJECTED":
      return {
        label: "Rejected",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        badgeClass: "bg-slate-100 text-slate-500 border-slate-200",
      };
  }
}
