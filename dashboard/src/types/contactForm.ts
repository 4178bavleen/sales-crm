import type { ContactFormValues } from "./contact";

export type ContactFormProps = {
  /** "create" starts blank; "edit" is pre-filled from `contact`. */
  mode: "create" | "edit";
  /** Existing values when editing. */
  contact?: ContactFormValues;
  onClose: () => void;
  onSubmit: (values: ContactFormValues) => void;
};

export type {
  FieldMessageProps,
  FieldProps,
  FormSectionProps,
  SelectFieldProps,
  TextAreaFieldProps,
} from "./formControls";
