import type { ComponentType, SVGProps } from "react";
import type { Company } from "./company";
import type { DataTableColumn } from "./dataTable";

/** Icon component signature used by the companies UI (lucide icons). */
export type CompanyIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

/** A read-only company field rendered in the detail dialog. */
export type CompanyField = {
  label: string;
  Icon: CompanyIcon;
  get: (company: Company) => string;
};

/** Flat string fields used for the CSV export. */
export type CompanyCsvField = {
  label: string;
  get: (company: Company) => string;
};

/** Compact seed row: [name, website, industry, phone, address, city, state, country, notes, createdAt]. */
export type CompanySeedRow = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

export type CompanyColumn = DataTableColumn<Company>;

export type CompanyDetailDialogProps = {
  company: Company;
  onClose: () => void;
};
