import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  CalendarDays,
  Calendar,
  Clock,
  Video,
  MapPin,
  ExternalLink,
  Plus,
  Search,
  RotateCw,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Filter,
  Check,
  X,
  Users,
  FolderGit2,
  List,
  LayoutGrid,
  ShieldAlert,
} from "lucide-react";
import {
  fetchMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  fetchMeetingOptions,
} from "../../lib/meetings";
import type {
  CreateMeetingInput,
  MeetingItem,
  MeetingOptions,
  MeetingStatus,
  UpdateMeetingInput,
} from "../../types/meeting";
import { getSession } from "../../lib/auth";
import { ApiError } from "../../lib/api";
import DynamicSparkline from "../../components/ui/DynamicSparkline";

function formatDateTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return {
      month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      day: d.toLocaleDateString("en-US", { day: "numeric" }),
      weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
      time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      full: d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };
  } catch {
    return { month: "CAL", day: "--", weekday: "---", time: "--:--", full: dateStr };
  }
}

function getStatusBadge(status: MeetingStatus) {
  switch (status) {
    case "PLANNED":
      return {
        label: "Scheduled",
        bg: "bg-blue-50 text-blue-700 border-blue-200/80",
        dot: "bg-blue-500",
      };
    case "COMPLETED":
      return {
        label: "Completed",
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        dot: "bg-emerald-500",
      };
    case "RESCHEDULED":
      return {
        label: "Rescheduled",
        bg: "bg-amber-50 text-amber-700 border-amber-200/80",
        dot: "bg-amber-500",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        bg: "bg-rose-50 text-rose-700 border-rose-200/80",
        dot: "bg-rose-500",
      };
    default:
      return {
        label: status,
        bg: "bg-slate-50 text-slate-700 border-slate-200",
        dot: "bg-slate-400",
      };
  }
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [options, setOptions] = useState<MeetingOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & View state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | "ALL">("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Toast state
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modals state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingMeeting, setEditingMeeting] = useState<MeetingItem | null>(null);
  const [savingForm, setSavingForm] = useState(false);
  const [formError, setFormError] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMeeting, setDetailMeeting] = useState<MeetingItem | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<MeetingItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form input state
  const [formData, setFormData] = useState<{
    title: string;
    startsAt: string;
    durationMinutes: number;
    location: string;
    meetingLink: string;
    status: MeetingStatus;
    leadId: string;
    dealId: string;
    notes: string;
    outcome: string;
    nextSteps: string;
  }>({
    title: "",
    startsAt: "",
    durationMinutes: 30,
    location: "",
    meetingLink: "",
    status: "PLANNED",
    leadId: "none",
    dealId: "none",
    notes: "",
    outcome: "",
    nextSteps: "",
  });

  const currentSession = getSession();

  const showToast = useCallback(
    (type: "success" | "error", message: string) => {
      setToastMessage({ type, message });
      setTimeout(() => setToastMessage(null), 4000);
    },
    [],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setStatusDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    setForbidden(false);

    try {
      const [res, opts] = await Promise.all([
        fetchMeetings(),
        fetchMeetingOptions().catch(() => null),
      ]);
      setMeetings(res.meetings);
      if (opts) setOptions(opts);
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
        setForbidden(true);
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to load meetings data.",
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Client-side filtering
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (statusFilter !== "ALL" && m.status !== statusFilter) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        const matchesTitle = m.title.toLowerCase().includes(s);
        const matchesLocation = m.location?.toLowerCase().includes(s) ?? false;
        const matchesLead = m.lead?.contactName.toLowerCase().includes(s) ?? false;
        const matchesDeal = m.deal?.name.toLowerCase().includes(s) ?? false;
        const matchesNotes = m.notes?.toLowerCase().includes(s) ?? false;
        if (!matchesTitle && !matchesLocation && !matchesLead && !matchesDeal && !matchesNotes) {
          return false;
        }
      }
      return true;
    });
  }, [meetings, statusFilter, search]);

  // Overall KPI counts
  const stats = useMemo(() => {
    const total = meetings.length;
    const planned = meetings.filter((m) => m.status === "PLANNED").length;
    const completed = meetings.filter((m) => m.status === "COMPLETED").length;
    const cancelled = meetings.filter(
      (m) => m.status === "CANCELLED" || m.status === "RESCHEDULED",
    ).length;
    return { total, planned, completed, cancelled };
  }, [meetings]);

  // Dynamic sparkline trend series
  const sparklineTrends = useMemo(() => {
    const days = 7;
    const now = new Date();
    const dayBuckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (days - 1 - i));
      return d.toISOString().slice(0, 10);
    });

    const totalTrend = new Array(days).fill(0);
    const plannedTrend = new Array(days).fill(0);
    const completedTrend = new Array(days).fill(0);
    const cancelledTrend = new Array(days).fill(0);

    const todayStr = now.toISOString().slice(0, 10);

    meetings.forEach((m) => {
      const dateKey = m.startsAt ? m.startsAt.slice(0, 10) : todayStr;
      let idx = dayBuckets.indexOf(dateKey);
      if (idx === -1) {
        if (dateKey < dayBuckets[0]) idx = 0;
        else if (dateKey > dayBuckets[days - 1]) idx = days - 1;
        else idx = Math.floor(days / 2);
      }

      totalTrend[idx]++;
      if (m.status === "PLANNED") plannedTrend[idx]++;
      else if (m.status === "COMPLETED") completedTrend[idx]++;
      else if (m.status === "CANCELLED" || m.status === "RESCHEDULED") cancelledTrend[idx]++;
    });

    return {
      total: totalTrend,
      planned: plannedTrend,
      completed: completedTrend,
      cancelled: cancelledTrend,
    };
  }, [meetings]);

  const handleOpenCreate = () => {
    // Default start time: tomorrow at 10:00 AM local
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setFormData({
      title: "",
      startsAt: isoLocal,
      durationMinutes: 30,
      location: "Google Meet",
      meetingLink: "",
      status: "PLANNED",
      leadId: "none",
      dealId: "none",
      notes: "",
      outcome: "",
      nextSteps: "",
    });
    setFormError("");
    setFormMode("create");
    setEditingMeeting(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (m: MeetingItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const d = new Date(m.startsAt);
    const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setFormData({
      title: m.title,
      startsAt: isoLocal,
      durationMinutes: m.durationMinutes,
      location: m.location || "",
      meetingLink: m.meetingLink || "",
      status: m.status,
      leadId: m.leadId ? String(m.leadId) : "none",
      dealId: m.dealId ? String(m.dealId) : "none",
      notes: m.notes || "",
      outcome: m.outcome || "",
      nextSteps: m.nextSteps || "",
    });
    setFormError("");
    setFormMode("edit");
    setEditingMeeting(m);
    setFormOpen(true);
  };

  const handleOpenDetail = (m: MeetingItem) => {
    setDetailMeeting(m);
    setDetailOpen(true);
  };

  const handleOpenDelete = (m: MeetingItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setMeetingToDelete(m);
    setDeleteOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError("Meeting title is required");
      return;
    }
    if (!formData.startsAt) {
      setFormError("Meeting date and time are required");
      return;
    }

    setSavingForm(true);
    setFormError("");

    try {
      const payload: CreateMeetingInput | UpdateMeetingInput = {
        title: formData.title.trim(),
        startsAt: new Date(formData.startsAt).toISOString(),
        durationMinutes: Number(formData.durationMinutes),
        location: formData.location.trim() || null,
        meetingLink: formData.meetingLink.trim() || null,
        status: formData.status,
        leadId: formData.leadId !== "none" ? Number(formData.leadId) : null,
        dealId: formData.dealId !== "none" ? Number(formData.dealId) : null,
        notes: formData.notes.trim() || null,
        outcome: formData.outcome.trim() || null,
        nextSteps: formData.nextSteps.trim() || null,
      };

      if (formMode === "create") {
        const created = await createMeeting(payload as CreateMeetingInput);
        setMeetings((prev) => [created, ...prev]);
        showToast("success", `Meeting "${created.title}" scheduled.`);
      } else if (editingMeeting) {
        const updated = await updateMeeting(editingMeeting.id, payload);
        setMeetings((prev) =>
          prev.map((m) => (m.id === updated.id ? updated : m)),
        );
        if (detailMeeting?.id === updated.id) {
          setDetailMeeting(updated);
        }
        showToast("success", `Meeting "${updated.title}" updated.`);
      }

      setFormOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save meeting.");
    } finally {
      setSavingForm(false);
    }
  };

  const handleDeleteMeeting = async () => {
    if (!meetingToDelete) return;
    setDeleting(true);
    try {
      await deleteMeeting(meetingToDelete.id);
      setMeetings((prev) => prev.filter((m) => m.id !== meetingToDelete.id));
      if (detailMeeting?.id === meetingToDelete.id) {
        setDetailOpen(false);
        setDetailMeeting(null);
      }
      setDeleteOpen(false);
      showToast("success", `Meeting "${meetingToDelete.title}" removed.`);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to delete meeting.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleQuickStatusChange = async (
    meeting: MeetingItem,
    newStatus: MeetingStatus,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    try {
      const updated = await updateMeeting(meeting.id, { status: newStatus });
      setMeetings((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
      if (detailMeeting?.id === updated.id) {
        setDetailMeeting(updated);
      }
      showToast("success", `Status updated to ${newStatus}.`);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to update status.",
      );
    }
  };

  if (forbidden) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <ShieldAlert size={28} />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">
            Permission Required
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs text-slate-600 leading-relaxed">
            Meetings management is restricted to authorized roles with{" "}
            <strong className="text-slate-800">meetings.view</strong>. Your current role is{" "}
            <strong className="text-slate-800">
              {currentSession?.user.role ?? "UNKNOWN"}
            </strong>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-3 ${
            toastMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50/95 text-emerald-900 shadow-emerald-900/10"
              : "border-rose-200 bg-rose-50/95 text-rose-900 shadow-rose-900/10"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 size={17} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={17} className="text-rose-600 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toastMessage.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Meetings & Calendar
            </h1>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/60">
              {meetings.length} Scheduled
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Schedule client consultations, sales discovery demos, and manage team appointments.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => void loadData(true)}
            disabled={refreshing}
            title="Refresh meetings list"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-50 cursor-pointer"
          >
            <RotateCw
              size={14}
              className={`text-slate-500 ${refreshing ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Schedule Meeting</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Meetings */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-blue-300 hover:shadow-xs min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#1d61e7]">
              <CalendarDays size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Total Consultations</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {stats.total}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-blue-600 flex items-center gap-0.5">
                <span>↑</span> Client sessions
              </p>
            </div>
          </div>
          <DynamicSparkline
            data={sparklineTrends.total}
            color="blue"
            gradientId="meeting-stat-dyn-total"
          />
        </div>

        {/* Planned Meetings */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-indigo-300 hover:shadow-xs min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <Clock size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Upcoming / Planned</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {stats.planned}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-indigo-600 flex items-center gap-0.5">
                <span>↑</span> Scheduled
              </p>
            </div>
          </div>
          <DynamicSparkline
            data={sparklineTrends.planned}
            color="indigo"
            gradientId="meeting-stat-dyn-planned"
          />
        </div>

        {/* Completed Meetings */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-emerald-300 hover:shadow-xs min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Completed Sessions</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {stats.completed}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5">
                <span>↑</span> Conducted
              </p>
            </div>
          </div>
          <DynamicSparkline
            data={sparklineTrends.completed}
            color="emerald"
            gradientId="meeting-stat-dyn-completed"
          />
        </div>

        {/* Cancelled / Rescheduled */}
        <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs transition hover:border-amber-300 hover:shadow-xs min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Calendar size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Rescheduled / Cancelled</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">
                {stats.cancelled}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-amber-600 flex items-center gap-0.5">
                <span>↑</span> Updated
              </p>
            </div>
          </div>
          <DynamicSparkline
            data={sparklineTrends.cancelled}
            color="amber"
            gradientId="meeting-stat-dyn-cancelled"
          />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-bold">Error loading meetings</p>
            <p className="mt-0.5 text-rose-700">{error}</p>
          </div>
        </div>
      )}

      {/* Main Workspace Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2.5 flex-1 max-w-lg">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3.5 top-2.5 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search meetings by title, location, client, deal..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Custom Status Dropdown */}
            <div className="relative" ref={statusDropdownRef}>
              <button
                type="button"
                onClick={() => setStatusDropdownOpen((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition cursor-pointer shadow-2xs whitespace-nowrap ${
                  statusFilter !== "ALL"
                    ? "border-blue-500 bg-blue-50/50 text-blue-700 ring-2 ring-blue-500/10 font-semibold"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Filter
                  size={13}
                  className={statusFilter !== "ALL" ? "text-blue-600" : "text-slate-400"}
                />
                <span>
                  {statusFilter === "ALL"
                    ? "All Statuses"
                    : getStatusBadge(statusFilter).label}
                </span>
                <ChevronDown
                  size={13}
                  className={`text-slate-400 transition-transform duration-150 ${
                    statusDropdownOpen ? "rotate-180 text-blue-600" : ""
                  }`}
                />
              </button>

              {statusDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-40 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Filter Status
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {[
                      { id: "ALL" as const, label: "All Statuses" },
                      { id: "PLANNED" as const, label: "Scheduled" },
                      { id: "COMPLETED" as const, label: "Completed" },
                      { id: "RESCHEDULED" as const, label: "Rescheduled" },
                      { id: "CANCELLED" as const, label: "Cancelled" },
                    ].map((opt) => {
                      const isSelected = statusFilter === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setStatusFilter(opt.id);
                            setStatusDropdownOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition cursor-pointer ${
                            isSelected
                              ? "bg-blue-50 text-blue-700 font-semibold"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isSelected && <Check size={14} className="text-blue-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Toolbar: View Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <LayoutGrid size={13} />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  viewMode === "table"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <List size={13} />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content View */}
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 size={32} className="mx-auto text-blue-600 animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-700">Loading meetings calendar...</p>
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="p-16 text-center">
            <CalendarDays size={36} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Meetings Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search || statusFilter !== "ALL"
                ? "No meetings matched your current filter criteria. Try clearing search or status filters."
                : "No meetings have been scheduled yet. Click 'Schedule Meeting' to create your first session."}
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Schedule First Meeting</span>
            </button>
          </div>
        ) : viewMode === "grid" ? (
          /* Cards View */
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMeetings.map((m) => {
              const dt = formatDateTime(m.startsAt);
              const badge = getStatusBadge(m.status);

              return (
                <div
                  key={m.id}
                  onClick={() => handleOpenDetail(m)}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-2xs hover:border-slate-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <div>
                    {/* Card Top: Date badge + Status Pill + Actions */}
                    <div className="flex items-start justify-between gap-2.5 mb-3">
                      {/* Date Block */}
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 px-2.5 py-1.5 text-center min-w-[50px] shadow-2xs">
                          <span className="text-[10px] font-bold text-blue-600 tracking-wider">
                            {dt.month}
                          </span>
                          <span className="text-base font-extrabold text-slate-900 leading-tight">
                            {dt.day}
                          </span>
                        </div>
                        <div>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.bg}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                          <p className="mt-0.5 text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                            <Clock size={11} className="text-slate-400" />
                            <span>{dt.time} ({m.durationMinutes} min)</span>
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          title="View Details"
                          onClick={() => handleOpenDetail(m)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          title="Edit Meeting"
                          onClick={(e) => handleOpenEdit(m, e)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          title="Delete Meeting"
                          onClick={(e) => handleOpenDelete(m, e)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition">
                      {m.title}
                    </h3>

                    {/* Location or Meeting Link */}
                    <div className="mt-2 space-y-1 text-xs text-slate-500">
                      {m.meetingLink && (
                        <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                          <Video size={13} className="shrink-0" />
                          <a
                            href={m.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="truncate hover:underline flex items-center gap-1"
                          >
                            <span>Join Video Call</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      )}

                      {m.location && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <MapPin size={13} className="shrink-0 text-slate-400" />
                          <span className="truncate">{m.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Associated Lead or Deal */}
                    {(m.lead || m.deal) && (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        {m.lead && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            <Users size={10} className="text-slate-500" />
                            <span className="truncate max-w-[130px]">{m.lead.contactName}</span>
                          </span>
                        )}
                        {m.deal && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60 px-2 py-0.5 text-[10px] font-semibold">
                            <FolderGit2 size={10} />
                            <span className="truncate max-w-[130px]">{m.deal.name}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Organizer & Quick Status Changer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-bold text-[9px]">
                        {m.organizer.name.charAt(0)}
                      </div>
                      <span className="truncate max-w-[100px]">{m.organizer.name}</span>
                    </span>

                    {/* Quick status actions */}
                    {m.status === "PLANNED" && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleQuickStatusChange(m, "COMPLETED", e)}
                          className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                        >
                          Complete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-slate-800">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[160px]">Date & Time</th>
                  <th className="py-3 px-4 min-w-[220px]">Meeting Title</th>
                  <th className="py-3 px-4 min-w-[160px]">Connected To</th>
                  <th className="py-3 px-4 min-w-[140px]">Organizer</th>
                  <th className="py-3 px-4 text-center min-w-[110px]">Status</th>
                  <th className="py-3 px-4 text-right min-w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {filteredMeetings.map((m) => {
                  const dt = formatDateTime(m.startsAt);
                  const badge = getStatusBadge(m.status);

                  return (
                    <tr
                      key={m.id}
                      onClick={() => handleOpenDetail(m)}
                      className="hover:bg-slate-50/60 transition cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{dt.full}</div>
                        <div className="text-[11px] font-medium text-slate-600">{dt.time} ({m.durationMinutes} min)</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 group-hover:text-blue-600 transition">
                          {m.title}
                        </div>
                        {m.meetingLink ? (
                          <a
                            href={m.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-0.5"
                          >
                            <Video size={11} />
                            <span>Video link</span>
                            <ExternalLink size={9} />
                          </a>
                        ) : m.location ? (
                          <div className="text-[11px] font-medium text-slate-600 mt-0.5 truncate max-w-[200px]">
                            {m.location}
                          </div>
                        ) : null}
                      </td>

                      <td className="py-3 px-4">
                        {m.lead ? (
                          <div className="flex items-center gap-1 text-slate-900 font-medium">
                            <Users size={12} className="text-slate-500" />
                            <span>{m.lead.contactName}</span>
                          </div>
                        ) : m.deal ? (
                          <div className="flex items-center gap-1 text-purple-700 font-medium">
                            <FolderGit2 size={12} className="text-purple-500" />
                            <span>{m.deal.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-light">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-900 font-semibold">{m.organizer.name}</div>
                        <div className="text-[11px] font-medium text-slate-600">{m.organizer.email}</div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badge.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="View Details"
                            onClick={() => handleOpenDetail(m)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            title="Edit Meeting"
                            onClick={(e) => handleOpenEdit(m, e)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            title="Delete Meeting"
                            onClick={(e) => handleOpenDelete(m, e)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule / Edit Meeting Modal */}
      {formOpen && (
        <div
          className="dialog-overlay-in fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs transition-opacity"
          role="dialog"
          aria-modal="true"
          onClick={() => !savingForm && setFormOpen(false)}
        >
          <div
            className="dialog-enter flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <CalendarDays size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {formMode === "create" ? "Schedule New Meeting" : "Edit Meeting Details"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Set up timing, location, agenda, and CRM connections
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Meeting Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Discovery Call with SolarTech Systems"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Date & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Date & Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startsAt}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startsAt: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Duration
                  </label>
                  <select
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, durationMinutes: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
              </div>

              {/* Location & Video Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Location / Platform
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Google Meet, Zoom, Office"
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Video Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={formData.meetingLink}
                    onChange={(e) => setFormData((prev) => ({ ...prev, meetingLink: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Status & Relations */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as MeetingStatus }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="PLANNED">Scheduled</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="RESCHEDULED">Rescheduled</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Linked Lead
                  </label>
                  <select
                    value={formData.leadId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, leadId: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="none">No Lead Linked</option>
                    {options?.leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.contactName} ({l.companyName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Linked Deal
                  </label>
                  <select
                    value={formData.dealId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dealId: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="none">No Deal Linked</option>
                    {options?.deals.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Agenda / Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Agenda & Discussion Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Outline key discussion topics or meeting notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>

              {/* Outcome & Next Steps (if completed) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Meeting Outcome
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Client agreed to enterprise proposal"
                    value={formData.outcome}
                    onChange={(e) => setFormData((prev) => ({ ...prev, outcome: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Next Steps
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Send contract by Friday"
                    value={formData.nextSteps}
                    onChange={(e) => setFormData((prev) => ({ ...prev, nextSteps: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  disabled={savingForm}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingForm}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
                >
                  {savingForm && <Loader2 size={14} className="animate-spin" />}
                  <span>{formMode === "create" ? "Schedule Meeting" : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Meeting Details Dialog */}
      {detailOpen && detailMeeting && (
        <div
          className="dialog-overlay-in fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs transition-opacity"
          role="dialog"
          aria-modal="true"
          onClick={() => setDetailOpen(false)}
        >
          <div
            className="dialog-enter flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <CalendarDays size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Meeting Details</h3>
                  <p className="text-[11px] text-slate-400">Consultation summary and attendees</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              <div>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getStatusBadge(detailMeeting.status).bg}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${getStatusBadge(detailMeeting.status).dot}`} />
                  {getStatusBadge(detailMeeting.status).label}
                </span>
                <h2 className="mt-2 text-base font-bold text-slate-900">{detailMeeting.title}</h2>
              </div>

              {/* Timing & Location Grid */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Date & Time</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{formatDateTime(detailMeeting.startsAt).full}</p>
                  <p className="text-slate-500 text-[11px]">{formatDateTime(detailMeeting.startsAt).time} ({detailMeeting.durationMinutes} min)</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Organizer</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{detailMeeting.organizer.name}</p>
                  <p className="text-slate-500 text-[11px]">{detailMeeting.organizer.email}</p>
                </div>
              </div>

              {/* Video Link */}
              {detailMeeting.meetingLink && (
                <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Video size={16} className="text-blue-600 shrink-0" />
                    <div>
                      <span className="font-bold text-blue-900">Video Call Available</span>
                      <p className="text-[11px] text-blue-700 truncate max-w-[240px]">{detailMeeting.meetingLink}</p>
                    </div>
                  </div>
                  <a
                    href={detailMeeting.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
                  >
                    <span>Join</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {/* Connected Records */}
              {(detailMeeting.lead || detailMeeting.deal) && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700">Connected CRM Entities</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {detailMeeting.lead && (
                      <div className="rounded-xl border border-slate-200 p-2.5 bg-white">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Associated Lead</span>
                        <p className="font-bold text-slate-800 mt-0.5">{detailMeeting.lead.contactName}</p>
                        <p className="text-[11px] text-slate-500">{detailMeeting.lead.companyName}</p>
                      </div>
                    )}
                    {detailMeeting.deal && (
                      <div className="rounded-xl border border-purple-200 p-2.5 bg-purple-50/40">
                        <span className="text-[10px] text-purple-600 uppercase font-bold">Associated Deal</span>
                        <p className="font-bold text-purple-900 mt-0.5">{detailMeeting.deal.name}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {detailMeeting.notes && (
                <div>
                  <span className="text-xs font-semibold text-slate-700">Agenda / Discussion Notes</span>
                  <p className="mt-1 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-700 leading-relaxed">
                    {detailMeeting.notes}
                  </p>
                </div>
              )}

              {/* Outcome & Next Steps */}
              {(detailMeeting.outcome || detailMeeting.nextSteps) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {detailMeeting.outcome && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                      <span className="text-[10px] uppercase font-bold text-emerald-700">Outcome</span>
                      <p className="font-medium text-emerald-900 mt-0.5">{detailMeeting.outcome}</p>
                    </div>
                  )}
                  {detailMeeting.nextSteps && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
                      <span className="text-[10px] uppercase font-bold text-blue-700">Next Steps</span>
                      <p className="font-medium text-blue-900 mt-0.5">{detailMeeting.nextSteps}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setDetailOpen(false);
                    handleOpenEdit(detailMeeting, {} as React.MouseEvent);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  <Pencil size={13} />
                  <span>Edit Meeting</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailOpen(false)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-slate-800 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteOpen && meetingToDelete && (
        <div
          className="dialog-overlay-in fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs transition-opacity"
          role="dialog"
          aria-modal="true"
          onClick={() => !deleting && setDeleteOpen(false)}
        >
          <div
            className="dialog-enter flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
                <Trash2 size={22} />
              </div>

              <h3 className="text-base font-bold text-slate-900">Delete Meeting</h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Are you sure you want to cancel and remove the meeting{" "}
                <strong className="text-slate-900">"{meetingToDelete.title}"</strong>?
                This action cannot be undone.
              </p>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleting}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteMeeting}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-rose-600/25 hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
                >
                  {deleting && <Loader2 size={14} className="animate-spin" />}
                  <span>Delete Meeting</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
