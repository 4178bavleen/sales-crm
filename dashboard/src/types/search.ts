import type { ComponentType } from "react";

export type SearchCategory =
  | "ALL"
  | "LEADS"
  | "CUSTOMERS"
  | "DEALS"
  | "CONTACTS"
  | "TASKS"
  | "MEETINGS"
  | "DOCUMENTS"
  | "PRODUCTS"
  | "USERS"
  | "TARGETS"
  | "PAGES";

export interface SearchLeadResult {
  id: number;
  contactName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  priority: string;
}

export interface SearchCustomerResult {
  id: number;
  company: string;
  industry: string;
  primaryContact: string;
  owner: string;
  dealCount: number;
  pipelineValue: number;
}

export interface SearchContactResult {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  company?: { name: string } | null;
}

export interface SearchDealResult {
  id: number;
  name: string;
  estimatedValue: string | number;
  status: string;
  stage?: { name: string } | null;
  customer?: { company?: { name: string } | null } | null;
  lead?: { companyName?: string | null } | null;
}

export interface SearchTaskResult {
  id: number;
  title: string;
  dueAt: string;
  priority: string;
  status: string;
  assignedTo?: { name: string } | null;
}

export interface SearchMeetingResult {
  id: number;
  title: string;
  startsAt: string;
  location?: string | null;
  status: string;
  lead?: { contactName?: string | null; companyName?: string | null } | null;
}

export interface SearchDocumentResult {
  id: number;
  name: string;
  category: string;
  currentVersion: number;
  latestVersion?: {
    originalFileName?: string;
    sizeBytes?: number;
    fileType?: string;
  };
  lead?: { contactName?: string } | null;
  deal?: { name?: string } | null;
  customer?: { company?: { name: string } | null } | null;
}

export interface SearchProductResult {
  id: number;
  name: string;
  sku?: string | null;
  type: string;
  unitPrice: number | string;
  currency: string;
  isActive: boolean;
}

export interface SearchUserResult {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role?: { name: string } | null;
}

export interface SearchTargetResult {
  id: number;
  amount: number;
  periodType: string;
  progressPercentage: number;
  status: string;
  employee?: { name: string; email: string } | null;
  team?: { name: string } | null;
}

export interface SystemPageItem {
  name: string;
  path: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  tags: string[];
}

export interface GlobalSearchResults {
  leads: SearchLeadResult[];
  customers: SearchCustomerResult[];
  deals: SearchDealResult[];
  contacts: SearchContactResult[];
  tasks: SearchTaskResult[];
  meetings: SearchMeetingResult[];
  documents: SearchDocumentResult[];
  products: SearchProductResult[];
  users: SearchUserResult[];
  targets: SearchTargetResult[];
  pages: SystemPageItem[];
}
