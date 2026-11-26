import { useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import DataTable, { type DataTableColumn } from "../../components/ui/DataTable";
import StatCard from "../../components/ui/StatCard";
import {
  ATTENDANCE_STATUSES,
  type AttendanceEmployeeOption,
  type AttendanceFilters,
  type AttendanceRecord,
  type AttendanceStatus,
  type AttendanceSummary,
} from "../../types/attendance";
import {
  attendanceStatusLabel,
  attendanceStatusStyles,
  exportAttendanceCsv,
  fetchAttendance,
  formatAttendanceDate,
  formatAttendanceTime,
  formatWorkingTime,
} from "../../lib/attendance";

const EMPTY_SUMMARY: AttendanceSummary = {
  PRESENT: 0,
  ABSENT: 0,
  LATE: 0,
  HALF_DAY: 0,
  LEAVE: 0,
  WEEKEND: 0,
  HOLIDAY: 0,
  total: 0,
};

const initialFilters: AttendanceFilters = {
  page: 1,
  limit: 20,
};

type AttendanceReportProps = {
  employees: AttendanceEmployeeOption[];
};

export default function AttendanceReport({ employees }: AttendanceReportProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [filters, setFilters] = useState<AttendanceFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetchAttendance(initialFilters)
      .then((response) => {
        if (!active) return;
        setRecords(response.records);
        setSummary(response.summary);
        setPagination(response.pagination);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to load attendance report");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function loadReport(nextFilters: AttendanceFilters) {
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await fetchAttendance(nextFilters);
      setRecords(response.records);
      setSummary(response.summary);
      setPagination(response.pagination);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load attendance report");
    } finally {
      setLoading(false);
    }
  }

  function applyFilters(nextFilters: AttendanceFilters) {
    setFilters(nextFilters);
    void loadReport(nextFilters);
  }

  function changeFilter<K extends keyof AttendanceFilters>(
    key: K,
    value: AttendanceFilters[K],
  ) {
    const nextFilters: AttendanceFilters = { ...filters, [key]: value };
    if (key !== "page") nextFilters.page = 1;
    applyFilters(nextFilters);
  }

  const columns: DataTableColumn<AttendanceRecord>[] = [
    {
      key: "date",
      header: "Date",
      cell: (record) => (
        <span className="whitespace-nowrap text-xs font-semibold text-slate-800">
          {formatAttendanceDate(record.date)}
        </span>
      ),
    },
    {
      key: "employee",
      header: "Employee",
      cell: (record) => (
        <div className="min-w-0">
          <span className="block truncate text-xs font-semibold text-slate-800">
            {record.user.name}
          </span>
          <span className="block truncate text-[11px] text-slate-400">
            {record.user.employeeProfile?.employeeCode ?? record.user.email}
          </span>
        </div>
      ),
    },
    {
      key: "checkIn",
      header: "Check In",
      cell: (record) => (
        <span className="whitespace-nowrap text-xs text-slate-600">
          {formatAttendanceTime(record.checkIn)}
        </span>
      ),
    },
    {
      key: "checkOut",
      header: "Check Out",
      cell: (record) => (
        <span className="whitespace-nowrap text-xs text-slate-600">
          {formatAttendanceTime(record.checkOut)}
        </span>
      ),
    },
    {
      key: "workingMinutes",
      header: "Working Time",
      cell: (record) => (
        <span className="whitespace-nowrap text-xs font-semibold text-slate-700">
          {formatWorkingTime(record.workingMinutes)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (record) => (
        <span
          className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            attendanceStatusStyles[record.status]
          }`}
        >
          {attendanceStatusLabel(record.status)}
        </span>
      ),
    },
    {
      key: "notes",
      header: "Remarks",
      cell: (record) => (
        <span className="line-clamp-2 max-w-[220px] text-[11px] text-slate-500">
          {record.notes ?? "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Total Records"
          value={summary.total}
          subtext="All attendance"
          icon={CalendarDays}
          color="blue"
        />
        <StatCard
          label="Present"
          value={summary.PRESENT}
          subtext="Full day"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          label="Absent"
          value={summary.ABSENT}
          subtext="No attendance"
          icon={XCircle}
          color="rose"
        />
        <StatCard
          label="Late"
          value={summary.LATE}
          subtext="Arrived late"
          icon={Clock3}
          color="amber"
        />
        <StatCard
          label="On Leave"
          value={summary.LEAVE}
          subtext="Approved leave"
          icon={CalendarDays}
          color="indigo"
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Attendance Report</h2>
            <p className="text-[11px] text-slate-400">Filter and review saved attendance records.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void loadReport(filters);
              }}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => exportAttendanceCsv(records)}
              disabled={!records.length}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="search"
              value={filters.search ?? ""}
              onChange={(event) => changeFilter("search", event.target.value)}
              placeholder="Search employee..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-100 sm:text-sm"
            />
          </div>
          <select
            value={filters.userId ?? ""}
            onChange={(event) =>
              changeFilter("userId", event.target.value ? Number(event.target.value) : undefined)
            }
            className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-100 sm:text-sm"
          >
            <option value="">All employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
          <select
            value={filters.status ?? ""}
            onChange={(event) =>
              changeFilter("status", (event.target.value || undefined) as AttendanceStatus | undefined)
            }
            className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-100 sm:text-sm"
          >
            <option value="">All statuses</option>
            {ATTENDANCE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {attendanceStatusLabel(status)}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filters.date ?? ""}
            onChange={(event) => changeFilter("date", event.target.value || undefined)}
            aria-label="Exact date"
            className="min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-100 sm:text-sm"
          />
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <input
              type="date"
              value={filters.from ?? ""}
              onChange={(event) => changeFilter("from", event.target.value || undefined)}
              aria-label="From date"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-2.5 py-2.5 text-xs text-slate-700 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-100 sm:text-sm"
            />
            <input
              type="date"
              value={filters.to ?? ""}
              onChange={(event) => changeFilter("to", event.target.value || undefined)}
              aria-label="To date"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-2.5 py-2.5 text-xs text-slate-700 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-100 sm:text-sm"
            />
            <button
              type="button"
              onClick={() => applyFilters(initialFilters)}
              className="shrink-0 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
            >
              Reset
            </button>
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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center gap-2 text-xs font-semibold text-slate-500">
            <Loader2 size={18} className="animate-spin text-[#1d61e7]" />
            Loading report...
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={records}
            getRowId={(record) => record.id}
            minWidth="860px"
            empty={
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <CalendarDays size={28} className="text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">No attendance records found</p>
                <p className="text-xs text-slate-400">Mark attendance first or adjust the filters.</p>
              </div>
            }
            pagination={{
              total: pagination.total,
              page: pagination.page,
              pageSize: pagination.limit,
              onPageChange: (page) => changeFilter("page", page),
              onPageSizeChange: (limit) => applyFilters({ ...filters, limit, page: 1 }),
              itemLabel: "records",
            }}
          />
        )}
      </section>
    </div>
  );
}
