import { useEffect } from "react";
import {
  X,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  Pencil,
  Power,
  ShieldCheck,
  Hash,
} from "lucide-react";
import type { UserRow } from "../../types/user";
import { ROLE_CONFIG, roleLabel } from "../../lib/users";

export type UserDetailDialogProps = {
  user: UserRow | null;
  isOpen: boolean;
  currentUserId?: number;
  onClose: () => void;
  onEdit: (user: UserRow) => void;
  onToggleActive: (user: UserRow) => void;
};

export default function UserDetailDialog({
  user,
  isOpen,
  currentUserId,
  onClose,
  onEdit,
  onToggleActive,
}: UserDetailDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const roleName = user.role.name as keyof typeof ROLE_CONFIG;
  const config = ROLE_CONFIG[roleName] || {
    label: roleLabel(user.role.name),
    description: "CRM System User",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-700",
    badgeBorder: "border-slate-200",
    dotColor: "bg-slate-400",
    permissions: ["Standard workspace access"],
  };

  const isSelf = Boolean(currentUserId && user.id === currentUserId);

  return (
    <div
      className="dialog-overlay-in fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="dialog-enter flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4 bg-white">
          <div>
            <p className="text-xs font-medium text-slate-500">User details</p>
            <h2 className="mt-0.5 text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>{user.name}</span>
              {isSelf && (
                <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700 uppercase tracking-wider">
                  You
                </span>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(user);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            >
              <Pencil size={13} className="text-slate-500" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-6 space-y-5">
          {/* User Profile Card */}
          <div className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#1d61e7] text-lg font-bold text-white shadow-md shadow-blue-500/20">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-base font-bold text-slate-900">
                  {user.name}
                </p>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                    user.isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      user.isActive ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                  {user.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500 font-medium">
                {user.email}
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}
                >
                  <ShieldCheck size={12} />
                  {config.label}
                </span>
                <span className="text-[11px] text-slate-400">
                  User ID #{user.id}
                </span>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Account Information
            </h3>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-3 hover:border-slate-300 transition">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Mail size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-slate-400">Email Address</p>
                  <p className="truncate text-xs font-semibold text-slate-800" title={user.email}>
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-3 hover:border-slate-300 transition">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Phone size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-slate-400">Phone Number</p>
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {user.phone || "No phone listed"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-3 hover:border-slate-300 transition">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Calendar size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-slate-400">Joined Date</p>
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {new Date(user.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-3 hover:border-slate-300 transition">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Hash size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-slate-400">System Role</p>
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {config.label}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Role & Workspace Permissions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Workspace Capabilities
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                {config.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-2.5">{config.description}</p>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-2">
              {config.permissions.map((perm: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-700">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span className="font-medium">{perm}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-3.5">
          <button
            type="button"
            disabled={isSelf}
            onClick={() => onToggleActive(user)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              user.isActive
                ? "border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
                : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            <Power size={13} />
            {user.isActive ? "Deactivate" : "Activate"}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(user);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d61e7] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition cursor-pointer"
            >
              <Pencil size={13} />
              Edit User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
