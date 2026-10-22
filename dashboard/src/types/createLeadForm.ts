import type { Lead, LeadStatus, Priority } from "./lead";

export type {
  FieldMessageProps,
  FieldProps,
  FormSectionProps,
  SelectFieldProps,
  TextAreaFieldProps,
} from "./formControls";

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
  productService?: string;
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
