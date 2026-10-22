import { useEffect, useState, useCallback, useRef } from "react";
import {
  Target,
  TrendingUp,
  Award,
  DollarSign,
  Users,
  Calendar,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Plus,
  Search,
  RotateCw,
  List,
  LayoutGrid,
  Pencil,
  Trash2,
  History,
  Eye,
  Building2,
  Sparkles,
  X,
  Briefcase,
  Lock,
} from "lucide-react";
import {
  fetchTargets,
  createTarget,
  updateTarget,
  deleteTarget,
  fetchTargetById,
  fetchTargetOptions,
} from "../../lib/targets";
import type {
  CreateTargetPayload,
  ListTargetsParams,
  TargetDetail,
  TargetItem,
  TargetMetricsSummary,
  TargetOptions,
  TargetPeriod,
  TargetStatus,
} from "../../types/target";
import { getSession } from "../../lib/auth";
import { ApiError } from "../../lib/api";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const STATUS_CONFIG: Record<
  TargetStatus,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    dot: string;
    progressBg: string;
  }
> = {
  ACHIEVED: {
    label: "Achieved",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    progressBg: "bg-emerald-500",
  },
  ON_TRACK: {
    label: "On Track",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
    progressBg: "bg-[#1d61e7]",
  },
  AT_RISK: {
    label: "At Risk",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
    progressBg: "bg-amber-500",
  },
  BEHIND: {
    label: "Behind",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
    progressBg: "bg-rose-500",
  },
};

export default function Targets() {
  const session = getSession();
  const userRole = session?.user?.role || "";
  const canManage = ["ADMIN", "SALES_MANAGER"].includes(userRole);

  // Data states
  const [targets, setTargets] = useState<TargetItem[]>([]);
  const [summary, setSummary] = useState<TargetMetricsSummary>({
    totalQuota: 0,
    totalAchieved: 0,
    overallAttainment: 0,
    totalTargets: 0,
    achievedCount: 0,
    onTrackCount: 0,
    atRiskCount: 0,
    behindCount: 0,
    topPerformer: null,
  });
  const [options, setOptions] = useState<TargetOptions | null>(null);

  // Loading & error states
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [forbidden, setForbidden] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>("");
  const [periodFilter, setPeriodFilter] = useState<"ALL" | TargetPeriod>("ALL");
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [editTargetItem, setEditTargetItem] = useState<TargetItem | null>(null);
  const [historyTargetId, setHistoryTargetId] = useState<number | null>(null);
  const [historyDetail, setHistoryDetail] = useState<TargetDetail | null>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [viewDealsDetail, setViewDealsDetail] = useState<TargetDetail | null>(null);
  const [viewDealsLoading, setViewDealsLoading] = useState<boolean>(false);
  const [deleteTargetItem, setDeleteTargetItem] = useState<TargetItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Toast timer ref
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setSuccessToast(msg);
    toastTimerRef.current = setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  }, []);

  // Fetch targets data
  const loadTargets = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);
      setError(null);
      setForbidden(false);
      try {
        const params: ListTargetsParams = {
          year: yearFilter,
        };
        if (periodFilter !== "ALL") {
          params.periodType = periodFilter;
        }
        if (search.trim()) {
          params.search = search.trim();
        }

        const res = await fetchTargets(params);
        setTargets(res.targets);
        setSummary(res.summary);
      } catch (err: unknown) {
        if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
          setForbidden(true);
        } else if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load sales targets. Please try again.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [periodFilter, yearFilter, search],
  );

  // Load options once
  useEffect(() => {
    async function loadOpts() {
      try {
        const opts = await fetchTargetOptions();
        setOptions(opts);
      } catch (e) {
        console.error("Failed to load target options:", e);
      }
    }
    loadOpts();
  }, []);

  // Load targets reactively & on mount
  useEffect(() => {
    let active = true;
    const timer = setTimeout(
      () => {
        if (active) {
          void loadTargets(false);
        }
      },
      search ? 300 : 0,
    );

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loadTargets, search]);

  const handleManualRefresh = () => {
    void loadTargets(true);
  };

  // Open adjustment history modal
  const handleOpenHistory = async (targetId: number) => {
    setHistoryTargetId(targetId);
    setHistoryLoading(true);
    try {
      const detail = await fetchTargetById(targetId);
      setHistoryDetail(detail);
    } catch (err) {
      console.error("Failed to fetch target history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Open deals breakdown modal
  const handleOpenDeals = async (targetId: number) => {
    setViewDealsLoading(true);
    try {
      const detail = await fetchTargetById(targetId);
      setViewDealsDetail(detail);
    } catch (err) {
      console.error("Failed to fetch deal breakdown:", err);
    } finally {
      setViewDealsLoading(false);
    }
  };

  // Execute delete target
  const handleConfirmDelete = async () => {
    if (!deleteTargetItem) return;
    setIsDeleting(true);
    try {
      await deleteTarget(deleteTargetItem.id);
      showToast("Sales target deleted successfully");
      setDeleteTargetItem(null);
      loadTargets(false);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert("Failed to delete target");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Formatting helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatPeriodDisplay = (t: TargetItem) => {
    try {
      const start = new Date(t.periodStart);
      if (t.periodType === "MONTHLY") {
        return `${MONTH_NAMES[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
      } else {
        const q = Math.floor(start.getUTCMonth() / 3) + 1;
        return `Q${q} ${start.getUTCFullYear()}`;
      }
    } catch {
      return `${t.periodStart} - ${t.periodEnd}`;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-xl shadow-emerald-600/20 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-4 w-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1d61e7] ring-8 ring-blue-50/50">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Sales Targets & Quotas
              </h1>
              <p className="text-sm text-slate-500">
                Track revenue performance, team quotas, and attainment progress across sales cycles
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
            title="Refresh Targets"
          >
            <RotateCw className={`h-4 w-4 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {canManage && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-[#1d61e7] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-[#1d61e7]/20 transition hover:bg-[#1650c5] active:scale-95"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Set New Target</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row (4 Cards) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Target Quota */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-blue-300 hover:shadow-xs min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#1d61e7]">
              <Target size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Total Quota Target</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {formatCurrency(summary.totalQuota)}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-blue-600 flex items-center gap-0.5">
                <span>↑</span> {summary.totalTargets} targets allocated
              </p>
            </div>
          </div>
          <div className="w-16 sm:w-20 md:w-24 shrink-0 overflow-hidden flex items-center justify-end">
            <svg className="w-full h-10 sm:h-11 overflow-hidden" viewBox="0 0 120 48" fill="none">
              <defs>
                <linearGradient id="target-stat-grad-quota" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="85%" stopColor="#3b82f6" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 42 C 16 42 28 34 44 34 C 58 34 68 16 78 14 C 85 12 90 20 96 20 C 104 20 110 8 116 6 L 116 48 L 0 48 Z"
                fill="url(#target-stat-grad-quota)"
              />
              <path
                d="M 0 42 C 16 42 28 34 44 34 C 58 34 68 16 78 14 C 85 12 90 20 96 20 C 104 20 110 8 116 6"
                stroke="#3b82f6"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Closed Won Revenue */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-emerald-300 hover:shadow-xs min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <TrendingUp size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Closed Won Revenue</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {formatCurrency(summary.totalAchieved)}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5">
                <span>↑</span> {summary.achievedCount} reached 100%+ goal
              </p>
            </div>
          </div>
          <div className="w-16 sm:w-20 md:w-24 shrink-0 overflow-hidden flex items-center justify-end">
            <svg className="w-full h-10 sm:h-11 overflow-hidden" viewBox="0 0 120 48" fill="none">
              <defs>
                <linearGradient id="target-stat-grad-revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="85%" stopColor="#10b981" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 43 C 14 43 26 33 40 33 C 54 33 62 17 70 15 C 76 13 82 21 88 21 C 96 21 104 7 112 5 L 112 48 L 0 48 Z"
                fill="url(#target-stat-grad-revenue)"
              />
              <path
                d="M 0 43 C 14 43 26 33 40 33 C 54 33 62 17 70 15 C 76 13 82 21 88 21 C 96 21 104 7 112 5"
                stroke="#10b981"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Overall Attainment */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-purple-300 hover:shadow-xs min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-600">
              <Award size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Overall Attainment</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {summary.overallAttainment}%
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-purple-600 flex items-center gap-0.5">
                <span>↑</span> {summary.onTrackCount} on track, {summary.atRiskCount} at risk
              </p>
            </div>
          </div>
          <div className="w-16 sm:w-20 md:w-24 shrink-0 overflow-hidden flex items-center justify-end">
            <svg className="w-full h-10 sm:h-11 overflow-hidden" viewBox="0 0 120 48" fill="none">
              <defs>
                <linearGradient id="target-stat-grad-attainment" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                  <stop offset="85%" stopColor="#8b5cf6" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 41 C 12 41 24 32 38 32 C 50 32 58 16 66 14 C 72 12 78 20 84 20 C 92 20 100 6 108 4 L 108 48 L 0 48 Z"
                fill="url(#target-stat-grad-attainment)"
              />
              <path
                d="M 0 41 C 12 41 24 32 38 32 C 50 32 58 16 66 14 C 72 12 78 20 84 20 C 92 20 100 6 108 4"
                stroke="#8b5cf6"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Top Performer */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-amber-300 hover:shadow-xs min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Top Performer</p>
              <p className="truncate text-xl font-bold text-slate-900 leading-tight">
                {summary.topPerformer ? summary.topPerformer.name : "In Progress"}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-amber-600 flex items-center gap-0.5">
                {summary.topPerformer ? (
                  <>
                    <span>★</span> {summary.topPerformer.attainment}% ({formatCurrency(summary.topPerformer.achieved)})
                  </>
                ) : (
                  "Tracking performance"
                )}
              </p>
            </div>
          </div>
          <div className="w-16 sm:w-20 md:w-24 shrink-0 overflow-hidden flex items-center justify-end">
            <svg className="w-full h-10 sm:h-11 overflow-hidden" viewBox="0 0 120 48" fill="none">
              <defs>
                <linearGradient id="target-stat-grad-performer" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="85%" stopColor="#f59e0b" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 42 C 16 42 28 34 44 34 C 58 34 68 16 78 14 C 85 12 90 20 96 20 C 104 20 110 8 116 6 L 116 48 L 0 48 Z"
                fill="url(#target-stat-grad-performer)"
              />
              <path
                d="M 0 42 C 16 42 28 34 44 34 C 58 34 68 16 78 14 C 85 12 90 20 96 20 C 104 20 110 8 116 6"
                stroke="#f59e0b"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by sales rep name, email, or team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition focus:border-[#1d61e7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1d61e7]/10"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Type Filter */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/80 p-0.5 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setPeriodFilter("ALL")}
              className={`rounded-lg px-3 py-1.5 transition ${
                periodFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              All Periods
            </button>
            <button
              onClick={() => setPeriodFilter("MONTHLY")}
              className={`rounded-lg px-3 py-1.5 transition ${
                periodFilter === "MONTHLY"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPeriodFilter("QUARTERLY")}
              className={`rounded-lg px-3 py-1.5 transition ${
                periodFilter === "QUARTERLY"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Quarterly
            </button>
          </div>

          {/* Year selector */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:border-[#1d61e7] focus:outline-none"
          >
            {[yearFilter - 1, yearFilter, yearFilter + 1].map((yr) => (
              <option key={yr} value={yr}>
                Year {yr}
              </option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/80 p-0.5 text-slate-600">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-lg p-1.5 transition ${
                viewMode === "grid"
                  ? "bg-white text-[#1d61e7] shadow-sm"
                  : "text-slate-400 hover:text-slate-700"
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`rounded-lg p-1.5 transition ${
                viewMode === "table"
                  ? "bg-white text-[#1d61e7] shadow-sm"
                  : "text-slate-400 hover:text-slate-700"
              }`}
              title="Detailed Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {forbidden ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50/60 p-12 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 ring-8 ring-amber-100/50">
            <Lock className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">Access Restricted</h3>
          <p className="mt-1.5 max-w-md text-sm text-slate-600">
            You do not have permission to view sales targets. Please contact an administrator to grant the{" "}
            <code className="rounded bg-amber-200/60 px-1.5 py-0.5 text-xs font-semibold text-amber-900">
              targets.view
            </code>{" "}
            permission in Roles & Permissions.
          </p>
        </div>
      ) : loading ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#1d61e7]" />
          <span className="mt-3 text-sm text-slate-500">Loading targets & quota progress...</span>
        </div>
      ) : targets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#1d61e7]">
            <Target className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">No Sales Targets Found</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            {search
              ? "No targets match your current search or filter criteria. Try adjusting filters."
              : "Set quota goals for individual sales reps or entire teams to begin tracking attainment."}
          </p>
          {canManage && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-5 flex items-center gap-2 rounded-xl bg-[#1d61e7] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1650c5]"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Target</span>
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {targets.map((target) => {
            const statusStyle = STATUS_CONFIG[target.status];
            const isTeam = !!target.teamId;
            const assigneeName = target.employee?.name || target.team?.name || "Unnamed";
            const roleOrTeam = target.employee?.role?.name
              ? target.employee.role.name.replace(/_/g, " ")
              : isTeam
              ? `${target.team?.membersCount || 0} Members Team`
              : "Sales Rep";

            return (
              <div
                key={target.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div>
                  {/* Top Bar: Assignee & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-sm ${
                          isTeam
                            ? "bg-gradient-to-tr from-purple-600 to-indigo-500"
                            : "bg-gradient-to-tr from-[#1d61e7] to-sky-400"
                        }`}
                      >
                        {isTeam ? (
                          <Building2 className="h-5 w-5 text-white" />
                        ) : (
                          assigneeName.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="truncate font-semibold text-slate-900">{assigneeName}</h4>
                          {isTeam && (
                            <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-purple-700">
                              Team
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-slate-500">{roleOrTeam}</p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                      <span>{statusStyle.label}</span>
                    </div>
                  </div>

                  {/* Period Badge & Dates */}
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50/80 px-3 py-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-700">
                        {formatPeriodDisplay(target)}
                      </span>
                    </div>
                    <span className="font-medium text-slate-400">
                      {target.periodType === "MONTHLY" ? "Monthly Target" : "Quarterly Target"}
                    </span>
                  </div>

                  {/* Revenue Quota vs Achieved */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
                      <span className="text-[11px] font-medium text-slate-500">Target Quota</span>
                      <div className="mt-0.5 text-base font-bold text-slate-900">
                        {formatCurrency(target.amount)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
                      <span className="text-[11px] font-medium text-slate-500">Achieved Won</span>
                      <div className="mt-0.5 text-base font-bold text-emerald-600">
                        {formatCurrency(target.achievedRevenue)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar & Attainment */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">Attainment Progress</span>
                      <span className="font-bold text-slate-900">
                        {target.progressPercentage}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${statusStyle.progressBg}`}
                        style={{ width: `${Math.min(100, target.progressPercentage)}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{target.wonDealsCount} won deal(s)</span>
                      <span>
                        {target.achievedRevenue >= target.amount
                          ? "Target exceeded!"
                          : `${formatCurrency(target.amount - target.achievedRevenue)} remaining`}
                      </span>
                    </div>
                  </div>

                  {/* Open Pipeline indicator */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                      <span>Pipeline:</span>
                    </span>
                    <span className="font-semibold text-slate-700">
                      {formatCurrency(target.pipelineRevenue)} ({target.openDealsCount} open)
                    </span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <div className="flex items-center gap-1 text-slate-400">
                    <button
                      onClick={() => handleOpenHistory(target.id)}
                      className="flex items-center gap-1 rounded-md px-1.5 py-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                      title="View Revision History"
                    >
                      <History className="h-3.5 w-3.5" />
                      <span>{target.changesCount} revisions</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenDeals(target.id)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-[#1d61e7] transition hover:bg-blue-50"
                      title="View Won Deals"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Deals</span>
                    </button>

                    {canManage && (
                      <>
                        <button
                          onClick={() => setEditTargetItem(target)}
                          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                          title="Edit Target Quota"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTargetItem(target)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          title="Delete Target"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Sales Rep / Team</th>
                  <th className="px-5 py-3.5">Period</th>
                  <th className="px-5 py-3.5 text-right">Target Quota</th>
                  <th className="px-5 py-3.5 text-right">Achieved Won</th>
                  <th className="px-5 py-3.5">Attainment</th>
                  <th className="px-5 py-3.5 text-right">Pipeline</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {targets.map((target) => {
                  const statusStyle = STATUS_CONFIG[target.status];
                  const isTeam = !!target.teamId;
                  const name = target.employee?.name || target.team?.name || "Unnamed";

                  return (
                    <tr key={target.id} className="transition hover:bg-slate-50/60">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-white ${
                              isTeam
                                ? "bg-gradient-to-tr from-purple-600 to-indigo-500"
                                : "bg-gradient-to-tr from-[#1d61e7] to-sky-400"
                            }`}
                          >
                            {isTeam ? (
                              <Building2 className="h-4 w-4" />
                            ) : (
                              name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                              <span>{name}</span>
                              {isTeam && (
                                <span className="rounded bg-purple-50 px-1 py-0.2 text-[10px] font-bold uppercase text-purple-700">
                                  Team
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400">
                              {target.employee?.email || `${target.team?.membersCount || 0} Reps`}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800">
                          {formatPeriodDisplay(target)}
                        </div>
                        <span className="text-xs text-slate-400">
                          {target.periodType === "MONTHLY" ? "Monthly" : "Quarterly"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right font-bold text-slate-900">
                        {formatCurrency(target.amount)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="font-bold text-emerald-600">
                          {formatCurrency(target.achievedRevenue)}
                        </div>
                        <span className="text-xs text-slate-400">
                          {target.wonDealsCount} won deal(s)
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="w-36">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span>{target.progressPercentage}%</span>
                          </div>
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${statusStyle.progressBg}`}
                              style={{ width: `${Math.min(100, target.progressPercentage)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right font-medium text-slate-700">
                        {formatCurrency(target.pipelineRevenue)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                          <span>{statusStyle.label}</span>
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDeals(target.id)}
                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-[#1d61e7]"
                            title="View Contributing Deals"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenHistory(target.id)}
                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            title="Adjustment History"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => setEditTargetItem(target)}
                                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                                title="Edit Quota"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTargetItem(target)}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                title="Delete Target"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE TARGET MODAL */}
      {isCreateOpen && (
        <CreateTargetModal
          options={options}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            setIsCreateOpen(false);
            showToast("Sales target created successfully!");
            loadTargets(false);
          }}
        />
      )}

      {/* EDIT TARGET MODAL */}
      {editTargetItem && (
        <EditTargetModal
          target={editTargetItem}
          options={options}
          onClose={() => setEditTargetItem(null)}
          onSuccess={() => {
            setEditTargetItem(null);
            showToast("Sales target quota updated successfully!");
            loadTargets(false);
          }}
        />
      )}

      {/* REVISION HISTORY MODAL */}
      {historyTargetId && (
        <HistoryModal
          loading={historyLoading}
          detail={historyDetail}
          onClose={() => {
            setHistoryTargetId(null);
            setHistoryDetail(null);
          }}
        />
      )}

      {/* WON DEALS BREAKDOWN MODAL */}
      {viewDealsDetail && (
        <WonDealsModal
          loading={viewDealsLoading}
          detail={viewDealsDetail}
          onClose={() => setViewDealsDetail(null)}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-8 ring-rose-50/50">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">Delete Sales Target?</h3>
            <p className="mt-2 text-sm text-slate-500">
              Are you sure you want to delete the target for{" "}
              <strong className="text-slate-800">
                {deleteTargetItem.employee?.name || deleteTargetItem.team?.name || "this target"}
              </strong>
              ? All historical adjustment records for this quota will be removed permanently.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTargetItem(null)}
                disabled={isDeleting}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                <span>Delete Target</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// SUB-MODALS
// -------------------------------------------------------------

/** Create Target Modal */
function CreateTargetModal({
  options,
  onClose,
  onSuccess,
}: {
  options: TargetOptions | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [targetType, setTargetType] = useState<"USER" | "TEAM">("USER");
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [selectedTeamId, setSelectedTeamId] = useState<number | "">("");
  const [periodType, setPeriodType] = useState<TargetPeriod>("MONTHLY");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [quarter, setQuarter] = useState<number>(Math.floor(new Date().getMonth() / 3) + 1); // 1-4
  const [amount, setAmount] = useState<string>("50000");
  const [reason, setReason] = useState<string>("Initial quota allocation");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Set defaults once options load
  useEffect(() => {
    if (options?.users?.length && selectedUserId === "") {
      setSelectedUserId(options.users[0].id);
    }
    if (options?.teams?.length && selectedTeamId === "") {
      setSelectedTeamId(options.teams[0].id);
    }
  }, [options, selectedUserId, selectedTeamId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid target amount greater than 0");
      return;
    }

    if (targetType === "USER" && !selectedUserId) {
      setError("Please select a sales representative");
      return;
    }

    if (targetType === "TEAM" && !selectedTeamId) {
      setError("Please select a team");
      return;
    }

    // Compute periodStart and periodEnd dates
    let startDate: string;
    let endDate: string;

    if (periodType === "MONTHLY") {
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      startDate = start.toISOString().split("T")[0];
      endDate = end.toISOString().split("T")[0];
    } else {
      const startMonth = (quarter - 1) * 3;
      const start = new Date(Date.UTC(year, startMonth, 1));
      const end = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59, 999));
      startDate = start.toISOString().split("T")[0];
      endDate = end.toISOString().split("T")[0];
    }

    const payload: CreateTargetPayload = {
      userId: targetType === "USER" ? Number(selectedUserId) : null,
      teamId: targetType === "TEAM" ? Number(selectedTeamId) : null,
      periodType,
      periodStart: startDate,
      periodEnd: endDate,
      amount: numericAmount,
      reason: reason.trim() || undefined,
    };

    setLoading(true);
    try {
      await createTarget(payload);
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to create sales target");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#1d61e7]">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Set Sales Target Quota</h3>
              <p className="text-xs text-slate-500">Define revenue target for representative or team</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Allocation Type Switch */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Target Scope
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetType("USER")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-sm font-semibold transition ${
                  targetType === "USER"
                    ? "border-[#1d61e7] bg-blue-50/50 text-[#1d61e7]"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Individual Rep</span>
              </button>
              <button
                type="button"
                onClick={() => setTargetType("TEAM")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-sm font-semibold transition ${
                  targetType === "TEAM"
                    ? "border-purple-600 bg-purple-50/50 text-purple-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Building2 className="h-4 w-4" />
                <span>Sales Team</span>
              </button>
            </div>
          </div>

          {/* Assignee Selection */}
          {targetType === "USER" ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Sales Representative *
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition focus:border-[#1d61e7] focus:outline-none"
                required
              >
                {options?.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role?.name?.replace(/_/g, " ") || "Rep"}) - {u.email}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700">Sales Team *</label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition focus:border-[#1d61e7] focus:outline-none"
                required
              >
                {options?.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t._count.members} Members)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Period Type Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Period Type</label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as TargetPeriod)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition focus:border-[#1d61e7] focus:outline-none"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Target Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition focus:border-[#1d61e7] focus:outline-none"
              >
                {[year - 1, year, year + 1].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Month or Quarter selection */}
          {periodType === "MONTHLY" ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700">Target Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition focus:border-[#1d61e7] focus:outline-none"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700">Target Quarter</label>
              <select
                value={quarter}
                onChange={(e) => setQuarter(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition focus:border-[#1d61e7] focus:outline-none"
              >
                <option value={1}>Q1 (Jan - Mar)</option>
                <option value={2}>Q2 (Apr - Jun)</option>
                <option value={3}>Q3 (Jul - Sep)</option>
                <option value={4}>Q4 (Oct - Dec)</option>
              </select>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Revenue Quota Amount ($) *
            </label>
            <div className="relative mt-1">
              <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                min="1000"
                step="500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm font-semibold text-slate-900 transition focus:border-[#1d61e7] focus:outline-none focus:ring-2 focus:ring-[#1d61e7]/10"
                required
              />
            </div>
          </div>

          {/* Reason / Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Allocation Note / Strategic Context
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Q4 enterprise expansion quota"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 transition focus:border-[#1d61e7] focus:outline-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-[#1d61e7] px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-[#1d61e7]/20 transition hover:bg-[#1650c5] disabled:opacity-50"
            >
              {loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              <span>Create Target</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Edit Target Modal */
function EditTargetModal({
  target,
  onClose,
  onSuccess,
}: {
  target: TargetItem;
  options?: TargetOptions | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState<string>(String(target.amount));
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid target amount greater than 0");
      return;
    }

    if (numericAmount !== target.amount && !reason.trim()) {
      setError("Please provide a reason or context for this quota adjustment");
      return;
    }

    setLoading(true);
    try {
      await updateTarget(target.id, {
        amount: numericAmount,
        reason: reason.trim() || undefined,
      });
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to update target quota");
      }
    } finally {
      setLoading(false);
    }
  };

  const name = target.employee?.name || target.team?.name || "Target";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#1d61e7]">
              <Pencil className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Adjust Target Quota</h3>
              <p className="text-xs text-slate-500">Revise revenue goal for {name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Info */}
          <div className="rounded-xl bg-slate-50 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Target Assignee:</span>
              <span className="font-semibold text-slate-800">{name}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-slate-500">Period:</span>
              <span className="font-semibold text-slate-800">
                {target.periodType} ({target.periodStart} to {target.periodEnd})
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-slate-500">Current Quota:</span>
              <span className="font-bold text-slate-900">
                ${target.amount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* New Quota Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              New Revenue Quota ($) *
            </label>
            <div className="relative mt-1">
              <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                min="1000"
                step="500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm font-semibold text-slate-900 transition focus:border-[#1d61e7] focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Adjustment Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Revision Reason / Justification *
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Quota adjustment due to revised territory accounts and pipeline expansion"
              className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 transition focus:border-[#1d61e7] focus:outline-none"
              required={parseFloat(amount) !== target.amount}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              This note will be logged in the permanent target audit trail.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-[#1d61e7] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1650c5] disabled:opacity-50"
            >
              {loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              <span>Save Adjustment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Revision History Audit Modal */
function HistoryModal({
  loading,
  detail,
  onClose,
}: {
  loading: boolean;
  detail: TargetDetail | null;
  onClose: () => void;
}) {
  const name = detail?.employee?.name || detail?.team?.name || "Target";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Target Adjustment History</h3>
              <p className="text-xs text-slate-500">Audit trail of quota revisions for {name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-48 flex-col items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#1d61e7]" />
              <span className="mt-2 text-xs text-slate-500">Loading audit history...</span>
            </div>
          ) : !detail?.changes?.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <History className="h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">No revisions logged for this target.</p>
            </div>
          ) : (
            <div className="relative space-y-6 pl-6 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-0.5 before:bg-slate-200">
              {detail.changes.map((change) => {
                const date = new Date(change.changedAt);
                const formattedDate = date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                });

                return (
                  <div key={change.id} className="relative">
                    {/* Circle marker */}
                    <div className="absolute -left-[29px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-[#1d61e7] shadow-sm" />

                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500">
                            ${change.oldAmount.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-400">→</span>
                          <span className="text-sm font-bold text-slate-900">
                            ${change.newAmount.toLocaleString()}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">{formattedDate}</span>
                      </div>

                      {change.reason && (
                        <p className="mt-2 text-xs italic text-slate-600">
                          &ldquo;{change.reason}&rdquo;
                        </p>
                      )}

                      <div className="mt-3 flex items-center gap-1.5 border-t border-slate-200/60 pt-2 text-[11px] text-slate-500">
                        <span>Modified by:</span>
                        <span className="font-semibold text-slate-700">
                          {change.changedBy.name}
                        </span>
                        <span className="text-slate-400">({change.changedBy.email})</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-6 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/** Contributing Won Deals Modal */
function WonDealsModal({
  loading,
  detail,
  onClose,
}: {
  loading: boolean;
  detail: TargetDetail;
  onClose: () => void;
}) {
  const name = detail.employee?.name || detail.team?.name || "Target";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Contributing Won Deals</h3>
              <p className="text-xs text-slate-500">
                Revenue deals credited toward {name}&rsquo;s quota
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quota overview bar */}
        <div className="grid grid-cols-3 border-b border-slate-100 bg-slate-50/70 px-6 py-3 text-xs">
          <div>
            <span className="text-slate-500">Target Quota:</span>
            <div className="font-bold text-slate-900">${detail.amount.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-slate-500">Achieved Won:</span>
            <div className="font-bold text-emerald-600">
              ${detail.achievedRevenue.toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Attainment:</span>
            <div className="font-bold text-slate-900">{detail.progressPercentage}%</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-48 flex-col items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#1d61e7]" />
              <span className="mt-2 text-xs text-slate-500">Loading won deals...</span>
            </div>
          ) : !detail.wonDeals?.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Briefcase className="h-8 w-8 text-slate-300" />
              <h4 className="mt-2 font-semibold text-slate-800">No Won Deals Yet</h4>
              <p className="mt-1 text-xs text-slate-500">
                No closed-won deals have been finalized in this period yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {detail.wonDeals.map((deal) => {
                const dateStr = deal.closedAt
                  ? new Date(deal.closedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Won in period";

                return (
                  <div
                    key={deal.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/40 p-3.5 transition hover:bg-slate-50"
                  >
                    <div>
                      <h5 className="font-semibold text-slate-900">{deal.name}</h5>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        <span>Closed: {dateStr}</span>
                        <span>•</span>
                        <span>Owner: {deal.owner.name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-emerald-600">
                        +${deal.amount.toLocaleString()}
                      </div>
                      <span className="inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        WON
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-6 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
