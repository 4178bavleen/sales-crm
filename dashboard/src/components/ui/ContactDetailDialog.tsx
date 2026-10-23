import { X, Pencil, Trash2 } from "lucide-react";
import type { ContactDetailDialogProps } from "../../types/contactUi";
import { contactDetailFields } from "../../columns/contactColumns";
import Avatar from "./Avatar";

/**
 * Centered modal showing a single contact's details.
 * Contacts are read-only here; closing (Esc, backdrop, close button) is
 * handled by the parent.
 */
export default function ContactDetailDialog({
  contact,
  onClose,
  onEdit,
  onDelete,
}: ContactDetailDialogProps) {
  return (
    <div
      className="dialog-overlay-in fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Contact details"
        className="dialog-enter flex h-[min(85vh,640px,90vw)] w-[min(85vh,640px,90vw)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50/70">
          <div>
            <p className="text-xs font-semibold text-slate-500">Contact details</p>
            <h2 className="mt-0.5 text-lg font-bold text-slate-950">
              {contact.fullName}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
              >
                <Pencil size={13} className="text-slate-600" />
                Edit
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100 transition cursor-pointer"
              >
                <Trash2 size={13} className="text-rose-600" />
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
              aria-label="Close details"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-5">
          <div className="flex items-center gap-3.5 rounded-xl bg-slate-50 p-4 border border-slate-200">
            <Avatar name={contact.fullName} seed={contact.id} size={48} />
            <div className="min-w-0">
              <p className="font-bold text-slate-950 text-base">{contact.fullName}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-700">
                {contact.jobTitle || "No job title"}
              </p>
              <p className="mt-0.5 text-xs font-bold text-blue-700">
                {contact.company || "No company"}
              </p>
            </div>
          </div>

          <h3 className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-slate-600">
            Contact information
          </h3>
          {contactDetailFields.map(({ label, Icon, get }) => (
            <div
              key={label}
              className="flex items-start gap-3 border-b border-slate-100 py-3"
            >
              <Icon size={16} className="mt-0.5 text-slate-500 shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-slate-500">{label}</p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                  {get(contact)}
                </p>
              </div>
            </div>
          ))}

          {contact.notes && (
            <>
              <h3 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-slate-600">
                Notes
              </h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-800 font-medium bg-slate-50 p-3 rounded-xl border border-slate-200">
                {contact.notes}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
