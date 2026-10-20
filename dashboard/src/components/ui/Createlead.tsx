import { useState, type FormEvent } from "react";
import { X, CircleHelp, UserRound } from "lucide-react";

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "DISQUALIFIED"
  | "CONVERTED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type Lead = {
  id: number;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  owner: string;
  status: LeadStatus;
  priority: Priority;
  createdAt: string;
};

const inputClass =
  "mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const labelClass = "block text-xs font-medium text-slate-600";

export default function CreateLeadModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (lead: Lead) => void;
}) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    company: "",
    email: "",
    phone: "",
    source: "Web Download",
    owner: "Gabriel Deora",
    status: "NEW" as LeadStatus,
    priority: "MEDIUM" as Priority,
  });
  const [error, setError] = useState("");

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm(previous => ({ ...previous, [key]: value }));
    if (error) setError("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const company = form.company.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    if (!firstName || !lastName || !company) {
      setError("Please complete the required fields before saving.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    onCreate({
      ...form,
      firstName,
      lastName,
      company,
      email,
      phone,
      id: Date.now(),
      createdAt: new Date().toISOString().slice(0, 10),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-lead-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <UserRound size={19} />
            </div>
            <div>
              <h2
                id="create-lead-title"
                className="text-base font-semibold text-slate-800"
              >
                Create Lead
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Add a new lead to your sales pipeline.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close create lead form"
            className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6">
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              <CircleHelp size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Contact details */}
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Contact details
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              First name <span className="text-rose-500">*</span>
              <input
                required
                autoFocus
                autoComplete="given-name"
                value={form.firstName}
                onChange={e => update("firstName", e.target.value)}
                className={inputClass}
                placeholder="e.g. Alex"
              />
            </label>
            <label className={labelClass}>
              Last name <span className="text-rose-500">*</span>
              <input
                required
                autoComplete="family-name"
                value={form.lastName}
                onChange={e => update("lastName", e.target.value)}
                className={inputClass}
                placeholder="e.g. Morgan"
              />
            </label>
            <label className={labelClass}>
              Email
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={e => update("email", e.target.value)}
                className={inputClass}
                placeholder="name@company.com"
              />
            </label>
            <label className={labelClass}>
              Phone
              <input
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={e => update("phone", e.target.value)}
                className={inputClass}
                placeholder="+1 555 555 5555"
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Company <span className="text-rose-500">*</span>
              <input
                required
                autoComplete="organization"
                value={form.company}
                onChange={e => update("company", e.target.value)}
                className={inputClass}
                placeholder="Company name"
              />
            </label>
          </div>

          {/* Qualification */}
          <h3 className="mb-4 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Qualification
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Lead source
              <select
                value={form.source}
                onChange={e => update("source", e.target.value)}
                className={inputClass}
              >
                {[
                  "Cold Call",
                  "Advertisement",
                  "Web Download",
                  "Seminar Partner",
                  "Online Store",
                  "Partner",
                  "External Referral",
                ].map(source => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Lead owner
              <select
                value={form.owner}
                onChange={e => update("owner", e.target.value)}
                className={inputClass}
              >
                {["Gabriel Deora", "Unassigned"].map(owner => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Lead status
              <select
                value={form.status}
                onChange={e => update("status", e.target.value as LeadStatus)}
                className={inputClass}
              >
                {(
                  ["NEW", "CONTACTED", "QUALIFIED", "DISQUALIFIED", "CONVERTED"] as LeadStatus[]
                ).map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Priority
              <select
                value={form.priority}
                onChange={e => update("priority", e.target.value as Priority)}
                className={inputClass}
              >
                {(["LOW", "MEDIUM", "HIGH", "URGENT"] as Priority[]).map(
                  priority => (
                    <option key={priority} value={priority}>
                      {priority.charAt(0) + priority.slice(1).toLowerCase()}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Save Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
