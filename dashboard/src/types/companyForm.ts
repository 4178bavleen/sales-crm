import type { CompanyFormValues } from "./company";

export type CompanyFormProps = {
  /** "create" starts blank; "edit" is pre-filled from `values`. */
  mode: "create" | "edit";
  /** Existing values when editing. */
  values?: CompanyFormValues;
  onClose: () => void;
  onSubmit: (values: CompanyFormValues) => void;
};

export type {
  FieldMessageProps,
  FieldProps,
  FormSectionProps,
  SelectFieldProps,
  TextAreaFieldProps,
} from "./formControls";
