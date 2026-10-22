import { useState } from "react";
import { AlertTriangle, Loader2, X, ShieldAlert } from "lucide-react";
import type { UserRow } from "../../types/user";
import { roleLabel } from "../../lib/users";

export type UserDeleteDialogProps = {
  user: UserRow | null;
  currentUserId?: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (user: UserRow) => Promise<void>;
};

export default function UserDeleteDialog({
  user,
  currentUserId,
  isOpen,
  onClose,
  onConfirm,
}: UserDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !user) return null;

  const isSelf = Boolean(currentUserId && user.id === currentUserId);

  async function handleConfirm() {
    if (isSelf || !user) return;
    setIsDeleting(true);
    setError("");
    try {
      await onConfirm(user);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Could not delete user account.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100 my-8">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
              <AlertTriangle size={24} />
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-4">
            <h3 className="text-base font-bold text-slate-900">
              Deactivate & Remove Account
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              Are you sure you want to remove{" "}
              <strong className="text-slate-800">{user.name}</strong>? This will revoke
              their sign-in credentials and access to the CRM workspace.
            </p>
          </div>

          {/* User summary card */}
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800">
                {user.name}
              </p>
              <p className="truncate text-[11px] text-slate-400">
                {user.email} • {roleLabel(user.role.name)}
              </p>
            </div>
          </div>

          {/* Prevent self delete alert */}
          {isSelf && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <span>
                <strong>Action forbidden:</strong> You cannot delete or revoke your own
                account while logged into it.
              </span>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Footer buttons */}
          <div className="mt-6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting || isSelf}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-rose-600/25 hover:bg-rose-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isDeleting && <Loader2 size={14} className="animate-spin" />}
              Revoke & Remove User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
