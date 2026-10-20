import type { ComponentType, SVGProps } from "react";
import type { Customer } from "./customer";
import type { DataTableColumn } from "./dataTable";

/** Icon component signature used by the customers UI (lucide icons). */
export type CustomerIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

/** A read-only customer field rendered in the detail dialog. */
export type CustomerField = {
  label: string;
  Icon: CustomerIcon;
  get: (customer: Customer) => string;
};

/** Flat string fields used for the CSV export. */
export type CustomerCsvField = {
  label: string;
  get: (customer: Customer) => string;
};

/**
 * Compact seed row:
 * [company, primaryContact, owner, notes, dealCount, pipelineValue, convertedAt].
 *
 * Industry is deliberately absent — it is resolved from the companies seed so
 * the two datasets cannot drift.
 */
export type CustomerSeedRow = [
  string, // company
  string, // primaryContact
  string, // owner
  string, // notes
  number, // dealCount
  number, // pipelineValue
  string, // convertedAt
];

export type CustomerColumn = DataTableColumn<Customer>;

export type CustomerDetailDialogProps = {
  customer: Customer;
  onClose: () => void;
};
