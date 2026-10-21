export type TableSettingsColumn = {
  key: string;
  label: string;
};

export type TableSettingsProps = {
  /** All columns available on the table */
  columns: TableSettingsColumn[];
  /** Keys of the currently hidden columns */
  hidden: string[];
  /** Called with the new hidden-keys list when a checkbox toggles */
  onChange: (hidden: string[]) => void;
  /** Tooltip / aria-label for the trigger button */
  title?: string;
};
