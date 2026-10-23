import { useState } from "react";
import { Loader2, X, Trash2, Building2, Mail, Phone } from "lucide-react";
import type { Contact } from "../../types/contact";
import Avatar from "./Avatar";

export type ContactDeleteDialogProps = {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (contact: Contact) => Promise<void>;
};

export default function ContactDeleteDialog({
  contact,
  isOpen,
  onClose,
  onConfirm,
}: ContactDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !contact) return null;

  async function handleConfirm() {
    if (!contact) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm(contact);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to delete contact.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div
      className="dialog-overlay-in fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Delete contact confirmation"
      onClick={onClose}
    >
      <div
        className="dialog-enter relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
              <Trash2 size={22} />
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-4">
            <h3 className="text-base font-bold text-slate-900">
              Delete Contact
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              Are you sure you want to delete{" "}
              <strong className="text-slate-900 font-semibold">{contact.fullName}</strong>?
              This record will be permanently removed from your CRM.
            </p>
          </div>

          {/* Contact summary card */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
            <div className="flex items-center gap-3">
              <Avatar name={contact.fullName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-900">
                  {contact.fullName}
                </p>
                {contact.jobTitle && (
                  <p className="truncate text-[11px] text-slate-500">
                    {contact.jobTitle}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 gap-1.5 text-[11px] text-slate-600">
              {contact.company && (
                <div className="flex items-center gap-2 truncate">
                  <Building2 size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{contact.company}</span>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-2 truncate">
                  <Mail size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{contact.email}</span>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 truncate">
                  <Phone size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{contact.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Error alert if failure */}
          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  <span>Delete Contact</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
