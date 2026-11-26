import { getSession } from "./auth";
import { request } from "./api";
import { ENDPOINTS } from "./endpoints";
import {
  ATTENDANCE_STATUSES,
  type BulkAttendanceInput,
  type BulkAttendanceResponse,
  type AttendanceFilters,
  type AttendanceFormValues,
  type AttendanceListResponse,
  type AttendanceOptionsResponse,
  type AttendanceRecord,
  type AttendanceStatus,
} from "../types/attendance";

function authToken(): string {
  const token = getSession()?.token;
  if (!token) throw new Error("Not signed in");
  return token;
}

export function attendanceQuery(filters: AttendanceFilters): string {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.userId) params.set("userId", String(filters.userId));
  if (filters.status) params.set("status", filters.status);
  if (filters.date) params.set("date", filters.date);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchAttendance(
  filters: AttendanceFilters = {},
): Promise<AttendanceListResponse> {
  return request<AttendanceListResponse>(
    `${ENDPOINTS.attendance.list}${attendanceQuery(filters)}`,
    { token: authToken() },
  );
}

export async function fetchAttendanceOptions(): Promise<AttendanceOptionsResponse> {
  return request<AttendanceOptionsResponse>(ENDPOINTS.attendance.options, {
    token: authToken(),
  });
}

export async function createAttendanceRecord(
  values: AttendanceFormValues,
): Promise<AttendanceRecord> {
  return request<AttendanceRecord>(ENDPOINTS.attendance.create, {
    method: "POST",
    body: values,
    token: authToken(),
  });
}

export async function updateAttendanceRecord(
  id: number,
  values: AttendanceFormValues,
): Promise<AttendanceRecord> {
  return request<AttendanceRecord>(ENDPOINTS.attendance.update(id), {
    method: "PATCH",
    body: values,
    token: authToken(),
  });
}

export async function saveBulkAttendance(
  input: BulkAttendanceInput,
): Promise<BulkAttendanceResponse> {
  return request<BulkAttendanceResponse>(ENDPOINTS.attendance.bulk, {
    method: "POST",
    body: input,
    token: authToken(),
  });
}

export async function deleteAttendanceRecord(id: number): Promise<void> {
  await request(ENDPOINTS.attendance.delete(id), {
    method: "DELETE",
    token: authToken(),
  });
}

export function attendanceStatusLabel(status: AttendanceStatus): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const attendanceStatusStyles: Record<AttendanceStatus, string> = {
  PRESENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ABSENT: "bg-rose-50 text-rose-700 border-rose-200",
  LATE: "bg-amber-50 text-amber-700 border-amber-200",
  HALF_DAY: "bg-orange-50 text-orange-700 border-orange-200",
  LEAVE: "bg-indigo-50 text-indigo-700 border-indigo-200",
  WEEKEND: "bg-slate-100 text-slate-600 border-slate-200",
  HOLIDAY: "bg-sky-50 text-sky-700 border-sky-200",
};

export function formatAttendanceDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatAttendanceTime(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 5);
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatWorkingTime(minutes: number): string {
  if (!minutes) return "0m";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return `${remaining}m`;
  if (!remaining) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

export function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export function attendanceFormValues(record: AttendanceRecord): AttendanceFormValues {
  return {
    userId: record.userId,
    date: formatAttendanceDateInput(record.date),
    checkIn: formatAttendanceTime(record.checkIn) === "-" ? "" : formatAttendanceTime(record.checkIn),
    checkOut: formatAttendanceTime(record.checkOut) === "-" ? "" : formatAttendanceTime(record.checkOut),
    status: record.status,
    notes: record.notes ?? "",
  };
}

export function formatAttendanceDateInput(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function exportAttendanceCsv(records: AttendanceRecord[]): void {
  const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const headers = [
    "Date",
    "Employee",
    "Employee Code",
    "Check In",
    "Check Out",
    "Working Time",
    "Status",
    "Notes",
  ];
  const rows = records.map((record) => [
    formatAttendanceDate(record.date),
    record.user.name,
    record.user.employeeProfile?.employeeCode ?? "",
    formatAttendanceTime(record.checkIn),
    formatAttendanceTime(record.checkOut),
    formatWorkingTime(record.workingMinutes),
    attendanceStatusLabel(record.status),
    record.notes ?? "",
  ]);

  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export { ATTENDANCE_STATUSES };
