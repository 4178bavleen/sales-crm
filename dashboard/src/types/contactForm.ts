import type { ContactFormValues } from "./contact";

export type ContactFormProps = {
  /** "create" starts blank; "edit" is pre-filled from `contact`. */
  mode: "create" | "edit";
  /** Existing values when editing. */
  contact?: ContactFormValues;
  availableCompanies?: { id: number; name: string }[];
  onClose: () => void;
  onSubmit: (values: ContactFormValues) => Promise<void> | void;
};

export type {
  FieldMessageProps,
  FieldProps,
  FormSectionProps,
  SelectFieldProps,
  TextAreaFieldProps,
} from "./formControls";
