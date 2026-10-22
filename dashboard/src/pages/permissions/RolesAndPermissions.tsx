import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Shield,
  ShieldAlert,
  Search,
  Check,
  RotateCw,
  Save,
  Undo2,
  Users,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LayoutDashboard,
  UserCheck,
  Building2,
  FolderGit2,
  CheckSquare,
  CalendarDays,
  BarChart3,
  Settings,
  Sparkles,
  Plus,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  fetchRoles,
  fetchPermissions,
  fetchRolePermissions,
  updateRolePermissions,
  createRole,
  updateRole,
  deleteRole,
  type RoleItem,
  type PermissionItem,
} from "../../lib/permissions";
import { roleLabel } from "../../lib/users";
import { ApiError } from "../../lib/api";
import { getSession } from "../../lib/auth";

const CATEGORY_ICONS: Record<string, typeof Shield> = {
  dashboard: LayoutDashboard,
  leads: Users,
  contacts: UserCheck,
  companies: Building2,
  deals: FolderGit2,
  tasks: CheckSquare,
  meetings: CalendarDays,
  reports: BarChart3,
  settings: Settings,
  users: UserCheck,
  permissions: KeyRound,
};

function getCategoryFromCode(code: string): string {
  const [cat] = code.split(".");
  return cat || "other";
}

function formatCategoryTitle(category: string): string {
  switch (category) {
    case "dashboard":
      return "Dashboard & Overview";
    case "leads":
      return "Leads Management";
    case "contacts":
      return "Contacts";
    case "companies":
      return "Companies & Accounts";
    case "deals":
      return "Deals & Sales Pipeline";
    case "tasks":
      return "Tasks & Activities";
    case "meetings":
      return "Meetings & Calendar";
    case "reports":
      return "Reports & Analytics";
    case "settings":
      return "Workspace Settings";
    case "users":
      return "User Management";
    case "permissions":
      return "Roles & Permissions";
    default:
      return category.charAt(0).toUpperCase() + category.slice(1);
  }
}

export default function RolesAndPermissions() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [assignedCodes, setAssignedCodes] = useState<string[]>([]);
  const [originalCodes, setOriginalCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [search, setSearch] = useState("");
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Create role dialog state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [copyFromRoleId, setCopyFromRoleId] = useState<number | "none">("none");
  const [creatingRole, setCreatingRole] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit role dialog state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleDesc, setEditRoleDesc] = useState("");
  const [savingEditRole, setSavingEditRole] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete role confirmation dialog state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null);
  const [reassignRoleId, setReassignRoleId] = useState<number | null>(null);
  const [deletingRole, setDeletingRole] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const SYSTEM_ROLES = ["ADMIN"];

  const currentSession = getSession();

  const showToast = useCallback(
    (type: "success" | "error", message: string) => {
      setToastMessage({ type, message });
      setTimeout(() => setToastMessage(null), 4000);
    },
    [],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);

    try {
      const [rolesData, permsData] = await Promise.all([
        fetchRoles(),
        fetchPermissions(),
      ]);

      setRoles(rolesData);
      setAllPermissions(permsData);

      const defaultRole = rolesData[0]?.id ?? null;
      if (defaultRole) {
        setSelectedRoleId(defaultRole);
        const detail = await fetchRolePermissions(defaultRole);
        const codes = detail.permissions.map((p) => p.code);
        setAssignedCodes(codes);
        setOriginalCodes(codes);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
        setForbidden(true);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load roles and permissions data.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSelectRole = async (roleId: number) => {
    if (roleId === selectedRoleId) return;
    try {
      setSelectedRoleId(roleId);
      const detail = await fetchRolePermissions(roleId);
      const codes = detail.permissions.map((p) => p.code);
      setAssignedCodes(codes);
      setOriginalCodes(codes);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to load role permissions",
      );
    }
  };

  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || null;
  }, [roles, selectedRoleId]);

  const hasUnsavedChanges = useMemo(() => {
    if (assignedCodes.length !== originalCodes.length) return true;
    const originalSet = new Set(originalCodes);
    return assignedCodes.some((code) => !originalSet.has(code));
  }, [assignedCodes, originalCodes]);

  const togglePermission = (code: string) => {
    if (selectedRole?.name === "ADMIN" && code === "permissions.manage") {
      showToast(
        "error",
        "The Administrator role must always retain permissions.manage.",
      );
      return;
    }

    setAssignedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      const updated = await updateRolePermissions(selectedRoleId, assignedCodes);
      const codes = updated.permissions.map((p) => p.code);
      setAssignedCodes(codes);
      setOriginalCodes(codes);

      setRoles((prev) =>
        prev.map((r) =>
          r.id === selectedRoleId
            ? {
                ...r,
                _count: { ...r._count, permissions: codes.length },
              }
            : r,
        ),
      );

      showToast(
        "success",
        `Permissions for ${roleLabel(updated.name)} saved successfully.`,
      );
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to save permissions.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setAssignedCodes(originalCodes);
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      setCreateError("Role name is required");
      return;
    }

    setCreatingRole(true);
    setCreateError("");
    try {
      let initialCodes: string[] = [];
      if (copyFromRoleId !== "none") {
        const source = await fetchRolePermissions(copyFromRoleId);
        initialCodes = source.permissions.map((p) => p.code);
      }

      const created = await createRole({
        name: newRoleName.trim(),
        description: newRoleDesc.trim() || undefined,
        codes: initialCodes,
      });

      setRoles((prev) => [...prev, created]);
      setSelectedRoleId(created.id);
      setAssignedCodes(initialCodes);
      setOriginalCodes(initialCodes);
      setCreateModalOpen(false);
      setNewRoleName("");
      setNewRoleDesc("");
      setCopyFromRoleId("none");

      showToast("success", `Role "${roleLabel(created.name)}" created successfully.`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create role.");
    } finally {
      setCreatingRole(false);
    }
  };

  const handleOpenEdit = (role: RoleItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRole(role);
    setEditRoleName(role.name);
    setEditRoleDesc(role.description || "");
    setEditError("");
    setEditModalOpen(true);
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    if (!editRoleName.trim()) {
      setEditError("Role name is required");
      return;
    }

    setSavingEditRole(true);
    setEditError("");
    try {
      const isSystem = SYSTEM_ROLES.includes(editingRole.name);
      const updated = await updateRole(editingRole.id, {
        name: isSystem ? undefined : editRoleName.trim(),
        description: editRoleDesc.trim() || undefined,
      });

      setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setEditModalOpen(false);
      setEditingRole(null);
      showToast("success", `Role "${roleLabel(updated.name)}" updated successfully.`);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update role.");
    } finally {
      setSavingEditRole(false);
    }
  };

  const handleOpenDelete = (role: RoleItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setRoleToDelete(role);
    setDeleteError("");
    const firstOther = roles.find((r) => r.id !== role.id);
    setReassignRoleId(firstOther ? firstOther.id : null);
    setDeleteModalOpen(true);
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    setDeletingRole(true);
    setDeleteError("");
    try {
      const reassignId =
        roleToDelete._count.users > 0 && reassignRoleId ? reassignRoleId : undefined;
      await deleteRole(roleToDelete.id, reassignId);
      const remainingRoles = roles
        .filter((r) => r.id !== roleToDelete.id)
        .map((r) => {
          if (reassignId && r.id === reassignId) {
            return {
              ...r,
              _count: {
                ...r._count,
                users: r._count.users + roleToDelete._count.users,
              },
            };
          }
          return r;
        });
      setRoles(remainingRoles);
      if (selectedRoleId === roleToDelete.id) {
        const nextRole = remainingRoles[0]?.id ?? null;
        setSelectedRoleId(nextRole);
        if (nextRole) {
          const detail = await fetchRolePermissions(nextRole);
          const codes = detail.permissions.map((p) => p.code);
          setAssignedCodes(codes);
          setOriginalCodes(codes);
        } else {
          setAssignedCodes([]);
          setOriginalCodes([]);
        }
      }
      setDeleteModalOpen(false);
      setRoleToDelete(null);
      showToast("success", `Role "${roleLabel(roleToDelete.name)}" deleted.`);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete role.");
    } finally {
      setDeletingRole(false);
    }
  };

  const handleToggleCategory = (categoryCodes: string[]) => {
    const allSelected = categoryCodes.every((code) =>
      assignedCodes.includes(code),
    );

    if (allSelected) {
      setAssignedCodes((prev) =>
        prev.filter((c) => {
          if (
            selectedRole?.name === "ADMIN" &&
            c === "permissions.manage"
          ) {
            return true;
          }
          return !categoryCodes.includes(c);
        }),
      );
    } else {
      setAssignedCodes((prev) => [
        ...prev,
        ...categoryCodes.filter((c) => !prev.includes(c)),
      ]);
    }
  };

  const handleGrantAll = () => {
    setAssignedCodes(allPermissions.map((p) => p.code));
  };

  const handleClearAll = () => {
    if (selectedRole?.name === "ADMIN") {
      setAssignedCodes(["permissions.manage"]);
    } else {
      setAssignedCodes([]);
    }
  };

  const groupedPermissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = allPermissions.filter((p) => {
      if (!q) return true;
      return (
        p.code.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });

    const groups: Record<string, PermissionItem[]> = {};
    for (const p of filtered) {
      const cat = getCategoryFromCode(p.code);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }

    return groups;
  }, [allPermissions, search]);

  if (forbidden) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <ShieldAlert size={28} />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">
            Permission Required
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs text-slate-600 leading-relaxed">
            Roles & Permissions management is restricted to authorized
            administrators with <strong className="text-slate-800">permissions.view</strong>.
            Your current role is{" "}
            <strong className="text-slate-800">
              {currentSession?.user.role ?? "UNKNOWN"}
            </strong>
            .
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

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Roles & Permissions
            </h1>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {roles.length} System Roles
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Configure fine-grained access control policies and permission boundaries across CRM modules.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            title="Reload from server"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
          >
            <RotateCw
              size={14}
              className={`text-slate-500 ${loading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>

          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              <Undo2 size={14} />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saving}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-md transition cursor-pointer ${
              hasUnsavedChanges && !saving
                ? "bg-[#1d61e7] shadow-blue-600/25 hover:bg-blue-700"
                : "bg-slate-300 shadow-none cursor-not-allowed opacity-70"
            }`}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            <span>Save Permissions</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateError("");
              setCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-md hover:bg-slate-800 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Create Role</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-bold">Error loading permissions</p>
            <p className="mt-0.5 text-rose-700">{error}</p>
          </div>
        </div>
      )}

      {/* Role Selection Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {roles.map((role) => {
          const isSelected = role.id === selectedRoleId;
          return (
            <div
              key={role.id}
              onClick={() => handleSelectRole(role.id)}
              className={`group relative rounded-2xl border p-4 transition-all cursor-pointer ${
                isSelected
                  ? "border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/10 shadow-sm"
                  : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                        : "bg-slate-100 text-slate-600 group-hover:bg-slate-200/70"
                    }`}
                  >
                    <Shield size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {roleLabel(role.name)}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {role.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    title="Edit role name & description"
                    onClick={(e) => handleOpenEdit(role, e)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                  >
                    <Pencil size={13} />
                  </button>

                  {!SYSTEM_ROLES.includes(role.name) && (
                    <button
                      type="button"
                      title="Delete role"
                      onClick={(e) => handleOpenDelete(role, e)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}

                  {isSelected && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs ml-0.5">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                {role.description || "System workspace role"}
              </p>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Users size={12} className="text-slate-400" />
                  <span>
                    {role._count.users} {role._count.users === 1 ? "user" : "users"}
                  </span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold text-[10px] ${
                    isSelected
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {isSelected ? assignedCodes.length : role._count.permissions} / {allPermissions.length} perms
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Workspace Card: Permissions Matrix */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {/* Toolbar: Search and Bulk Action */}
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-2.5 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search permissions by name or module..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGrantAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <Sparkles size={13} className="text-blue-600" />
              <span>Select All</span>
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            >
              <span>Clear All</span>
            </button>
          </div>
        </div>

        {/* Selected Role Summary Bar */}
        {selectedRole && (
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50/70 border-b border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">
                Configuring permissions for:
              </span>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 font-bold text-blue-800">
                {roleLabel(selectedRole.name)}
              </span>
              <span className="text-slate-400 hidden sm:inline">•</span>
              <span className="text-slate-500 hidden sm:inline">
                {assignedCodes.length} of {allPermissions.length} permissions active
              </span>
            </div>

            {hasUnsavedChanges && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Unsaved Changes
              </span>
            )}
          </div>
        )}

        {/* Permission Groups */}
        <div className="p-6 space-y-6">
          {Object.entries(groupedPermissions).map(([category, items]) => {
            const Icon = CATEGORY_ICONS[category] || Shield;
            const categoryCodes = items.map((i) => i.code);
            const activeCount = categoryCodes.filter((c) =>
              assignedCodes.includes(c),
            ).length;
            const allSelected = activeCount === categoryCodes.length;

            return (
              <div
                key={category}
                className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 transition-all"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Icon size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        {formatCategoryTitle(category)}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {activeCount} of {items.length} enabled
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleCategory(categoryCodes)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                  >
                    {allSelected ? "Deselect Group" : "Select Group"}
                  </button>
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((perm) => {
                    const isChecked = assignedCodes.includes(perm.code);
                    const isLocked =
                      selectedRole?.name === "ADMIN" &&
                      perm.code === "permissions.manage";

                    return (
                      <div
                        key={perm.code}
                        onClick={() => !isLocked && togglePermission(perm.code)}
                        className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                          isLocked
                            ? "border-slate-200 bg-slate-100/70 cursor-not-allowed opacity-90"
                            : isChecked
                            ? "border-blue-200 bg-blue-50/40 hover:bg-blue-50/70 cursor-pointer shadow-2xs"
                            : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/60 cursor-pointer"
                        }`}
                      >
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isLocked}
                            onChange={() => togglePermission(perm.code)}
                            className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-900 leading-snug">
                              {perm.description}
                            </span>
                            {isLocked && (
                              <span title="Required for system administrators">
                                <Lock size={12} className="text-amber-500 shrink-0" />
                              </span>
                            )}
                          </div>
                          <span className="block mt-1 font-mono text-[10px] text-slate-400 truncate">
                            {perm.code}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Role Modal */}
      {createModalOpen && (
        <div
          className="dialog-overlay-in fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs transition-opacity"
          role="dialog"
          aria-modal="true"
          onClick={() => !creatingRole && setCreateModalOpen(false)}
        >
          <div
            className="dialog-enter flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Create New Role
                  </h3>
                  <p className="text-xs text-slate-500">
                    Define a custom workspace role and base permissions.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                disabled={creatingRole}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateRole} className="p-6 space-y-4">
              {createError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Role Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Support Specialist or LEAD_QUALIFIER"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Names will be converted to uppercase identifiers (e.g. SUPPORT_SPECIALIST).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Briefly describe the responsibilities and scope of this role..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Copy Permissions From (Optional)
                </label>
                <select
                  value={copyFromRoleId}
                  onChange={(e) =>
                    setCopyFromRoleId(
                      e.target.value === "none" ? "none" : Number(e.target.value),
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="none">Start with no permissions</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {roleLabel(r.name)} ({r._count.permissions} permissions)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={creatingRole}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingRole}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
                >
                  {creatingRole ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  <span>Create Role</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editModalOpen && editingRole && (
        <div
          className="dialog-overlay-in fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs transition-opacity"
          role="dialog"
          aria-modal="true"
          onClick={() => !savingEditRole && setEditModalOpen(false)}
        >
          <div
            className="dialog-enter flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Pencil size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Role
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update role identity and details.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                disabled={savingEditRole}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="p-6 space-y-4">
              {editError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Role Name
                </label>
                <input
                  type="text"
                  required
                  disabled={SYSTEM_ROLES.includes(editingRole.name)}
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
                />
                {SYSTEM_ROLES.includes(editingRole.name) && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    System core role names cannot be renamed.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editRoleDesc}
                  onChange={(e) => setEditRoleDesc(e.target.value)}
                  placeholder="Role description..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  disabled={savingEditRole}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditRole}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
                >
                  {savingEditRole && <Loader2 size={14} className="animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && roleToDelete && (
        <div
          className="dialog-overlay-in fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs transition-opacity"
          role="dialog"
          aria-modal="true"
          onClick={() => !deletingRole && setDeleteModalOpen(false)}
        >
          <div
            className="dialog-enter flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
                <Trash2 size={22} />
              </div>

              <h3 className="text-base font-bold text-slate-900">
                Delete Role
              </h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Are you sure you want to delete the role{" "}
                <strong className="text-slate-900">{roleLabel(roleToDelete.name)}</strong>?
                This action cannot be undone.
              </p>

              {roleToDelete._count.users > 0 ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      This role currently has <strong>{roleToDelete._count.users} user(s)</strong> assigned. Select another role to transfer those users to:
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Reassign users to
                    </label>
                    <select
                      value={reassignRoleId ?? ""}
                      onChange={(e) => setReassignRoleId(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {roles
                        .filter((r) => r.id !== roleToDelete.id)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {roleLabel(r.name)} ({r.name})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <Shield size={15} className="text-slate-500 shrink-0 mt-0.5" />
                  <span>
                    No users are currently assigned to this role. It can be safely deleted immediately.
                  </span>
                </div>
              )}

              {deleteError && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={deletingRole}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRole}
                  disabled={
                    deletingRole ||
                    (roleToDelete._count.users > 0 && !reassignRoleId)
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-rose-600/25 hover:bg-rose-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingRole && <Loader2 size={14} className="animate-spin" />}
                  <span>Delete Role</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
