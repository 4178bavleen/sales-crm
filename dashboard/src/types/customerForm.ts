import type { CustomerFormValues } from "./customer";

export interface CustomerFormOptionItem {
  id: number;
  name: string;
}

export type CustomerFormProps = {
  /** "create" starts blank; "edit" is pre-filled from `values`. */
  mode: "create" | "edit";
  /** Existing values when editing. */
  values?: CustomerFormValues;
  companies?: CustomerFormOptionItem[];
  contacts?: CustomerFormOptionItem[];
  owners?: CustomerFormOptionItem[];
  onClose: () => void;
  onSubmit: (values: CustomerFormValues) => void;
};
