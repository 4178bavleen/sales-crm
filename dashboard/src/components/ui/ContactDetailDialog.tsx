import { X } from "lucide-react";
import type { ContactDetailDialogProps } from "../../types/contactUi";
import { contactDetailFields } from "../../data/contactColumns";
import Avatar from "./Avatar";

/**
 * Centered modal showing a single contact's details.
 * Contacts are read-only here; closing (Esc, backdrop, close button) is
 * handled by the parent.
 */
export default function ContactDetailDialog({
  contact,
  onClose,
}: ContactDetailDialogProps) {
  return (
    <div
      className="dialog-overlay-in fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Contact details"
        className="dialog-enter flex h-[min(85vh,640px,90vw)] w-[min(85vh,640px,90vw)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs text-slate-500">Contact details</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-800">
              {contact.fullName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-100"
            aria-label="Close details"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4">
            <Avatar name={contact.fullName} seed={contact.id} size={48} />
            <div className="min-w-0">
              <p className="font-semibold text-slate-800">{contact.fullName}</p>
              <p className="mt-1 text-xs text-slate-500">
                {contact.jobTitle || "No job title"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {contact.company || "No company"}
              </p>
            </div>
          </div>

          <h3 className="mb-4 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Contact information
          </h3>
          {contactDetailFields.map(({ label, Icon, get }) => (
            <div
              key={label}
              className="flex items-start gap-3 border-b border-slate-100 py-3"
            >
              <Icon size={16} className="mt-0.5 text-slate-400" />
              <div>
                <p className="text-[11px] text-slate-400">{label}</p>
                <p className="mt-1 break-words text-sm text-slate-700">
                  {get(contact)}
                </p>
              </div>
            </div>
          ))}

          {contact.notes && (
            <>
              <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Notes
              </h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {contact.notes}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
