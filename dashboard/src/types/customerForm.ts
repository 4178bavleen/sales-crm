import type { CustomerFormValues } from "./customer";

export type CustomerFormProps = {
  /** "create" starts blank; "edit" is pre-filled from `values`. */
  mode: "create" | "edit";
  /** Existing values when editing. */
  values?: CustomerFormValues;
  onClose: () => void;
  onSubmit: (values: CustomerFormValues) => void;
};
