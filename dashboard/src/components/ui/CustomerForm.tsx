import { useEffect, useState } from "react";
import {
  Building2,
  Handshake,
  StickyNote,
  CalendarDays,
  X,
  UserRound,
  Check,
  AlertCircle,
  Factory,
  ShieldCheck,
} from "lucide-react";
import type { CustomerFormValues } from "../../types/customer";
import { CUSTOMER_OWNERS } from "../../types/customer";
import type { CustomerFormProps } from "../../types/customerForm";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const emptyValues: CustomerFormValues = {
  company: "",
  primaryContact: "",
  owner: CUSTOMER_OWNERS[0] ?? "",
  convertedAt: today(),
  notes: "",
};

export default function CustomerForm({
  mode,
  values,
  companies = [],
  contacts = [],
  owners = [],
  onClose,
  onSubmit,
}: CustomerFormProps) {
  const initialValues: CustomerFormValues = values
    ? {
        ...values,
        company: values.company === "—" ? "" : values.company,
        primaryContact: values.primaryContact === "—" ? "" : values.primaryContact,
        owner: values.owner === "Unassigned" ? "" : values.owner,
      }
    : emptyValues;
  const [form, setForm] = useState<CustomerFormValues>(initialValues);
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = mode === "edit";

  function update<K extends keyof CustomerFormValues>(
    key: K,
    value: CustomerFormValues[K]
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  // Esc closes the modal
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const companyInvalid = !form.company || !form.company.trim();

  // Find linked objects for real-time live preview
  const selectedCompanyObj = companies.find(
    (c) => c.name.toLowerCase() === (form.company || "").trim().toLowerCase()
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowErrors(true);
    if (companyInvalid) return;

    setIsSubmitting(true);
    try {
      const matchedCompany = companies.find(
        (c) => c.name.toLowerCase() === form.company.trim().toLowerCase()
      );
      const matchedContact = contacts.find(
        (c) => c.name.toLowerCase() === form.primaryContact.trim().toLowerCase()
      );
      const matchedOwner = owners.find(
        (o) => o.name.toLowerCase() === form.owner.trim().toLowerCase()
      );

      // If user typed a custom/empty contact or cleared it, don't send a dead/stale ID
      const resolvedContactId = form.primaryContact.trim()
        ? (matchedContact?.id ?? null)
        : null;

      const resolvedCompanyId = form.company.trim()
        ? (matchedCompany?.id ?? null)
        : null;

      await onSubmit({
        companyId: resolvedCompanyId,
        companyName: form.company.trim(),
        primaryContactId: resolvedContactId,
        primaryContactName: form.primaryContact.trim(),
        ownerId: matchedOwner?.id ?? form.ownerId ?? null,
        company: form.company.trim(),
        primaryContact: form.primaryContact.trim(),
        owner: form.owner.trim(),
        convertedAt: form.convertedAt || today(),
        notes: (form.notes || "").trim(),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit Customer Account" : "Create Customer Account"}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-6 py-4.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-[#154fc1] shadow-xs">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-950">
                {isEdit ? "Edit Customer Account" : "Create New Customer Account"}
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                {isEdit
                  ? "Update client relationship, primary contact, and account owner"
                  : "Register a verified client account and link key stakeholder details"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Form Fields */}
            <div className="lg:col-span-2 space-y-5">
              {/* Company Selection / Input */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Corporate Account / Company Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="text"
                    required
                    list="customer-company-list"
                    placeholder="e.g. Acme Industrial Technologies"
                    value={form.company}
                    onChange={(e) => update("company", e.target.value)}
                    className={`w-full rounded-xl border bg-white pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-950 placeholder:text-slate-400 placeholder:font-normal outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 ${
                      showErrors && companyInvalid
                        ? "border-rose-400 bg-rose-50/20"
                        : "border-slate-300"
                    }`}
                  />
                  <datalist id="customer-company-list">
                    {companies.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>
                {showErrors && companyInvalid && (
                  <p className="mt-1 text-[11px] font-bold text-rose-600">
                    Company name is required.
                  </p>
                )}
              </div>

              {/* Primary Contact & Owner Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Primary Contact */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">
                    Primary Key Contact
                  </label>
                  <div className="relative">
                    <UserRound
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="text"
                      list="customer-contact-list"
                      placeholder="e.g. Eleanor Vance"
                      value={form.primaryContact}
                      onChange={(e) => update("primaryContact", e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-950 placeholder:text-slate-400 placeholder:font-normal outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                    <datalist id="customer-contact-list">
                      {contacts.map((ct) => (
                        <option key={ct.id} value={ct.name} />
                      ))}
                    </datalist>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Lead representative or chief stakeholder
                  </p>
                </div>

                {/* Account Owner */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">
                    Account Owner
                  </label>
                  <div className="relative">
                    <Handshake
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <select
                      value={form.owner}
                      onChange={(e) => update("owner", e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-8 py-2.5 text-xs font-semibold text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 appearance-none cursor-pointer"
                    >
                      {owners.length > 0
                        ? owners.map((u) => (
                            <option key={u.id} value={u.name}>
                              {u.name}
                            </option>
                          ))
                        : CUSTOMER_OWNERS.map((owner) => (
                            <option key={owner} value={owner}>
                              {owner}
                            </option>
                          ))}
                    </select>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Internal sales rep managing the account
                  </p>
                </div>
              </div>

              {/* Converted Date */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Account Onboarded / Converted On
                </label>
                <div className="relative">
                  <CalendarDays
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="date"
                    value={form.convertedAt}
                    onChange={(e) => update("convertedAt", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Conversion Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Account Notes &amp; Special Arrangements
                </label>
                <div className="relative">
                  <StickyNote
                    size={15}
                    className="absolute left-3.5 top-3 text-slate-500"
                  />
                  <textarea
                    rows={4}
                    placeholder="Enter onboarding details, contract references, service-level expectations, or account background..."
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-950 placeholder:text-slate-400 placeholder:font-normal outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Live Account Preview Card */}
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-xs">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Account Card Preview
                </p>

                <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-[#154fc1] font-extrabold text-sm shadow-xs">
                      {(form.company || "C").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {form.company || "Company Name"}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                        <Factory size={11} className="text-slate-400" />
                        {selectedCompanyObj ? "Verified Client" : "Corporate Account"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Contact:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[130px]">
                        {form.primaryContact || "Unassigned"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Owner:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[130px]">
                        {form.owner || "Unassigned"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Status:</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                        <ShieldCheck size={11} />
                        Active Client
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 text-blue-600 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      Deal counts and total pipeline values are synchronized automatically from deals linked with this client account.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200/80 pt-4 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d61e7] px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
            >
              <Check size={15} />
              <span>{isEdit ? "Save Changes" : "Create Customer"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
