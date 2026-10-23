import { X, Building2 } from "lucide-react";
import type { CompanyDetailDialogProps } from "../../types/companyUi";
import { companyDetailFields } from "../../columns/companyColumns";

/**
 * Centered modal showing a single company's details.
 * Companies are read-only here; closing (Esc, backdrop, close button) is
 * handled by the parent.
 */
export default function CompanyDetailDialog({
  company,
  onClose,
}: CompanyDetailDialogProps) {
  return (
    <div
      className="dialog-overlay-in fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Company details"
        className="dialog-enter flex h-[min(85vh,640px,90vw)] w-[min(85vh,640px,90vw)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs text-slate-500">Company details</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-800">
              {company.name}
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
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-500">
              <Building2 size={22} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800">{company.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {company.industry || "No industry"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {company.contactCount}{" "}
                {company.contactCount === 1 ? "contact" : "contacts"}
              </p>
            </div>
          </div>

          <h3 className="mb-4 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Company information
          </h3>
          {companyDetailFields.map(({ label, Icon, get }) => (
            <div
              key={label}
              className="flex items-start gap-3 border-b border-slate-100 py-3"
            >
              <Icon size={16} className="mt-0.5 text-slate-400" />
              <div>
                <p className="text-[11px] text-slate-400">{label}</p>
                <p className="mt-1 break-words text-sm text-slate-700">
                  {get(company)}
                </p>
              </div>
            </div>
          ))}

          {company.notes && (
            <>
              <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Notes
              </h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {company.notes}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
