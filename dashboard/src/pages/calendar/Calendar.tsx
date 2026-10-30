import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Video,
  MapPin,
  RotateCw,
  Users,
  CheckSquare,
  CalendarDays,
  CheckCircle2,
  X,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Clock,
  User,
} from "lucide-react";
import { fetchMeetings } from "../../lib/meetings";
import { request } from "../../lib/api";
import { ENDPOINTS } from "../../lib/endpoints";
import { getSession } from "../../lib/auth";
import type { MeetingItem } from "../../types/meeting";

type CalendarViewMode = "month" | "agenda";
type FilterEventType = "all" | "meetings" | "tasks" | "overdue";

interface CalendarTask {
  id: number;
  title: string;
  dueAt: string;
  priority: string;
  status: string;
  description?: string | null;
  assignedTo?: { id: number; name: string; email?: string } | null;
  lead?: { id: number; contactName: string; companyName?: string | null } | null;
  deal?: { id: number; name: string } | null;
  company?: { id: number; name: string } | null;
}

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function isTaskOverdue(task: CalendarTask, todayStr: string = getTodayString()): boolean {
  if (!task.dueAt) return false;
  const normalizedStatus = (task.status || "").toUpperCase();
  if (normalizedStatus === "COMPLETED" || normalizedStatus === "CANCELLED") return false;
  const taskDate = task.dueAt.split("T")[0];
  return taskDate < todayStr;
}

export function getMeetingWith(m: MeetingItem): {
  name: string;
  detail?: string;
  type: "contact" | "lead" | "deal" | "company" | "user" | "none";
} {
  // 1. Participant contact (external attendee)
  const contactPart = m.participants?.find((p) => p.contact?.fullName);
  if (contactPart?.contact) {
    return {
      name: contactPart.contact.fullName,
      detail: contactPart.contact.email || contactPart.contact.phone || undefined,
      type: "contact",
    };
  }

  // 2. Linked Lead
  if (m.lead?.contactName) {
    return {
      name: m.lead.contactName,
      detail: m.lead.companyName ? `Lead • ${m.lead.companyName}` : "Lead",
      type: "lead",
    };
  }

  // 3. Customer primary contact
  if (m.customer?.primaryContact?.fullName) {
    return {
      name: m.customer.primaryContact.fullName,
      detail: m.customer.company?.name || "Customer",
      type: "contact",
    };
  }

  // 4. Linked Company
  if (m.company?.name) {
    return {
      name: m.company.name,
      detail: "Company Account",
      type: "company",
    };
  }

  // 5. Linked Deal
  if (m.deal?.name) {
    return {
      name: m.deal.name,
      detail: "Deal Discussion",
      type: "deal",
    };
  }

  // 6. Other team member participant
  const userPart = m.participants?.find((p) => p.user && p.user.id !== m.organizerId);
  if (userPart?.user) {
    return {
      name: userPart.user.name,
      detail: "Team Member",
      type: "user",
    };
  }

  return {
    name: "Not specified",
    type: "none",
  };
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatEndTime(isoString: string, durationMinutes: number = 30): string {
  try {
    const start = new Date(isoString);
    if (isNaN(start.getTime())) return "";
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    return end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function Calendar() {
  const navigate = useNavigate();

  // Current view date (year & month)
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [eventTypeFilter, setEventTypeFilter] = useState<FilterEventType>("all");

  // Data states
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected meeting & task for preview dialog
  const [previewMeeting, setPreviewMeeting] = useState<MeetingItem | null>(null);
  const [previewTask, setPreviewTask] = useState<CalendarTask | null>(null);

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const token = getSession()?.token;
      const [meetingsRes, tasksRes] = await Promise.allSettled([
        fetchMeetings({ limit: 100 }),
        request<{ items: CalendarTask[] }>(ENDPOINTS.tasks.list + "?limit=100", { token }),
      ]);

      if (meetingsRes.status === "fulfilled") {
        setMeetings(meetingsRes.value.meetings || []);
      } else {
        console.warn("Could not load meetings:", meetingsRes.reason);
      }

      if (tasksRes.status === "fulfilled") {
        const res = tasksRes.value as any;
        const items = Array.isArray(res)
          ? res
          : Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res?.data?.items)
          ? res.data.items
          : [];
        setTasks(items);
      } else {
        console.warn("Could not load tasks:", tasksRes.reason);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load calendar events");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Month name display
  const monthTitle = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
      currentDate
    );
  }, [currentDate]);

  // Today string
  const todayString = useMemo(() => getTodayString(), []);

  // Days grid construction (Monday-first: Monday to Sunday with Sat & Sun together)
  const calendarDays = useMemo(() => {
    const rawFirstDay = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
    const firstDayIndex = (rawFirstDay + 6) % 7; // 0 = Mon, 1 = Tue, ..., 5 = Sat, 6 = Sun
    const lastDayCurrentMonth = new Date(year, month + 1, 0).getDate();
    const lastDayPrevMonth = new Date(year, month, 0).getDate();

    const days: {
      date: Date;
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isWeekend: boolean;
    }[] = [];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, lastDayPrevMonth - i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      const dayOfWeek = d.getDay();
      days.push({
        date: d,
        dateString: ds,
        dayNumber: lastDayPrevMonth - i,
        isCurrentMonth: false,
        isToday: ds === todayString,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    // Current month days
    for (let i = 1; i <= lastDayCurrentMonth; i++) {
      const d = new Date(year, month, i);
      const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const dayOfWeek = d.getDay();
      days.push({
        date: d,
        dateString: ds,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: ds === todayString,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    // Next month filler days (fill to reach 35 or 42 cells)
    const totalCells = days.length <= 35 ? 35 : 42;
    const remainingDays = totalCells - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const d = new Date(year, month + 1, i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      const dayOfWeek = d.getDay();
      days.push({
        date: d,
        dateString: ds,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: ds === todayString,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    return days;
  }, [year, month, todayString]);

  // Index events by "YYYY-MM-DD"
  const eventsByDate = useMemo(() => {
    const map = new Map<
      string,
      {
        meetings: MeetingItem[];
        tasks: CalendarTask[];
      }
    >();

    const getEntry = (key: string) => {
      let entry = map.get(key);
      if (!entry) {
        entry = { meetings: [], tasks: [] };
        map.set(key, entry);
      }
      return entry;
    };

    meetings.forEach((m) => {
      if (!m.startsAt) return;
      const key = m.startsAt.split("T")[0];
      getEntry(key).meetings.push(m);
    });

    tasks.forEach((t) => {
      if (!t.dueAt) return;
      const key = t.dueAt.split("T")[0];
      getEntry(key).tasks.push(t);
    });

    return map;
  }, [meetings, tasks]);

  // Selected date key
  const selectedDateKey = useMemo(() => {
    return `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(selectedDate.getDate()).padStart(2, "0")}`;
  }, [selectedDate]);

  // Events on selected day
  const selectedDayEvents = useMemo(() => {
    return eventsByDate.get(selectedDateKey) || { meetings: [], tasks: [] };
  }, [eventsByDate, selectedDateKey]);

  // Month summary stats
  const currentMonthStats = useMemo(() => {
    let meetingCount = 0;
    let completedMeetingCount = 0;
    let plannedMeetingCount = 0;
    let taskCount = 0;
    let overdueCount = 0;
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

    meetings.forEach((m) => {
      if (m.startsAt && m.startsAt.startsWith(monthPrefix)) {
        meetingCount++;
        if (m.status === "COMPLETED") completedMeetingCount++;
        if (m.status === "PLANNED") plannedMeetingCount++;
      }
    });

    tasks.forEach((t) => {
      if (t.dueAt && t.dueAt.startsWith(monthPrefix)) {
        taskCount++;
      }
      if (isTaskOverdue(t, todayString)) {
        overdueCount++;
      }
    });

    return {
      meetings: meetingCount,
      plannedMeetings: plannedMeetingCount,
      completedMeetings: completedMeetingCount,
      tasks: taskCount,
      overdue: overdueCount,
      total: meetingCount + taskCount,
    };
  }, [meetings, tasks, year, month, todayString]);

  // All events list for Agenda View sorted by date
  const agendaList = useMemo(() => {
    const list: {
      type: "meeting" | "task";
      dateString: string;
      item: MeetingItem | CalendarTask;
    }[] = [];

    if (eventTypeFilter === "all" || eventTypeFilter === "meetings") {
      meetings.forEach((m) => {
        if (m.startsAt) {
          list.push({
            type: "meeting",
            dateString: m.startsAt.split("T")[0],
            item: m,
          });
        }
      });
    }

    if (eventTypeFilter === "all" || eventTypeFilter === "tasks") {
      tasks.forEach((t) => {
        if (t.dueAt) {
          list.push({
            type: "task",
            dateString: t.dueAt.split("T")[0],
            item: t,
          });
        }
      });
    }

    if (eventTypeFilter === "overdue") {
      tasks
        .filter((t) => isTaskOverdue(t, todayString))
        .forEach((t) => {
          if (t.dueAt) {
            list.push({
              type: "task",
              dateString: t.dueAt.split("T")[0],
              item: t,
            });
          }
        });
    }

    return list.sort((a, b) => a.dateString.localeCompare(b.dateString));
  }, [meetings, tasks, eventTypeFilter, todayString]);

  const weekDayLabels = [
    { short: "Mon", full: "Monday", isWeekend: false },
    { short: "Tue", full: "Tuesday", isWeekend: false },
    { short: "Wed", full: "Wednesday", isWeekend: false },
    { short: "Thu", full: "Thursday", isWeekend: false },
    { short: "Fri", full: "Friday", isWeekend: false },
    { short: "Sat", full: "Saturday", isWeekend: true },
    { short: "Sun", full: "Sunday", isWeekend: true },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Executive KPI Metrics */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Calendar
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Coordinate appointments, client meetings, and track task delivery in a unified visual timeline.
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition active:scale-98 cursor-pointer"
          >
            <RotateCw size={14} className={refreshing ? "animate-spin text-blue-600" : "text-slate-500"} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/tasks")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
          >
            <CheckSquare size={14} className="text-amber-600" />
            <span>Tasks</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/meetings")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
          >
            <CalendarDays size={14} className="text-blue-600" />
            <span>Meetings</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/meetings")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition active:scale-98 cursor-pointer"
          >
            <Plus size={15} />
            <span>Schedule Meeting</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-xs font-semibold text-red-700 shadow-2xs">
          <AlertCircle size={17} className="shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {loading && !refreshing && (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-16 text-slate-500 shadow-xs">
          <Loader2 size={20} className="animate-spin text-blue-600" />
          <span className="text-sm font-semibold text-slate-700">Loading sales calendar events...</span>
        </div>
      )}

      {/* 2. Interactive Navigation Bar & Segmented Controls */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Month Navigator with polished Today pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous Month"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition active:scale-95 cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="border-x border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Month"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition active:scale-95 cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            {monthTitle}
          </h2>
        </div>

        {/* View mode toggle & Filter Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter Pills */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50/80 p-1">
            <button
              type="button"
              onClick={() => setEventTypeFilter("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                eventTypeFilter === "all"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({currentMonthStats.total})
            </button>
            <button
              type="button"
              onClick={() => setEventTypeFilter("meetings")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                eventTypeFilter === "meetings"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Meetings ({currentMonthStats.meetings})
            </button>
            <button
              type="button"
              onClick={() => setEventTypeFilter("tasks")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                eventTypeFilter === "tasks"
                  ? "bg-white text-amber-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tasks ({currentMonthStats.tasks})
            </button>
            {currentMonthStats.overdue > 0 && (
              <button
                type="button"
                onClick={() => setEventTypeFilter("overdue")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  eventTypeFilter === "overdue"
                    ? "bg-red-500 text-white shadow-xs"
                    : "text-red-700 hover:bg-red-50"
                }`}
              >
                <AlertTriangle size={11} />
                Overdue ({currentMonthStats.overdue})
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50/80 p-1">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                viewMode === "month"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Month View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("agenda")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                viewMode === "agenda"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Agenda View
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Workspace Area: Month Grid or Agenda View */}
      {viewMode === "month" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
          {/* Month Calendar Grid (3 cols on xl) */}
          <div className="xl:col-span-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs overflow-hidden flex flex-col justify-between">
            {/* Legend & Month status */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">Date Box Color Guide:</span>
                <span className="text-[11px] text-slate-400">Click any date to view day agenda</span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 text-[11px]">
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-200/80">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Completed Meeting
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-blue-800 bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-200/80">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Planned Meeting
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-amber-800 bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-200/80">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Task Due
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-red-800 bg-red-50/80 px-2 py-0.5 rounded-md border border-red-200/80">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Overdue Task
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-rose-800 bg-rose-50/80 px-2 py-0.5 rounded-md border border-rose-200/80">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  Cancelled
                </span>
              </div>
            </div>

            {/* Days of week header (Monday to Sunday, with Saturday & Sunday together) */}
            <div className="grid grid-cols-7 border-b border-slate-200/80 pb-2.5 text-center">
              {weekDayLabels.map((day) => (
                <div
                  key={day.short}
                  className={`text-xs font-bold uppercase tracking-wider py-1 rounded-md ${
                    day.isWeekend
                      ? "text-slate-700 bg-slate-100/70 font-extrabold"
                      : "text-slate-600"
                  }`}
                >
                  <span className="hidden sm:inline">{day.full}</span>
                  <span className="sm:hidden">{day.short}</span>
                </div>
              ))}
            </div>

            {/* Calendar Cells Grid */}
            <div className="grid grid-cols-7 gap-px bg-slate-200 pt-px mt-2 rounded-xl overflow-hidden border border-slate-200">
              {calendarDays.map((cell) => {
                const dayEvents = eventsByDate.get(cell.dateString);
                const hasMeetings =
                  (eventTypeFilter === "all" || eventTypeFilter === "meetings") &&
                  (dayEvents?.meetings.length || 0) > 0;
                const hasTasks =
                  (eventTypeFilter === "all" || eventTypeFilter === "tasks") &&
                  (dayEvents?.tasks.length || 0) > 0;

                const isSelected = cell.dateString === selectedDateKey;

                // Event status flags for this day
                const hasCompletedMeeting = (dayEvents?.meetings || []).some(
                  (m) => m.status === "COMPLETED"
                );
                const hasPlannedMeeting = (dayEvents?.meetings || []).some(
                  (m) => m.status === "PLANNED"
                );
                const hasCancelledMeeting = (dayEvents?.meetings || []).some(
                  (m) => m.status === "CANCELLED"
                );
                const hasRescheduledMeeting = (dayEvents?.meetings || []).some(
                  (m) => m.status === "RESCHEDULED"
                );
                const dayTasks = dayEvents?.tasks || [];
                const hasTaskEvents = dayTasks.length > 0;
                const hasOverdueTask = dayTasks.some((t) => isTaskOverdue(t, todayString));

                // Determine box background color, border, and active selection ring
                let boxBgStyle = "bg-white text-slate-800 hover:bg-slate-50";
                let selectionRing = isSelected ? "ring-2 ring-blue-500 ring-inset bg-blue-50/20" : "";
                let datePillStyle = cell.isCurrentMonth ? "text-slate-800" : "text-slate-400";

                if (!cell.isCurrentMonth) {
                  // Muted adjacent month days
                  if (hasOverdueTask) {
                    boxBgStyle = "bg-red-50/40 text-slate-500 hover:bg-red-50/60";
                  } else if (hasCompletedMeeting && hasPlannedMeeting) {
                    boxBgStyle = "bg-teal-50/40 text-slate-500 hover:bg-teal-50/60";
                  } else if (hasCompletedMeeting) {
                    boxBgStyle = "bg-emerald-50/40 text-slate-500 hover:bg-emerald-50/60";
                  } else if (hasPlannedMeeting) {
                    boxBgStyle = "bg-blue-50/40 text-slate-500 hover:bg-blue-50/60";
                  } else if (hasTaskEvents) {
                    boxBgStyle = "bg-amber-50/40 text-slate-500 hover:bg-amber-50/60";
                  } else if (hasCancelledMeeting || hasRescheduledMeeting) {
                    boxBgStyle = "bg-rose-50/40 text-slate-500 hover:bg-rose-50/60";
                  } else {
                    boxBgStyle = cell.isWeekend
                      ? "bg-slate-100/60 text-slate-400 hover:bg-slate-100/80"
                      : "bg-slate-50/70 text-slate-400 hover:bg-slate-100/50";
                  }
                } else {
                  // Current month days
                  if (hasOverdueTask) {
                    // Overdue task alert: urgent light red box!
                    boxBgStyle =
                      "bg-red-50/90 text-slate-900 hover:bg-red-100/80 border border-red-300/80 shadow-2xs";
                    datePillStyle = "bg-red-100 text-red-900 font-bold";
                    if (isSelected) selectionRing = "ring-2 ring-red-500 ring-inset bg-red-100/60";
                  } else if (hasCompletedMeeting && hasPlannedMeeting) {
                    // Both completed & planned meetings on the same day
                    boxBgStyle =
                      "bg-gradient-to-br from-emerald-50/90 via-teal-50/70 to-blue-50/90 text-slate-900 hover:from-emerald-100/90 hover:to-blue-100/90 border border-teal-200/70 shadow-2xs";
                    datePillStyle = "bg-teal-100 text-teal-900 font-bold";
                    if (isSelected) selectionRing = "ring-2 ring-teal-500 ring-inset bg-teal-100/60";
                  } else if (hasCompletedMeeting) {
                    // Completed meeting box: Light Green
                    boxBgStyle =
                      "bg-emerald-50/85 text-slate-900 hover:bg-emerald-100/75 border border-emerald-200/70 shadow-2xs";
                    datePillStyle = "bg-emerald-100 text-emerald-900 font-bold";
                    if (isSelected) selectionRing = "ring-2 ring-emerald-500 ring-inset bg-emerald-100/60";
                  } else if (hasPlannedMeeting) {
                    // Planned meeting box: Light Blue
                    boxBgStyle =
                      "bg-blue-50/85 text-slate-900 hover:bg-blue-100/75 border border-blue-200/70 shadow-2xs";
                    datePillStyle = "bg-blue-100 text-blue-900 font-bold";
                    if (isSelected) selectionRing = "ring-2 ring-blue-500 ring-inset bg-blue-100/60";
                  } else if (hasCancelledMeeting || hasRescheduledMeeting) {
                    // Cancelled / Rescheduled meeting box: Light Rose
                    boxBgStyle =
                      "bg-rose-50/80 text-slate-900 hover:bg-rose-100/70 border border-rose-200/70 shadow-2xs";
                    datePillStyle = "bg-rose-100 text-rose-900 font-bold";
                    if (isSelected) selectionRing = "ring-2 ring-rose-400 ring-inset bg-rose-100/50";
                  } else if (hasTaskEvents) {
                    // Task Due box: Light Amber / Warm Yellow
                    boxBgStyle =
                      "bg-amber-50/85 text-slate-900 hover:bg-amber-100/75 border border-amber-200/70 shadow-2xs";
                    datePillStyle = "bg-amber-100 text-amber-900 font-bold";
                    if (isSelected) selectionRing = "ring-2 ring-amber-500 ring-inset bg-amber-100/60";
                  } else {
                    // Regular empty day
                    boxBgStyle = cell.isWeekend
                      ? "bg-slate-50/50 text-slate-800 hover:bg-slate-100/60"
                      : "bg-white text-slate-800 hover:bg-slate-50";
                    if (isSelected) selectionRing = "ring-2 ring-blue-500 ring-inset bg-blue-50/20";
                  }
                }

                if (cell.isToday) {
                  datePillStyle = "bg-blue-600 text-white font-bold shadow-sm ring-2 ring-blue-200";
                }

                return (
                  <div
                    key={cell.dateString}
                    onClick={() => setSelectedDate(cell.date)}
                    className={`min-h-[102px] sm:min-h-[118px] p-2 transition flex flex-col justify-between cursor-pointer ${boxBgStyle} ${selectionRing}`}
                  >
                    {/* Top Row: Date Number & Badges */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${datePillStyle}`}
                        >
                          {cell.dayNumber}
                        </span>

                        {/* Status Badges on the date box */}
                        {hasOverdueTask && (
                          <span
                            title="Overdue task on this date"
                            className="inline-flex items-center gap-0.5 rounded-full bg-white/95 px-1.5 py-0.2 text-[9px] font-bold text-red-800 border border-red-300 shadow-2xs"
                          >
                            <AlertTriangle size={8} className="text-red-600 shrink-0" />
                            Overdue
                          </span>
                        )}

                        {!hasOverdueTask && hasCompletedMeeting && hasPlannedMeeting && (
                          <span
                            title="Completed and planned meetings on this date"
                            className="inline-flex items-center gap-0.5 rounded-full bg-white/90 px-1 py-0.5 text-[9px] font-bold text-teal-800 border border-teal-200 shadow-2xs"
                          >
                            <CheckCircle2 size={8} className="text-emerald-600 shrink-0" />
                            <Video size={8} className="text-blue-600 shrink-0" />
                          </span>
                        )}

                        {!hasOverdueTask && hasCompletedMeeting && !hasPlannedMeeting && (
                          <span
                            title="Completed meeting on this date"
                            className="inline-flex items-center gap-0.5 rounded-full bg-white/90 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 border border-emerald-200 shadow-2xs"
                          >
                            <CheckCircle2 size={8} className="text-emerald-700 shrink-0" />
                            Done
                          </span>
                        )}

                        {!hasOverdueTask && hasPlannedMeeting && !hasCompletedMeeting && (
                          <span
                            title="Planned meeting on this date"
                            className="inline-flex items-center gap-0.5 rounded-full bg-white/90 px-1.5 py-0.2 text-[9px] font-bold text-blue-800 border border-blue-200 shadow-2xs"
                          >
                            <Video size={8} className="text-blue-600 shrink-0" />
                            Plan
                          </span>
                        )}

                        {!hasOverdueTask &&
                          !hasCompletedMeeting &&
                          !hasPlannedMeeting &&
                          (hasCancelledMeeting || hasRescheduledMeeting) && (
                            <span
                              title="Cancelled / Rescheduled on this date"
                              className="inline-flex items-center gap-0.5 rounded-full bg-white/90 px-1 py-0.2 text-[9px] font-bold text-rose-800 border border-rose-200 shadow-2xs"
                            >
                              <AlertCircle size={8} className="text-rose-600 shrink-0" />
                            </span>
                          )}

                        {!hasOverdueTask && !hasMeetings && hasTaskEvents && (
                          <span
                            title="Task due on this date"
                            className="inline-flex items-center gap-0.5 rounded-full bg-white/90 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 border border-amber-200 shadow-2xs"
                          >
                            <CheckSquare size={8} className="text-amber-700 shrink-0" />
                            Task
                          </span>
                        )}
                      </div>

                      {/* Small total badge */}
                      {(hasMeetings || hasTasks) && (
                        <span className="text-[10px] font-bold text-slate-400">
                          {eventTypeFilter === "all"
                            ? (dayEvents?.meetings.length || 0) + (dayEvents?.tasks.length || 0)
                            : eventTypeFilter === "meetings"
                            ? dayEvents?.meetings.length || 0
                            : eventTypeFilter === "tasks"
                            ? dayEvents?.tasks.length || 0
                            : dayTasks.filter((t) => isTaskOverdue(t, todayString)).length}
                        </span>
                      )}
                    </div>

                    {/* Events chips list */}
                    <div className="mt-1 flex-1 space-y-1 overflow-hidden">
                      {/* Meetings */}
                      {(eventTypeFilter === "all" || eventTypeFilter === "meetings") &&
                        dayEvents?.meetings.slice(0, 2).map((m) => {
                          const isDone = m.status === "COMPLETED";
                          const isCancelled = m.status === "CANCELLED";
                          const isRescheduled = m.status === "RESCHEDULED";

                          let chipColor =
                            "bg-blue-100/90 text-blue-900 hover:bg-blue-200 border border-blue-300/80";
                          let dotColor = "bg-blue-600";

                          if (isDone) {
                            chipColor =
                              "bg-emerald-100/90 text-emerald-900 hover:bg-emerald-200 border border-emerald-300/80 font-semibold";
                            dotColor = "bg-emerald-600";
                          } else if (isCancelled) {
                            chipColor =
                              "bg-rose-100/90 text-rose-900 hover:bg-rose-200 border border-rose-300/80";
                            dotColor = "bg-rose-600";
                          } else if (isRescheduled) {
                            chipColor =
                              "bg-purple-100/90 text-purple-900 hover:bg-purple-200 border border-purple-300/80";
                            dotColor = "bg-purple-600";
                          }

                          const withWho = getMeetingWith(m);

                          return (
                            <div
                              key={`m-${m.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewMeeting(m);
                              }}
                              title={`${formatTime(m.startsAt)} ${m.title}${withWho.type !== "none" ? ` (with ${withWho.name})` : ""} [${m.status}]`}
                              className={`group flex items-center justify-between gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition active:scale-98 cursor-pointer ${chipColor}`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0 truncate">
                                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor}`} />
                                <span className="truncate">{m.title}</span>
                              </div>
                              {withWho.type !== "none" && (
                                <span className="shrink-0 text-[9px] font-semibold opacity-80 truncate max-w-[65px]">
                                  w/ {withWho.name.split(" ")[0]}
                                </span>
                              )}
                            </div>
                          );
                        })}

                      {/* Tasks */}
                      {(eventTypeFilter === "all" || eventTypeFilter === "tasks" || eventTypeFilter === "overdue") &&
                        dayEvents?.tasks.slice(0, 1).map((t) => {
                          const isOverdue = isTaskOverdue(t, todayString);
                          return (
                            <div
                              key={`t-${t.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewTask(t);
                              }}
                              title={`Task: ${t.title} ${isOverdue ? "(OVERDUE)" : ""}`}
                              className={`flex items-center gap-1.5 truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium transition active:scale-98 cursor-pointer ${
                                isOverdue
                                  ? "bg-red-100 text-red-900 hover:bg-red-200 border border-red-300 font-semibold"
                                  : "bg-amber-100/90 text-amber-900 hover:bg-amber-200 border border-amber-300/80"
                              }`}
                            >
                              {isOverdue ? (
                                <AlertTriangle size={10} className="shrink-0 text-red-600" />
                              ) : (
                                <CheckSquare size={10} className="shrink-0 text-amber-700" />
                              )}
                              <span className="truncate">{t.title}</span>
                            </div>
                          );
                        })}

                      {/* More items overflow */}
                      {dayEvents &&
                        (dayEvents.meetings.length + dayEvents.tasks.length > 2) && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(cell.date);
                            }}
                            className="text-[9px] font-bold text-slate-500 hover:text-blue-600 pl-1 cursor-pointer"
                          >
                            +{dayEvents.meetings.length + dayEvents.tasks.length - 2} more items
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Day Agenda Panel (Right Column) - Executive Day Schedule */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600">
                    Day Agenda
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {new Intl.DateTimeFormat("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(selectedDate)}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/meetings")}
                  title="Schedule on this day"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition active:scale-95 cursor-pointer shadow-2xs"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* List of items on this date */}
              <div className="space-y-3 overflow-y-auto max-h-[580px] pr-0.5">
                {selectedDayEvents.meetings.length === 0 && selectedDayEvents.tasks.length === 0 ? (
                  <div className="py-14 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
                      <CalendarDays size={26} />
                    </div>
                    <p className="mt-3.5 text-xs font-bold text-slate-700">No events on this day</p>
                    <p className="mt-1 text-[11px] text-slate-400 max-w-[200px] mx-auto">
                      Plan ahead by scheduling a meeting or creating a task deadline.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/meetings")}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add Meeting</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Meetings on selected day */}
                    {selectedDayEvents.meetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        onClick={() => setPreviewMeeting(meeting)}
                        className={`group rounded-2xl border p-4 shadow-2xs hover:shadow-md transition cursor-pointer ${
                          meeting.status === "COMPLETED"
                            ? "border-emerald-200/90 bg-emerald-50/30 hover:border-emerald-300"
                            : meeting.status === "CANCELLED"
                            ? "border-rose-200/90 bg-rose-50/30 hover:border-rose-300"
                            : "border-slate-200 bg-white hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            <Clock size={10} />
                            {formatTime(meeting.startsAt)} ({meeting.durationMinutes}m)
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              meeting.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-800"
                                : meeting.status === "CANCELLED"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {meeting.status}
                          </span>
                        </div>

                        <h4 className="mt-2 text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                          {meeting.title}
                        </h4>

                        {meeting.location && (
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 truncate">
                            <MapPin size={11} className="shrink-0 text-slate-400" />
                            <span className="truncate">{meeting.location}</span>
                          </p>
                        )}

                        {meeting.meetingLink && (
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-blue-600 truncate hover:underline">
                            <Video size={11} className="shrink-0 text-blue-500" />
                            <span className="truncate">Virtual Meeting Link</span>
                          </p>
                        )}

                        {(meeting.lead || meeting.company || meeting.deal) && (
                          <div className="mt-2.5 flex items-center gap-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                            <Users size={11} className="text-slate-400 shrink-0" />
                            <span className="truncate font-medium">
                              {meeting.lead
                                ? `${meeting.lead.contactName} (${meeting.lead.companyName || "Lead"})`
                                : meeting.company?.name || meeting.deal?.name}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Tasks on selected day */}
                    {selectedDayEvents.tasks.map((task) => {
                      const isOverdue = isTaskOverdue(task, todayString);
                      return (
                        <div
                          key={task.id}
                          onClick={() => setPreviewTask(task)}
                          className={`rounded-2xl border p-4 shadow-2xs hover:shadow-md transition cursor-pointer ${
                            isOverdue
                              ? "border-red-300 bg-red-50/70 hover:border-red-400"
                              : "border-amber-200/90 bg-amber-50/40 hover:border-amber-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                                isOverdue ? "text-red-800" : "text-amber-800"
                              }`}
                            >
                              {isOverdue ? (
                                <AlertTriangle size={12} className="text-red-600" />
                              ) : (
                                <CheckSquare size={12} className="text-amber-600" />
                              )}
                              {isOverdue ? "OVERDUE TASK" : "TASK DUE"}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                isOverdue
                                  ? "bg-red-100 text-red-800 border border-red-200"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {task.priority || "NORMAL"}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs font-bold text-slate-900">{task.title}</p>
                          {task.description && (
                            <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>

            {/* Bottom quick stats */}
            <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
              <span>{selectedDayEvents.meetings.length} meetings scheduled</span>
              <span>{selectedDayEvents.tasks.length} tasks</span>
            </div>
          </div>
        </div>
      ) : (
        /* Agenda / Timeline View */
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Chronological Timeline</h3>
              <p className="text-xs text-slate-500">Upcoming schedule organized chronologically</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {agendaList.length} scheduled items
            </span>
          </div>

          {agendaList.length === 0 ? (
            <div className="py-16 text-center">
              <CalendarDays size={32} className="mx-auto text-slate-300" />
              <p className="mt-3.5 text-sm font-bold text-slate-700">No scheduled activities found</p>
              <p className="mt-1 text-xs text-slate-400">
                Try switching the filter or create a new meeting.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {agendaList.map((entry, idx) => {
                if (entry.type === "meeting") {
                  const m = entry.item as MeetingItem;
                  const withWho = getMeetingWith(m);
                  return (
                    <div
                      key={`agenda-m-${m.id}-${idx}`}
                      onClick={() => setPreviewMeeting(m)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 hover:bg-slate-50 px-3.5 rounded-2xl transition cursor-pointer"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                          <Video size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-900 sm:text-sm">{m.title}</h4>
                            {withWho.type !== "none" && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200/60 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                                <User size={11} className="text-blue-600 shrink-0" />
                                <span>With: {withWho.name}</span>
                                {withWho.detail ? <span className="font-medium text-blue-600">({withWho.detail})</span> : null}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span className="font-bold text-slate-800">{entry.dateString}</span>
                            <span>•</span>
                            <span>
                              {formatTime(m.startsAt)} - {formatEndTime(m.startsAt, m.durationMinutes)}
                            </span>
                            {m.location && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin size={10} />
                                  {m.location}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span
                          className={`rounded px-2.5 py-0.5 text-xs font-bold ${
                            m.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : m.status === "CANCELLED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>
                    </div>
                  );
                } else {
                  const t = entry.item as CalendarTask;
                  const isOverdue = isTaskOverdue(t, todayString);
                  return (
                    <div
                      key={`agenda-t-${t.id}-${idx}`}
                      onClick={() => setPreviewTask(t)}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 px-3.5 rounded-2xl transition cursor-pointer ${
                        isOverdue ? "bg-red-50/50 hover:bg-red-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${
                            isOverdue
                              ? "bg-red-100 text-red-600 ring-red-200"
                              : "bg-amber-50 text-amber-600 ring-amber-100"
                          }`}
                        >
                          {isOverdue ? <AlertTriangle size={18} /> : <CheckSquare size={18} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900 sm:text-sm">{t.title}</h4>
                            {isOverdue && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.2 text-[9px] font-bold text-red-800 border border-red-200">
                                Overdue
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="font-bold text-slate-800">{entry.dateString}</span>
                            <span>•</span>
                            <span
                              className={`uppercase text-[10px] font-bold ${
                                isOverdue ? "text-red-700" : "text-amber-700"
                              }`}
                            >
                              Task Due ({t.priority})
                            </span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`rounded px-2.5 py-0.5 text-xs font-bold self-end sm:self-center ${
                          isOverdue
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isOverdue ? "OVERDUE" : t.status}
                      </span>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. Meeting Details Modal */}
      {previewMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <Video size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{previewMeeting.title}</h3>
                  <p className="text-xs text-slate-500">
                    {previewMeeting.startsAt ? previewMeeting.startsAt.split("T")[0] : ""} •{" "}
                    {formatTime(previewMeeting.startsAt)} -{" "}
                    {formatEndTime(previewMeeting.startsAt, previewMeeting.durationMinutes)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewMeeting(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Prominent Meeting With Banner */}
              {(() => {
                const withWho = getMeetingWith(previewMeeting);
                return (
                  <div className="rounded-xl border border-blue-200/80 bg-blue-50/70 p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                      Meeting With
                    </span>
                    <div className="mt-1.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs">
                          <User size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-900">
                            {withWho.type !== "none" ? withWho.name : "No external contact/lead assigned"}
                          </p>
                          {withWho.detail && (
                            <p className="truncate text-[11px] text-slate-600 font-medium">
                              {withWho.detail}
                            </p>
                          )}
                        </div>
                      </div>
                      {withWho.type !== "none" && (
                        <span className="shrink-0 rounded-md bg-blue-100 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-800 uppercase">
                          {withWho.type}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Status</span>
                  <p className="mt-0.5 text-xs font-bold text-slate-800">{previewMeeting.status}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Organizer</span>
                  <p className="mt-0.5 text-xs font-bold text-slate-800">
                    {previewMeeting.organizer?.name || "Unassigned"}
                  </p>
                </div>
              </div>

              {previewMeeting.location && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Location
                  </span>
                  <p className="mt-0.5 text-xs text-slate-800 flex items-center gap-1.5 break-all">
                    <MapPin size={13} className="shrink-0 text-slate-400" />
                    {previewMeeting.location}
                  </p>
                </div>
              )}

              {previewMeeting.meetingLink && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Meeting Link
                  </span>
                  <a
                    href={previewMeeting.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 text-xs text-blue-600 hover:underline flex items-center gap-1.5 break-all"
                  >
                    <ExternalLink size={13} className="shrink-0" />
                    {previewMeeting.meetingLink}
                  </a>
                </div>
              )}

              {previewMeeting.notes && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Notes</span>
                  <p className="mt-1 text-xs text-slate-700 whitespace-pre-wrap">
                    {previewMeeting.notes}
                  </p>
                </div>
              )}

              {(previewMeeting.lead || previewMeeting.company || previewMeeting.deal) && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Related Records
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                    {previewMeeting.lead && (
                      <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700 font-medium">
                        Lead: {previewMeeting.lead.contactName} ({previewMeeting.lead.companyName})
                      </span>
                    )}
                    {previewMeeting.company && (
                      <span className="rounded-md bg-purple-50 px-2 py-1 text-purple-700 font-medium">
                        Company: {previewMeeting.company.name}
                      </span>
                    )}
                    {previewMeeting.deal && (
                      <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700 font-medium">
                        Deal: {previewMeeting.deal.name}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {previewMeeting.participants && previewMeeting.participants.length > 0 && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Attendees & Participants ({previewMeeting.participants.length})
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {previewMeeting.participants.map((p) => {
                      const label = p.contact?.fullName || p.user?.name || "Participant";
                      const role = p.contact ? "External Contact" : "Internal Team";
                      return (
                        <span
                          key={p.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>{label}</span>
                          <span className="text-[10px] text-slate-400">({role})</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setPreviewMeeting(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewMeeting(null);
                  navigate("/meetings");
                }}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer shadow-xs"
              >
                Manage in Meetings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Task Details Modal */}
      {previewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                  <CheckSquare size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{previewTask.title}</h3>
                  <p className="text-xs text-slate-500">
                    Due: {previewTask.dueAt ? previewTask.dueAt.split("T")[0] : ""}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewTask(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {isTaskOverdue(previewTask, todayString) && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  <AlertTriangle size={16} className="shrink-0 text-red-600" />
                  <span>
                    This task was due on {previewTask.dueAt ? previewTask.dueAt.split("T")[0] : ""} and is currently <strong>overdue</strong>.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Status</span>
                  <p className="mt-0.5 text-xs font-bold text-slate-800">{previewTask.status}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Priority</span>
                  <p className="mt-0.5 text-xs font-bold text-amber-800 uppercase">
                    {previewTask.priority}
                  </p>
                </div>
              </div>

              {previewTask.description && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Description</span>
                  <p className="mt-1 text-xs text-slate-700 whitespace-pre-wrap">
                    {previewTask.description}
                  </p>
                </div>
              )}

              {previewTask.assignedTo && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Assigned To</span>
                  <p className="mt-0.5 text-xs font-bold text-slate-800">
                    {previewTask.assignedTo.name}
                  </p>
                </div>
              )}

              {(previewTask.lead || previewTask.company || previewTask.deal) && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Related Records
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                    {previewTask.lead && (
                      <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700 font-medium">
                        Lead: {previewTask.lead.contactName}
                      </span>
                    )}
                    {previewTask.company && (
                      <span className="rounded-md bg-purple-50 px-2 py-1 text-purple-700 font-medium">
                        Company: {previewTask.company.name}
                      </span>
                    )}
                    {previewTask.deal && (
                      <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700 font-medium">
                        Deal: {previewTask.deal.name}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setPreviewTask(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewTask(null);
                  navigate("/tasks");
                }}
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition cursor-pointer shadow-xs"
              >
                Manage in Tasks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
