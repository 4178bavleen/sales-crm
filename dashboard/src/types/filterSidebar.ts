export type FilterCheckboxSection = {
  title: string;
  items: string[];
  /** Currently checked items (controlled from the page) */
  selected?: string[];
  /** Called with the full new selection when a checkbox toggles */
  onChange?: (selected: string[]) => void;
};

export type FilterSelect = {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

export type FilterSidebarProps = {
  /** Heading, e.g. "Filter Leads by" */
  title?: string;
  /** Collapsible checkbox groups (dividers added between them) */
  sections?: FilterCheckboxSection[];
  /** Quick-filter dropdowns rendered under a "Quick Filters" heading */
  selects?: FilterSelect[];
  className?: string;
};

export type FilterSectionProps = {
  title: string;
  items: string[];
  selected?: string[];
  onChange?: (selected: string[]) => void;
  query: string;
};
