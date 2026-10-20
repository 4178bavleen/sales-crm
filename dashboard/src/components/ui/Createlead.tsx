import { useEffect, useState } from "react";
import { UserRound, BriefcaseBusiness, CalendarDays, ChevronDown } from "lucide-react";
import { LEAD_PRIORITIES, LEAD_SOURCES, LEAD_STATUSES } from "../../types/lead";
import type { LeadStatus } from "../../types/lead";
import { COMPANY_INDUSTRIES } from "../../types/company";
import type { CreateLeadFormProps, FormValues } from "../../types/createLeadForm";
import { cellClass, inputValid, labelClass } from "../../types/formControls";
import {
  Field,
  FormSection,
  FormShell,
  SelectField,
  TextAreaField,
} from "./FormControls";

const initialValues: FormValues = {
  owner: "Gabriel Deora",
  firstName: "",
  lastName: "",
  company: "",
  email: "",
  phone: "",
  source: "",
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

export default function CreateLeadModal({ onClose, onCreate }: CreateLeadFormProps) {
  const [form, setForm] = useState<FormValues>(initialValues);
  const [showErrors, setShowErrors] = useState(false);

  const dirty = (Object.keys(initialValues) as (keyof FormValues)[]).some(
    key => form[key] !== initialValues[key],
  );

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  // Esc closes the form (same as the back button)
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
  const requiredInvalid = !firstName || !lastName || !company;
  const emailInvalid = !!email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  // Business rule from the schema: every active lead needs a next follow-up
  // date OR a reason why none is needed.
  const followUpInvalid = !form.noFollowUp && !form.followUpDate;
  const errorMessage = requiredInvalid
    ? "Please complete First Name, Last Name, and Company before saving."
    : emailInvalid
      ? "Enter a valid email address."
      : followUpInvalid
        ? "Set a next follow-up date, or tick 'No follow-up needed'."
        : "";

  function submit() {
    setShowErrors(true);
    if (requiredInvalid || emailInvalid || followUpInvalid) return;

    onCreate({
      id: Date.now(),
      firstName,
      lastName,
      company,
      email,
      phone: form.phone.trim(),
      source: form.source || "Unknown",
      owner: form.owner,
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
    <FormShell
      title="Create Lead"
      description="Add a new lead and its business details."
      error={errorMessage}
      dirty={dirty}
      onClose={onClose}
      onSubmit={submit}
    >
      {/* Maps to: Lead (contactName, email, phone, sourceId, status, priority) */}
      <FormSection
        icon={<UserRound size={17} />}
        title="Lead Information"
        description="Who owns this lead and how to reach them."
        aside="* Required fields"
      >
        <div className={cellClass}>
          <label htmlFor="lead-owner" className={labelClass}>
            Lead Owner
          </label>
          <div className="relative">
            <select
              id="lead-owner"
              className={`${inputValid} appearance-none pr-9`}
              value={form.owner}
              onChange={e => update("owner", e.target.value)}
            >
              <option>Gabriel Deora</option>
              <option>Unassigned</option>
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
        <div className={cellClass}>
          <Field label="First Name" value={form.firstName} onChange={v => update("firstName", v)} required placeholder="First name" invalid={showErrors && !firstName} hint="First name is required." />
        </div>
        <div className={cellClass}>
          <Field label="Last Name" value={form.lastName} onChange={v => update("lastName", v)} required placeholder="Last name" invalid={showErrors && !lastName} hint="Last name is required." />
        </div>
        <div className={cellClass}>
          <Field label="Email" value={form.email} onChange={v => update("email", v)} type="email" placeholder="name@company.com" invalid={showErrors && emailInvalid} hint="Enter a valid email address." />
        </div>
        <div className={cellClass}>
          <Field label="Phone" value={form.phone} onChange={v => update("phone", v)} type="tel" />
        </div>
        <div className={cellClass}>
          <SelectField label="Lead Source" value={form.source} onChange={v => update("source", v)} options={LEAD_SOURCES} />
        </div>
        <div className={cellClass}>
          <SelectField label="Lead Status" value={form.status} onChange={v => update("status", v as FormValues["status"])} options={LEAD_STATUSES} required />
        </div>
        <div className={cellClass}>
          <SelectField label="Priority" value={form.priority} onChange={v => update("priority", v as FormValues["priority"])} options={LEAD_PRIORITIES} />
        </div>
      </FormSection>

      {/* Maps to: linked Company (name, website, industry, address, city, state, country) */}
      <FormSection
        icon={<BriefcaseBusiness size={17} />}
        title="Company Information"
        description="Where this lead's organization is based."
      >
        <div className={cellClass}>
          <Field label="Company" value={form.company} onChange={v => update("company", v)} required invalid={showErrors && !company} hint="Company is required." />
        </div>
        <div className={cellClass}>
          <Field label="Website" value={form.website} onChange={v => update("website", v)} placeholder="https://" />
        </div>
        <div className={cellClass}>
          <SelectField label="Industry" value={form.industry} onChange={v => update("industry", v)} options={COMPANY_INDUSTRIES} />
        </div>
        <div className={cellClass}>
          <TextAreaField label="Street" value={form.street} onChange={v => update("street", v)} placeholder="Street address" />
        </div>
        <div className={cellClass}>
          <Field label="City" value={form.city} onChange={v => update("city", v)} />
        </div>
        <div className={cellClass}>
          <Field label="State / Province" value={form.state} onChange={v => update("state", v)} />
        </div>
        <div className={cellClass}>
          <Field label="Country" value={form.country} onChange={v => update("country", v)} />
        </div>
      </FormSection>

      {/* Maps to: Lead.notes, Lead.nextFollowUpAt / Lead.noFollowUpReasonId */}
      <FormSection
        icon={<CalendarDays size={17} />}
        title="Notes & Follow-up"
        description="Context for the team and the next step."
      >
        <div className={cellClass}>
          <TextAreaField label="Notes" value={form.notes} onChange={v => update("notes", v)} placeholder="Context, requirements, or anything the team should know." />
        </div>
        {!form.noFollowUp && (
          <div className={cellClass}>
            <Field
              label="Next follow-up"
              value={form.followUpDate}
              onChange={v => update("followUpDate", v)}
              type="date"
              required
              invalid={showErrors && followUpInvalid}
              hint="Choose a date, or tick 'No follow-up needed'."
            />
          </div>
        )}
        <div className={cellClass}>
          <label htmlFor="no-follow-up" className={labelClass}>
            No follow-up needed
          </label>
          <label
            id="no-follow-up"
            htmlFor="no-follow-up-checkbox"
            className="flex h-10 cursor-pointer items-center gap-2 text-sm text-slate-600"
          >
            <input
              id="no-follow-up-checkbox"
              type="checkbox"
              checked={form.noFollowUp}
              onChange={e => update("noFollowUp", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
            />
            This lead does not need a follow-up
          </label>
        </div>
      </FormSection>
    </FormShell>
  );
}
