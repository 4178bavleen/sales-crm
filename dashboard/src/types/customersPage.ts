/**
 * Checkbox filter selections for the customers list — one array per
 * filterable field. Keep this in sync with the sidebar sections in the page.
 */
export type CustomersFilter = {
  industry: string[];
  owner: string[];
};
