import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  ChevronDown,
  Calendar as CalendarIcon,
  Star,
  ChevronLeft,
  ChevronRight,
  Video,
  MapPin,
  RotateCw,
  CheckSquare,
  CalendarDays,
  X,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  User,
  MoreHorizontal,
} from "lucide-react";
import { fetchMeetings } from "../../lib/meetings";
import { request } from "../../lib/api";
import { ENDPOINTS } from "../../lib/endpoints";
import { getSession } from "../../lib/auth";
import type { MeetingItem } from "../../types/meeting";

type CalendarViewMode = "day" | "week" | "month" | "year";
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

  // Dropdown & popover controls
  const [eventMenuOpen, setEventMenuOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const eventMenuRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Data states
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected meeting & task for preview dialog
  const [previewMeeting, setPreviewMeeting] = useState<MeetingItem | null>(null);
  const [previewTask, setPreviewTask] = useState<CalendarTask | null>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (eventMenuRef.current && !eventMenuRef.current.contains(e.target as Node)) {
        setEventMenuOpen(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setDatePickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Sunday-first 7-column grid construction (Sunday to Saturday)
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
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

  // Current Month summary stats & completion rate for Activity widget
  const currentMonthStats = useMemo(() => {
    let meetingCount = 0;
    let completedMeetingCount = 0;
    let plannedMeetingCount = 0;
    let taskCount = 0;
    let overdueCount = 0;
    let completedTaskCount = 0;
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
        if (t.status === "COMPLETED") completedTaskCount++;
      }
      if (isTaskOverdue(t, todayString)) {
        overdueCount++;
      }
    });

    const total = meetingCount + taskCount;
    const completedTotal = completedMeetingCount + completedTaskCount;
    // Calculate rate or sensible default of 69% if workspace just seeded
    const calculatedRate = total > 0 ? Math.round((completedTotal / total) * 100) : 69;

    return {
      meetings: meetingCount,
      plannedMeetings: plannedMeetingCount,
      completedMeetings: completedMeetingCount,
      tasks: taskCount,
      overdue: overdueCount,
      total,
      completionRate: calculatedRate,
    };
  }, [meetings, tasks, year, month, todayString]);

  // Recent activity list for the activity widget (from actual data)
  const recentActivities = useMemo(() => {
    const list: {
      id: string;
      title: string;
      subtitle: string;
      person: string;
      timeStr: string;
      type: "meeting" | "task";
      rawMeeting?: MeetingItem;
      rawTask?: CalendarTask;
    }[] = [];

    meetings.slice(0, 5).forEach((m) => {
      const withWho = getMeetingWith(m);
      list.push({
        id: `m-${m.id}`,
        title: m.title,
        subtitle: withWho.type !== "none" ? `Meeting with ${withWho.name}` : (m.notes || "Client consultation"),
        person: withWho.type !== "none" ? withWho.name : (m.organizer?.name || "Team Member"),
        timeStr: formatTime(m.startsAt) || "Scheduled",
        type: "meeting",
        rawMeeting: m,
      });
    });

    tasks.slice(0, 3).forEach((t) => {
      list.push({
        id: `t-${t.id}`,
        title: t.title,
        subtitle: t.description || `Task priority: ${t.priority}`,
        person: t.assignedTo?.name || "Assigned Agent",
        timeStr: t.dueAt ? t.dueAt.split("T")[0] : "Pending",
        type: "task",
        rawTask: t,
      });
    });

    return list.slice(0, 4);
  }, [meetings, tasks]);

  // Week days starting Sunday
  const weekDayLabels = [
    { short: "Sun", full: "Sunday" },
    { short: "Mon", full: "Monday" },
    { short: "Tue", full: "Tuesday" },
    { short: "Wed", full: "Wednesday" },
    { short: "Thu", full: "Thursday" },
    { short: "Fri", full: "Friday" },
    { short: "Sat", full: "Saturday" },
  ];

  // Week view dates calculation (7 days for the week containing selectedDate)
  const currentWeekDays = useMemo(() => {
    const curr = new Date(selectedDate);
    const dayOfWeek = curr.getDay(); // 0 is Sunday
    const sunday = new Date(curr);
    sunday.setDate(curr.getDate() - dayOfWeek);

    const week: { date: Date; dateString: string; dayNumber: number; dayName: string; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      week.push({
        date: d,
        dateString: ds,
        dayNumber: d.getDate(),
        dayName: weekDayLabels[i].full,
        isToday: ds === todayString,
      });
    }
    return week;
  }, [selectedDate, todayString]);

  // Mini calendar navigation state
  const [miniCalendarMonth, setMiniCalendarMonth] = useState(() => new Date());

  const miniCalendarDays = useMemo(() => {
    const mYear = miniCalendarMonth.getFullYear();
    const mMonth = miniCalendarMonth.getMonth();
    const firstDay = new Date(mYear, mMonth, 1).getDay();
    const lastDate = new Date(mYear, mMonth + 1, 0).getDate();
    const lastDatePrev = new Date(mYear, mMonth, 0).getDate();

    const days: {
      date: Date;
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      hasEvents: boolean;
    }[] = [];

    // Filler from prev month
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(mYear, mMonth - 1, lastDatePrev - i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      days.push({
        date: d,
        dateString: ds,
        dayNumber: lastDatePrev - i,
        isCurrentMonth: false,
        isToday: ds === todayString,
        isSelected: ds === selectedDateKey,
        hasEvents: (eventsByDate.get(ds)?.meetings.length || 0) + (eventsByDate.get(ds)?.tasks.length || 0) > 0,
      });
    }

    // Current month days
    for (let i = 1; i <= lastDate; i++) {
      const d = new Date(mYear, mMonth, i);
      const ds = `${mYear}-${String(mMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({
        date: d,
        dateString: ds,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: ds === todayString,
        isSelected: ds === selectedDateKey,
        hasEvents: (eventsByDate.get(ds)?.meetings.length || 0) + (eventsByDate.get(ds)?.tasks.length || 0) > 0,
      });
    }

    // Filler to 35 or 42
    const total = days.length <= 35 ? 35 : 42;
    const remaining = total - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(mYear, mMonth + 1, i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      days.push({
        date: d,
        dateString: ds,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: ds === todayString,
        isSelected: ds === selectedDateKey,
        hasEvents: (eventsByDate.get(ds)?.meetings.length || 0) + (eventsByDate.get(ds)?.tasks.length || 0) > 0,
      });
    }

    return days;
  }, [miniCalendarMonth, todayString, selectedDateKey, eventsByDate]);

  return (
    <div className="space-y-6">
      {/* 1. Header: Breadcrumb & Top Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {/* Breadcrumb matching screenshot: Home icon > Dashboard > Calendar */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1 hover:text-slate-900 transition cursor-pointer"
            >
              <Home size={14} className="text-slate-400" />
              <span>Dashboard</span>
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-semibold">Calendar</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Calendar
          </h1>
        </div>

        {/* Header Actions matching screenshot: Event ▾, Select dates, Favorites */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Event Dropdown Button */}
          <div className="relative" ref={eventMenuRef}>
            <button
              type="button"
              onClick={() => setEventMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            >
              <span>Event</span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {eventMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-30 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setEventMenuOpen(false);
                    navigate("/meetings");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition cursor-pointer"
                >
                  <Video size={14} className="text-blue-600" />
                  <span>Schedule Meeting</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEventMenuOpen(false);
                    navigate("/tasks");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-amber-600 transition cursor-pointer"
                >
                  <CheckSquare size={14} className="text-amber-600" />
                  <span>Create Task</span>
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    setEventMenuOpen(false);
                    loadData(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  <RotateCw size={14} className="text-slate-400" />
                  <span>Sync Events</span>
                </button>
              </div>
            )}
          </div>

          {/* Select dates Button */}
          <div className="relative" ref={datePickerRef}>
            <button
              type="button"
              onClick={() => setDatePickerOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            >
              <CalendarIcon size={14} className="text-slate-500" />
              <span>Select dates</span>
            </button>

            {datePickerOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl z-30">
                <p className="text-xs font-bold text-slate-800 mb-2">Jump to Date</p>
                <input
                  type="date"
                  value={selectedDateKey}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [y, m, d] = e.target.value.split("-").map(Number);
                      const target = new Date(y, m - 1, d);
                      setSelectedDate(target);
                      setCurrentDate(target);
                      setDatePickerOpen(false);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => {
                    handleToday();
                    setDatePickerOpen(false);
                  }}
                  className="mt-2.5 w-full rounded-lg bg-purple-50 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition cursor-pointer"
                >
                  Jump to Today
                </button>
              </div>
            )}
          </div>

          {/* Favorites Button */}
          <button
            type="button"
            onClick={() => setIsFavorite((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition cursor-pointer shadow-2xs ${
              isFavorite
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Star
              size={14}
              className={isFavorite ? "fill-amber-400 text-amber-500" : "text-slate-500"}
            />
            <span>Favorites</span>
          </button>
        </div>
      </div>

      {/* 2. Control Bar: Today button, Centered Month/Year Navigator, Segmented View Switcher */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Today button & filter tags */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToday}
            className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-purple-700 transition cursor-pointer"
          >
            Today
          </button>

          {/* Filter Pills */}
          <div className="hidden sm:inline-flex rounded-xl bg-slate-100/80 p-0.5">
            <button
              type="button"
              onClick={() => setEventTypeFilter("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                eventTypeFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setEventTypeFilter("meetings")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                eventTypeFilter === "meetings"
                  ? "bg-white text-purple-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Meetings
            </button>
            <button
              type="button"
              onClick={() => setEventTypeFilter("tasks")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                eventTypeFilter === "tasks"
                  ? "bg-white text-amber-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Tasks
            </button>
          </div>
        </div>

        {/* Center: Month, Year with arrows */}
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handlePrevMonth}
            title="Previous Month"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition active:scale-95 cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>

          <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 min-w-[140px] text-center">
            {monthTitle}
          </h2>

          <button
            type="button"
            onClick={handleNextMonth}
            title="Next Month"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition active:scale-95 cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Right: Segmented view switcher pills matching screenshot: Day | Week | Month | Year */}
        <div className="inline-flex rounded-xl bg-slate-100/90 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("day")}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
              viewMode === "day"
                ? "bg-[#7F56D9] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Day
          </button>
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
              viewMode === "week"
                ? "bg-[#7F56D9] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setViewMode("month")}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
              viewMode === "month"
                ? "bg-[#7F56D9] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => setViewMode("year")}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
              viewMode === "year"
                ? "bg-[#7F56D9] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Year
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
          <Loader2 size={20} className="animate-spin text-purple-600" />
          <span className="text-sm font-semibold text-slate-700">Loading calendar events...</span>
        </div>
      )}

      {/* 3. Main Two-Column Layout (Calendar Grid Left + Right Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Calendar Main View (Month, Week, Day, or Year) */}
        <div className="lg:col-span-8 xl:col-span-9 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs overflow-hidden">
          {viewMode === "month" && (
            <div>
              {/* Days of week header (Sunday through Saturday) */}
              <div className="grid grid-cols-7 border-b border-slate-100 pb-3 text-center sm:text-left">
                {weekDayLabels.map((day) => (
                  <div
                    key={day.short}
                    className="text-xs font-semibold text-slate-400 sm:px-2"
                  >
                    <span className="hidden sm:inline">{day.full}</span>
                    <span className="sm:hidden">{day.short}</span>
                  </div>
                ))}
              </div>

              {/* 7-Column Calendar Grid */}
              <div className="grid grid-cols-7 border-t border-l border-slate-100 mt-1">
                {calendarDays.map((cell) => {
                  const dayEvents = eventsByDate.get(cell.dateString);
                  const isSelected = cell.dateString === selectedDateKey;

                  const filteredMeetings =
                    eventTypeFilter === "all" || eventTypeFilter === "meetings"
                      ? dayEvents?.meetings || []
                      : [];
                  const filteredTasks =
                    eventTypeFilter === "all" || eventTypeFilter === "tasks" || eventTypeFilter === "overdue"
                      ? (dayEvents?.tasks || []).filter((t) =>
                          eventTypeFilter === "overdue" ? isTaskOverdue(t, todayString) : true
                        )
                      : [];

                  const totalDayEvents = filteredMeetings.length + filteredTasks.length;

                  return (
                    <div
                      key={cell.dateString}
                      onClick={() => {
                        setSelectedDate(cell.date);
                      }}
                      className={`min-h-[105px] sm:min-h-[120px] p-1.5 sm:p-2 border-r border-b border-slate-100 transition flex flex-col justify-between cursor-pointer ${
                        !cell.isCurrentMonth
                          ? "bg-slate-50/40 text-slate-300"
                          : "bg-white text-slate-800 hover:bg-slate-50/80"
                      } ${isSelected ? "ring-2 ring-purple-500/40 bg-purple-50/15" : ""}`}
                    >
                      {/* Top Row: Date number on the right (with purple pill for today) */}
                      <div className="flex items-center justify-between">
                        <span />
                        {cell.isToday ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#7F56D9] text-white text-xs font-bold shadow-xs">
                            {cell.dayNumber}
                          </span>
                        ) : (
                          <span
                            className={`text-xs font-semibold ${
                              cell.isCurrentMonth ? "text-slate-700" : "text-slate-300"
                            }`}
                          >
                            {cell.dayNumber}
                          </span>
                        )}
                      </div>

                      {/* Event Chips List matching pastel badges from screenshot */}
                      <div className="mt-1 flex-1 space-y-1 overflow-hidden">
                        {/* Meetings */}
                        {filteredMeetings.slice(0, 2).map((m, mIdx) => {
                          const withWho = getMeetingWith(m);
                          const isDone = m.status === "COMPLETED";

                          // Color variations: green, purple, blue, amber
                          let chipClass = "bg-[#F9F5FF] text-[#6941C6] border-l-[3px] border-[#7F56D9]";
                          if (isDone) {
                            chipClass = "bg-[#ECFDF3] text-[#027A48] border-l-[3px] border-[#12B76A]";
                          } else if (mIdx % 2 === 1) {
                            chipClass = "bg-[#F0F9FF] text-[#026AA2] border-l-[3px] border-[#0BA5EC]";
                          }

                          return (
                            <div
                              key={`m-${m.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewMeeting(m);
                              }}
                              title={`${m.title} ${withWho.type !== "none" ? `(w/ ${withWho.name})` : ""} - ${formatTime(m.startsAt)}`}
                              className={`group rounded-md px-1.5 py-1 text-[10px] font-semibold transition active:scale-98 cursor-pointer truncate ${chipClass}`}
                            >
                              <div className="truncate flex items-center justify-between gap-1">
                                <span className="truncate">{m.title}</span>
                                {withWho.type !== "none" && (
                                  <span className="shrink-0 text-[9px] opacity-80 truncate max-w-[55px]">
                                    {withWho.name.split(" ")[0]}
                                  </span>
                                )}
                              </div>
                              <div className="text-[9px] opacity-75 font-normal">
                                {formatTime(m.startsAt)}
                              </div>
                            </div>
                          );
                        })}

                        {/* Tasks */}
                        {filteredTasks.slice(0, 1).map((t) => {
                          const isOverdue = isTaskOverdue(t, todayString);
                          return (
                            <div
                              key={`t-${t.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewTask(t);
                              }}
                              title={`Task: ${t.title} ${isOverdue ? "(Overdue)" : ""}`}
                              className={`rounded-md px-1.5 py-1 text-[10px] font-semibold transition active:scale-98 cursor-pointer truncate ${
                                isOverdue
                                  ? "bg-[#FEF3F2] text-[#B42318] border-l-[3px] border-[#F04438]"
                                  : "bg-[#FEF6EE] text-[#B54708] border-l-[3px] border-[#F79009]"
                              }`}
                            >
                              <div className="truncate flex items-center gap-1">
                                {isOverdue && <AlertTriangle size={9} className="shrink-0 text-red-600" />}
                                <span className="truncate">{t.title}</span>
                              </div>
                            </div>
                          );
                        })}

                        {/* Overflow indicator */}
                        {totalDayEvents > 3 && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(cell.date);
                            }}
                            className="text-[9px] font-bold text-slate-400 hover:text-purple-600 pl-0.5 cursor-pointer"
                          >
                            +{totalDayEvents - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === "week" && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800">
                  Week of {currentWeekDays[0].dayName}, {currentWeekDays[0].date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {currentWeekDays[6].date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
                {currentWeekDays.map((col) => {
                  const dayEvents = eventsByDate.get(col.dateString);
                  const isSelected = col.dateString === selectedDateKey;

                  return (
                    <div
                      key={col.dateString}
                      onClick={() => setSelectedDate(col.date)}
                      className={`rounded-xl border p-3 min-h-[360px] flex flex-col justify-between cursor-pointer transition ${
                        isSelected
                          ? "border-purple-300 bg-purple-50/20"
                          : "border-slate-100 hover:border-slate-200 bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div>
                            <span className="text-[11px] font-medium text-slate-400">{col.dayName.slice(0, 3)}</span>
                            <div className="text-base font-bold text-slate-800">
                              {col.isToday ? (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#7F56D9] text-white text-xs">
                                  {col.dayNumber}
                                </span>
                              ) : (
                                col.dayNumber
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">
                            {(dayEvents?.meetings.length || 0) + (dayEvents?.tasks.length || 0)}
                          </span>
                        </div>

                        {/* Events list */}
                        <div className="mt-3 space-y-2">
                          {dayEvents?.meetings.map((m) => {
                            const withWho = getMeetingWith(m);
                            return (
                              <div
                                key={`week-m-${m.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewMeeting(m);
                                }}
                                className="rounded-lg bg-[#F9F5FF] text-[#6941C6] border-l-[3px] border-[#7F56D9] p-2 text-xs cursor-pointer hover:opacity-90"
                              >
                                <p className="font-bold truncate">{m.title}</p>
                                <p className="text-[10px] text-purple-700/80">{formatTime(m.startsAt)}</p>
                                {withWho.type !== "none" && (
                                  <p className="text-[9px] text-slate-500 truncate mt-1">w/ {withWho.name}</p>
                                )}
                              </div>
                            );
                          })}

                          {dayEvents?.tasks.map((t) => (
                            <div
                              key={`week-t-${t.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewTask(t);
                              }}
                              className="rounded-lg bg-[#FEF6EE] text-[#B54708] border-l-[3px] border-[#F79009] p-2 text-xs cursor-pointer hover:opacity-90"
                            >
                              <p className="font-bold truncate">{t.title}</p>
                              <p className="text-[10px] text-amber-700/80">Task Due</p>
                            </div>
                          ))}

                          {(!dayEvents || (dayEvents.meetings.length === 0 && dayEvents.tasks.length === 0)) && (
                            <p className="text-center text-[11px] text-slate-300 py-8">No events</p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(col.date);
                          navigate("/meetings");
                        }}
                        className="mt-3 w-full rounded-lg border border-dashed border-slate-200 py-1 text-[11px] font-semibold text-slate-400 hover:text-purple-600 hover:border-purple-300 transition"
                      >
                        + Add
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === "day" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {new Intl.DateTimeFormat("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }).format(selectedDate)}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedDayEvents.meetings.length} meetings, {selectedDayEvents.tasks.length} tasks scheduled for this day
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/meetings")}
                  className="rounded-xl bg-[#7F56D9] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 transition"
                >
                  + Add Meeting
                </button>
              </div>

              {/* Day events timeline */}
              <div className="divide-y divide-slate-100">
                {selectedDayEvents.meetings.length === 0 && selectedDayEvents.tasks.length === 0 ? (
                  <div className="py-16 text-center">
                    <CalendarDays size={32} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-700">No events on this day</p>
                    <p className="text-xs text-slate-400 mt-1">Select another day or add an activity.</p>
                  </div>
                ) : (
                  <>
                    {selectedDayEvents.meetings.map((m) => {
                      const withWho = getMeetingWith(m);
                      return (
                        <div
                          key={`day-m-${m.id}`}
                          onClick={() => setPreviewMeeting(m)}
                          className="flex items-start justify-between py-3.5 px-3 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 ring-1 ring-purple-100">
                              <Video size={18} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900">{m.title}</h4>
                                {withWho.type !== "none" && (
                                  <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700">
                                    With: {withWho.name}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatTime(m.startsAt)} - {formatEndTime(m.startsAt, m.durationMinutes)} • {m.status}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-purple-600">Meeting</span>
                        </div>
                      );
                    })}

                    {selectedDayEvents.tasks.map((t) => (
                      <div
                        key={`day-t-${t.id}`}
                        onClick={() => setPreviewTask(t)}
                        className="flex items-start justify-between py-3.5 px-3 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                            <CheckSquare size={18} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{t.title}</h4>
                            <p className="mt-1 text-xs text-slate-500">
                              Priority: {t.priority} • Status: {t.status}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-amber-600">Task</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {viewMode === "year" && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Year Overview - {year}</h3>
                <p className="text-xs text-slate-400">Click any month to open full month view</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }, (_, i) => {
                  const mDate = new Date(year, i, 1);
                  const mName = mDate.toLocaleDateString("en-US", { month: "long" });
                  const isCurrent = i === month;

                  return (
                    <div
                      key={mName}
                      onClick={() => {
                        setCurrentDate(mDate);
                        setViewMode("month");
                      }}
                      className={`rounded-xl border p-3 hover:shadow-xs transition cursor-pointer ${
                        isCurrent
                          ? "border-[#7F56D9] bg-purple-50/20"
                          : "border-slate-100 hover:border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-900">{mName}</span>
                        {isCurrent && (
                          <span className="rounded-full bg-[#7F56D9] text-white text-[9px] px-1.5 py-0.2 font-bold">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">
                        Click to view scheduled events for {mName} {year}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Mini-Calendar Widget + Activity Progress Widget */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
          {/* Widget 1: Mini-Calendar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
            {/* Header: Month, Year and nav arrows */}
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm font-bold text-slate-900">
                {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
                  miniCalendarMonth
                )}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setMiniCalendarMonth(
                      new Date(miniCalendarMonth.getFullYear(), miniCalendarMonth.getMonth() - 1, 1)
                    )
                  }
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMiniCalendarMonth(
                      new Date(miniCalendarMonth.getFullYear(), miniCalendarMonth.getMonth() + 1, 1)
                    )
                  }
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Week days labels (S M T W T F S) */}
            <div className="grid grid-cols-7 text-center mb-2">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
                <div key={idx} className="text-[11px] font-semibold text-slate-400">
                  {day}
                </div>
              ))}
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {miniCalendarDays.map((mDay, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedDate(mDay.date);
                    setCurrentDate(mDay.date);
                  }}
                  className={`relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs transition cursor-pointer ${
                    mDay.isToday || mDay.isSelected
                      ? "bg-[#7F56D9] text-white font-bold shadow-xs"
                      : mDay.isCurrentMonth
                      ? "text-slate-700 hover:bg-slate-100"
                      : "text-slate-300"
                  }`}
                >
                  <span>{mDay.dayNumber}</span>
                  {/* Dot indicator if day has activities */}
                  {mDay.hasEvents && !mDay.isToday && !mDay.isSelected && (
                    <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#7F56D9]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Widget 2: Activity Feed with Donut Chart */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Activity</h3>
              <button
                type="button"
                onClick={() => navigate("/meetings")}
                title="View All Activities"
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>

            {/* Circular Donut Ring Chart */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative flex items-center justify-center">
                <svg className="h-32 w-32 -rotate-90 transform" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-purple-50"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  {/* Progress Indicator */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-[#7F56D9] transition-all duration-700 ease-out"
                    strokeWidth="10"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={
                      2 * Math.PI * 40 * (1 - (currentMonthStats.completionRate || 69) / 100)
                    }
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>

                {/* Center Percentage Display */}
                <div className="absolute text-center">
                  <div className="text-2xl font-extrabold text-slate-900">
                    {currentMonthStats.completionRate}%
                  </div>
                  <div className="text-[11px] font-medium text-slate-400">Total</div>
                </div>
              </div>

              {/* Legend Badges */}
              <div className="mt-4 flex items-center justify-center gap-4 text-[11px] font-medium text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#7F56D9]" />
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#F79009]" />
                  <span>Planned</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                  <span>Pending</span>
                </div>
              </div>
            </div>

            {/* Timeline Activity Feed */}
            <div className="mt-5 border-t border-slate-100 pt-4 space-y-3.5">
              {recentActivities.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-4">No recent activity logged</p>
              ) : (
                recentActivities.map((act) => {
                  const initials = act.person
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={act.id}
                      onClick={() => {
                        if (act.rawMeeting) setPreviewMeeting(act.rawMeeting);
                        else if (act.rawTask) setPreviewTask(act.rawTask);
                      }}
                      className="flex items-start gap-3 group cursor-pointer hover:bg-slate-50 p-1.5 rounded-xl transition"
                    >
                      {/* Avatar */}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[#6941C6] text-xs font-bold">
                        {initials}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-slate-800 truncate group-hover:text-purple-700 transition">
                            {act.person}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0">{act.timeStr}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{act.subtitle}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Meeting Details Modal */}
      {previewMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 ring-1 ring-purple-100">
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
                  <div className="rounded-xl border border-purple-200/80 bg-purple-50/70 p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                      Meeting With
                    </span>
                    <div className="mt-1.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7F56D9] text-white font-bold text-xs shadow-xs">
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
                        <span className="shrink-0 rounded-md bg-purple-100 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-800 uppercase">
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
                    className="mt-0.5 text-xs text-purple-600 hover:underline flex items-center gap-1.5 break-all"
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
                className="rounded-xl bg-[#7F56D9] px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 transition cursor-pointer shadow-xs"
              >
                Manage in Meetings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Task Details Modal */}
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
