import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Users,
  UserPlus,
  Search,
  Download,
  RotateCw,
  LayoutGrid,
  List,
  ShieldCheck,
  UserCheck,
  Eye,
  Trash2,
  Pencil,
  Phone,
  Calendar,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Sparkles,
  TrendingUp,
  SlidersHorizontal,
} from "lucide-react";
import type {
  CreateUserInput,
  UserRow,
  UserUpdateValues,
  UsersFilterState,
} from "../../types/user";
import {
  fetchUsers,
  createUser as createUserApi,
  updateUser as updateUserApi,
  deleteUser as deleteUserApi,
  exportUsersToCsv,
  roleLabel,
} from "../../lib/users";
import { ApiError } from "../../lib/api";
import { getSession } from "../../lib/auth";
import UserFormDialog from "../../components/ui/UserFormDialog";
import UserDeleteDialog from "../../components/ui/UserDeleteDialog";
import UserDetailDialog from "../../components/ui/UserDetailDialog";

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filters state
  const [filters, setFilters] = useState<UsersFilterState>({
    search: "",
    role: "ALL",
    status: "ALL",
  });
  const [view, setView] = useState<"table" | "grid">("table");

  // Dialogs state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<UserRow | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);

  // Inline action state
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const currentSession = getSession();
  const currentUserId = currentSession?.user?.id;

  const showToast = useCallback(
    (type: "success" | "error", message: string) => {
      setToastMessage({ type, message });
      setTimeout(() => {
        setToastMessage(null);
      }, 4000);
    },
    [],
  );

  const loadUsersData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setForbidden(false);

    try {
      const response = await fetchUsers({ page: 1, limit: 100 });
      setUsers(response.users);
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
        setForbidden(true);
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : "Failed to load users from the server.",
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadUsersData();
  }, [loadUsersData]);

  // Derived filtered users
  const filteredUsers = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return users.filter((u) => {
      // Search
      if (q) {
        const matchesName = u.name.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesPhone = u.phone ? u.phone.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesEmail && !matchesPhone) return false;
      }

      // Role
      if (filters.role !== "ALL" && u.role?.name !== filters.role) {
        return false;
      }

      // Status
      if (filters.status === "ACTIVE" && !u.isActive) return false;
      if (filters.status === "INACTIVE" && u.isActive) return false;

      return true;
    });
  }, [users, filters]);

  // Role counters for badges
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: users.length,
      ADMIN: 0,
      SALES_MANAGER: 0,
      SALES_EMPLOYEE: 0,
      REPORT_VIEWER: 0,
    };
    for (const u of users) {
      const name = u.role?.name;
      if (name && name in counts) {
        counts[name] = (counts[name] || 0) + 1;
      }
    }
    return counts;
  }, [users]);

  // KPI statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const adminsAndManagers = users.filter(
      (u) => u.role?.name === "ADMIN" || u.role?.name === "SALES_MANAGER",
    ).length;
    const salesTeam = users.filter(
      (u) =>
        u.role?.name === "SALES_EMPLOYEE" || u.role?.name === "REPORT_VIEWER",
    ).length;

    const activePercentage =
      total > 0 ? Math.round((active / total) * 100) : 0;

    return { total, active, adminsAndManagers, salesTeam, activePercentage };
  }, [users]);

  // Handlers
  async function handleCreateUser(data: CreateUserInput) {
    const created = await createUserApi(data);
    setUsers((prev) => [created, ...prev]);
    showToast("success", `User "${created.name}" created successfully.`);
  }

  async function handleEditUser(id: number, data: UserUpdateValues) {
    const updated = await updateUserApi(id, data);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    if (detailUser && detailUser.id === updated.id) {
      setDetailUser(updated);
    }
    showToast("success", `Account for "${updated.name}" updated successfully.`);
  }

  async function handleDeleteUser(user: UserRow) {
    await deleteUserApi(user.id);
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    if (detailUser && detailUser.id === user.id) {
      setDetailOpen(false);
      setDetailUser(null);
    }
    showToast("success", `Account "${user.name}" has been removed.`);
  }

  async function handleToggleActive(user: UserRow) {
    if (user.id === currentUserId) {
      showToast("error", "You cannot deactivate your own account.");
      return;
    }

    setTogglingId(user.id);
    try {
      const updated = await updateUserApi(user.id, { isActive: !user.isActive });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      if (detailUser && detailUser.id === updated.id) {
        setDetailUser(updated);
      }
      showToast(
        "success",
        `Account for "${updated.name}" is now ${
          updated.isActive ? "active" : "inactive"
        }.`,
      );
    } catch (err: unknown) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to change user status.",
      );
    } finally {
      setTogglingId(null);
    }
  }

  function resetFilters() {
    setFilters({ search: "", role: "ALL", status: "ALL" });
  }

  const hasActiveFilters =
    Boolean(filters.search.trim()) ||
    filters.role !== "ALL" ||
    filters.status !== "ALL";

  // Consistent avatar palette
  const avatarColors = [
    "bg-blue-600 text-white",
    "bg-indigo-600 text-white",
    "bg-violet-600 text-white",
    "bg-emerald-600 text-white",
    "bg-amber-600 text-white",
    "bg-rose-600 text-white",
    "bg-sky-600 text-white",
  ];

  function getAvatarClass(id: number): string {
    return avatarColors[id % avatarColors.length];
  }

  // Non-admin restricted access view
  if (forbidden) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <ShieldAlert size={28} />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">
            Administrator Access Required
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs text-slate-600 leading-relaxed">
            User Management is restricted to system administrators. Your current
            signed-in role is{" "}
            <strong className="text-slate-800">
              {currentSession?.user.role ?? "UNKNOWN"}
            </strong>
            . Please contact your CRM administrator if you require access.
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
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-sm transition-all animate-in fade-in slide-in-from-bottom-3 ${
            toastMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toastMessage.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              User Management
            </h1>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {users.length} {users.length === 1 ? "Member" : "Members"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Administer team member accounts, assign system roles, and configure
            CRM workspace permissions.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => exportUsersToCsv(filteredUsers)}
            title="Export to CSV"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition cursor-pointer"
          >
            <Download size={14} className="text-slate-500" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={() => void loadUsersData(true)}
            disabled={refreshing}
            title="Refresh user list"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
          >
            <RotateCw
              size={14}
              className={`text-slate-500 ${refreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingUser(null);
              setFormMode("create");
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition cursor-pointer"
          >
            <UserPlus size={15} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Total Accounts
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {stats.total}
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              registered
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
            <TrendingUp size={12} className="text-emerald-500" />
            <span>CRM workspace accounts</span>
          </div>
        </div>

        {/* Active Accounts */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Active Accounts
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {stats.active}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              {stats.activePercentage}% active
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Currently permitted to sign in</span>
          </div>
        </div>

        {/* Leadership / Admin */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Leadership & Admins
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {stats.adminsAndManagers}
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              managers & admins
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
            <Sparkles size={12} className="text-purple-500" />
            <span>Elevated permissions</span>
          </div>
        </div>

        {/* Sales Reps */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Frontline Reps
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <UserCheck size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {stats.salesTeam}
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              reps & viewers
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Leads, tasks, & pipeline</span>
          </div>
        </div>
      </div>

      {/* Main Container: Filters & Table / Grid */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search
                size={16}
                className="absolute left-3.5 top-2.5 text-slate-400"
              />
              <input
                type="text"
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev: UsersFilterState) => ({ ...prev, search: e.target.value }))
                }
                placeholder="Search by name, email, phone..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              {filters.search && (
                <button
                  type="button"
                  onClick={() =>
                    setFilters((prev: UsersFilterState) => ({ ...prev, search: "" }))
                  }
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Right toolbar controls: Status filter & View toggle */}
            <div className="flex items-center gap-2.5">
              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal size={13} className="text-slate-400 hidden sm:block" />
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((prev: UsersFilterState) => ({
                      ...prev,
                      status: e.target.value as UsersFilterState["status"],
                    }))
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="INACTIVE">Inactive Only</option>
                </select>
              </div>

              {/* View Switcher */}
              <div className="flex items-center rounded-xl border border-slate-200 p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setView("table")}
                  title="Table view"
                  className={`rounded-lg p-1.5 transition ${
                    view === "table"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <List size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  title="Cards view"
                  className={`rounded-lg p-1.5 transition ${
                    view === "grid"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>

              {/* Reset Filters */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                >
                  <X size={13} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Role Filter Tabs (Segmented Control) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit overflow-x-auto max-w-full">
            {[
              { id: "ALL", label: "All Roles", count: roleCounts.ALL },
              { id: "ADMIN", label: "Admins", count: roleCounts.ADMIN },
              { id: "SALES_MANAGER", label: "Sales Managers", count: roleCounts.SALES_MANAGER },
              { id: "SALES_EMPLOYEE", label: "Sales Reps", count: roleCounts.SALES_EMPLOYEE },
              { id: "REPORT_VIEWER", label: "Report Viewers", count: roleCounts.REPORT_VIEWER },
            ].map(({ id, label, count }) => {
              const active = filters.role === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    setFilters((prev: UsersFilterState) => ({
                      ...prev,
                      role: id as UsersFilterState["role"],
                    }))
                  }
                  className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                    active
                      ? "bg-white text-slate-900 font-semibold shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                      active
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-200/80 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Info bar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50/70 border-b border-slate-100 text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800">{filteredUsers.length}</strong>{" "}
            of <strong className="text-slate-800">{users.length}</strong> accounts
          </span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="m-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
            <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-bold">Error loading users</p>
              <p className="mt-0.5 text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {/* Content States */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <p className="mt-3 text-xs font-medium">Loading user accounts…</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Users size={28} />
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-800">
              No team accounts found
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {hasActiveFilters
                ? "No users matched your active search or filter criteria."
                : "No accounts have been created yet."}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              >
                Clear all filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingUser(null);
                  setFormMode("create");
                  setFormOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition"
              >
                <UserPlus size={14} />
                Add First User
              </button>
            )}
          </div>
        ) : view === "table" ? (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="w-14 px-4 py-3 text-center">#</th>
                  <th className="px-4 py-3">Team Member</th>
                  <th className="px-4 py-3">System Role</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user, index) => {
                  const isSelf = user.id === currentUserId;
                  const isToggling = togglingId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="group transition hover:bg-slate-50/80"
                    >
                      {/* Serial Number */}
                      <td className="px-4 py-3 text-center text-xs font-semibold text-slate-400 font-mono">
                        {index + 1}
                      </td>

                      {/* User Info */}
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition">
                              {user.name}
                            </span>
                            {isSelf && (
                              <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 uppercase tracking-wide">
                                You
                              </span>
                            )}
                          </div>
                          <span className="truncate text-[11px] text-slate-400 block mt-0.5">
                            {user.email}
                          </span>
                        </div>
                      </td>

                      {/* Role (shown directly as text, no pill badge) */}
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-slate-700">
                          {roleLabel(user.role?.name || "SALES_EMPLOYEE")}
                        </span>
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {user.phone ? (
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <Phone size={12} className="text-slate-400" />
                            {user.phone}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(user)}
                          disabled={isSelf || isToggling}
                          title={
                            isSelf
                              ? "Cannot deactivate own account"
                              : `Click to ${user.isActive ? "deactivate" : "activate"}`
                          }
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                            user.isActive
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {isToggling ? (
                            <Loader2 size={11} className="animate-spin text-slate-500" />
                          ) : (
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                user.isActive ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                            />
                          )}
                          <span>{user.isActive ? "Active" : "Inactive"}</span>
                        </button>
                      </td>

                      {/* Joined Date */}
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(user.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setDetailUser(user);
                              setDetailOpen(true);
                            }}
                            title="View user details & permissions"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingUser(user);
                              setFormMode("edit");
                              setFormOpen(true);
                            }}
                            title="Edit user profile & role"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setUserToDelete(user);
                              setDeleteOpen(true);
                            }}
                            disabled={isSelf}
                            title={
                              isSelf
                                ? "Cannot delete own account"
                                : "Deactivate & delete user"
                            }
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid / Cards View */
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((user) => {
              const isSelf = user.id === currentUserId;
              const isToggling = togglingId === user.id;

              return (
                <div
                  key={user.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Avatar, Info, Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold text-sm shadow-sm ${getAvatarClass(
                            user.id,
                          )}`}
                        >
                          {user.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 truncate">
                              {user.name}
                            </h4>
                            {isSelf && (
                              <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.2 text-[9px] font-semibold text-slate-600 uppercase">
                                You
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-slate-400">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      {/* Status pill */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(user)}
                        disabled={isSelf || isToggling}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition disabled:cursor-not-allowed ${
                          user.isActive
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {isToggling ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.isActive ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                        )}
                        <span>{user.isActive ? "Active" : "Inactive"}</span>
                      </button>
                    </div>

                    {/* Role */}
                    <div className="mt-3 text-xs font-semibold text-slate-700">
                      {roleLabel(user.role?.name || "SALES_EMPLOYEE")}
                    </div>

                    {/* Contact & Date info */}
                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Phone size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">
                          {user.phone || "No phone registered"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">
                          Joined{" "}
                          {new Date(user.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDetailUser(user);
                        setDetailOpen(true);
                      }}
                      className="text-xs font-semibold text-[#1d61e7] hover:underline"
                    >
                      View Details
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUser(user);
                          setFormMode("edit");
                          setFormOpen(true);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUserToDelete(user);
                          setDeleteOpen(true);
                        }}
                        disabled={isSelf}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {formOpen && (
        <UserFormDialog
          mode={formMode}
          initialUser={editingUser}
          currentUserId={currentUserId}
          isOpen={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditingUser(null);
          }}
          onSubmitCreate={handleCreateUser}
          onSubmitEdit={handleEditUser}
        />
      )}

      {/* Detail Dialog */}
      {detailOpen && (
        <UserDetailDialog
          user={detailUser}
          isOpen={detailOpen}
          currentUserId={currentUserId}
          onClose={() => {
            setDetailOpen(false);
            setDetailUser(null);
          }}
          onEdit={(u) => {
            setEditingUser(u);
            setFormMode("edit");
            setFormOpen(true);
          }}
          onToggleActive={handleToggleActive}
        />
      )}

      {/* Delete User Dialog */}
      {deleteOpen && (
        <UserDeleteDialog
          user={userToDelete}
          currentUserId={currentUserId}
          isOpen={deleteOpen}
          onClose={() => {
            setDeleteOpen(false);
            setUserToDelete(null);
          }}
          onConfirm={handleDeleteUser}
        />
      )}
    </div>
  );
}
