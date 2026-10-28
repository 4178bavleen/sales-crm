import type { Lead, LeadStatus, Priority } from "./lead";

export type {
  FieldMessageProps,
  FieldProps,
  FormSectionProps,
  SelectFieldProps,
  TextAreaFieldProps,
} from "./formControls";

export type CreateLeadFormProps = {
  initialLead?: Lead | null;
  onClose: () => void;
  onCreate: (lead: Lead) => Promise<void> | void;
  onUpdate?: (id: number, lead: Lead) => Promise<void> | void;
};

export type FormValues = {
  owner: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  productService?: string;
  status: LeadStatus | "";
  priority: Priority;
  notes: string;
  followUpDate: string;
  noFollowUp: boolean;
  noFollowUpNote: string;
  website: string;
  industry: string;
  street: string;
  city: string;
  state: string;
  country: string;
};
