import { useEffect, useState } from "react";
import {
  UserRound,
  Building2,
  StickyNote,
  Mail,
  Phone,
  BriefcaseBusiness,
  X,
  Loader2,
  Check,
  AlertCircle,
  Eye,
} from "lucide-react";
import type { ContactFormValues } from "../../types/contact";
import type { ContactFormProps } from "../../types/contactForm";

const emptyValues: ContactFormValues = {
  fullName: "",
  company: "",
  companyId: null,
  jobTitle: "",
  email: "",
  phone: "",
  notes: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ContactForm({
  mode,
  contact,
  availableCompanies = [],
  onClose,
  onSubmit,
}: ContactFormProps) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState<ContactFormValues>(contact ?? emptyValues);
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  function update<K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  // Esc closes the dialog
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fullName = form.fullName.trim();
  const email = form.email.trim();
  const phone = form.phone.trim();
  const nameInvalid = !fullName;
  const emailInvalid = !!email && !EMAIL_PATTERN.test(email);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setShowErrors(true);
    setBackendError(null);

    if (nameInvalid || emailInvalid) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        fullName,
        company: form.company.trim(),
        companyId: form.companyId ?? null,
        jobTitle: form.jobTitle.trim(),
        email: email || "",
        phone: phone || "",
        notes: form.notes.trim(),
      });
    } catch (err) {
      setBackendError(err instanceof Error ? err.message : "Failed to save contact");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="dialog-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-5 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit Contact" : "Create Contact"}
        className="dialog-enter flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-[#154fc1]">
              <UserRound size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-950">
                {isEdit ? "Edit Contact" : "Create New Contact"}
              </h2>
              <p className="text-xs font-semibold text-slate-600">
                {isEdit ? "Update contact information" : "Add a business contact to your address book"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Backend Error Alert */}
        {backendError && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{backendError}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Input Fields */}
            <div className="lg:col-span-2 space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserRound
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eleanor Vance"
                    value={form.fullName}
                    onChange={e => update("fullName", e.target.value)}
                    className={`w-full rounded-xl border bg-white pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-950 placeholder:text-slate-400 placeholder:font-normal outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 ${
                      showErrors && nameInvalid
                        ? "border-rose-400 bg-rose-50/20"
                        : "border-slate-300"
                    }`}
                  />
                </div>
                {showErrors && nameInvalid && (
                  <p className="mt-1 text-[11px] font-bold text-rose-600">
                    Full name is required.
                  </p>
                )}
              </div>

              {/* Job Title */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Job Title
                </label>
                <div className="relative">
                  <BriefcaseBusiness
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="text"
                    placeholder="e.g. VP of Operations"
                    value={form.jobTitle}
                    onChange={e => update("jobTitle", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-950 placeholder:text-slate-400 placeholder:font-normal outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Company Selector or Input */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Company
                </label>
                <div className="relative">
                  <Building2
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  {availableCompanies.length > 0 ? (
                    <select
                      value={form.companyId ?? (form.company || "")}
                      onChange={e => {
                        const val = e.target.value;
                        const num = Number(val);
                        if (!isNaN(num) && num > 0) {
                          const matched = availableCompanies.find(c => c.id === num);
                          setForm(prev => ({
                            ...prev,
                            companyId: num,
                            company: matched?.name || "",
                          }));
                        } else {
                          setForm(prev => ({
                            ...prev,
                            companyId: null,
                            company: val === "none" ? "" : val,
                          }));
                        }
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                    >
                      <option value="none">No company associated</option>
                      {availableCompanies.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. Acme Corporation"
                      value={form.company}
                      onChange={e => update("company", e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-950 placeholder:text-slate-400 placeholder:font-normal outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  )}
                </div>
              </div>

              {/* Email & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="email"
                      placeholder="eleanor@company.com"
                      value={form.email}
                      onChange={e => update("email", e.target.value)}
                      className={`w-full rounded-xl border bg-white pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-950 placeholder:text-slate-400 placeholder:font-normal outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 ${
                        showErrors && emailInvalid
                          ? "border-rose-400 bg-rose-50/20"
                          : "border-slate-300"
                      }`}
                    />
                  </div>
                  {showErrors && emailInvalid && (
                    <p className="mt-1 text-[11px] font-bold text-rose-600">
                      Enter a valid email address.
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={form.phone}
                      onChange={e => update("phone", e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-950 placeholder:text-slate-400 placeholder:font-normal outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Notes & Background
                </label>
                <div className="relative">
                  <StickyNote
                    size={15}
                    className="absolute left-3.5 top-3 text-slate-500"
                  />
                  <textarea
                    rows={3}
                    placeholder="Key context, meeting history, relationship background..."
                    value={form.notes}
                    onChange={e => update("notes", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2 text-xs font-medium text-slate-950 placeholder:text-slate-400 placeholder:font-normal outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Right 1 Column: Live Contact Card Preview */}
            <div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sticky top-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mb-3 uppercase tracking-wider">
                  <Eye size={13} />
                  <span>Live Preview</span>
                </div>

                <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-[#154fc1]">
                      {getInitials(form.fullName || "Contact")}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-950 text-sm truncate">
                        {form.fullName.trim() || "(No name entered yet)"}
                      </p>
                      <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">
                        {form.jobTitle.trim() || "No job title"}
                      </p>
                      {form.company.trim() && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Building2 size={10} className="text-slate-600" />
                          <span className="truncate">{form.company}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-slate-800">
                      <Mail size={13} className="shrink-0 text-slate-500" />
                      <span className="truncate font-semibold">{form.email || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-800">
                      <Phone size={13} className="shrink-0 text-slate-500" />
                      <span className="truncate font-semibold">{form.phone || "—"}</span>
                    </div>
                  </div>

                  {form.notes && (
                    <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-600 line-clamp-2 italic">
                      "{form.notes}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1d61e7] px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Saving Contact...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>{isEdit ? "Save Changes" : "Create Contact"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
