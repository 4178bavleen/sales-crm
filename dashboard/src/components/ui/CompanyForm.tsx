import { useEffect, useState } from "react";
import { Building2, MapPin, StickyNote } from "lucide-react";
import type { CompanyFormValues } from "../../types/company";
import { COMPANY_INDUSTRIES } from "../../types/company";
import type { CompanyFormProps } from "../../types/companyForm";
import { cellClass } from "../../types/formControls";
import {
  Field,
  FormSection,
  FormShell,
  SelectField,
  TextAreaField,
} from "./FormControls";

const emptyValues: CompanyFormValues = {
  name: "",
  website: "",
  industry: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  country: "",
  notes: "",
};

/**
 * Full-page create/edit form for a company.
 * Maps 1:1 onto the backend `Company` model: name, website, industry, phone,
 * address, city, state, country, notes.
 */
export default function CompanyForm({
  mode,
  values,
  onClose,
  onSubmit,
}: CompanyFormProps) {
  const initialValues: CompanyFormValues = values ?? emptyValues;
  const [form, setForm] = useState<CompanyFormValues>(initialValues);
  const [showErrors, setShowErrors] = useState(false);

  const isEdit = mode === "edit";
  const dirty = (Object.keys(initialValues) as (keyof CompanyFormValues)[]).some(
    key => form[key] !== initialValues[key],
  );

  function update<K extends keyof CompanyFormValues>(
    key: K,
    value: CompanyFormValues[K],
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

  const name = form.name.trim();
  const nameInvalid = !name;
  const errorMessage = nameInvalid
    ? "Please enter the company name before saving."
    : "";

  function submit() {
    setShowErrors(true);
    if (nameInvalid) return;

    onSubmit({
      name,
      website: form.website.trim(),
      industry: form.industry,
      phone: form.phone.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      country: form.country.trim(),
      notes: form.notes.trim(),
    });
  }

  return (
    <FormShell
      title={isEdit ? "Edit Company" : "Create Company"}
      description={
        isEdit
          ? "Update this company's details."
          : "Add a new company and its business details."
      }
      error={errorMessage}
      dirty={dirty}
      onClose={onClose}
      onSubmit={submit}
    >
      {/* Maps to: Company (name, website, industry, phone) */}
      <FormSection
        icon={<Building2 size={17} />}
        title="Company Information"
        description="The organization and how to reach it."
        aside="* Required fields"
      >
        <div className={cellClass}>
          <Field
            label="Company"
            value={form.name}
            onChange={value => update("name", value)}
            required
            placeholder="e.g. Rangoni Of Florence"
            invalid={showErrors && nameInvalid}
            hint="Company name is required."
          />
        </div>
        <div className={cellClass}>
          <SelectField
            label="Industry"
            value={form.industry}
            onChange={value => update("industry", value)}
            options={COMPANY_INDUSTRIES}
          />
        </div>
        <div className={cellClass}>
          <Field
            label="Website"
            value={form.website}
            onChange={value => update("website", value)}
            placeholder="https://"
          />
        </div>
        <div className={cellClass}>
          <Field
            label="Phone"
            value={form.phone}
            onChange={value => update("phone", value)}
            type="tel"
            placeholder="555-000-0000"
          />
        </div>
      </FormSection>

      {/* Maps to: Company (address, city, state, country) */}
      <FormSection
        icon={<MapPin size={17} />}
        title="Location"
        description="Where this company is based."
      >
        <div className={cellClass}>
          <TextAreaField
            label="Address"
            value={form.address}
            onChange={value => update("address", value)}
            placeholder="Street address"
            rows={2}
          />
        </div>
        <div className={cellClass}>
          <Field
            label="City"
            value={form.city}
            onChange={value => update("city", value)}
          />
        </div>
        <div className={cellClass}>
          <Field
            label="State / Province"
            value={form.state}
            onChange={value => update("state", value)}
          />
        </div>
        <div className={cellClass}>
          <Field
            label="Country"
            value={form.country}
            onChange={value => update("country", value)}
          />
        </div>
      </FormSection>

      {/* Maps to: Company.notes */}
      <FormSection
        icon={<StickyNote size={17} />}
        title="Notes"
        description="Anything the team should know about this company."
      >
        <div className={cellClass}>
          <TextAreaField
            label="Notes"
            value={form.notes}
            onChange={value => update("notes", value)}
            placeholder="Context, relationship history, or next steps."
          />
        </div>
      </FormSection>
    </FormShell>
  );
}
