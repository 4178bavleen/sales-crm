import {
  X,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  Clock,
  Pencil,
  Power,
  ShieldCheck,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100 my-8">
        {/* Banner with avatar */}
        <div className="relative bg-gradient-to-r from-[#0b1328] via-[#12234e] to-[#1d61e7] p-6 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-lg bg-white/10 p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md text-xl font-bold text-white border border-white/20 shadow-lg">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white truncate">
                  {user.name}
                </h3>
                {isSelf && (
                  <span className="rounded-full bg-blue-500/30 border border-blue-400/40 px-2 py-0.5 text-[10px] font-semibold text-blue-200 uppercase tracking-wider">
                    You
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 truncate mt-0.5">
                {user.email}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}
                >
                  <ShieldCheck size={12} />
                  {config.label}
                </span>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    user.isActive
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                      : "bg-slate-500/20 text-slate-300 border border-slate-400/30"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      user.isActive ? "bg-emerald-400" : "bg-slate-400"
                    }`}
                  />
                  {user.isActive ? "Active Account" : "Suspended"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-6">
          {/* Contact & Profile Details */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Account Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Mail size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-slate-400">Email Address</p>
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Phone size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-slate-400">Phone</p>
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {user.phone || "No phone listed"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Calendar size={15} />
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

              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Clock size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-slate-400">User ID</p>
                  <p className="truncate text-xs font-semibold text-slate-800">
                    #{user.id}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Role Permissions & Capabilities */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Role Permissions ({config.label})
            </h4>
            <p className="text-xs text-slate-500 mb-3">{config.description}</p>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-2">
              {config.permissions.map((perm: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-700">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span>{perm}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={isSelf}
              onClick={() => {
                onToggleActive(user);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                user.isActive
                  ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                  : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              <Power size={14} />
              {user.isActive ? "Deactivate Account" : "Activate Account"}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(user);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition"
              >
                <Pencil size={13} />
                Edit User
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
