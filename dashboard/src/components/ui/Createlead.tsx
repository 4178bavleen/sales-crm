import { useEffect, useState } from "react";
import {
  UserRound,
  CalendarDays,
  ChevronDown,
  ArrowLeft,
  Save,
  Building,
} from "lucide-react";
import type { LeadStatus, Priority } from "../../types/lead";
import { LEAD_PRIORITIES } from "../../types/lead";
import { COMPANY_INDUSTRIES } from "../../types/company";
import type { CreateLeadFormProps, FormValues } from "../../types/createLeadForm";
import { getSession } from "../../lib/auth";

const SCHEMA_SOURCES = [
  "Website",
  "Referral",
  "LinkedIn",
  "Google Ads",
  "Cold Call",
  "Webinar",
];

const SCHEMA_PRODUCTS = [
  "CRM Implementation",
  "Sales Training",
  "Cloud Subscription",
  "Support Plan",
];

const SCHEMA_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "CONVERTED",
];

export default function CreateLeadModal({ onClose, onCreate }: CreateLeadFormProps) {
  const sessionUser = getSession()?.user;
  const initialOwner = sessionUser?.name || "admin";

  const initialValues: FormValues = {
    owner: initialOwner,
    firstName: "",
    lastName: "",
    company: "",
    email: "",
    phone: "",
    source: "Website",
    productService: "CRM Implementation",
    status: "NEW",
    priority: "MEDIUM",
    notes: "",
    followUpDate: "",
    noFollowUp: false,
    website: "",
    industry: "",
    street: "",
    city: "",
    state: "",
    country: "",
  };

  const [form, setForm] = useState<FormValues>(initialValues);
  const [showErrors, setShowErrors] = useState(false);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm(previous => ({ ...previous, [key]: value }));
  }

  // Esc closes the form
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const firstName = form.firstName.trim();
  const lastName = form.lastName.trim();
  const company = form.company.trim();
  const email = form.email.trim();

  // According to backend createLeadSchema:
  // contactName (firstName + lastName) min length is 2.
  const nameInvalid = firstName.length === 0;
  const emailInvalid = !!email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const followUpInvalid = !form.noFollowUp && !form.followUpDate;

  const errorMessage = nameInvalid
    ? "Please enter the contact's first name."
    : emailInvalid
      ? "Please enter a valid email address."
      : followUpInvalid
        ? "Please select a next follow-up date, or check 'No follow-up needed'."
        : "";

  function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setShowErrors(true);
    if (nameInvalid || emailInvalid || followUpInvalid) return;

    onCreate({
      id: Date.now(),
      firstName,
      lastName,
      company,
      email,
      phone: form.phone.trim(),
      source: form.source || "Website",
      owner: form.owner || "Unassigned",
      status: (form.status || "NEW") as LeadStatus,
      priority: form.priority,
      createdAt: new Date().toISOString().slice(0, 10),
      notes: form.notes.trim() || undefined,
      nextFollowUpAt: form.noFollowUp ? undefined : form.followUpDate,
      noFollowUp: form.noFollowUp,
      website: form.website.trim() || undefined,
      industry: form.industry || undefined,
      address: form.street.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      country: form.country.trim() || undefined,
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Header matching Leads page */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            title="Back to leads"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Create Lead
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              Add a new prospect to your sales pipeline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={submit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
          >
            <Save size={15} />
            Save Lead
          </button>
        </div>
      </div>

      {showErrors && errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700">
          {errorMessage}
        </div>
      )}

      {/* Form sections using Leads page cards styling */}
      <form onSubmit={submit} className="space-y-6" noValidate>
        {/* Section 1: Lead Information */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1d61e7]">
              <UserRound size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Lead Information</h2>
              <p className="text-xs text-slate-500">
                Primary contact details and ownership
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.firstName}
                onChange={e => update("firstName", e.target.value)}
                placeholder="e.g. John"
                className={`w-full rounded-lg border bg-white py-2 px-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 ${
                  showErrors && nameInvalid ? "border-rose-400 focus:border-rose-500" : "border-slate-200 focus:border-blue-500"
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Last Name
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={e => update("lastName", e.target.value)}
                placeholder="e.g. Doe"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Company Name
              </label>
              <input
                type="text"
                value={form.company}
                onChange={e => update("company", e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => update("email", e.target.value)}
                placeholder="john.doe@example.com"
                className={`w-full rounded-lg border bg-white py-2 px-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 ${
                  showErrors && emailInvalid ? "border-rose-400 focus:border-rose-500" : "border-slate-200 focus:border-blue-500"
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => update("phone", e.target.value)}
                placeholder="+1 555 0199"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Lead Source
              </label>
              <div className="relative">
                <select
                  value={form.source}
                  onChange={e => update("source", e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                >
                  {SCHEMA_SOURCES.map(source => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Product / Service
              </label>
              <div className="relative">
                <select
                  value={form.productService || ""}
                  onChange={e => update("productService", e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                >
                  {SCHEMA_PRODUCTS.map(prod => (
                    <option key={prod} value={prod}>
                      {prod}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Lead Owner
              </label>
              <div className="relative">
                <select
                  value={form.owner}
                  onChange={e => update("owner", e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="admin">admin</option>
                  <option value="Marcus Webb">Marcus Webb</option>
                  <option value="Priya Sharma">Priya Sharma</option>
                  <option value="Unassigned">Unassigned</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Status
              </label>
              <div className="relative">
                <select
                  value={form.status || "NEW"}
                  onChange={e => update("status", e.target.value as LeadStatus)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                >
                  {SCHEMA_STATUSES.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Priority
              </label>
              <div className="relative">
                <select
                  value={form.priority}
                  onChange={e => update("priority", e.target.value as Priority)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                >
                  {LEAD_PRIORITIES.map(priority => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Follow-up & Notes */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1d61e7]">
              <CalendarDays size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Follow-up & Notes</h2>
              <p className="text-xs text-slate-500">
                Scheduled follow-ups and additional background
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!form.noFollowUp && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Next Follow-up Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.followUpDate}
                  onChange={e => update("followUpDate", e.target.value)}
                  className={`w-full rounded-lg border bg-white py-2 px-3 text-xs text-slate-700 outline-none transition ${
                    showErrors && followUpInvalid ? "border-rose-400 focus:border-rose-500" : "border-slate-200 focus:border-blue-500"
                  }`}
                />
              </div>
            )}

            <div className="flex items-center pt-2 sm:pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.noFollowUp}
                  onChange={e => update("noFollowUp", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                No follow-up needed for this lead
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={e => update("notes", e.target.value)}
                rows={3}
                placeholder="Key requirements, conversation notes, or details..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Company Details (Optional) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1d61e7]">
              <Building size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Company & Address Details</h2>
              <p className="text-xs text-slate-500">
                Optional location and corporate profile
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Website
              </label>
              <input
                type="url"
                value={form.website}
                onChange={e => update("website", e.target.value)}
                placeholder="https://example.com"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Industry
              </label>
              <div className="relative">
                <select
                  value={form.industry}
                  onChange={e => update("industry", e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Select industry</option>
                  {COMPANY_INDUSTRIES.map(industry => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Street Address
              </label>
              <input
                type="text"
                value={form.street}
                onChange={e => update("street", e.target.value)}
                placeholder="123 Business Parkway"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                City
              </label>
              <input
                type="text"
                value={form.city}
                onChange={e => update("city", e.target.value)}
                placeholder="New York"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                State / Region
              </label>
              <input
                type="text"
                value={form.state}
                onChange={e => update("state", e.target.value)}
                placeholder="NY"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
          >
            <Save size={15} />
            Save Lead
          </button>
        </div>
      </form>
    </div>
  );
}
