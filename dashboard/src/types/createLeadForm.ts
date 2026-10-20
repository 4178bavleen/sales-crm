import type { ReactNode } from "react";
import type { Lead, LeadStatus, Priority } from "./lead";

export type CreateLeadFormProps = {
  onClose: () => void;
  onCreate: (lead: Lead) => void;
};

export type FormValues = {
  owner: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  status: LeadStatus | "";
  priority: Priority;
  notes: string;
  followUpDate: string;
  noFollowUp: boolean;
  website: string;
  industry: string;
  street: string;
  city: string;
  state: string;
  country: string;
};

export type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  invalid?: boolean;
  hint?: string;
};

export type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
  invalid?: boolean;
  hint?: string;
};

export type FieldMessageProps = {
  id: string;
  hint?: string;
};

export type SectionCardProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
};
