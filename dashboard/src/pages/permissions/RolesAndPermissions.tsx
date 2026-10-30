import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
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
  Sparkles,
  Plus,
  X,
  Pencil,
  Trash2,
  Layers,
  Activity,
  Briefcase,
  CheckCheck,
  Eye,
  Table as TableIcon,
  LayoutGrid,
  ChevronDown,
  Filter,
  Target,
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
import StatCard from "../../components/ui/StatCard";

const CATEGORY_ICONS: Record<string, typeof Shield> = {
  dashboard: LayoutDashboard,
  leads: Users,
  contacts: UserCheck,
  companies: Building2,
  deals: FolderGit2,
  tasks: CheckSquare,
  meetings: CalendarDays,
  targets: Target,
  reports: BarChart3,
  users: UserCheck,
  permissions: KeyRound,
};

function getCategoryFromCode(code: string): string {
  const [cat] = code.split(".");
  return cat || "other";
}

function getActionFromCode(code: string): string {
  const parts = code.split(".");
  return parts[parts.length - 1] || "access";
}

function getActionBadgeStyle(action: string): { bg: string; text: string; border: string } {
  switch (action.toLowerCase()) {
    case "create":
      return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
    case "view":
      return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" };
    case "edit":
      return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
    case "delete":
      return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" };
    case "assign":
    case "export":
      return { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" };
    case "manage":
      return { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" };
    default:
      return { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
  }
}

function formatCategoryTitle(category: string): string {
  switch (category) {
    case "dashboard":
      return "Dashboard";
    case "leads":
      return "Leads";
    case "contacts":
      return "Contacts";
    case "companies":
      return "Companies";
    case "deals":
      return "Deals";
    case "tasks":
      return "Tasks";
    case "meetings":
      return "Meetings";
    case "targets":
      return "Sales Targets";
    case "reports":
      return "Reports";
    case "users":
      return "Users";
    case "permissions":
      return "Permissions";
    default:
      return category.charAt(0).toUpperCase() + category.slice(1);
  }
}

function formatCategoryDesc(category: string): string {
  switch (category) {
    case "dashboard":
      return "Workspace metrics, KPI charts, and aggregated sales analytics";
    case "leads":
      return "Inbound prospects, pipeline status, and lead ownership";
    case "contacts":
      return "Individual customer directory and client profiles";
    case "companies":
      return "Corporate accounts, organizations, and firmographic data";
    case "deals":
      return "Sales opportunities, stages, deal values, and forecasts";
    case "tasks":
      return "Team action items, reminders, and follow-up activities";
    case "meetings":
      return "Client consultations, appointments, and calendar events";
    case "targets":
      return "Revenue quotas, team performance, and attainment targets";
    case "reports":
      return "Business intelligence, revenue performance, and exports";
    case "users":
      return "Staff directory, team account provisioning, and user profiles";
    case "permissions":
      return "Security boundary management and RBAC access roles";
    default:
      return "Module capabilities and system privileges";
  }
}

function formatPermissionLabel(code: string, fallbackDesc: string): string {
  const parts = code.split(".");
  const action = parts[parts.length - 1] || "";
  const resource = parts[0] || "";

  const resourceMap: Record<string, string> = {
    dashboard: "Dashboard",
    leads: "Leads",
    contacts: "Contacts",
    companies: "Companies",
    deals: "Deals",
    tasks: "Tasks",
    meetings: "Meetings",
    targets: "Sales Targets",
    reports: "Reports",
    users: "Team Members",
    permissions: "Role Permissions",
  };

  const actionMap: Record<string, string> = {
    view: "View & Browse",
    create: "Create New",
    edit: "Edit & Update",
    delete: "Delete & Remove",
    assign: "Assign Ownership",
    export: "Export to CSV",
    manage: "Full Management",
  };

  const actLabel = actionMap[action] || action.toUpperCase();
  const resLabel = resourceMap[resource] || resource;

  if (fallbackDesc && fallbackDesc.trim()) {
    return fallbackDesc;
  }

  return `${actLabel} ${resLabel}`;
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
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("ALL");
  const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false);
  const moduleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        moduleDropdownRef.current &&
        !moduleDropdownRef.current.contains(event.target as Node)
      ) {
        setModuleDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [permissionViewMode, setPermissionViewMode] = useState<"matrix" | "cards">("matrix");
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
        const targetRole = rolesData.find((r) => r.id === defaultRole);
        const codes =
          targetRole?.name === "ADMIN"
            ? permsData.map((p) => p.code)
            : detail.permissions.map((p) => p.code);
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
      const targetRole = roles.find((r) => r.id === roleId);
      if (targetRole?.name === "ADMIN") {
        const allCodes = allPermissions.map((p) => p.code);
        setAssignedCodes(allCodes);
        setOriginalCodes(allCodes);
      } else {
        const detail = await fetchRolePermissions(roleId);
        const codes = detail.permissions.map((p) => p.code);
        setAssignedCodes(codes);
        setOriginalCodes(codes);
      }
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

  const isAdminRole = selectedRole?.name === "ADMIN";

  const hasUnsavedChanges = useMemo(() => {
    if (isAdminRole) return false;
    if (assignedCodes.length !== originalCodes.length) return true;
    const originalSet = new Set(originalCodes);
    return assignedCodes.some((code) => !originalSet.has(code));
  }, [assignedCodes, originalCodes, isAdminRole]);

  const togglePermission = (code: string) => {
    if (isAdminRole) {
      showToast(
        "error",
        "The ADMIN role always retains all system permissions and cannot be modified.",
      );
      return;
    }

    setAssignedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const handleSetModulePreset = (category: string, preset: "none" | "read" | "full") => {
    if (isAdminRole) {
      showToast(
        "error",
        "The ADMIN role always retains all system permissions and cannot be modified.",
      );
      return;
    }

    const categoryPerms = allPermissions.filter(
      (p) => getCategoryFromCode(p.code) === category,
    );
    const categoryCodes = categoryPerms.map((p) => p.code);
    const viewCode = `${category}.view`;

    setAssignedCodes((prev) => {
      let next = prev.filter((c) => !categoryCodes.includes(c));

      if (preset === "full") {
        next = [...next, ...categoryCodes];
      } else if (preset === "read") {
        if (categoryCodes.includes(viewCode)) {
          next = [...next, viewCode];
        }
      }

      return next;
    });
  };

  const getModuleAccessStatus = (category: string) => {
    const categoryCodes = allPermissions
      .filter((p) => getCategoryFromCode(p.code) === category)
      .map((p) => p.code);
    const activeCount = categoryCodes.filter((c) => assignedCodes.includes(c)).length;

    if (activeCount === 0) {
      return { label: "No Access", color: "bg-slate-100 text-slate-500 border-slate-200" };
    }
    if (activeCount === categoryCodes.length) {
      return { label: "Full Access", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
    if (activeCount === 1 && assignedCodes.includes(`${category}.view`)) {
      return { label: "Read Only", color: "bg-blue-50 text-blue-700 border-blue-200" };
    }
    return {
      label: `${activeCount}/${categoryCodes.length} Active`,
      color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    };
  };

  const handleSave = async () => {
    if (!selectedRoleId || isAdminRole) return;
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

  const handleGrantAll = () => {
    if (isAdminRole) return;
    setAssignedCodes(allPermissions.map((p) => p.code));
  };

  const handleClearAll = () => {
    if (isAdminRole) return;
    setAssignedCodes([]);
  };

  // Grouped permissions by category
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    allPermissions.forEach((p) => set.add(getCategoryFromCode(p.code)));
    return Array.from(set);
  }, [allPermissions]);

  const groupedPermissions = useMemo(() => {
    const map: Record<string, PermissionItem[]> = {};
    for (const perm of allPermissions) {
      const cat = getCategoryFromCode(perm.code);
      if (selectedCategoryTab !== "ALL" && cat !== selectedCategoryTab) {
        continue;
      }
      if (
        search.trim() &&
        !perm.code.toLowerCase().includes(search.toLowerCase()) &&
        !perm.description.toLowerCase().includes(search.toLowerCase())
      ) {
        continue;
      }
      if (!map[cat]) map[cat] = [];
      map[cat].push(perm);
    }
    return map;
  }, [allPermissions, search, selectedCategoryTab]);

  // Overall KPI metrics
  const totalAssignedUsers = useMemo(() => {
    return roles.reduce((acc, r) => acc + (r._count?.users || 0), 0);
  }, [roles]);

  const selectedRoleCoverage = useMemo(() => {
    if (!allPermissions.length) return 0;
    return Math.round((assignedCodes.length / allPermissions.length) * 100);
  }, [assignedCodes, allPermissions]);

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
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-3 ${
            toastMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50/95 text-emerald-900 shadow-emerald-900/10"
              : "border-rose-200 bg-rose-50/95 text-rose-900 shadow-rose-900/10"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 size={17} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={17} className="text-rose-600 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toastMessage.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Roles & Permissions
            </h1>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/60">
              {roles.length} Active Roles
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Configure access controls, define role privileges, and enforce granular security across CRM modules.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            title="Reload from server"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-50 cursor-pointer"
          >
            <RotateCw
              size={14}
              className={`text-slate-500 ${loading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateError("");
              setCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Create Role</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Configured Roles"
          value={roles.length}
          subtext={`1 Root, ${Math.max(0, roles.length - 1)} Configurable`}
          icon={Layers}
          color="blue"
        />
        <StatCard
          label="Assigned Team"
          value={totalAssignedUsers}
          subtext={`Mapped across ${roles.length} roles`}
          icon={Users}
          color="indigo"
        />
        <StatCard
          label={`${selectedRole ? roleLabel(selectedRole.name) : "Active Role"} Coverage`}
          value={`${selectedRoleCoverage}%`}
          subtext={`${assignedCodes.length}/${allPermissions.length} permissions`}
          icon={Activity}
          color="emerald"
        />
        <StatCard
          label="Security Bounds"
          value={allPermissions.length}
          subtext={`Across ${categoriesList.length} modules`}
          icon={KeyRound}
          color="purple"
        />
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-bold">Error loading permissions</p>
            <p className="mt-0.5 text-rose-700">{error}</p>
          </div>
        </div>
      )}

      {/* 2-Column Responsive Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Roles Navigation Card */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Access Roles</h3>
                <p className="text-[11px] text-slate-400">Select a role to inspect or edit permissions</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreateError("");
                  setCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer"
              >
                <Plus size={13} />
                <span>New</span>
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {roles.map((role) => {
                const isSelected = role.id === selectedRoleId;
                const isSystem = SYSTEM_ROLES.includes(role.name);
                const rolePermCount = isSelected ? assignedCodes.length : role._count.permissions;
                const percentage = allPermissions.length
                  ? Math.round((rolePermCount / allPermissions.length) * 100)
                  : 0;

                return (
                  <div
                    key={role.id}
                    onClick={() => handleSelectRole(role.id)}
                    className={`group relative rounded-xl border p-3.5 transition-all cursor-pointer ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/10 shadow-xs"
                        : "border-slate-200/70 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 group-hover:bg-slate-200/80"
                          }`}
                        >
                          {isSystem ? <Shield size={17} /> : <Briefcase size={17} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {roleLabel(role.name)}
                            </h4>
                            {isSystem && (
                              <span className="rounded-md bg-amber-50 border border-amber-200/70 px-1.5 py-0.2 text-[9px] font-semibold text-amber-700">
                                SYSTEM
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {role.name}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          title="Edit role metadata"
                          onClick={(e) => handleOpenEdit(role, e)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                        >
                          <Pencil size={13} />
                        </button>

                        {!isSystem && (
                          <button
                            type="button"
                            title="Delete role"
                            onClick={(e) => handleOpenDelete(role, e)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}

                        {isSelected && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white ml-0.5">
                            <Check size={11} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="mt-2 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {role.description || "Workspace team access tier"}
                    </p>

                    {/* Mini metrics bar */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Users size={12} className="text-slate-400" />
                        <span className="font-medium text-slate-700">
                          {role._count.users} {role._count.users === 1 ? "user" : "users"}
                        </span>
                      </span>

                      <span className="font-semibold text-slate-700 text-[10px]">
                        {rolePermCount} / {allPermissions.length} perms ({percentage}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-1.5 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isSelected ? "bg-blue-600" : "bg-slate-400"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Permission Assignment Studio Card */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-4">
          {selectedRole ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
              {/* Studio Header Banner */}
              <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-blue-50/20">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
                      <Shield size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">
                          {roleLabel(selectedRole.name)}
                        </h2>
                        <span className="rounded-full bg-blue-50 border border-blue-200/60 px-2 py-0.5 text-[10px] font-bold text-blue-700 font-mono">
                          {selectedRole.name}
                        </span>
                        {SYSTEM_ROLES.includes(selectedRole.name) && (
                          <span className="rounded-full bg-amber-50 border border-amber-200/70 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Root Protected
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {selectedRole.description || "Configuring access boundaries for this workspace tier"}
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  {isAdminRole ? (
                    <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs">
                      <Lock size={13} className="text-amber-500" />
                      <span>Admin Permissions Locked</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {hasUnsavedChanges && (
                        <button
                          type="button"
                          onClick={handleReset}
                          disabled={saving}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                        >
                          <Undo2 size={13} />
                          <span>Discard</span>
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
                        <span>Save Changes</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Sub status alert */}
                {isAdminRole ? (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-2 text-xs text-blue-900">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={15} className="text-blue-600 shrink-0" />
                      <span className="font-semibold">The ADMIN role automatically holds all {allPermissions.length} system permissions.</span>
                      <span className="text-blue-700 hidden sm:inline">— To prevent lockouts, administrator privileges cannot be edited.</span>
                    </div>
                    <span className="rounded-md bg-blue-200/60 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                      Full Access
                    </span>
                  </div>
                ) : hasUnsavedChanges ? (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2 text-xs text-amber-800">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="font-semibold">Unsaved permission changes</span>
                      <span className="text-amber-700 hidden sm:inline">
                        — Click "Save Changes" to apply this policy.
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-900">
                      {assignedCodes.length} active
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Filtering, Search & View Switcher Toolbar */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 max-w-xl">
                    <div className="relative flex-1">
                      <Search
                        size={15}
                        className="absolute left-3.5 top-2.5 text-slate-400"
                      />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search capability or code (e.g. leads.create, deals)..."
                        className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    {/* Custom Module Filter Dropdown */}
                    <div className="relative" ref={moduleDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setModuleDropdownOpen((prev) => !prev)}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition cursor-pointer shadow-2xs whitespace-nowrap ${
                          selectedCategoryTab !== "ALL"
                            ? "border-blue-500 bg-blue-50/50 text-blue-700 ring-2 ring-blue-500/10 font-semibold"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Filter
                          size={13}
                          className={selectedCategoryTab !== "ALL" ? "text-blue-600" : "text-slate-400"}
                        />
                        <span>
                          {selectedCategoryTab === "ALL"
                            ? "All Modules"
                            : formatCategoryTitle(selectedCategoryTab)}
                        </span>
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                            selectedCategoryTab !== "ALL"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {selectedCategoryTab === "ALL"
                            ? allPermissions.length
                            : allPermissions.filter((p) => getCategoryFromCode(p.code) === selectedCategoryTab).length}
                        </span>
                        <ChevronDown
                          size={13}
                          className={`text-slate-400 transition-transform duration-150 ${
                            moduleDropdownOpen ? "rotate-180 text-blue-600" : ""
                          }`}
                        />
                      </button>

                      {moduleDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1.5 z-40 w-60 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 max-h-80 overflow-y-auto">
                          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Filter by Module
                          </div>
                          <div className="space-y-0.5 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCategoryTab("ALL");
                                setModuleDropdownOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition cursor-pointer ${
                                selectedCategoryTab === "ALL"
                                  ? "bg-blue-50 text-blue-700 font-semibold"
                                  : "text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Layers
                                  size={14}
                                  className={selectedCategoryTab === "ALL" ? "text-blue-600" : "text-slate-400"}
                                />
                                <span>All Modules</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600 font-semibold">
                                  {allPermissions.length}
                                </span>
                                {selectedCategoryTab === "ALL" && (
                                  <Check size={14} className="text-blue-600" />
                                )}
                              </div>
                            </button>

                            {categoriesList.map((cat) => {
                              const Icon = CATEGORY_ICONS[cat] || Shield;
                              const countInCat = allPermissions.filter(
                                (p) => getCategoryFromCode(p.code) === cat,
                              ).length;
                              const isSelected = selectedCategoryTab === cat;

                              return (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCategoryTab(cat);
                                    setModuleDropdownOpen(false);
                                  }}
                                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition cursor-pointer ${
                                    isSelected
                                      ? "bg-blue-50 text-blue-700 font-semibold"
                                      : "text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <Icon
                                      size={14}
                                      className={isSelected ? "text-blue-600" : "text-slate-400"}
                                    />
                                    <span>{formatCategoryTitle(cat)}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600 font-semibold">
                                      {countInCat}
                                    </span>
                                    {isSelected && (
                                      <Check size={14} className="text-blue-600" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* View Switcher: Matrix vs Cards */}
                    <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setPermissionViewMode("matrix")}
                        title="Permission Matrix Table view"
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                          permissionViewMode === "matrix"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        <TableIcon size={13} />
                        <span>Matrix</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPermissionViewMode("cards")}
                        title="Detailed Capability Cards view"
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                          permissionViewMode === "cards"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        <LayoutGrid size={13} />
                        <span>Cards</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isAdminRole}
                      onClick={handleGrantAll}
                      className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs ${
                        isAdminRole
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-slate-50 transition cursor-pointer"
                      }`}
                    >
                      <Sparkles size={13} className="text-blue-600" />
                      <span>Select All</span>
                    </button>
                    <button
                      type="button"
                      disabled={isAdminRole}
                      onClick={handleClearAll}
                      className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-2xs ${
                        isAdminRole
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-rose-50 transition cursor-pointer"
                      }`}
                    >
                      <CheckCheck size={13} />
                      <span>Clear All</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* PERMISSION ASSIGN CONTENT: MATRIX VIEW OR CARDS VIEW */}
              {Object.keys(groupedPermissions).length === 0 ? (
                <div className="p-12 text-center">
                  <Search size={28} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No capabilities matched</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Try clearing your search query or switching category tabs.</p>
                </div>
              ) : permissionViewMode === "matrix" ? (
                /* 1. ENTERPRISE PERMISSION MATRIX TABLE */
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200/90 bg-slate-50/90 text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none">
                        <th className="py-3 px-4 min-w-[200px]">Module / Feature</th>
                        <th className="py-3 px-3 text-center w-24">
                          <div className="flex items-center justify-center gap-1 text-blue-700">
                            <Eye size={13} />
                            <span>View</span>
                          </div>
                        </th>
                        <th className="py-3 px-3 text-center w-24">
                          <div className="flex items-center justify-center gap-1 text-emerald-700">
                            <Plus size={13} />
                            <span>Create</span>
                          </div>
                        </th>
                        <th className="py-3 px-3 text-center w-24">
                          <div className="flex items-center justify-center gap-1 text-amber-700">
                            <Pencil size={13} />
                            <span>Edit</span>
                          </div>
                        </th>
                        <th className="py-3 px-3 text-center w-24">
                          <div className="flex items-center justify-center gap-1 text-rose-700">
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </div>
                        </th>
                        <th className="py-3 px-3 text-center w-28">
                          <div className="flex items-center justify-center gap-1 text-indigo-700">
                            <KeyRound size={13} />
                            <span>Special</span>
                          </div>
                        </th>
                        <th className="py-3 px-4 text-right min-w-[190px]">Quick Presets</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {Object.entries(groupedPermissions).map(([category, items]) => {
                        const Icon = CATEGORY_ICONS[category] || Shield;
                        const status = getModuleAccessStatus(category);

                        // Look up permissions for standard CRUD + Special
                        const viewPerm = items.find((p) => p.code === `${category}.view`);
                        const createPerm = items.find((p) => p.code === `${category}.create`);
                        const editPerm = items.find((p) => p.code === `${category}.edit`);
                        const deletePerm = items.find((p) => p.code === `${category}.delete`);
                        const specialPerm = items.find(
                          (p) =>
                            p.code !== `${category}.view` &&
                            p.code !== `${category}.create` &&
                            p.code !== `${category}.edit` &&
                            p.code !== `${category}.delete`,
                        );

                        const renderCell = (perm?: PermissionItem) => {
                          if (!perm) {
                            return <span className="text-slate-200 select-none font-bold">—</span>;
                          }

                          if (isAdminRole) {
                            return (
                              <div
                                title="ADMIN holds all permissions permanently and cannot be edited"
                                className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 border border-blue-200/80 text-blue-600 cursor-not-allowed shadow-2xs"
                              >
                                <Check size={13} strokeWidth={3} />
                              </div>
                            );
                          }

                          const isChecked = assignedCodes.includes(perm.code);

                          return (
                            <button
                              type="button"
                              onClick={() => togglePermission(perm.code)}
                              title={`${perm.code}: ${perm.description}`}
                              className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg transition cursor-pointer ${
                                isChecked
                                  ? "bg-[#1d61e7] text-white shadow-xs hover:bg-blue-700 ring-2 ring-blue-500/20"
                                  : "border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-transparent"
                              }`}
                            >
                              {isChecked ? (
                                <Check size={14} strokeWidth={3} />
                              ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                              )}
                            </button>
                          );
                        };

                        return (
                          <tr
                            key={category}
                            className="hover:bg-slate-50/60 transition group"
                          >
                            {/* Feature / Module */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600 transition shrink-0">
                                  <Icon size={16} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900">
                                      {formatCategoryTitle(category)}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400">
                                      ({items.length})
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                                    {formatCategoryDesc(category)}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* View */}
                            <td className="py-3 px-3 text-center">{renderCell(viewPerm)}</td>

                            {/* Create */}
                            <td className="py-3 px-3 text-center">{renderCell(createPerm)}</td>

                            {/* Edit */}
                            <td className="py-3 px-3 text-center">{renderCell(editPerm)}</td>

                            {/* Delete */}
                            <td className="py-3 px-3 text-center">{renderCell(deletePerm)}</td>

                            {/* Special (Assign / Manage / etc.) */}
                            <td className="py-3 px-3 text-center">
                              {specialPerm ? (
                                <div className="flex flex-col items-center gap-1">
                                  {renderCell(specialPerm)}
                                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tight">
                                    {getActionFromCode(specialPerm.code)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-200 select-none font-bold">—</span>
                              )}
                            </td>

                            {/* Access Level Status & Quick Presets */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold shrink-0 ${status.color}`}
                                >
                                  {status.label}
                                </span>

                                {isAdminRole ? (
                                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                                    Permanent
                                  </span>
                                ) : (
                                  <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-[10px] font-semibold text-slate-600 shadow-2xs">
                                    <button
                                      type="button"
                                      onClick={() => handleSetModulePreset(category, "none")}
                                      className="rounded-md px-1.5 py-0.5 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                                      title="Revoke all capabilities in this module"
                                    >
                                      None
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSetModulePreset(category, "read")}
                                      className="rounded-md px-1.5 py-0.5 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
                                      title="View-only access"
                                    >
                                      Read
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSetModulePreset(category, "full")}
                                      className="rounded-md px-1.5 py-0.5 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
                                      title="Grant all capabilities in this module"
                                    >
                                      Full
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* 2. DETAILED CAPABILITY CARDS VIEW */
                <div className="p-5 space-y-5">
                  {Object.entries(groupedPermissions).map(([category, items]) => {
                    const Icon = CATEGORY_ICONS[category] || Shield;
                    const status = getModuleAccessStatus(category);

                    return (
                      <div
                        key={category}
                        className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs"
                      >
                        {/* Group Header with Presets */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-slate-50/70 border-b border-slate-100 gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200/70 text-blue-600 shadow-2xs">
                              <Icon size={15} />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 tracking-wide">
                                {formatCategoryTitle(category)}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-medium">
                                {items.length} capabilities defined
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${status.color}`}>
                              {status.label}
                            </span>

                            {isAdminRole ? (
                              <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                                Permanent
                              </span>
                            ) : (
                              <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-[10px] font-semibold text-slate-600 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleSetModulePreset(category, "none")}
                                  className="rounded-md px-1.5 py-0.5 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                                >
                                  None
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetModulePreset(category, "read")}
                                  className="rounded-md px-1.5 py-0.5 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
                                >
                                  Read
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetModulePreset(category, "full")}
                                  className="rounded-md px-1.5 py-0.5 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
                                >
                                  Full
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Permission Tiles Grid */}
                        <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                          {items.map((perm) => {
                            const isChecked = isAdminRole || assignedCodes.includes(perm.code);
                            const action = getActionFromCode(perm.code);
                            const badgeStyle = getActionBadgeStyle(action);
                            const isLocked = isAdminRole;

                            return (
                              <div
                                key={perm.code}
                                onClick={() => togglePermission(perm.code)}
                                className={`group relative flex flex-col justify-between rounded-xl border p-3 transition-all ${
                                  isLocked
                                    ? "border-slate-200 bg-slate-50/70 cursor-not-allowed opacity-85"
                                    : isChecked
                                    ? "border-blue-300 bg-blue-50/30 ring-1 ring-blue-500/10 shadow-2xs cursor-pointer"
                                    : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/40 cursor-pointer"
                                }`}
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2">
                                    <span
                                      className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                                    >
                                      {action}
                                    </span>

                                    {/* Custom Modern Switch */}
                                    <div
                                      className={`relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                        isLocked
                                          ? "bg-blue-600/70 cursor-not-allowed"
                                          : isChecked
                                          ? "bg-blue-600 cursor-pointer"
                                          : "bg-slate-200 cursor-pointer"
                                      }`}
                                    >
                                      <span
                                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                          isChecked ? "translate-x-3" : "translate-x-0"
                                        }`}
                                      />
                                    </div>
                                  </div>

                                  <h5 className="mt-2 text-xs font-bold text-slate-800 leading-snug">
                                    {formatPermissionLabel(perm.code, perm.description)}
                                  </h5>

                                  <p className="mt-0.5 text-[10px] font-mono text-slate-400">
                                    {perm.code}
                                  </p>
                                </div>

                                {isAdminRole && (
                                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                                    <Lock size={10} className="text-slate-400" />
                                    <span>Admin Privilege (Permanent)</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <Shield size={32} className="mx-auto text-slate-400 mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No Role Selected</h3>
              <p className="text-xs text-slate-500 mt-1">Please select a role from the left list to inspect its policy.</p>
            </div>
          )}
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
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Create New Access Role
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Define a new role and baseline permissions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

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
                  placeholder="e.g. MARKETING_DIRECTOR"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Briefly describe responsibilities and permissions..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Copy Permissions From Template
                </label>
                <select
                  value={copyFromRoleId}
                  onChange={(e) =>
                    setCopyFromRoleId(
                      e.target.value === "none" ? "none" : Number(e.target.value),
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="none">Start with 0 permissions (Clean slate)</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      Clone from {roleLabel(r.name)} ({r._count.permissions} perms)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={creatingRole}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingRole}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
                >
                  {creatingRole && <Loader2 size={14} className="animate-spin" />}
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
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Pencil size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Edit Role Details
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Update role display name and description
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={16} />
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
