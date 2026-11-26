import { useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Loader2,
  Printer,
  Save,
} from "lucide-react";
import AttendanceReport from "./AttendanceReport";
import {
  type AttendanceEmployeeOption,
  type AttendanceRecord,
  type AttendanceStatus,
  type RegisterEntry,
} from "../../types/attendance";
import {
  attendanceStatusLabel,
  fetchAttendance,
  fetchAttendanceOptions,
  formatAttendanceTime,
  saveBulkAttendance,
  todayInputValue,
} from "../../lib/attendance";

const STATUS_BUTTONS = [
  {
    status: "PRESENT" as const,
    letter: "P",
    label: "Present",
    selected: "border-emerald-600 bg-emerald-600 text-white shadow-emerald-500/25",
  },
  {
    status: "ABSENT" as const,
    letter: "A",
    label: "Absent",
    selected: "border-rose-600 bg-rose-600 text-white shadow-rose-500/25",
  },
  {
    status: "LATE" as const,
    letter: "L",
    label: "Late",
    selected: "border-amber-600 bg-amber-600 text-white shadow-amber-500/25",
  },
  {
    status: "HALF_DAY" as const,
    letter: "HD",
    label: "Half Day",
    selected: "border-orange-600 bg-orange-600 text-white shadow-orange-500/25",
  },
  {
    status: "LEAVE" as const,
    letter: "LV",
    label: "Leave",
    selected: "border-indigo-600 bg-indigo-600 text-white shadow-indigo-500/25",
  },
];

function inputTime(value: string | null): string {
  const formatted = formatAttendanceTime(value);
  return formatted === "-" ? "" : formatted;
}

function formatRole(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildEntries(
  employees: AttendanceEmployeeOption[],
  records: AttendanceRecord[],
): Record<number, RegisterEntry> {
  const byEmployee = new Map(records.map((record) => [record.userId, record]));
  const entries: Record<number, RegisterEntry> = {};

  for (const employee of employees) {
    const record = byEmployee.get(employee.id);
    entries[employee.id] = {
      userId: employee.id,
      status: record?.status ?? "",
      checkIn: inputTime(record?.checkIn ?? null),
      checkOut: inputTime(record?.checkOut ?? null),
      notes: record?.notes ?? "",
      recordId: record?.id,
    };
  }

  return entries;
}

async function fetchRegisterData(selectedDate: string) {
  const [options, attendance] = await Promise.all([
    fetchAttendanceOptions(),
    fetchAttendance({ date: selectedDate, limit: 100 }),
  ]);
  return { employees: options.employees, records: attendance.records };
}

export default function Attendance() {
  const [activeTab, setActiveTab] = useState<"register" | "report">("register");
  const [date, setDate] = useState(todayInputValue());
  const [employees, setEmployees] = useState<AttendanceEmployeeOption[]>([]);
  const [entries, setEntries] = useState<Record<number, RegisterEntry>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetchRegisterData(date)
      .then(({ employees: loadedEmployees, records }) => {
        if (!active) return;
        setEmployees(loadedEmployees);
        setEntries(buildEntries(loadedEmployees, records));
        setDirty(false);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to load the register");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [date]);

  function changeDate(value: string) {
    if (!value || value === date) return;
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    setDate(value);
  }

  function shiftDate(days: number) {
    const value = new Date(`${date}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + days);
    changeDate(value.toISOString().slice(0, 10));
  }

  function updateEntry(userId: number, patch: Partial<RegisterEntry>) {
    setEntries((previous) => ({
      ...previous,
      [userId]: { ...previous[userId], ...patch },
    }));
    setDirty(true);
    setSuccessMessage("");
  }

  function toggleStatus(userId: number, status: AttendanceStatus) {
    const current = entries[userId]?.status;
    updateEntry(userId, { status: current === status ? "" : status });
  }

  function markAllPresent() {
    setEntries((previous) =>
      Object.fromEntries(
        Object.entries(previous).map(([userId, entry]) => [
          userId,
          { ...entry, status: "PRESENT" as const },
        ]),
      ),
    );
    setDirty(true);
    setSuccessMessage("");
  }

  function clearRegister() {
    setEntries((previous) =>
      Object.fromEntries(
        Object.entries(previous).map(([userId, entry]) => [userId, { ...entry, status: "" }]),
      ),
    );
    setDirty(true);
    setSuccessMessage("");
  }

  async function handleSave() {
    const values = Object.values(entries);
    const marked = values.filter(
      (entry): entry is RegisterEntry & { status: AttendanceStatus } => Boolean(entry.status),
    );
    const clearUserIds = values
      .filter((entry) => !entry.status && entry.recordId)
      .map((entry) => entry.userId);

    if (!marked.length && !clearUserIds.length) {
      setSuccessMessage("Nothing to save yet. Mark at least one employee.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const result = await saveBulkAttendance({
        date,
        records: marked.map((entry) => ({
          userId: entry.userId,
          status: entry.status,
          checkIn: entry.checkIn || null,
          checkOut: entry.checkOut || null,
          notes: entry.notes.trim() || null,
        })),
        clearUserIds,
      });

      const refreshed = await fetchRegisterData(date);
      setEmployees(refreshed.employees);
      setEntries(buildEntries(refreshed.employees, refreshed.records));
      setDirty(false);
      setSuccessMessage(
        `Register saved: ${result.count} marked${result.cleared ? `, ${result.cleared} cleared` : ""}.`,
      );
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save the register");
    } finally {
      setSaving(false);
    }
  }

  const entryValues = Object.values(entries);
  const counts = {
    total: employees.length,
    present: entryValues.filter((entry) => entry.status === "PRESENT").length,
    absent: entryValues.filter((entry) => entry.status === "ABSENT").length,
    late: entryValues.filter((entry) => entry.status === "LATE").length,
    leave: entryValues.filter((entry) => entry.status === "LEAVE").length,
    unmarked: entryValues.filter((entry) => !entry.status).length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Attendance</h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            {activeTab === "register"
              ? "Mark attendance employee-by-employee, like a classroom register."
              : "Review and export saved attendance records."}
          </p>
        </div>
        {activeTab === "register" && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <Printer size={15} />
              Print
            </button>
            <button
              type="button"
              onClick={markAllPresent}
              disabled={!employees.length || saving}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              <Check size={15} />
              Mark All Present
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1d61e7] px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-50 lg:flex-none"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("register")}
          className={`-mb-px border-b-2 px-4 py-2.5 text-xs font-semibold transition sm:text-sm ${
            activeTab === "register"
              ? "border-[#1d61e7] text-[#1d61e7]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Mark Attendance
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("report")}
          className={`-mb-px border-b-2 px-4 py-2.5 text-xs font-semibold transition sm:text-sm ${
            activeTab === "report"
              ? "border-[#1d61e7] text-[#1d61e7]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Attendance Report
        </button>
      </div>

      {activeTab === "register" && (
        <>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50"
              aria-label="Previous day"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="relative">
              <CalendarDays size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="date"
                value={date}
                onChange={(event) => changeDate(event.target.value)}
                className="rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-100 sm:text-sm"
                aria-label="Register date"
              />
            </div>
            <button
              type="button"
              onClick={() => shiftDate(1)}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50"
              aria-label="Next day"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => changeDate(todayInputValue())}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Today
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
              Total: {counts.total}
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
              Present: {counts.present}
            </span>
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-700">
              Absent: {counts.absent}
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700">
              Late: {counts.late}
            </span>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold text-indigo-700">
              Leave: {counts.leave}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
              Unmarked: {counts.unmarked}
            </span>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-800"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
          <span className="flex-1 font-medium">{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs font-semibold text-emerald-800">
          {successMessage}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-800">Employee Register</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {STATUS_BUTTONS.map((button) => (
                <span
                  key={button.status}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600"
                >
                  <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-700 shadow-sm">
                    {button.letter}
                  </span>
                  {attendanceStatusLabel(button.status)}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={clearRegister}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Eraser size={14} />
            Clear Marks
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center gap-2 text-xs font-semibold text-slate-500">
            <Loader2 size={18} className="animate-spin text-[#1d61e7]" />
            Loading register...
          </div>
        ) : employees.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center">
            <CalendarDays size={28} className="text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No employees found</p>
            <p className="text-xs text-slate-400">Add employees first to start a register.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="w-12 px-3 py-3 text-center">#</th>
                  <th className="px-3 py-3">Employee</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-2 py-3 text-center">P</th>
                  <th className="px-2 py-3 text-center">A</th>
                  <th className="px-2 py-3 text-center">L</th>
                  <th className="px-2 py-3 text-center">HD</th>
                  <th className="px-2 py-3 text-center">LV</th>
                  <th className="px-3 py-3">Check In</th>
                  <th className="px-3 py-3">Check Out</th>
                  <th className="px-3 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee, index) => {
                  const entry = entries[employee.id];
                  if (!entry) return null;
                  const timesDisabled = entry.status === "ABSENT" || entry.status === "LEAVE";

                  return (
                    <tr
                      key={employee.id}
                      className="border-b border-slate-100 transition hover:bg-slate-50/60"
                    >
                      <td className="px-3 py-3 text-center text-[11px] font-semibold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-3 py-3">
                        <span className="block text-xs font-semibold text-slate-800">
                          {employee.name}
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          {employee.employeeProfile?.employeeCode ?? employee.email}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[11px] font-medium text-slate-500">
                        {formatRole(employee.role?.name ?? "")}
                      </td>
                      {STATUS_BUTTONS.map((button) => {
                        const selected = entry.status === button.status;
                        return (
                          <td key={button.status} className="px-2 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleStatus(employee.id, button.status)}
                              title={button.label}
                              aria-label={`${button.label} for ${employee.name}`}
                              aria-pressed={selected}
                              className={`h-8 w-9 rounded-lg border text-[11px] font-bold transition ${
                                selected
                                  ? `${button.selected} shadow-md`
                                  : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600"
                              }`}
                            >
                              {button.letter}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-3 py-3">
                        <input
                          type="time"
                          value={entry.checkIn}
                          disabled={timesDisabled}
                          onChange={(event) => updateEntry(employee.id, { checkIn: event.target.value })}
                          className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] text-slate-700 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-300"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="time"
                          value={entry.checkOut}
                          disabled={timesDisabled}
                          onChange={(event) => updateEntry(employee.id, { checkOut: event.target.value })}
                          className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] text-slate-700 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-300"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={entry.notes}
                          onChange={(event) => updateEntry(employee.id, { notes: event.target.value })}
                          placeholder="Remarks"
                          className="w-40 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-100"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
        </>
      )}
      {activeTab === "report" && <AttendanceReport employees={employees} />}
    </div>
  );
}
