import type { ComponentType, SVGProps } from "react";
import type { Lead, LeadStatus, Priority } from "./lead";
import type { DataTableColumn } from "./dataTable";

/** Icon component signature used by the leads UI (lucide icons). */
export type LeadIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

/** A read-only lead field rendered in the detail dialog (icon + formatted value). */
export type LeadField = {
  label: string;
  Icon: LeadIcon;
  get: (lead: Lead) => string;
};

/** Flat string fields used for the CSV export. */
export type LeadCsvField = {
  label: string;
  get: (lead: Lead) => string;
};

/** Compact seed row: [firstName, lastName, company, source, status, priority, createdAt]. */
export type SeedRow = [
  string,
  string,
  string,
  string,
  LeadStatus,
  Priority,
  string,
];

export type LeadDetailDialogProps = {
  lead: Lead;
  onClose: () => void;
  onEdit?: () => void;
  onStatusChange?: (status: LeadStatus) => void;
  availableStatuses?: LeadStatus[];
};

/** Column config for the leads table. */
export type LeadColumn = DataTableColumn<Lead>;
