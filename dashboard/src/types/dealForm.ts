import type { DealFormValues } from "./deal";

export type DealFormProps = {
  /** "create" starts blank; "edit" is pre-filled from `values`. */
  mode: "create" | "edit";
  /** Existing values when editing. */
  values?: DealFormValues;
  onClose: () => void;
  onSubmit: (values: DealFormValues) => void;
};
