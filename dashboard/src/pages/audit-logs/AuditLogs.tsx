import { useState, useEffect } from "react";
import { History, Shield, User, Filter, RotateCw } from "lucide-react";
import { fetchAuditLogs, type AuditLogItem } from "../../lib/auditLogs";

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [searchAction, setSearchAction] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  async function loadLogs(pageNum = 1) {
    setLoading(true);
    try {
      const res = await fetchAuditLogs({
        entityType: entityFilter !== "ALL" ? entityFilter : undefined,
        action: searchAction.trim() || undefined,
        page: pageNum,
        limit: 20,
      });
      setLogs(res?.items || []);
      setPage(res?.pagination?.page || 1);
      setTotalPages(res?.pagination?.totalPages || 1);
      setTotalCount(res?.pagination?.total || 0);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs(1);
  }, [entityFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-[#1d61e7]" />
            Audit Logs & System Activity
          </h1>
          <p className="mt-1 text-xs text-slate-700">
            Immutable tracking of state changes, assignments, and sensitive entity mutations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadLogs(page)}
          className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 transition"
        >
          <RotateCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
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
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-200 transition"
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
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-[#1d61e7] focus:outline-none"
          >
            <option value="ALL">All Entities</option>
            <option value="LEAD">Leads</option>
            <option value="DEAL">Deals</option>
            <option value="CUSTOMER">Customers</option>
            <option value="USER">Users</option>
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
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Performed By</th>
                <th className="px-4 py-3">Change Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-700">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#1d61e7]" />
                      <span>Loading audit logs...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-700">
                    <History className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                    <span>No audit log records match the current filters.</span>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actorName = log.actor?.name || (log.actorId ? `User #${log.actorId}` : "System");
                  const actorEmail = log.actor?.email || "";
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">{log.entityType}</span>{" "}
                        <span className="text-slate-600">#{log.entityId}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                            <User size={12} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{actorName}</p>
                            {actorEmail && <p className="text-[10px] text-slate-600">{actorEmail}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-[11px] text-slate-800 font-mono bg-slate-50 p-1.5 rounded border border-slate-200 overflow-x-auto max-h-20">
                          {log.after ? JSON.stringify(log.after) : log.before ? JSON.stringify(log.before) : "No payload"}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50">
            <span className="text-xs text-slate-700">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => loadLogs(page - 1)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => loadLogs(page + 1)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
