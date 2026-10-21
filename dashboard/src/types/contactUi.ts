import type { ComponentType, SVGProps } from "react";
import type { Contact } from "./contact";
import type { DataTableColumn } from "./dataTable";

/** Icon component signature used by the contacts UI (lucide icons). */
export type ContactIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

/** A read-only contact field rendered in the detail dialog. */
export type ContactField = {
  label: string;
  Icon: ContactIcon;
  get: (contact: Contact) => string;
};

/** Flat string fields used for the CSV export. */
export type ContactCsvField = {
  label: string;
  get: (contact: Contact) => string;
};

/** Compact seed row: [fullName, company, jobTitle, email, phone, notes, createdAt]. */
export type ContactSeedRow = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

export type ContactColumn = DataTableColumn<Contact>;

export type ContactDetailDialogProps = {
  contact: Contact;
  onClose: () => void;
};
