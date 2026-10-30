import { useState, useEffect } from "react";
import {
  History,
  Shield,
  Filter,
  RotateCw,
  Users,
  TrendingUp,
  UserCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { fetchAuditLogs, getActionBadgeClass, formatAuditSummary, type AuditLogItem } from "../../lib/auditLogs";
import AuditLogDetailDialog from "../../components/ui/AuditLogDetailDialog";
import StatCard from "../../components/ui/StatCard";

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [searchAction, setSearchAction] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    leads: 0,
    deals: 0,
    customers: 0,
    users: 0,
  });

  async function loadLogs(pageNum = page, currentLimit = pageSize) {
    setLoading(true);
    try {
      const res = await fetchAuditLogs({
        entityType: entityFilter !== "ALL" ? entityFilter : undefined,
        action: searchAction.trim() || undefined,
        page: pageNum,
        limit: currentLimit,
      });
      setLogs(res?.items || []);
      setPage(res?.pagination?.page || 1);
      setTotalPages(res?.pagination?.totalPages || 1);
      setTotalCount(res?.pagination?.total || 0);
      if (res?.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs(1, pageSize);
  }, [entityFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs(1, pageSize);
  };

  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalCount);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (page >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-[#1d61e7]" />
            Audit Logs &amp; System Activity
          </h1>
          <p className="mt-1 text-xs text-slate-700">
            Immutable tracking of state changes, assignments, and sensitive entity mutations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadLogs(page, pageSize)}
          className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
        >
          <RotateCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Top KPI Cards Row (5 Cards - using Global StatCard) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Total Events"
          value={stats.total}
          subtext="All logs"
          icon={Shield}
          color="blue"
          isActive={entityFilter === "ALL"}
          onClick={() => setEntityFilter("ALL")}
        />

        <StatCard
          label="Lead Activities"
          value={stats.leads}
          subtext={<span>↑ Leads</span>}
          icon={Users}
          color="emerald"
          isActive={entityFilter === "LEAD"}
          onClick={() => setEntityFilter("LEAD")}
        />

        <StatCard
          label="Deal Mutations"
          value={stats.deals}
          subtext={<span>↑ Deals</span>}
          icon={TrendingUp}
          color="purple"
          isActive={entityFilter === "DEAL"}
          onClick={() => setEntityFilter("DEAL")}
        />

        <StatCard
          label="Customer Logs"
          value={stats.customers}
          subtext="Accounts"
          icon={Building2}
          color="indigo"
          isActive={entityFilter === "CUSTOMER"}
          onClick={() => setEntityFilter("CUSTOMER")}
        />

        <StatCard
          label="User & Auth"
          value={stats.users}
          subtext="Reps & Admins"
          icon={UserCheck}
          color="amber"
          isActive={entityFilter === "USER"}
          onClick={() => setEntityFilter("USER")}
        />
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <input
            type="text"
            value={searchAction}
            onChange={(e) => setSearchAction(e.target.value)}
            placeholder="Filter by action (e.g. CREATE, ASSIGN)..."
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 placeholder-slate-500 focus:border-[#1d61e7] focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-200 transition cursor-pointer"
          >
            Filter
          </button>
        </form>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-600" />
          <span className="text-xs font-medium text-slate-800">Entity:</span>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-[#1d61e7] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Entities</option>
            <option value="AUTH">Authentication (Login / Logout)</option>
            <option value="LEAD">Leads</option>
            <option value="DEAL">Deals</option>
            <option value="TASK">Tasks</option>
            <option value="ACTIVITY">Follow-ups &amp; Activities</option>
            <option value="CONTACT">Contacts</option>
            <option value="PRODUCT_SERVICE">Products &amp; Services</option>
            <option value="MEETING">Meetings</option>
            <option value="CUSTOMER">Customers</option>
            <option value="USER">Users</option>
            <option value="TARGET">Targets</option>
          </select>
          <span className="text-xs text-slate-700 ml-2">Total: {totalCount} records</span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-700">
              <tr>
                <th className="px-3 py-3 w-12 text-center">#</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Performed By</th>
                <th className="px-4 py-3">Change Details</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-700">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#1d61e7]" />
                      <span>Loading audit logs...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-700">
                    <History className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                    <span>No audit log records match the current filters.</span>
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => {
                  const actorName = log.actor?.name || (log.actorId ? `User #${log.actorId}` : "System");
                  const actorEmail = log.actor?.email || "";
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="px-3 py-3 text-center font-mono text-[11px] font-semibold text-slate-700">
                        {startIndex + index}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wider ${getActionBadgeClass(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900">{log.entityType}</span>{" "}
                        <span className="text-slate-600 font-mono text-[11px]">#{log.entityId}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {actorName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{actorName}</p>
                            {actorEmail && <p className="text-[10px] text-slate-600">{actorEmail}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-sm">
                        <p className="text-xs text-slate-800 font-medium truncate" title={formatAuditSummary(log)}>
                          {formatAuditSummary(log)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#1d61e7] shadow-2xs transition cursor-pointer"
                        >
                          <Eye size={12} />
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Proper Pagination matching standard tables */}
        {totalCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-white px-5 py-3.5">
            <div className="text-xs text-slate-700 font-medium">
              Showing <span className="font-bold text-slate-900">{startIndex}–{endIndex}</span> of{" "}
              <span className="font-bold text-slate-900">{totalCount}</span> audit records
            </div>

            <div className="flex items-center gap-2">
              {/* Previous page */}
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => loadLogs(Math.max(1, page - 1), pageSize)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {pages.map((p, index) => {
                  if (p === "...") {
                    return (
                      <span key={`ellipsis-${index}`} className="px-1 text-xs text-slate-500 font-semibold">
                        ...
                      </span>
                    );
                  }
                  const pageNum = p as number;
                  const isActive = pageNum === page;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => loadLogs(pageNum, pageSize)}
                      className={`flex h-7 w-7 items-center justify-center rounded-md text-xs transition cursor-pointer ${
                        isActive
                          ? "border border-blue-600 bg-blue-50/50 font-bold text-blue-700 shadow-2xs"
                          : "text-slate-800 font-semibold hover:bg-slate-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next page */}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => loadLogs(Math.min(totalPages, page + 1), pageSize)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>

              {/* Page size select */}
              <div className="ml-2">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setPageSize(newSize);
                    loadLogs(1, newSize);
                  }}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 font-semibold outline-none hover:border-slate-400 cursor-pointer"
                >
                  {[10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size} / page
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Audit Log Detail Dialog */}
      {selectedLog && (
        <AuditLogDetailDialog
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}
