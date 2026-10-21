import type { DealStatus } from "./deal";

/**
 * Checkbox filter selections for the deals list — one array per filterable
 * field. Keep this in sync with the sidebar sections in the page.
 */
export type DealsFilter = {
  stage: string[];
  owner: string[];
  product: string[];
};

/** Quick-filter dropdown state (single-select per control). */
export type DealsQuickFilters = {
  status: DealStatus | "";
};
