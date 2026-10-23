import type { TaskFormValues } from "./task";

export type TaskFormProps = {
  /** "create" starts blank; "edit" is pre-filled from `values`. */
  mode: "create" | "edit";
  /** Existing values when editing. */
  values?: TaskFormValues;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => void | Promise<void>;
};
