import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import { ApiError } from "../../lib/api";
import { roleLabel } from "../../lib/users";
import {
  createRole,
  deleteRole,
  fetchRolePermissions,
  fetchRoles,
  updateRole,
  type RoleItem,
} from "../../lib/permissions";

const SYSTEM_ROLES = ["ADMIN"];

type Toast = { type: "success" | "error"; message: string };

export default function EmployeeRolesPanel() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [copyFromRoleId, setCopyFromRoleId] = useState("none");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null);
  const [reassignRoleId, setReassignRoleId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      setRoles(await fetchRoles());
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setForbidden(true);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load roles.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  function openCreate() {
    setEditingRole(null);
    setFormName("");
    setFormDescription("");
    setCopyFromRoleId("none");
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(role: RoleItem) {
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description || "");
    setCopyFromRoleId("none");
    setFormError("");
    setFormOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!formName.trim()) {
      setFormError("Role name is required");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      if (editingRole) {
        const updated = await updateRole(editingRole.id, {
          name: SYSTEM_ROLES.includes(editingRole.name) ? undefined : formName.trim(),
          description: formDescription.trim() || undefined,
        });
        setRoles((prev) => prev.map((role) => (role.id === updated.id ? updated : role)));
        showToast("success", `Role "${roleLabel(updated.name)}" updated successfully.`);
      } else {
        let codes: string[] = [];
        if (copyFromRoleId !== "none") {
          const source = await fetchRolePermissions(Number(copyFromRoleId));
          codes = source.permissions.map((permission) => permission.code);
        }
        const created = await createRole({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          codes,
        });
        setRoles((prev) => [...prev, created]);
        showToast("success", `Role "${roleLabel(created.name)}" added successfully.`);
      }
      setFormOpen(false);
      setEditingRole(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save role.");
    } finally {
      setSaving(false);
    }
  }

  function openDelete(role: RoleItem) {
    setRoleToDelete(role);
    setDeleteError("");
    const firstOther = roles.find((item) => item.id !== role.id);
    setReassignRoleId(firstOther ? String(firstOther.id) : "");
  }

  async function handleDelete() {
    if (!roleToDelete) return;
    if (roleToDelete._count.users > 0 && !reassignRoleId) {
      setDeleteError("Choose a role to reassign the existing employees to.");
      return;
    }

    setDeleting(true);
    setDeleteError("");
    try {
      const reassignId =
        roleToDelete._count.users > 0 ? Number(reassignRoleId) : undefined;
      await deleteRole(roleToDelete.id, reassignId);
      setRoles((prev) =>
        prev
          .filter((role) => role.id !== roleToDelete.id)
          .map((role) =>
            reassignId && role.id === reassignId
              ? {
                  ...role,
                  _count: {
                    ...role._count,
                    users: role._count.users + roleToDelete._count.users,
                  },
                }
              : role,
          ),
      );
      showToast("success", `Role "${roleLabel(roleToDelete.name)}" removed.`);
      setRoleToDelete(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to remove role.");
    } finally {
      setDeleting(false);
    }
  }

  if (forbidden) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Shield size={28} />
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-900">
          Administrator Access Required
        </h2>
        <p className="mx-auto mt-2 max-w-md text-xs text-slate-600">
          Managing roles requires role administration permission. Contact your CRM
          administrator if you need access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 shadow-xl ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Roles</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Create and manage the roles assigned to employees.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => navigate("/permissions")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition cursor-pointer"
          >
            <ArrowUpRight size={14} className="text-slate-500" />
            Advanced permissions
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus size={15} />
            Add Role
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertCircle size={16} className="shrink-0 text-rose-600" />
          <div>
            <p className="font-bold">Error loading roles</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <p className="mt-3 text-xs font-medium">Loading roles…</p>
          </div>
        ) : roles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Shield size={28} />
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-800">No roles found</h3>
            <p className="mt-1 text-xs text-slate-500">
              Add a role to start grouping employees by responsibility.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-slate-800">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-center">Employees</th>
                  <th className="px-4 py-3 text-center">Permissions</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roles.map((role) => (
                  <tr key={role.id} className="transition hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-slate-900">
                        {roleLabel(role.name)}
                      </span>
                      {role.name === "ADMIN" && (
                        <span className="ml-2 rounded bg-purple-50 px-1.5 py-0.5 text-[9px] font-semibold text-purple-700 border border-purple-200 uppercase">
                          System
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {role.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-xs font-semibold text-slate-700">
                      {role._count.users}
                    </td>
                    <td className="px-4 py-3 text-center text-xs font-semibold text-slate-700">
                      {role._count.permissions}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(role)}
                          title="Edit role"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDelete(role)}
                          disabled={role.name === "ADMIN"}
                          title={
                            role.name === "ADMIN"
                              ? "System role cannot be removed"
                              : "Remove role"
                          }
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-100 bg-white shadow-2xl my-8">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {editingRole ? "Edit Role" : "Add Role"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {editingRole
                        ? "Update the role name and description."
                        : "Create a new role for employee management."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>

              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Role Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  disabled={Boolean(editingRole && editingRole.name === "ADMIN")}
                  placeholder="e.g. HR_MANAGER"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(event) => setFormDescription(event.target.value)}
                  placeholder="What does this role do?"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {!editingRole && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Copy permissions from
                  </label>
                  <div className="relative">
                    <Copy
                      size={15}
                      className="absolute left-3 top-2.5 text-slate-400"
                    />
                    <select
                      value={copyFromRoleId}
                      onChange={(event) => setCopyFromRoleId(event.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-3.5 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                    >
                      <option value="none">No permissions yet</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {roleLabel(role.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1d61e7] px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {editingRole ? "Save Changes" : "Add Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {roleToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                <Trash2 size={22} />
              </div>
              <button
                type="button"
                onClick={() => setRoleToDelete(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <h3 className="mt-4 text-base font-bold text-slate-900">Remove Role</h3>
            <p className="mt-1.5 text-xs text-slate-500">
              Remove <strong className="text-slate-800">{roleLabel(roleToDelete.name)}</strong>?
              This cannot be undone.
            </p>

            {roleToDelete._count.users > 0 && (
              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Reassign {roleToDelete._count.users} employee(s) to
                </label>
                <select
                  value={reassignRoleId}
                  onChange={(event) => setReassignRoleId(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="">Select a role</option>
                  {roles
                    .filter((role) => role.id !== roleToDelete.id)
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {roleLabel(role.name)}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {deleteError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRoleToDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition disabled:opacity-50 cursor-pointer"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                Remove Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
