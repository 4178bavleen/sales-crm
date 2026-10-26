import { useEffect, useState, useCallback, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Award,
  Download,
  RotateCw,
  CheckCircle2,
  Filter,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";
import DynamicSparkline from "../../components/ui/DynamicSparkline";
import {
  exportReportExcel,
  fetchDealsReport,
  fetchLeadsReport,
  fetchRepPerformanceReport,
  fetchReportOptions,
  fetchReportOverview,
} from "../../lib/reports";
import type {
  DealsReportData,
  LeadsReportData,
  RepPerformanceItem,
  ReportFilterOptions,
  ReportFilterParams,
  ReportOverviewData,
  ReportPeriod,
} from "../../types/reports";

const PERIOD_OPTIONS: { label: string; value: ReportPeriod }[] = [
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "Last 30 Days", value: "last_30_days" },
  { label: "Last 7 Days", value: "last_7_days" },
  { label: "This Quarter", value: "this_quarter" },
  { label: "This Year", value: "this_year" },
  { label: "All Time", value: "all" },
];

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

function formatNumber(val: number): string {
  return new Intl.NumberFormat("en-US").format(val);
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState<"overview" | "leads" | "deals" | "performance">("overview");
  const [period, setPeriod] = useState<ReportPeriod>("this_month");
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);

  const [filterOptions, setFilterOptions] = useState<ReportFilterOptions | null>(null);
  const [overviewData, setOverviewData] = useState<ReportOverviewData | null>(null);
  const [leadsData, setLeadsData] = useState<LeadsReportData | null>(null);
  const [dealsData, setDealsData] = useState<DealsReportData | null>(null);
  const [performanceData, setPerformanceData] = useState<RepPerformanceItem[] | null>(null);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load filter options once
  useEffect(() => {
    fetchReportOptions()
      .then(setFilterOptions)
      .catch((err) => console.error("Error loading report options:", err));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params: ReportFilterParams = {
      period,
      userId: selectedUserId,
    };

    try {
      const overviewPromise = fetchReportOverview(params);
      let tabPromise: Promise<unknown> = Promise.resolve(null);

      if (activeTab === "leads") {
        tabPromise = fetchLeadsReport(params);
      } else if (activeTab === "deals") {
        tabPromise = fetchDealsReport(params);
      } else if (activeTab === "performance") {
        tabPromise = fetchRepPerformanceReport(params);
      }

      const [overview, tabData] = await Promise.all([overviewPromise, tabPromise]);
      setOverviewData(overview);

      if (activeTab === "leads") setLeadsData(tabData as LeadsReportData);
      else if (activeTab === "deals") setDealsData(tabData as DealsReportData);
      else if (activeTab === "performance") setPerformanceData(tabData as RepPerformanceItem[]);
    } catch (err: unknown) {
      console.error("Failed to load report data:", err);
      setError(err instanceof Error ? err.message : "Failed to load report data");
    } finally {
      setLoading(false);
    }
  }, [activeTab, period, selectedUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportReportExcel({ period, userId: selectedUserId });
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export report spreadsheet.");
    } finally {
      setExporting(false);
    }
  };

  const sparkTrends = useMemo(() => {
    if (!overviewData?.trends || overviewData.trends.length === 0) {
      return {
        leads: [12, 19, 15, 25, 22, 30],
        revenue: [8000, 14000, 11000, 19000, 24000, 28000],
        pipeline: [20000, 25000, 22000, 31000, 36000, 42000],
        winRate: [40, 45, 42, 55, 52, 60],
        activities: [25, 34, 30, 45, 48, 55],
      };
    }
    return {
      leads: overviewData.trends.map((t) => t.leads),
      revenue: overviewData.trends.map((t) => t.wonRevenue),
      pipeline: overviewData.trends.map((t) => t.wonRevenue * 1.4 + t.leads * 120),
      winRate: overviewData.trends.map((t) => (t.wonDealsCount > 0 ? t.wonDealsCount * 20 : 15)),
      activities: overviewData.trends.map((t) => t.leads + t.conversions + t.wonDealsCount * 2),
    };
  }, [overviewData]);

  const summary = overviewData?.summary;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <BarChart3 size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Sales & CRM Analytics</h1>
              <p className="text-xs text-slate-500 sm:text-sm">
                Executive reports on leads, sales velocity, pipeline health, and team quotas.
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50"
            title="Refresh Data"
          >
            <RotateCw size={14} className={loading ? "animate-spin text-blue-600" : "text-slate-500"} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d61e7] px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-[#1d61e7]/20 transition hover:bg-[#1650c5] active:scale-95 disabled:opacity-50"
          >
            <Download size={14} className={exporting ? "animate-bounce" : ""} />
            <span>{exporting ? "Exporting..." : "Export Excel (.xlsx)"}</span>
          </button>
        </div>
      </div>

      {/* Persistent 5 Stat Cards Grid Matching Leads & Tasks & Targets */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Total Leads */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-blue-300 hover:shadow-xs min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#1d61e7]">
              <Users size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Total Leads</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {summary ? formatNumber(summary.totalLeads) : "0"}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-blue-600 flex items-center gap-0.5">
                <span>↑</span> {summary ? `${summary.leadConversionRate}% conv.` : "0% conv."}
              </p>
            </div>
          </div>
          <DynamicSparkline
            data={sparkTrends.leads}
            color="blue"
            gradientId="report-stat-dyn-leads"
          />
        </div>

        {/* Card 2: Won Revenue */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-emerald-300 hover:shadow-xs min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <DollarSign size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Won Revenue</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {summary ? formatCurrency(summary.wonRevenue) : "$0"}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5">
                <span>↑</span> {summary ? `${summary.wonDeals} deals won` : "0 deals"}
              </p>
            </div>
          </div>
          <DynamicSparkline
            data={sparkTrends.revenue}
            color="emerald"
            gradientId="report-stat-dyn-revenue"
          />
        </div>

        {/* Card 3: Active Pipeline */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-amber-300 hover:shadow-xs min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <TrendingUp size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Active Pipeline</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {summary ? formatCurrency(summary.totalPipelineValue) : "$0"}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-amber-600 flex items-center gap-0.5">
                <span>↑</span> {summary ? `${summary.openDeals} open deals` : "0 deals"}
              </p>
            </div>
          </div>
          <DynamicSparkline
            data={sparkTrends.pipeline}
            color="amber"
            gradientId="report-stat-dyn-pipeline"
          />
        </div>

        {/* Card 4: Win Rate */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-purple-300 hover:shadow-xs min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-600">
              <Award size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Win Rate</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {summary ? `${summary.winRate}%` : "0%"}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-purple-600 flex items-center gap-0.5">
                <span>↑</span> {summary ? `${summary.wonDeals}W / ${summary.lostDeals}L` : "0W / 0L"}
              </p>
            </div>
          </div>
          <DynamicSparkline
            data={sparkTrends.winRate}
            color="purple"
            gradientId="report-stat-dyn-winrate"
          />
        </div>

        {/* Card 5: Activities */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-sky-300 hover:shadow-xs min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
              <CheckCircle2 size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Activities</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {summary ? formatNumber(summary.totalTasksCompleted + summary.totalMeetingsConducted) : "0"}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-sky-600 flex items-center gap-0.5">
                <span>↑</span> {summary ? `${summary.totalTasksCompleted} tasks, ${summary.totalMeetingsConducted} mtgs` : "0 done"}
              </p>
            </div>
          </div>
          <DynamicSparkline
            data={sparkTrends.activities}
            color="sky"
            gradientId="report-stat-dyn-activities"
          />
        </div>
      </div>

      {/* Filter and Date Range Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
        {/* Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPeriod(opt.value)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                period === opt.value
                  ? "bg-[#1d61e7] text-white shadow-2xs font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Rep Selector Dropdown */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select
            value={selectedUserId ?? ""}
            onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : undefined)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
          >
            <option value="">All Representatives</option>
            {filterOptions?.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} {u.role ? `(${u.role.name})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-transparent">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition ${
            activeTab === "overview"
              ? "border-[#1d61e7] text-[#1d61e7]"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
          }`}
        >
          <BarChart3 size={16} />
          Executive Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("leads")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition ${
            activeTab === "leads"
              ? "border-[#1d61e7] text-[#1d61e7]"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
          }`}
        >
          <Users size={16} />
          Leads Analytics
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("deals")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition ${
            activeTab === "deals"
              ? "border-[#1d61e7] text-[#1d61e7]"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
          }`}
        >
          <TrendingUp size={16} />
          Pipeline & Deals
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("performance")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition ${
            activeTab === "performance"
              ? "border-[#1d61e7] text-[#1d61e7]"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
          }`}
        >
          <Award size={16} />
          Team Performance
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          <p>{error}</p>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            <div className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          </div>
        </div>
      ) : (
        <>
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === "overview" && overviewData && (
            <div className="space-y-6">
              {/* Monthly Trend & Pipeline Distribution */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* 6-Month Revenue & Pipeline Chart */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Monthly Revenue Velocity</h2>
                      <p className="text-xs text-slate-400">Won revenue trajectory across recent months</p>
                    </div>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={overviewData.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="wonRevGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1d61e7" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#1d61e7" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip
                          formatter={(value) => [formatCurrency(Number(value || 0)), "Won Revenue"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="wonRevenue"
                          stroke="#1d61e7"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#wonRevGrad)"
                          name="Won Revenue"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pipeline Funnel / Stage Breakdown */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <h2 className="text-sm font-bold text-slate-900">Pipeline Stages</h2>
                  <p className="text-xs text-slate-400">Value distribution across stages</p>

                  <div className="mt-4 space-y-3">
                    {overviewData.stageDistribution.map((stage) => {
                      const maxVal = Math.max(
                        ...overviewData.stageDistribution.map((s) => s.totalValue),
                        1,
                      );
                      const percent = Math.round((stage.totalValue / maxVal) * 100);

                      return (
                        <div key={stage.stageId} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-700">{stage.stageName}</span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(stage.totalValue)}{" "}
                              <span className="font-normal text-slate-400">({stage.count})</span>
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[#1d61e7] transition-all duration-500"
                              style={{ width: `${Math.max(percent, 4)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Lead Conversion Funnel & Deal Velocity Insights */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Lead Conversion Health</h2>
                      <p className="text-xs text-slate-400">Conversion efficiency and volume transition</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      <Sparkles size={12} />
                      {overviewData.summary.leadConversionRate}% Rate
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3 text-center">
                      <p className="text-[11px] font-medium text-slate-500 uppercase">Total Leads</p>
                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {formatNumber(overviewData.summary.totalLeads)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-blue-50/70 p-3 text-center">
                      <p className="text-[11px] font-medium text-blue-600 uppercase">Qualified</p>
                      <p className="mt-1 text-xl font-bold text-blue-900">
                        {formatNumber(overviewData.summary.qualifiedLeads)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-50/70 p-3 text-center">
                      <p className="text-[11px] font-medium text-emerald-600 uppercase">Converted</p>
                      <p className="mt-1 text-xl font-bold text-emerald-900">
                        {formatNumber(overviewData.summary.convertedLeads)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Sales Deal Metrics</h2>
                      <p className="text-xs text-slate-400">Average contract value and closing ratios</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700">
                      <Award size={12} />
                      {overviewData.summary.winRate}% Win Rate
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3 text-center">
                      <p className="text-[11px] font-medium text-slate-500 uppercase">Avg. Deal Size</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {formatCurrency(overviewData.summary.averageDealSize)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-50/70 p-3 text-center">
                      <p className="text-[11px] font-medium text-emerald-600 uppercase">Won Deals</p>
                      <p className="mt-1 text-lg font-bold text-emerald-900">
                        {overviewData.summary.wonDeals} deals
                      </p>
                    </div>
                    <div className="rounded-xl bg-rose-50/70 p-3 text-center">
                      <p className="text-[11px] font-medium text-rose-600 uppercase">Lost Deals</p>
                      <p className="mt-1 text-lg font-bold text-rose-900">
                        {overviewData.summary.lostDeals} deals
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LEADS ANALYTICS */}
          {activeTab === "leads" && leadsData && (
            <div className="space-y-6">
              {/* Funnel Metrics */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {leadsData.byStatus.map((st) => (
                  <div key={st.status} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{st.status}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{formatNumber(st.count)}</p>
                    <p className="text-[11px] font-semibold text-blue-600">{st.percentage}%</p>
                  </div>
                ))}
              </div>

              {/* Source Breakdown & Disqualification Reasons */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Leads by Acquisition Source */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <h2 className="text-sm font-bold text-slate-900">Leads by Channel / Source</h2>
                  <p className="text-xs text-slate-400">Performance and volume by channel</p>

                  <div className="mt-4 h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={leadsData.bySource} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="sourceName" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="count" name="Total Leads" fill="#1d61e7" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="convertedCount" name="Converted" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 divide-y divide-slate-100">
                    {leadsData.bySource.map((s) => (
                      <div key={s.sourceName} className="flex items-center justify-between py-2 text-xs">
                        <span className="font-medium text-slate-700">{s.sourceName}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500">{s.count} leads</span>
                          <span className="font-semibold text-emerald-600">{s.conversionRate}% conv.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Disqualification Reasons */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <h2 className="text-sm font-bold text-slate-900">Disqualification Reasons</h2>
                  <p className="text-xs text-slate-400">Why prospective leads did not convert</p>

                  {leadsData.disqualificationAnalysis.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {leadsData.disqualificationAnalysis.map((item) => (
                        <div key={item.reason} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs">
                          <span className="font-medium text-slate-700">{item.reason}</span>
                          <span className="rounded-full bg-slate-200 px-2.5 py-0.5 font-bold text-slate-700">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-12 text-center text-xs text-slate-400">
                      No disqualification records in this period.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PIPELINE & DEALS */}
          {activeTab === "deals" && dealsData && (
            <div className="space-y-6">
              {/* Deals Summary Row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Deals</span>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(dealsData.totalDeals)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {dealsData.openDeals} Open | {dealsData.wonDeals} Won | {dealsData.lostDeals} Lost
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Won Revenue</span>
                  <p className="mt-2 text-2xl font-bold text-emerald-600">{formatCurrency(dealsData.wonRevenue)}</p>
                  <p className="mt-1 text-xs text-slate-500">From {dealsData.wonDeals} won deals</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lost Value</span>
                  <p className="mt-2 text-2xl font-bold text-rose-500">{formatCurrency(dealsData.lostValue)}</p>
                  <p className="mt-1 text-xs text-slate-500">From {dealsData.lostDeals} lost opportunities</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Sales Cycle</span>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{dealsData.averageSalesCycleDays} Days</p>
                  <p className="mt-1 text-xs text-slate-500">Time from deal creation to win</p>
                </div>
              </div>

              {/* Stage Table & Deal Size Distribution */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Stage Table */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs lg:col-span-2">
                  <div className="border-b border-slate-100 p-5">
                    <h2 className="text-sm font-bold text-slate-900">Pipeline Stages Breakdown</h2>
                    <p className="text-xs text-slate-400">Current active and concluded opportunities by stage</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Stage</th>
                          <th className="px-4 py-3 font-semibold">Type</th>
                          <th className="px-4 py-3 font-semibold text-right">Deals</th>
                          <th className="px-4 py-3 font-semibold text-right">Total Value</th>
                          <th className="px-4 py-3 font-semibold text-right">Avg. Size</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {dealsData.stageDistribution.map((st) => (
                          <tr key={st.stageId} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold text-slate-900">{st.stageName}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  st.kind === "WON"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : st.kind === "LOST"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {st.kind}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">{st.count}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-900">
                              {formatCurrency(st.totalValue)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-500">
                              {formatCurrency(st.averageValue || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Deal Size Distribution */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <h2 className="text-sm font-bold text-slate-900">Deal Value Brackets</h2>
                  <p className="text-xs text-slate-400">Distribution by deal size tiers</p>

                  <div className="mt-4 space-y-3">
                    {dealsData.sizeDistribution.map((bracket) => (
                      <div key={bracket.label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{bracket.label}</span>
                          <span className="font-bold text-blue-600">{bracket.count} deals</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{formatCurrency(bracket.value)} total</p>
                      </div>
                    ))}
                  </div>

                  {/* Lost Reasons */}
                  {dealsData.lossReasonsAnalysis.length > 0 && (
                    <div className="mt-6 border-t border-slate-100 pt-4">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Top Lost Reasons</h3>
                      <div className="mt-3 space-y-2">
                        {dealsData.lossReasonsAnalysis.map((lr) => (
                          <div key={lr.reason} className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">{lr.reason}</span>
                            <span className="font-semibold text-rose-600">
                              {lr.count} ({formatCurrency(lr.lostValue)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TEAM PERFORMANCE */}
          {activeTab === "performance" && performanceData && (
            <div className="space-y-6">
              {/* Leaderboard Table */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
                <div className="border-b border-slate-100 p-5">
                  <h2 className="text-sm font-bold text-slate-900">Team Performance & Quota Attainment</h2>
                  <p className="text-xs text-slate-400">
                    Individual sales achievement, deal velocity, and activity output
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3.5 font-semibold">Representative</th>
                        <th className="px-4 py-3.5 font-semibold">Role</th>
                        <th className="px-4 py-3.5 font-semibold text-right">Won Revenue</th>
                        <th className="px-4 py-3.5 font-semibold text-right">Quota Target</th>
                        <th className="px-4 py-3.5 font-semibold">Attainment</th>
                        <th className="px-4 py-3.5 font-semibold text-right">Deals (W/L)</th>
                        <th className="px-4 py-3.5 font-semibold text-right">Win Rate</th>
                        <th className="px-4 py-3.5 font-semibold text-right">Leads Conv.</th>
                        <th className="px-4 py-3.5 font-semibold text-right">Activities</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {performanceData.map((rep) => {
                        const initials = rep.name
                          .split(" ")
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase();

                        return (
                          <tr key={rep.userId} className="hover:bg-slate-50/60">
                            {/* Rep Name & Avatar */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1d61e7] text-xs font-bold text-white">
                                  {initials}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">{rep.name}</p>
                                  <p className="text-[11px] text-slate-400">{rep.email}</p>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td className="px-4 py-3">
                              <span className="font-medium text-slate-800">{rep.role}</span>
                            </td>

                            {/* Won Revenue */}
                            <td className="px-4 py-3 text-right font-bold text-slate-900">
                              {formatCurrency(rep.revenueAchieved)}
                            </td>

                            {/* Quota Target */}
                            <td className="px-4 py-3 text-right font-medium text-slate-600">
                              {rep.targetQuota > 0 ? formatCurrency(rep.targetQuota) : "No quota set"}
                            </td>

                            {/* Attainment % & Bar */}
                            <td className="px-4 py-3">
                              <div className="w-32 space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span
                                    className={`font-bold ${
                                      rep.targetAttainment >= 100
                                        ? "text-emerald-600"
                                        : rep.targetAttainment >= 60
                                        ? "text-blue-600"
                                        : "text-amber-600"
                                    }`}
                                  >
                                    {rep.targetAttainment}%
                                  </span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className={`h-full rounded-full ${
                                      rep.targetAttainment >= 100
                                        ? "bg-emerald-500"
                                        : rep.targetAttainment >= 60
                                        ? "bg-[#1d61e7]"
                                        : "bg-amber-500"
                                    }`}
                                    style={{ width: `${Math.min(rep.targetAttainment, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Deals Won / Lost */}
                            <td className="px-4 py-3 text-right font-medium">
                              <span className="text-emerald-600">{rep.dealsWon}W</span> /{" "}
                              <span className="text-rose-500">{rep.dealsLost}L</span>
                            </td>

                            {/* Win Rate */}
                            <td className="px-4 py-3 text-right font-bold text-slate-900">{rep.winRate}%</td>

                            {/* Leads Converted */}
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-slate-900">{rep.leadsConverted}</span>
                              <span className="text-slate-400">/{rep.leadsAssigned}</span>
                            </td>

                            {/* Activities */}
                            <td className="px-4 py-3 text-right text-slate-600">
                              {rep.tasksCompleted} tasks, {rep.meetingsHeld} mtgs
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
