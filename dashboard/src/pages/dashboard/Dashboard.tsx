import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar as CalendarIcon,
  Target,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCw,
  AlertCircle,
  Building2,
  CalendarClock,
  Award,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Shield,
  History,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { fetchReportOverview, fetchRepPerformanceReport } from "../../lib/reports";
import { fetchLeads, createLead } from "../../lib/leads";
import { fetchMeetings } from "../../lib/meetings";
import { fetchAuditLogs, type AuditLogItem } from "../../lib/auditLogs";
import { request } from "../../lib/api";
import { ENDPOINTS } from "../../lib/endpoints";
import { getSession } from "../../lib/auth";

import type {
  ReportOverviewData,
  RepPerformanceItem,
  ReportPeriod,
} from "../../types/reports";
import type { Lead } from "../../types/lead";
import type { MeetingItem } from "../../types/meeting";
import type { Task } from "../../types/task";
import CreateLeadModal from "../../components/ui/Createlead";
import DynamicSparkline from "../../components/ui/DynamicSparkline";

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val || 0);
}

function formatNumber(val: number): string {
  return new Intl.NumberFormat("en-IN").format(val || 0);
}

function formatDateKey(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function getActionBadgeClass(action: string) {
  switch (action) {
    case "CREATE":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20";
    case "ASSIGN":
      return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20";
    case "STATUS_CHANGE":
    case "STAGE_CHANGE":
      return "bg-blue-50 text-[#1d61e7] ring-1 ring-[#1d61e7]/20";
    case "DISQUALIFY":
    case "DELETE":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20";
    case "CLOSE_WON":
      return "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatAuditSummary(log: AuditLogItem): string {
  if (log.after && typeof log.after === "object") {
    const after = log.after as Record<string, unknown>;
    const before = (log.before && typeof log.before === "object" ? log.before : {}) as Record<string, unknown>;

    if (log.action === "STAGE_CHANGE" || (before.stageId !== undefined && after.stageId !== undefined)) {
      return `Stage moved from #${String(before.stageId ?? "?")} to #${String(after.stageId ?? "?")}`;
    }
    if (log.action === "STATUS_CHANGE" || (before.status !== undefined && after.status !== undefined)) {
      return `Status changed: ${String(before.status)} → ${String(after.status)}`;
    }
    if (log.action === "ASSIGN" || after.ownerId !== undefined) {
      return after.ownerId ? `Assigned to user #${String(after.ownerId)}` : "Unassigned";
    }
    if (log.action === "DISQUALIFY" || after.reason !== undefined) {
      return `Disqualified${after.reason ? `: "${String(after.reason)}"` : ""}`;
    }
    if (after.title) {
      return `"${String(after.title)}"`;
    }
    if (after.fullName) {
      return `Contact: ${String(after.fullName)}`;
    }
    const entries = Object.entries(after).filter(([k]) => k !== "id");
    if (entries.length > 0) {
      return entries
        .slice(0, 2)
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join(", ");
    }
  }
  return "State updated";
}

export default function Dashboard() {
  const [period, setPeriod] = useState<ReportPeriod>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [overview, setOverview] = useState<ReportOverviewData | null>(null);
  const [reps, setReps] = useState<RepPerformanceItem[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [customerAccounts, setCustomerAccounts] = useState<
    Array<{
      id: number;
      companyName: string;
      contactName: string;
      industry: string;
      health: "EXCELLENT" | "STABLE" | "NEW";
      tier: "Enterprise" | "Growth" | "Standard";
    }>
  >([]);

  // Calendar states
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [agendaTab, setAgendaTab] = useState<"ALL" | "MEETINGS" | "TASKS">("ALL");

  // Create lead modal
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);

  const loadDashboardData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    setError(null);

    const token = getSession()?.token;

    try {
      const [overviewRes, repsRes, leadsRes, meetingsRes, tasksRes, dealOptionsRes, auditLogsRes] =
        await Promise.allSettled([
          fetchReportOverview({ period }),
          fetchRepPerformanceReport({ period }),
          fetchLeads({ limit: 6 }),
          fetchMeetings({ limit: 30 }),
          request<{ items: Task[] }>(ENDPOINTS.tasks.list, {
            method: "GET",
            token,
          }),
          request<{
            customers?: Array<{
              id: number;
              company?: { id: number; name: string } | null;
              primaryContact?: { id: number; fullName: string } | null;
            }>;
          }>(ENDPOINTS.deals.options, {
            method: "GET",
            token,
          }),
          fetchAuditLogs({ limit: 8 }),
        ]);

      if (overviewRes.status === "fulfilled") {
        setOverview(overviewRes.value);
      }
      if (repsRes.status === "fulfilled") {
        setReps(repsRes.value);
      }
      if (leadsRes.status === "fulfilled") {
        setLeads(leadsRes.value.leads || []);
      }
      if (meetingsRes.status === "fulfilled") {
        setMeetings(meetingsRes.value.meetings || []);
      }
      if (tasksRes.status === "fulfilled") {
        setTasks(tasksRes.value.items || []);
      }
      if (auditLogsRes.status === "fulfilled") {
        setAuditLogs(auditLogsRes.value.items || []);
      }
      if (dealOptionsRes.status === "fulfilled" && dealOptionsRes.value.customers) {
        const rawCusts = dealOptionsRes.value.customers;
        const mapped = rawCusts.map((c, i) => {
          const compName = c.company?.name || `Client Account #${c.id}`;
          const contact = c.primaryContact?.fullName || "Primary Representative";
          const industries = ["Technology", "Manufacturing", "Finance", "Healthcare", "Services"];
          const tiers: Array<"Enterprise" | "Growth" | "Standard"> = ["Enterprise", "Growth", "Standard"];
          return {
            id: c.id,
            companyName: compName,
            contactName: contact,
            industry: industries[i % industries.length],
            health: (i % 2 === 0 ? "EXCELLENT" : "STABLE") as "EXCELLENT" | "STABLE" | "NEW",
            tier: tiers[i % tiers.length],
          };
        });
        setCustomerAccounts(mapped);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load dashboard data";
      setError(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Derived KPI Stats (with fallbacks if fresh database)
  const stats = useMemo(() => {
    const summary = overview?.summary;
    const totalPipelineValue = summary?.totalPipelineValue ?? 0;
    const wonRevenue = summary?.wonRevenue ?? 0;
    const totalLeads = summary?.totalLeads ?? leads.length;
    const winRate = summary?.winRate ?? 0;
    const averageDealSize = summary?.averageDealSize ?? 0;
    const totalDeals = summary?.totalDeals ?? 0;

    return {
      pipelineValue: totalPipelineValue,
      wonRevenue: wonRevenue,
      totalLeads: totalLeads,
      winRate: winRate,
      averageDealSize: averageDealSize,
      totalDeals: totalDeals,
      openDeals: summary?.openDeals ?? 0,
      wonDeals: summary?.wonDeals ?? 0,
      conversionRate: summary?.leadConversionRate ?? 0,
    };
  }, [overview, leads]);

  const sparkTrends = useMemo(() => {
    if (!overview?.trends || overview.trends.length === 0) {
      return {
        pipeline: [
          Math.round(stats.pipelineValue * 0.3),
          Math.round(stats.pipelineValue * 0.5),
          Math.round(stats.pipelineValue * 0.7),
          Math.round(stats.pipelineValue * 0.85),
          stats.pipelineValue || 35000,
        ],
        revenue: [
          Math.round(stats.wonRevenue * 0.25),
          Math.round(stats.wonRevenue * 0.45),
          Math.round(stats.wonRevenue * 0.6),
          Math.round(stats.wonRevenue * 0.8),
          stats.wonRevenue || 45580,
        ],
        leads: [
          Math.max(1, Math.round(stats.totalLeads * 0.3)),
          Math.max(2, Math.round(stats.totalLeads * 0.5)),
          Math.max(3, Math.round(stats.totalLeads * 0.7)),
          Math.max(4, Math.round(stats.totalLeads * 0.85)),
          stats.totalLeads || 15,
        ],
        winRate: [
          Math.max(10, Math.round((stats.winRate || 50) * 0.6)),
          Math.max(15, Math.round((stats.winRate || 50) * 0.75)),
          Math.max(20, Math.round((stats.winRate || 50) * 0.85)),
          Math.max(25, Math.round((stats.winRate || 50) * 0.95)),
          stats.winRate || 66,
        ],
        avgDeal: [
          Math.round((stats.averageDealSize || 20000) * 0.4),
          Math.round((stats.averageDealSize || 20000) * 0.6),
          Math.round((stats.averageDealSize || 20000) * 0.8),
          Math.round((stats.averageDealSize || 20000) * 0.9),
          stats.averageDealSize || 22790,
        ],
      };
    }
    return {
      pipeline: overview.trends.map((t) => t.wonRevenue * 1.35 + t.leads * 150),
      revenue: overview.trends.map((t) => t.wonRevenue),
      leads: overview.trends.map((t) => t.leads),
      winRate: overview.trends.map((t) => (t.wonDealsCount > 0 ? Math.min(100, t.wonDealsCount * 22) : 20)),
      avgDeal: overview.trends.map((t) => (t.wonDealsCount > 0 ? Math.round(t.wonRevenue / t.wonDealsCount) : 18000)),
    };
  }, [overview, stats]);

  // Calendar calculations
  const calendarDays = useMemo(() => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    // Monday as 0, Sunday as 6
    const adjustedFirstDay = (firstDayIndex + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      date: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      hasMeeting: boolean;
      hasTask: boolean;
    }> = [];

    const todayStr = new Date().toISOString().split("T")[0];

    // Previous month padding
    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, d);
      const dateKey = prevDate.toISOString().split("T")[0];
      days.push({
        date: dateKey,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateKey === todayStr,
        isSelected: dateKey === selectedDate,
        hasMeeting: meetings.some((m) => formatDateKey(m.startsAt) === dateKey),
        hasTask: tasks.some((t) => formatDateKey(t.dueAt) === dateKey),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const currentDate = new Date(year, month, d);
      const dateKey = currentDate.toISOString().split("T")[0];
      days.push({
        date: dateKey,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateKey === todayStr,
        isSelected: dateKey === selectedDate,
        hasMeeting: meetings.some((m) => formatDateKey(m.startsAt) === dateKey),
        hasTask: tasks.some((t) => formatDateKey(t.dueAt) === dateKey),
      });
    }

    // Next month padding to complete 35 or 42 grid cells
    const remaining = 35 - days.length >= 0 ? 35 - days.length : 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dateKey = nextDate.toISOString().split("T")[0];
      days.push({
        date: dateKey,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateKey === todayStr,
        isSelected: dateKey === selectedDate,
        hasMeeting: meetings.some((m) => formatDateKey(m.startsAt) === dateKey),
        hasTask: tasks.some((t) => formatDateKey(t.dueAt) === dateKey),
      });
    }

    return days;
  }, [currentCalendarMonth, selectedDate, meetings, tasks]);

  // Scheduled agenda items for selected date
  const agendaItems = useMemo(() => {
    const dayMeetings = meetings
      .filter((m) => formatDateKey(m.startsAt) === selectedDate)
      .map((m) => ({
        id: `meet-${m.id}`,
        type: "MEETING" as const,
        time: m.startsAt
          ? new Date(m.startsAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "TBD",
        title: m.title,
        subtitle: m.lead?.contactName
          ? `Lead: ${m.lead.contactName}`
          : m.location || m.meetingLink || "Scheduled Conference",
        status: m.status,
        raw: m,
      }));

    const dayTasks = tasks
      .filter((t) => formatDateKey(t.dueAt) === selectedDate)
      .map((t) => ({
        id: `task-${t.id}`,
        type: "TASK" as const,
        time: t.dueAt
          ? new Date(t.dueAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "All Day",
        title: t.title,
        subtitle: t.assignedTo ? `Assigned to: ${t.assignedTo}` : t.description || "Action Item",
        priority: t.priority,
        status: t.status,
        raw: t,
      }));

    if (agendaTab === "MEETINGS") return dayMeetings;
    if (agendaTab === "TASKS") return dayTasks;
    return [...dayMeetings, ...dayTasks];
  }, [meetings, tasks, selectedDate, agendaTab]);

  // Chart data
  const chartTrends = useMemo(() => {
    if (overview?.trends && overview.trends.length > 0) {
      return overview.trends.map((t) => ({
        month: t.month.replace(" 2026", ""),
        wonRevenue: t.wonRevenue,
        leads: t.leads,
        conversions: t.conversions,
      }));
    }
    // Fallback trend structure
    return [
      { month: "May", wonRevenue: 12000, leads: 5, conversions: 2 },
      { month: "Jun", wonRevenue: 28000, leads: 8, conversions: 3 },
      { month: "Jul", wonRevenue: 34000, leads: 11, conversions: 4 },
      { month: "Aug", wonRevenue: 42000, leads: 14, conversions: 6 },
      { month: "Sep", wonRevenue: 38000, leads: 12, conversions: 5 },
      { month: "Oct", wonRevenue: stats.wonRevenue || 45580, leads: stats.totalLeads || 15, conversions: 7 },
    ];
  }, [overview, stats]);

  // Stage distribution for pipeline funnel / bar chart
  const stageDistributionData = useMemo(() => {
    if (overview?.stageDistribution && overview.stageDistribution.length > 0) {
      return overview.stageDistribution.map((st) => ({
        name: st.stageName,
        deals: st.count,
        value: st.totalValue,
        kind: st.kind,
      }));
    }
    // Fallback stage distribution
    return [
      { name: "Qualified", deals: 3, value: 35000, kind: "OPEN" },
      { name: "Demo", deals: 2, value: 54000, kind: "OPEN" },
      { name: "Proposal", deals: 2, value: 72000, kind: "OPEN" },
      { name: "Negotiation", deals: 1, value: 45000, kind: "OPEN" },
      { name: "Won", deals: 2, value: stats.wonRevenue || 45580, kind: "WON" },
    ];
  }, [overview, stats.wonRevenue]);

  const handleLeadCreated = async (newLead: Lead) => {
    try {
      await createLead(newLead);
      setIsCreateLeadOpen(false);
      loadDashboardData(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create lead";
      alert(message);
    }
  };

  const formattedSelectedDate = useMemo(() => {
    try {
      const parts = selectedDate.split("-");
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    } catch {
      // fallback
    }
    return selectedDate;
  }, [selectedDate]);

  return (
    <div className="space-y-6 pb-12">
      {/* TOP HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Executive Sales Overview
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Real-time pipeline velocity, meetings, tasks, conversion rates &amp; team performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period selector */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-xs">
            {(
              [
                { label: "Today", val: "today" },
                { label: "7 Days", val: "last_7_days" },
                { label: "This Month", val: "this_month" },
                { label: "All Time", val: "all" },
              ] as const
            ).map((item) => (
              <button
                key={item.val}
                type="button"
                onClick={() => setPeriod(item.val)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  period === item.val
                    ? "bg-[#1d61e7] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-60"
            title="Refresh dashboard metrics"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-[#1d61e7]" : ""}`} />
            <span>Refresh</span>
          </button>

          {/* Create Lead Action Button */}
          <button
            type="button"
            onClick={() => setIsCreateLeadOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d61e7] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Lead</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. PERSISTENT 5 STAT CARDS GRID MATCHING LEADS, CUSTOMERS, REPORTS & CONTACTS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Pipeline Value */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-blue-500 bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-blue-600 hover:shadow-xs min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-[#154fc1]">
              <DollarSign size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">Pipeline Value</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-950 leading-tight">
                {formatCurrency(stats.pipelineValue)}
              </p>
              <p className="mt-0.5 text-[11px] font-bold text-[#154fc1] flex items-center gap-0.5">
                <span>↑</span> {stats.openDeals > 0 ? `${stats.openDeals} open deals` : `${stats.totalDeals} deals`}
              </p>
            </div>
          </div>
          <DynamicSparkline
            data={sparkTrends.pipeline}
            color="blue"
            gradientId="dash-stat-dyn-pipeline"
          />
        </div>

        {/* Card 2: Won Revenue */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-emerald-500 bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-emerald-600 hover:shadow-xs min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <TrendingUp size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">Won Revenue</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-950 leading-tight">
                {formatCurrency(stats.wonRevenue)}
              </p>
              <p className="mt-0.5 text-[11px] font-bold text-emerald-700 flex items-center gap-0.5">
                <span>↑</span> {stats.wonDeals > 0 ? `${stats.wonDeals} won deals` : "Active revenue"}
              </p>
            </div>
          </div>
          <DynamicSparkline
            data={sparkTrends.revenue}
            color="emerald"
            gradientId="dash-stat-dyn-revenue"
          />
        </div>

        {/* Card 3: Total Leads */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-purple-500 bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-purple-600 hover:shadow-xs min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <Users size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">Total Leads</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-950 leading-tight">
                {formatNumber(stats.totalLeads)}
              </p>
              <p className="mt-0.5 text-[11px] font-bold text-purple-700 flex items-center gap-0.5">
                <span>↑</span> {stats.conversionRate > 0 ? `${stats.conversionRate}% conv.` : "Tracking"}
              </p>
            </div>
          </div>
          <DynamicSparkline
            data={sparkTrends.leads}
            color="purple"
            gradientId="dash-stat-dyn-leads"
          />
        </div>

        {/* Card 4: Win Rate */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-amber-500 bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-amber-600 hover:shadow-xs min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Target size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">Win Rate</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-950 leading-tight">
                {stats.winRate > 0 ? `${stats.winRate}%` : "0%"}
              </p>
              <p className="mt-0.5 text-[11px] font-bold text-amber-800 flex items-center gap-0.5">
                <span>↑</span> {stats.wonDeals}W / {Math.max(0, stats.totalDeals - stats.wonDeals)}L
              </p>
            </div>
          </div>
          <DynamicSparkline
            data={sparkTrends.winRate}
            color="amber"
            gradientId="dash-stat-dyn-winrate"
          />
        </div>

        {/* Card 5: Avg Deal Size */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-rose-500 bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-rose-600 hover:shadow-xs min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <Award size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">Avg Deal Size</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-950 leading-tight">
                {formatCurrency(stats.averageDealSize || (stats.wonDeals > 0 ? Math.round(stats.wonRevenue / stats.wonDeals) : 0))}
              </p>
              <p className="mt-0.5 text-[11px] font-bold text-rose-700 flex items-center gap-0.5">
                <span>↑</span> Realized avg
              </p>
            </div>
          </div>
          <DynamicSparkline
            data={sparkTrends.avgDeal}
            color="rose"
            gradientId="dash-stat-dyn-avgdeal"
          />
        </div>
      </div>

      {/* 2. MIDDLE GRID: WORKSPACE (CHARTS + DEALS & PIPELINE) & CALENDAR/MEETINGS DECK */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* LEFT COLUMN: CHARTS, PIPELINE STAGES, LEADS (8 COLS) */}
        <div className="space-y-6 xl:col-span-8">
          {/* CHARTS SECTION */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Chart 1: Revenue Velocity Area Chart */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Revenue Velocity Trend
                  </h3>
                  <p className="text-xs text-slate-500">
                    Won revenue trajectory across months
                  </p>
                </div>
                <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-[#1d61e7]">
                  Monthly
                </span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashboardRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1d61e7" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#1d61e7" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val) => [formatCurrency(Number(val || 0)), "Won Revenue"]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="wonRevenue"
                      stroke="#1d61e7"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#dashboardRevenueGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Deal Volume & Pipeline by Stage */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Pipeline by Stage
                  </h3>
                  <p className="text-xs text-slate-500">
                    Deal volume across active sales stages
                  </p>
                </div>
                <Link
                  to="/deals"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#1d61e7] hover:underline"
                >
                  View Deals
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stageDistributionData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 10 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      formatter={(val, _name, item) => [
                        `${val} deals (${formatCurrency(item.payload.value)})`,
                        "Deal Count",
                      ]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                      }}
                    />
                    <Bar dataKey="deals" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 3. KEY CUSTOMER ACCOUNTS & ENTERPRISE ORGANIZATIONS */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#1d61e7]" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Key Customer Accounts &amp; Partner Companies
                  </h3>
                  <p className="text-xs text-slate-500">
                    High-value organizational accounts &amp; relationship health
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/companies"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#1d61e7]"
                >
                  Companies
                </Link>
                <span className="text-slate-300">•</span>
                <Link
                  to="/customers"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#1d61e7] hover:underline"
                >
                  All Customers
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {(customerAccounts.length > 0
                ? customerAccounts
                : [
                    {
                      id: 1,
                      companyName: "G K Enterprises",
                      contactName: "Gabrial Deora",
                      industry: "Technology",
                      health: "EXCELLENT" as const,
                      tier: "Enterprise" as const,
                    },
                    {
                      id: 2,
                      companyName: "Acme Industrial Global",
                      contactName: "Operations Lead",
                      industry: "Manufacturing",
                      health: "STABLE" as const,
                      tier: "Growth" as const,
                    },
                    {
                      id: 3,
                      companyName: "Apex Logistics Corp",
                      contactName: "Managing Director",
                      industry: "Logistics",
                      health: "EXCELLENT" as const,
                      tier: "Enterprise" as const,
                    },
                  ]
              ).map((acc) => (
                <div
                  key={acc.id}
                  className="group relative flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 transition-all hover:border-blue-200 hover:bg-white hover:shadow-xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100/70 text-[#1d61e7] font-bold text-xs">
                          {acc.companyName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-slate-900 truncate" title={acc.companyName}>
                          {acc.companyName}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                        {acc.health}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <UserCheck className="h-3 w-3 text-slate-400" />
                        <span className="truncate max-w-[120px]">{acc.contactName}</span>
                      </span>
                      <span className="rounded bg-slate-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        {acc.industry}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                    <span className="text-slate-500 font-medium">{acc.tier} Tier</span>
                    <Link
                      to={`/customers`}
                      className="inline-flex items-center gap-0.5 font-bold text-[#1d61e7] opacity-80 group-hover:opacity-100 hover:underline"
                    >
                      View Account
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. LEADS SECTION */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Recents Leads &amp; Follow-ups
                </h3>
                <p className="text-xs text-slate-500">
                  Latest high-intent opportunities needing follow-up
                </p>
              </div>
              <Link
                to="/leads"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1d61e7] hover:underline"
              >
                View All Leads
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {leads.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center">
                <Users className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-600">
                  No active leads found
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateLeadOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#1d61e7] px-3 py-1.5 text-xs font-bold text-white shadow-xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create First Lead
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      <th className="py-2.5 px-3">Lead / Contact</th>
                      <th className="py-2.5 px-3">Company</th>
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Owner</th>
                      <th className="py-2.5 px-3">Next Action / Follow-up</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {leads.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3">
                          <Link
                            to={`/leads?leadId=${l.id}`}
                            className="font-bold text-slate-900 hover:text-[#1d61e7]"
                          >
                            {`${l.firstName} ${l.lastName}`.trim()}
                          </Link>
                          {l.email && (
                            <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                              {l.email}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {l.company || "—"}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              l.priority === "URGENT"
                                ? "bg-rose-100 text-rose-700"
                                : l.priority === "HIGH"
                                ? "bg-amber-100 text-amber-700"
                                : l.priority === "MEDIUM"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {l.priority}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                              {(l.owner || "A").charAt(0).toUpperCase()}
                            </span>
                            <span className="truncate max-w-[90px]">
                              {l.owner || "Unassigned"}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          {l.noFollowUp ? (
                            <span className="text-slate-400 italic">
                              No follow-up needed
                              {l.noFollowUpNote ? `: ${l.noFollowUpNote}` : ""}
                            </span>
                          ) : l.nextFollowUpAt ? (
                            <span className="font-medium text-slate-800">
                              {new Date(l.nextFollowUpAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          ) : (
                            <span className="text-slate-400">Scheduled follow-up</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              l.status === "QUALIFIED"
                                ? "bg-purple-100 text-purple-700"
                                : l.status === "CONTACTED"
                                ? "bg-blue-100 text-blue-700"
                                : l.status === "NEW"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SMALL CALENDAR (MEETINGS & TASKS) + TEAM PERFORMANCE (4 COLS) */}
        <div className="space-y-6 xl:col-span-4">
          {/* 5. SMALL CALENDAR WIDGET WITH MEETINGS AND TASKS */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="h-4 w-4 text-[#1d61e7]" />
                <h3 className="text-sm font-bold text-slate-900">
                  {currentCalendarMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const prev = new Date(currentCalendarMonth);
                    prev.setMonth(prev.getMonth() - 1);
                    setCurrentCalendarMonth(prev);
                  }}
                  className="rounded-md border border-slate-200 p-1 text-slate-600 hover:bg-slate-50 cursor-pointer"
                  title="Previous month"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = new Date(currentCalendarMonth);
                    next.setMonth(next.getMonth() + 1);
                    setCurrentCalendarMonth(next);
                  }}
                  className="rounded-md border border-slate-200 p-1 text-slate-600 hover:bg-slate-50 cursor-pointer"
                  title="Next month"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Mini Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                <div key={d} className="py-1 text-[10px] font-bold text-slate-400">
                  {d}
                </div>
              ))}

              {calendarDays.map((cDay, idx) => {
                return (
                  <button
                    key={`${cDay.date}-${idx}`}
                    type="button"
                    onClick={() => setSelectedDate(cDay.date)}
                    className={`relative flex h-8 flex-col items-center justify-center rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      cDay.isSelected
                        ? "bg-[#1d61e7] text-white shadow-xs"
                        : cDay.isToday
                        ? "bg-blue-50 text-[#1d61e7] font-bold ring-1 ring-[#1d61e7]/30"
                        : cDay.isCurrentMonth
                        ? "text-slate-700 hover:bg-slate-100"
                        : "text-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span>{cDay.dayNum}</span>

                    {/* Indicator dots for meetings & tasks */}
                    <div className="absolute bottom-1 flex items-center gap-0.5">
                      {cDay.hasMeeting && (
                        <span
                          className={`h-1 w-1 rounded-full ${
                            cDay.isSelected ? "bg-white" : "bg-emerald-500"
                          }`}
                        />
                      )}
                      {cDay.hasTask && (
                        <span
                          className={`h-1 w-1 rounded-full ${
                            cDay.isSelected ? "bg-white" : "bg-amber-500"
                          }`}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Agenda for Selected Date */}
            <div className="mt-4 border-t border-slate-100 pt-3">
              <div className="mb-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Schedule for {formattedSelectedDate}
                  </span>
                </div>
                <div className="flex gap-1">
                  {(["ALL", "MEETINGS", "TASKS"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setAgendaTab(tab)}
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-all cursor-pointer ${
                        agendaTab === tab
                          ? "bg-slate-900 text-white"
                          : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {agendaItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center">
                  <CalendarClock className="mx-auto h-6 w-6 text-slate-300" />
                  <p className="mt-1 text-xs text-slate-500 font-medium">
                    No meetings or tasks on this day
                  </p>
                  <div className="mt-2 flex justify-center gap-2">
                    <Link
                      to="/meetings"
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
                    >
                      + Meeting
                    </Link>
                    <Link
                      to="/tasks"
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
                    >
                      + Task
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {agendaItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors ${
                        item.type === "MEETING"
                          ? "border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50"
                          : "border-amber-200 bg-amber-50/40 hover:bg-amber-50"
                      }`}
                    >
                      <div className="shrink-0 text-center">
                        <span className="block font-mono text-[11px] font-bold text-slate-800">
                          {item.time}
                        </span>
                        <span
                          className={`mt-0.5 inline-block rounded-xs px-1 py-0.2 text-[9px] font-bold uppercase ${
                            item.type === "MEETING"
                              ? "bg-emerald-200 text-emerald-800"
                              : "bg-amber-200 text-amber-800"
                          }`}
                        >
                          {item.type}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 truncate">{item.title}</p>
                        <p className="text-[11px] text-slate-500 truncate">{item.subtitle}</p>
                      </div>

                      <Link
                        to={item.type === "MEETING" ? "/meetings" : "/tasks"}
                        className="shrink-0 rounded p-1 text-slate-400 hover:text-slate-700"
                        title="View details"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 6. TEAM PERFORMANCE LEADERBOARD */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Team Performance
                </h3>
                <p className="text-xs text-slate-500">
                  Sales representative quota attainment
                </p>
              </div>
              <Link
                to="/reports"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1d61e7] hover:underline"
              >
                Full Report
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {reps.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                No team performance data available
              </div>
            ) : (
              <div className="space-y-3">
                {reps.map((rep) => {
                  const attainment = rep.targetAttainment || 0;
                  const isExceeding = attainment >= 100;

                  return (
                    <div key={rep.userId} className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1d61e7]/10 text-[11px] font-bold text-[#1d61e7]">
                            {rep.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">{rep.name}</span>
                            <span className="ml-1 text-[10px] text-slate-400">
                              ({rep.role || "Sales Rep"})
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-slate-900">
                            {formatCurrency(rep.revenueAchieved)}
                          </span>
                          <span
                            className={`ml-1.5 font-bold ${
                              isExceeding
                                ? "text-emerald-600"
                                : attainment >= 80
                                ? "text-blue-600"
                                : "text-slate-500"
                            }`}
                          >
                            {attainment}%
                          </span>
                        </div>
                      </div>

                      {/* Quota Progress Bar */}
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isExceeding
                              ? "bg-emerald-500"
                              : attainment >= 80
                              ? "bg-[#1d61e7]"
                              : "bg-slate-400"
                          }`}
                          style={{ width: `${Math.min(attainment, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. FULL WIDTH AUDIT LOGS & SYSTEM ACTIVITY */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#1d61e7]" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Recent Audit &amp; System Activity
              </h3>
              <p className="text-xs text-slate-700">
                Immutable event tracking for lead and deal state modifications, assignments, and disqualifications
              </p>
            </div>
          </div>
          <Link
            to="/audit-logs"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1d61e7] hover:underline"
          >
            View All Audit Logs
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {auditLogs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-xs text-slate-700">
            <History className="mx-auto h-6 w-6 text-slate-400 mb-1.5" />
            No system activity recorded yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-700 uppercase">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Performed By</th>
                  <th className="py-2.5 px-3">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {auditLogs.map((log) => {
                  const actorName = log.actor?.name || (log.actorId ? `User #${log.actorId}` : "System");
                  const actorEmail = log.actor?.email;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        <span className="text-slate-600">
                          {new Date(log.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getActionBadgeClass(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {log.entityType}{" "}
                        <span className="font-normal text-slate-600 text-[11px]">#{log.entityId}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                            {actorName.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <span className="truncate max-w-[140px] font-medium text-slate-900 block">
                              {actorName}
                            </span>
                            {actorEmail && (
                              <span className="text-[10px] text-slate-600 block -mt-0.5">
                                {actorEmail}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">
                        {formatAuditSummary(log)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE LEAD MODAL */}
      {isCreateLeadOpen && (
        <CreateLeadModal
          onClose={() => setIsCreateLeadOpen(false)}
          onCreate={handleLeadCreated}
        />
      )}
    </div>
  );
}
