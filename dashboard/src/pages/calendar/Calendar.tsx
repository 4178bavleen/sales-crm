import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon,
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
  Loader2,
  ExternalLink,
} from "lucide-react";
import { fetchMeetings } from "../../lib/meetings";
import { request } from "../../lib/api";
import { ENDPOINTS } from "../../lib/endpoints";
import type { MeetingItem } from "../../types/meeting";

type CalendarViewMode = "month" | "agenda";
type FilterEventType = "all" | "meetings" | "tasks";

interface CalendarTask {
  id: number;
  title: string;
  dueDate: string | null;
  priority: string;
  status: string;
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

  // Selected meeting for preview dialog
  const [previewMeeting, setPreviewMeeting] = useState<MeetingItem | null>(null);

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [meetingsRes, tasksRes] = await Promise.allSettled([
        fetchMeetings({ limit: 100 }),
        request<{ data: CalendarTask[] }>(ENDPOINTS.tasks.list + "?limit=100"),
      ]);

      if (meetingsRes.status === "fulfilled") {
        setMeetings(meetingsRes.value.meetings || []);
      } else {
        console.warn("Could not load meetings:", meetingsRes.reason);
      }

      if (tasksRes.status === "fulfilled") {
        const tData = (tasksRes.value as any)?.data || tasksRes.value || [];
        setTasks(Array.isArray(tData) ? tData : []);
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

  // Days grid construction
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
    const lastDayCurrentMonth = new Date(year, month + 1, 0).getDate();
    const lastDayPrevMonth = new Date(year, month, 0).getDate();

    const days: {
      date: Date;
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(today.getDate()).padStart(2, "0")}`;

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, lastDayPrevMonth - i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      days.push({
        date: d,
        dateString: ds,
        dayNumber: lastDayPrevMonth - i,
        isCurrentMonth: false,
        isToday: ds === todayString,
      });
    }

    // Current month days
    for (let i = 1; i <= lastDayCurrentMonth; i++) {
      const d = new Date(year, month, i);
      const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({
        date: d,
        dateString: ds,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: ds === todayString,
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
      days.push({
        date: d,
        dateString: ds,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: ds === todayString,
      });
    }

    return days;
  }, [year, month]);

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
      if (!t.dueDate) return;
      const key = t.dueDate.split("T")[0];
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
    let taskCount = 0;
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

    meetings.forEach((m) => {
      if (m.startsAt && m.startsAt.startsWith(monthPrefix)) {
        meetingCount++;
      }
    });

    tasks.forEach((t) => {
      if (t.dueDate && t.dueDate.startsWith(monthPrefix)) {
        taskCount++;
      }
    });

    return {
      meetings: meetingCount,
      tasks: taskCount,
      total: meetingCount + taskCount,
    };
  }, [meetings, tasks, year, month]);

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
        if (t.dueDate) {
          list.push({
            type: "task",
            dateString: t.dueDate.split("T")[0],
            item: t,
          });
        }
      });
    }

    return list.sort((a, b) => a.dateString.localeCompare(b.dateString));
  }, [meetings, tasks, eventTypeFilter]);

  const weekDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
            <CalendarIcon size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Sales & Activity Calendar
              </h1>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                {currentMonthStats.total} Events
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Track appointments, client meetings, and critical task deadlines in one schedule.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <RotateCw size={14} className={refreshing ? "animate-spin text-blue-600" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/meetings")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <CalendarDays size={14} className="text-blue-600" />
            <span>Meetings List</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/meetings")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Schedule Meeting</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !refreshing && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-12 text-slate-500 shadow-sm">
          <Loader2 size={18} className="animate-spin text-blue-600" />
          <span className="text-xs font-semibold">Loading calendar events...</span>
        </div>
      )}

      {/* Calendar Controls & Month Switcher Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Month Navigator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous Month"
              className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-l-xl transition cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="border-x border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Month"
              className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-r-xl transition cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <h2 className="text-lg font-bold text-slate-900">{monthTitle}</h2>
        </div>

        {/* Filters and View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Event Type Filter */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setEventTypeFilter("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                eventTypeFilter === "all"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({currentMonthStats.total})
            </button>
            <button
              type="button"
              onClick={() => setEventTypeFilter("meetings")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                eventTypeFilter === "meetings"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Meetings ({currentMonthStats.meetings})
            </button>
            <button
              type="button"
              onClick={() => setEventTypeFilter("tasks")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                eventTypeFilter === "tasks"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tasks ({currentMonthStats.tasks})
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                viewMode === "month"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode("agenda")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                viewMode === "agenda"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Agenda
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar View Area */}
      {viewMode === "month" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Month Calendar Grid (3 cols on lg) */}
          <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm overflow-hidden">
            {/* Legend & Month status */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-2 text-xs">
              <span className="font-semibold text-slate-700">Date Box Color Guide</span>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-100 border border-emerald-300" />
                  Completed Meeting
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-blue-800">
                  <span className="h-2.5 w-2.5 rounded-sm bg-blue-100 border border-blue-300" />
                  Planned Meeting
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-amber-800">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-100 border border-amber-300" />
                  Task Due
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-rose-800">
                  <span className="h-2.5 w-2.5 rounded-sm bg-rose-100 border border-rose-300" />
                  Cancelled / Rescheduled
                </span>
              </div>
            </div>

            {/* Days of week */}
            <div className="grid grid-cols-7 border-b border-slate-200 pb-2 text-center">
              {weekDayLabels.map((day) => (
                <div key={day} className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 gap-px bg-slate-200 pt-px mt-2 rounded-xl overflow-hidden">
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
                const hasTaskEvents = (dayEvents?.tasks || []).length > 0;

                // Determine box background color, border, and active selection ring
                let boxBgStyle = "bg-white text-slate-800 hover:bg-slate-50";
                let selectionRing = isSelected ? "ring-2 ring-blue-500 ring-inset bg-blue-50/20" : "";
                let datePillStyle = cell.isCurrentMonth ? "text-slate-800" : "text-slate-400";

                if (!cell.isCurrentMonth) {
                  // Muted adjacent month days
                  if (hasCompletedMeeting && hasPlannedMeeting) {
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
                    boxBgStyle = "bg-slate-50/70 text-slate-400 hover:bg-slate-100/50";
                  }
                } else {
                  // Current month days
                  if (hasCompletedMeeting && hasPlannedMeeting) {
                    // Both completed & planned meetings on the same day
                    boxBgStyle =
                      "bg-gradient-to-br from-emerald-50/90 via-teal-50/70 to-blue-50/90 text-slate-900 hover:from-emerald-100/90 hover:to-blue-100/90 border border-teal-200/70 shadow-xs";
                    datePillStyle = "bg-teal-100 text-teal-900 font-bold";
                    if (isSelected) selectionRing = "ring-2 ring-teal-500 ring-inset bg-teal-100/60";
                  } else if (hasCompletedMeeting) {
                    // Completed meeting box: Light Green
                    boxBgStyle =
                      "bg-emerald-50/85 text-slate-900 hover:bg-emerald-100/75 border border-emerald-200/70 shadow-xs";
                    datePillStyle = "bg-emerald-100 text-emerald-900 font-bold";
                    if (isSelected) selectionRing = "ring-2 ring-emerald-500 ring-inset bg-emerald-100/60";
                  } else if (hasPlannedMeeting) {
                    // Planned meeting box: Light Blue
                    boxBgStyle =
                      "bg-blue-50/85 text-slate-900 hover:bg-blue-100/75 border border-blue-200/70 shadow-xs";
                    datePillStyle = "bg-blue-100 text-blue-900 font-bold";
                    if (isSelected) selectionRing = "ring-2 ring-blue-500 ring-inset bg-blue-100/60";
                  } else if (hasCancelledMeeting || hasRescheduledMeeting) {
                    // Cancelled / Rescheduled meeting box: Light Rose
                    boxBgStyle =
                      "bg-rose-50/80 text-slate-900 hover:bg-rose-100/70 border border-rose-200/70 shadow-xs";
                    datePillStyle = "bg-rose-100 text-rose-900 font-bold";
                    if (isSelected) selectionRing = "ring-2 ring-rose-400 ring-inset bg-rose-100/50";
                  } else if (hasTaskEvents) {
                    // Task Due box: Light Amber / Warm Yellow
                    boxBgStyle =
                      "bg-amber-50/85 text-slate-900 hover:bg-amber-100/75 border border-amber-200/70 shadow-xs";
                    datePillStyle = "bg-amber-100 text-amber-900 font-bold";
                    if (isSelected) selectionRing = "ring-2 ring-amber-500 ring-inset bg-amber-100/60";
                  } else {
                    // Regular empty day
                    boxBgStyle = "bg-white text-slate-800 hover:bg-slate-50";
                    if (isSelected) selectionRing = "ring-2 ring-blue-500 ring-inset bg-blue-50/20";
                  }
                }

                if (cell.isToday) {
                  datePillStyle = "bg-blue-600 text-white font-bold shadow-sm";
                }

                return (
                  <div
                    key={cell.dateString}
                    onClick={() => setSelectedDate(cell.date)}
                    className={`min-h-[96px] sm:min-h-[112px] p-1.5 transition flex flex-col justify-between cursor-pointer ${boxBgStyle} ${selectionRing}`}
                  >
                    {/* Top Row: Date Number & Badges */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${datePillStyle}`}
                        >
                          {cell.dayNumber}
                        </span>

                        {/* Status Badges on the date box */}
                        {hasCompletedMeeting && hasPlannedMeeting && (
                          <span
                            title="Completed and planned meetings on this date"
                            className="inline-flex items-center gap-0.5 rounded-full bg-white/90 px-1 py-0.5 text-[9px] font-bold text-teal-800 border border-teal-200 shadow-2xs"
                          >
                            <CheckCircle2 size={8} className="text-emerald-600 shrink-0" />
                            <Video size={8} className="text-blue-600 shrink-0" />
                          </span>
                        )}

                        {hasCompletedMeeting && !hasPlannedMeeting && (
                          <span
                            title="Completed meeting on this date"
                            className="inline-flex items-center gap-0.5 rounded-full bg-white/90 px-1 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-200 shadow-2xs"
                          >
                            <CheckCircle2 size={8} className="text-emerald-700 shrink-0" />
                            Done
                          </span>
                        )}

                        {hasPlannedMeeting && !hasCompletedMeeting && (
                          <span
                            title="Planned meeting on this date"
                            className="inline-flex items-center gap-0.5 rounded-full bg-white/90 px-1 py-0.5 text-[9px] font-bold text-blue-800 border border-blue-200 shadow-2xs"
                          >
                            <Video size={8} className="text-blue-600 shrink-0" />
                            Plan
                          </span>
                        )}

                        {!hasCompletedMeeting &&
                          !hasPlannedMeeting &&
                          (hasCancelledMeeting || hasRescheduledMeeting) && (
                            <span
                              title="Cancelled / Rescheduled on this date"
                              className="inline-flex items-center gap-0.5 rounded-full bg-white/90 px-1 py-0.5 text-[9px] font-bold text-rose-800 border border-rose-200 shadow-2xs"
                            >
                              <AlertCircle size={8} className="text-rose-600 shrink-0" />
                            </span>
                          )}

                        {!hasMeetings && hasTaskEvents && (
                          <span
                            title="Task due on this date"
                            className="inline-flex items-center gap-0.5 rounded-full bg-white/90 px-1 py-0.5 text-[9px] font-bold text-amber-800 border border-amber-200 shadow-2xs"
                          >
                            <CheckSquare size={8} className="text-amber-700 shrink-0" />
                            Task
                          </span>
                        )}
                      </div>

                      {/* Small total badge */}
                      {(hasMeetings || hasTasks) && (
                        <span className="text-[10px] font-bold text-slate-500">
                          {eventTypeFilter === "all"
                            ? (dayEvents?.meetings.length || 0) + (dayEvents?.tasks.length || 0)
                            : eventTypeFilter === "meetings"
                            ? dayEvents?.meetings.length || 0
                            : dayEvents?.tasks.length || 0}
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
                            "bg-blue-100/90 text-blue-800 hover:bg-blue-200 border border-blue-300/80";
                          let dotColor = "bg-blue-600";

                          if (isDone) {
                            chipColor =
                              "bg-emerald-100/90 text-emerald-800 hover:bg-emerald-200 border border-emerald-300/80 font-semibold";
                            dotColor = "bg-emerald-600";
                          } else if (isCancelled) {
                            chipColor =
                              "bg-rose-100/90 text-rose-800 hover:bg-rose-200 border border-rose-300/80";
                            dotColor = "bg-rose-600";
                          } else if (isRescheduled) {
                            chipColor =
                              "bg-purple-100/90 text-purple-800 hover:bg-purple-200 border border-purple-300/80";
                            dotColor = "bg-purple-600";
                          }

                          return (
                            <div
                              key={`m-${m.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewMeeting(m);
                              }}
                              title={`${formatTime(m.startsAt)} ${m.title} (${m.status})`}
                              className={`group flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[10px] font-medium transition ${chipColor}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor}`} />
                              <span className="truncate">{m.title}</span>
                            </div>
                          );
                        })}

                      {/* Tasks */}
                      {(eventTypeFilter === "all" || eventTypeFilter === "tasks") &&
                        dayEvents?.tasks.slice(0, 1).map((t) => (
                          <div
                            key={`t-${t.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/tasks");
                            }}
                            title={`Task: ${t.title}`}
                            className="flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-100/90 text-amber-900 hover:bg-amber-200 border border-amber-300/80 transition"
                          >
                            <CheckSquare size={10} className="shrink-0 text-amber-700" />
                            <span className="truncate">{t.title}</span>
                          </div>
                        ))}

                      {/* More items overflow */}
                      {dayEvents &&
                        (dayEvents.meetings.length + dayEvents.tasks.length > 2) && (
                          <div className="text-[9px] font-medium text-slate-400 pl-1">
                            +{dayEvents.meetings.length + dayEvents.tasks.length - 2} more
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day Agenda Panel (Right Column) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  Day Schedule
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
                title="Schedule Meeting"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition cursor-pointer"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* List of items on this date */}
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px]">
              {selectedDayEvents.meetings.length === 0 && selectedDayEvents.tasks.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                    <CalendarDays size={22} />
                  </div>
                  <p className="mt-3 text-xs font-semibold text-slate-700">No events on this day</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Use the button above to schedule a new meeting.
                  </p>
                </div>
              ) : (
                <>
                  {/* Meetings on selected day */}
                  {selectedDayEvents.meetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      onClick={() => setPreviewMeeting(meeting)}
                      className="group rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm hover:border-blue-300 hover:shadow-md transition cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          <Video size={10} />
                          {formatTime(meeting.startsAt)} ({meeting.durationMinutes}m)
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            meeting.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700"
                              : meeting.status === "CANCELLED"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-blue-50 text-blue-700"
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

                      {(meeting.lead || meeting.company || meeting.deal) && (
                        <div className="mt-2 flex items-center gap-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                          <Users size={11} className="text-slate-400" />
                          <span className="truncate">
                            {meeting.lead
                              ? `${meeting.lead.contactName} (${meeting.lead.companyName || "Lead"})`
                              : meeting.company?.name || meeting.deal?.name}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Tasks on selected day */}
                  {selectedDayEvents.tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => navigate("/tasks")}
                      className="rounded-xl border border-amber-200/80 bg-amber-50/30 p-3 shadow-sm hover:border-amber-300 transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
                          <CheckSquare size={12} className="text-amber-600" />
                          Task Due
                        </span>
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 uppercase">
                          {task.priority || "NORMAL"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs font-semibold text-slate-800">{task.title}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Agenda View */
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-900">Agenda & Timeline</h3>
            <p className="text-xs text-slate-500">Upcoming schedule sorted chronologically</p>
          </div>

          {agendaList.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarDays size={28} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">No scheduled activities</p>
              <p className="mt-1 text-xs text-slate-400">
                Create meetings or set task due dates to see them here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {agendaList.map((entry, idx) => {
                if (entry.type === "meeting") {
                  const m = entry.item as MeetingItem;
                  return (
                    <div
                      key={`agenda-m-${m.id}-${idx}`}
                      onClick={() => setPreviewMeeting(m)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 hover:bg-slate-50 px-3 rounded-xl transition cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <Video size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{m.title}</h4>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-700">{entry.dateString}</span>
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
                          className={`rounded px-2 py-0.5 text-xs font-semibold ${
                            m.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700"
                              : m.status === "CANCELLED"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>
                    </div>
                  );
                } else {
                  const t = entry.item as CalendarTask;
                  return (
                    <div
                      key={`agenda-t-${t.id}-${idx}`}
                      onClick={() => navigate("/tasks")}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 hover:bg-slate-50 px-3 rounded-xl transition cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                          <CheckSquare size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{t.title}</h4>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-700">{entry.dateString}</span>
                            <span>•</span>
                            <span className="uppercase text-[10px] font-bold text-amber-700">
                              Task Due ({t.priority})
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 self-end sm:self-center">
                        {t.status}
                      </span>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>
      )}

      {/* Meeting Details Modal */}
      {previewMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
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
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer"
              >
                Manage in Meetings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
