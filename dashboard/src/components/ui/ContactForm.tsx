import { useEffect, useState } from "react";
import { UserRound, Building2, StickyNote } from "lucide-react";
import type { ContactFormValues } from "../../types/contact";
import { CONTACT_JOB_TITLES } from "../../types/contact";
import type { ContactFormProps } from "../../types/contactForm";
import { cellClass } from "../../types/formControls";
import {
  Field,
  FormSection,
  FormShell,
  SelectField,
  TextAreaField,
} from "./FormControls";

const emptyValues: ContactFormValues = {
  fullName: "",
  company: "",
  jobTitle: "",
  email: "",
  phone: "",
  notes: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Full-page create/edit form for a contact.
 * Maps 1:1 onto the backend `Contact` model: fullName, company (companyId),
 * jobTitle, email, phone, notes.
 */
export default function ContactForm({
  mode,
  contact,
  onClose,
  onSubmit,
}: ContactFormProps) {
  const initialValues: ContactFormValues = contact ?? emptyValues;
  const [form, setForm] = useState<ContactFormValues>(initialValues);
  const [showErrors, setShowErrors] = useState(false);

  const isEdit = mode === "edit";
  const dirty = (Object.keys(initialValues) as (keyof ContactFormValues)[]).some(
    key => form[key] !== initialValues[key],
  );

  function update<K extends keyof ContactFormValues>(
    key: K,
    value: ContactFormValues[K],
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

  const fullName = form.fullName.trim();
  const email = form.email.trim();
  const nameInvalid = !fullName;
  const emailInvalid = !!email && !EMAIL_PATTERN.test(email);
  const errorMessage = nameInvalid
    ? "Please enter the contact's full name before saving."
    : emailInvalid
      ? "Enter a valid email address."
      : "";

  function submit() {
    setShowErrors(true);
    if (nameInvalid || emailInvalid) return;

    onSubmit({
      fullName,
      company: form.company.trim(),
      jobTitle: form.jobTitle,
      email,
      phone: form.phone.trim(),
      notes: form.notes.trim(),
    });
  }

  return (
    <FormShell
      title={isEdit ? "Edit Contact" : "Create Contact"}
      description={
        isEdit
          ? "Update this contact's details."
          : "Add a new contact and their company details."
      }
      error={errorMessage}
      dirty={dirty}
      onClose={onClose}
      onSubmit={submit}
    >
      {/* Maps to: Contact (fullName, jobTitle, email, phone) */}
      <FormSection
        icon={<UserRound size={17} />}
        title="Contact Information"
        description="The person and how to reach them."
        aside="* Required fields"
      >
        <div className={cellClass}>
          <Field
            label="Full Name"
            value={form.fullName}
            onChange={value => update("fullName", value)}
            required
            placeholder="e.g. Amelia Hartley"
            invalid={showErrors && nameInvalid}
            hint="Full name is required."
          />
        </div>
        <div className={cellClass}>
          <SelectField
            label="Job Title"
            value={form.jobTitle}
            onChange={value => update("jobTitle", value)}
            options={CONTACT_JOB_TITLES}
          />
        </div>
        <div className={cellClass}>
          <Field
            label="Email"
            value={form.email}
            onChange={value => update("email", value)}
            type="email"
            placeholder="name@company.com"
            invalid={showErrors && emailInvalid}
            hint="Enter a valid email address."
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

      {/* Maps to: linked Company (Contact.companyId) */}
      <FormSection
        icon={<Building2 size={17} />}
        title="Company"
        description="The organization this contact belongs to."
      >
        <div className={cellClass}>
          <Field
            label="Company"
            value={form.company}
            onChange={value => update("company", value)}
            placeholder="e.g. Rangoni Of Florence"
          />
        </div>
      </FormSection>

      {/* Maps to: Contact.notes */}
      <FormSection
        icon={<StickyNote size={17} />}
        title="Notes"
        description="Anything the team should know about this contact."
      >
        <div className={cellClass}>
          <TextAreaField
            label="Notes"
            value={form.notes}
            onChange={value => update("notes", value)}
            placeholder="Context, preferences, or next steps."
          />
        </div>
      </FormSection>
    </FormShell>
  );
}
