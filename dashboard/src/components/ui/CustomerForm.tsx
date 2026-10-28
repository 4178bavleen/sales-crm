import { useEffect, useState } from "react";
import { Building2, Handshake, StickyNote, CalendarDays } from "lucide-react";
import type { CustomerFormValues } from "../../types/customer";
import { CUSTOMER_OWNERS } from "../../types/customer";
import type { CustomerFormProps } from "../../types/customerForm";
import { cellClass } from "../../types/formControls";
import {
  Field,
  FormSection,
  FormShell,
  SelectField,
  TextAreaField,
} from "./FormControls";

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

/**
 * Conversion-style create/edit form for a customer.
 *
 * A Customer is not hand-authored: in the backend it is created when a
 * qualified lead converts, and its own columns are only companyId,
 * primaryContactId, ownerId, convertedAt and notes. This form reflects that —
 * it links existing records rather than inventing descriptive fields the
 * schema does not have.
 */
export default function CustomerForm({
  mode,
  values,
  companies = [],
  contacts = [],
  owners = [],
  onClose,
  onSubmit,
}: CustomerFormProps) {
  const initialValues: CustomerFormValues = values ?? emptyValues;
  const [form, setForm] = useState<CustomerFormValues>(initialValues);
  const [showErrors, setShowErrors] = useState(false);

  const isEdit = mode === "edit";
  const dirty = (Object.keys(initialValues) as (keyof CustomerFormValues)[]).some(
    key => form[key] !== initialValues[key],
  );

  function update<K extends keyof CustomerFormValues>(
    key: K,
    value: CustomerFormValues[K],
  ) {
    setForm(previous => ({ ...previous, [key]: value }));
  }

  // Esc closes the form (same as the back button)
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const companyOptions: string[] = companies.map(c => c.name);
  const contactOptions: string[] = contacts.map(c => c.name);
  const ownerOptions: string[] = owners.length > 0 ? owners.map(o => o.name) : CUSTOMER_OWNERS;

  const companyInvalid = !form.company;
  const errorMessage = companyInvalid
    ? "Please select or enter the company this customer was converted from."
    : "";

  function submit() {
    setShowErrors(true);
    if (companyInvalid) return;

    // Resolve IDs if available
    const matchedCompany = companies.find(c => c.name.toLowerCase() === form.company.trim().toLowerCase());
    const matchedContact = contacts.find(c => c.name.toLowerCase() === form.primaryContact.trim().toLowerCase());
    const matchedOwner = owners.find(o => o.name.toLowerCase() === form.owner.trim().toLowerCase());

    onSubmit({
      companyId: matchedCompany?.id ?? form.companyId ?? null,
      primaryContactId: matchedContact?.id ?? form.primaryContactId ?? null,
      ownerId: matchedOwner?.id ?? form.ownerId ?? null,
      company: form.company,
      primaryContact: form.primaryContact,
      owner: form.owner,
      convertedAt: form.convertedAt,
      notes: form.notes.trim(),
    });
  }

  return (
    <FormShell
      title={isEdit ? "Edit Customer" : "Create Customer"}
      description={
        isEdit
          ? "Update this customer's links and ownership."
          : "Convert a company and contact into a customer account."
      }
      error={errorMessage}
      dirty={dirty}
      onClose={onClose}
      onSubmit={submit}
    >
      {/* Maps to: Customer.companyId + Customer.primaryContactId */}
      <FormSection
        icon={<Building2 size={17} />}
        title="Account"
        description="The company and contact this customer represents."
        aside="* Required fields"
      >
        <div className={cellClass}>
          <SelectField
            label="Company"
            value={form.company}
            onChange={value => update("company", value)}
            options={companyOptions}
            required
            invalid={showErrors && companyInvalid}
            hint="A company is required."
          />
        </div>
        <div className={cellClass}>
          <SelectField
            label="Primary Contact"
            value={form.primaryContact}
            onChange={value => update("primaryContact", value)}
            options={contactOptions}
          />
        </div>
      </FormSection>

      {/* Maps to: Customer.ownerId + Customer.convertedAt */}
      <FormSection
        icon={<Handshake size={17} />}
        title="Ownership"
        description="Who looks after this account, and since when."
      >
        <div className={cellClass}>
          <SelectField
            label="Account Owner"
            value={form.owner}
            onChange={value => update("owner", value)}
            options={ownerOptions}
          />
        </div>
        <div className={cellClass}>
          <Field
            label="Converted On"
            value={form.convertedAt}
            onChange={value => update("convertedAt", value)}
            type="date"
          />
        </div>
      </FormSection>

      {/* Maps to: Customer.notes */}
      <FormSection
        icon={<StickyNote size={17} />}
        title="Notes"
        description="Anything the team should know about this account."
      >
        <div className={cellClass}>
          <TextAreaField
            label="Notes"
            value={form.notes}
            onChange={value => update("notes", value)}
            placeholder="Conversion context, onboarding status, or next steps."
          />
        </div>
      </FormSection>

      {/* Read-only: a Customer's metrics come from its Deal relation */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <CalendarDays size={17} />
          </div>
          <p className="text-xs text-slate-500">
            Deal count and pipeline value are aggregated from this customer's
            deals — they are not edited here.
          </p>
        </div>
      </section>
    </FormShell>
  );
}
