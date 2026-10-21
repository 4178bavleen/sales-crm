import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  KeyRound,
  Loader2,
  Pencil,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import type {
  RoleName,
  SettingsSection,
  UserRow,
} from "../../types/settings";
import {
  buildRoles,
  fetchUsers,
  roleLabel,
  roleNames,
  updateUser,
} from "../../lib/settings";
import { ApiError } from "../../lib/api";
import { getSession } from "../../lib/auth";

/** In-page nav. */
const SECTIONS: { id: SettingsSection; label: string; Icon: typeof Users }[] = [
  { id: "users", label: "User management", Icon: Users },
  { id: "roles", label: "Roles & permissions", Icon: KeyRound },
];

/**
 * Settings.
 *
 * - User management: real API (GET /api/v1/users, PATCH /api/v1/users/:id) — admin only
 * - Roles & permissions: derived from fetched user list; definitions mirrored from backend seed
 */
export default function Settings() {
  const [section, setSection] = useState<SettingsSection>("users");

  // --- Users (real API) ---
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [forbidden, setForbidden] = useState(false);

  // Which row (and field) is being edited.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftRole, setDraftRole] = useState<RoleName>("SALES_EMPLOYEE");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [rowError, setRowError] = useState("");

  const currentUserId = getSession()?.user.id;

  useEffect(() => {
    let cancelled = false;
    setLoadingUsers(true);
    setUsersError("");
    setForbidden(false);

    void fetchUsers(1, 100)
      .then((result) => {
        if (cancelled) return;
        setUsers(result.users);
        setTotal(result.pagination.total);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
          setForbidden(true);
        } else {
          setUsersError(
            error instanceof ApiError ? error.message : "Could not load users.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingUsers(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const roles = buildRoles(users);

  function startEditRole(user: UserRow) {
    setEditingId(user.id);
    setDraftRole(user.role.name as RoleName);
    setRowError("");
  }

  async function saveRole(user: UserRow) {
    setSavingId(user.id);
    setRowError("");
    try {
      const updated = await updateUser(user.id, { roleName: draftRole });
      setUsers((previous) =>
        previous.map((u) => (u.id === updated.id ? updated : u)),
      );
      setEditingId(null);
    } catch (error) {
      setRowError(
        error instanceof ApiError ? error.message : "Could not update the role.",
      );
    } finally {
      setSavingId(null);
    }
  }

  async function toggleActive(user: UserRow) {
    setSavingId(user.id);
    setRowError("");
    try {
      const updated = await updateUser(user.id, { isActive: !user.isActive });
      setUsers((previous) =>
        previous.map((u) => (u.id === updated.id ? updated : u)),
      );
    } catch (error) {
      setRowError(
        error instanceof ApiError
          ? error.message
          : "Could not update the account status.",
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Workspace preferences, team accounts, and role definitions.
        </p>
      </header>

      {/* Section nav */}
      <div className="mt-5 flex flex-wrap gap-1 border-b border-slate-200">
        {SECTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm transition ${
              section === id
                ? "border-indigo-600 font-semibold text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ---------------------------- User management ---------------------------- */}
      {section === "users" && (
        <section className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Team accounts
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {loadingUsers
                  ? "Loading…"
                  : forbidden
                    ? "Restricted"
                    : `${total} account${total === 1 ? "" : "s"} from the server.`}
              </p>
            </div>
            {rowError && (
              <span role="alert" className="text-xs text-rose-600">
                {rowError}
              </span>
            )}
          </div>

          {loadingUsers ? (
            <div className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              Loading accounts…
            </div>
          ) : forbidden ? (
            <div
              role="alert"
              className="m-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              <ShieldCheck size={16} className="mt-0.5 shrink-0" />
              <span>
                User management requires an administrator account. Your role is{" "}
                <strong>{getSession()?.user.role ?? "unknown"}</strong>.
              </span>
            </div>
          ) : usersError ? (
            <div
              role="alert"
              className="m-5 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{usersError}</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-2.5 font-medium">User</th>
                    <th className="px-5 py-2.5 font-medium">Phone</th>
                    <th className="px-5 py-2.5 font-medium">Role</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-700">
                            {user.name.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {user.name}
                              {user.id === currentUserId && (
                                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {user.phone || "—"}
                      </td>
                      <td className="px-5 py-3">
                        {editingId === user.id ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={draftRole}
                              onChange={(e) => setDraftRole(e.target.value as RoleName)}
                              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 outline-none focus:border-indigo-500"
                            >
                              {roleNames.map((name) => (
                                <option key={name} value={name}>
                                  {roleLabel(name)}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => saveRole(user)}
                              disabled={savingId === user.id}
                              className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                              aria-label="Save role"
                            >
                              {savingId === user.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Check size={14} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100"
                              aria-label="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditRole(user)}
                            className="group inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                          >
                            {roleLabel(user.role.name)}
                            <Pencil
                              size={11}
                              className="text-slate-300 group-hover:text-slate-500"
                            />
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => toggleActive(user)}
                          disabled={savingId === user.id}
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition disabled:opacity-50 ${
                            user.isActive
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* --------------------------- Roles & permissions -------------------------- */}
      {section === "roles" && (
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800">
              Roles & permissions
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {forbidden
              ? "Account counts need administrator access; role definitions are shown for reference."
              : "Counts are from the accounts returned by the server."}
          </p>

          <ul className="mt-4 space-y-2">
            {roles.map((role) => (
              <li
                key={role.name}
                className="flex flex-wrap items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <UserRound size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {roleLabel(role.name)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {role.description}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-500 ring-1 ring-slate-200">
                  {role.userCount} {role.userCount === 1 ? "user" : "users"}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-[11px] leading-4 text-slate-400">
            Role definitions mirror the backend&rsquo;s accepted values. There is no
            roles endpoint yet, so these descriptions are not fetched.
          </p>
        </section>
      )}
    </div>
  );
}