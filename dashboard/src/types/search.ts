import type { ComponentType } from "react";

export type SearchCategory =
  | "ALL"
  | "LEADS"
  | "DEALS"
  | "CONTACTS"
  | "TASKS"
  | "MEETINGS"
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

export interface SystemPageItem {
  name: string;
  path: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  tags: string[];
}

export interface GlobalSearchResults {
  leads: SearchLeadResult[];
  deals: SearchDealResult[];
  contacts: SearchContactResult[];
  tasks: SearchTaskResult[];
  meetings: SearchMeetingResult[];
  pages: SystemPageItem[];
}
