import type { DealFormValues, DealStatus, StageKind } from "./deal";

export type DealOptionsData = {
  stages: { id: number; name: string; position: number; kind: StageKind }[];
  users: { id: number; name: string; email: string }[];
  products: { id: number; name: string }[];
  leads: { id: number; contactName: string; companyName: string | null }[];
  customers: {
    id: number;
    company?: { id: number; name: string } | null;
    primaryContact?: { id: number; fullName: string } | null;
  }[];
  lostReasons: { id: number; name: string }[];
  statuses: DealStatus[];
};

export type DealFormProps = {
  /** "create" starts blank; "edit" is pre-filled from `values`. */
  mode: "create" | "edit";
  /** Existing values when editing. */
  values?: DealFormValues;
  /** Dropdown options from backend. */
  options?: DealOptionsData;
  onClose: () => void;
  onSubmit: (values: DealFormValues) => void | Promise<void>;
};
