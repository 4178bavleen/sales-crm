import { request } from "./api";
import { apiUrl, ENDPOINTS } from "./endpoints";
import { getSession } from "./auth";
import type {
  DealsReportData,
  LeadsReportData,
  RepPerformanceItem,
  ReportFilterOptions,
  ReportFilterParams,
  ReportOverviewData,
} from "../types/reports";

function authToken(): string | undefined {
  return getSession()?.token;
}

function buildQueryString(params?: ReportFilterParams): string {
  if (!params) return "";
  const query = new URLSearchParams();
  if (params.period) query.set("period", params.period);
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.userId) query.set("userId", String(params.userId));
  if (params.teamId) query.set("teamId", String(params.teamId));
  return query.toString();
}

export async function fetchReportOptions(): Promise<ReportFilterOptions> {
  return await request<ReportFilterOptions>(ENDPOINTS.reports.options, {
    method: "GET",
    token: authToken(),
  });
}

export async function fetchReportOverview(params?: ReportFilterParams): Promise<ReportOverviewData> {
  const qs = buildQueryString(params);
  const url = qs ? `${ENDPOINTS.reports.overview}?${qs}` : ENDPOINTS.reports.overview;
  return await request<ReportOverviewData>(url, {
    method: "GET",
    token: authToken(),
  });
}

export async function fetchLeadsReport(params?: ReportFilterParams): Promise<LeadsReportData> {
  const qs = buildQueryString(params);
  const url = qs ? `${ENDPOINTS.reports.leads}?${qs}` : ENDPOINTS.reports.leads;
  return await request<LeadsReportData>(url, {
    method: "GET",
    token: authToken(),
  });
}

export async function fetchDealsReport(params?: ReportFilterParams): Promise<DealsReportData> {
  const qs = buildQueryString(params);
  const url = qs ? `${ENDPOINTS.reports.deals}?${qs}` : ENDPOINTS.reports.deals;
  return await request<DealsReportData>(url, {
    method: "GET",
    token: authToken(),
  });
}

export async function fetchRepPerformanceReport(
  params?: ReportFilterParams,
): Promise<RepPerformanceItem[]> {
  const qs = buildQueryString(params);
  const url = qs ? `${ENDPOINTS.reports.performance}?${qs}` : ENDPOINTS.reports.performance;
  return await request<RepPerformanceItem[]>(url, {
    method: "GET",
    token: authToken(),
  });
}

export async function exportReportExcel(params?: ReportFilterParams): Promise<void> {
  const qs = buildQueryString(params);
  const url = apiUrl(qs ? `${ENDPOINTS.reports.export}?${qs}` : ENDPOINTS.reports.export);

  const token = authToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `sales-crm-report-${params?.period || "current"}-${Date.now()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}
