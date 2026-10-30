import {
  Home,
  Users,
  Contact,
  UserRound,
  CheckSquare,
  CalendarDays,
  Calendar,
  GitFork,
  Target,
  BarChart3,
  FileText,
  UserCog,
  ShieldCheck,
  Package,
  Bell,
} from "lucide-react";
import { request } from "./api";
import { ENDPOINTS } from "./endpoints";
import { getSession } from "./auth";
import type {
  GlobalSearchResults,
  SearchLeadResult,
  SearchCustomerResult,
  SearchDealResult,
  SearchContactResult,
  SearchTaskResult,
  SearchMeetingResult,
  SystemPageItem,
} from "../types/search";

export const SYSTEM_PAGES: SystemPageItem[] = [
  { name: "Dashboard", path: "/", icon: Home, tags: ["home", "dashboard", "overview", "kpi"] },
  { name: "Notifications", path: "/notifications", icon: Bell, tags: ["notifications", "alerts", "inbox"] },
  { name: "Calendar", path: "/calendar", icon: Calendar, tags: ["calendar", "schedule", "events"] },
  { name: "Leads", path: "/leads", icon: Users, tags: ["leads", "prospects", "pipeline", "inquiries"] },
  { name: "Contacts", path: "/contacts", icon: Contact, tags: ["contacts", "people", "clients", "directory"] },
  { name: "Customers", path: "/customers", icon: UserRound, tags: ["customers", "clients", "accounts"] },
  { name: "Tasks", path: "/tasks", icon: CheckSquare, tags: ["tasks", "todos", "action items"] },
  { name: "Meetings", path: "/meetings", icon: CalendarDays, tags: ["meetings", "demos", "calls", "calendar"] },
  { name: "Deals & Pipeline", path: "/deals", icon: GitFork, tags: ["deals", "pipeline", "opportunities", "sales", "revenue"] },
  { name: "Products & Services", path: "/products-services", icon: Package, tags: ["products", "services", "catalog", "pricing"] },
  { name: "Sales Targets", path: "/targets", icon: Target, tags: ["targets", "goals", "quotas"] },
  { name: "Reports", path: "/reports", icon: BarChart3, tags: ["reports", "analytics", "charts", "performance", "metrics"] },
  { name: "Documents", path: "/documents", icon: FileText, tags: ["documents", "files", "contracts", "proposals"] },
  { name: "User Management", path: "/users", icon: UserCog, tags: ["users", "team", "members", "staff"] },
  { name: "Roles & Permissions", path: "/permissions", icon: ShieldCheck, tags: ["permissions", "roles", "access", "security"] },
  { name: "Profile", path: "/profile", icon: UserRound, tags: ["profile", "settings", "account", "my profile"] },
];

export function matchSystemPages(query: string, limit = 4): SystemPageItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return SYSTEM_PAGES.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q))
  ).slice(0, limit);
}

export async function executeGlobalSearch(
  query: string,
  limit = 4
): Promise<GlobalSearchResults> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      leads: [],
      customers: [],
      deals: [],
      contacts: [],
      tasks: [],
      meetings: [],
      pages: [],
    };
  }

  const token = getSession()?.token;
  const encoded = encodeURIComponent(trimmed);

  const [leadsRes, customersRes, contactsRes, dealsRes, tasksRes, meetingsRes] =
    await Promise.allSettled([
      request<{ leads: SearchLeadResult[] }>(
        `${ENDPOINTS.leads.list}?search=${encoded}&limit=${limit}`,
        { method: "GET", token }
      ),
      request<{ customers: SearchCustomerResult[] }>(
        `${ENDPOINTS.customers.list}?search=${encoded}&limit=${limit}`,
        { method: "GET", token }
      ),
      request<{ contacts: SearchContactResult[] }>(
        `${ENDPOINTS.contacts.list}?search=${encoded}&limit=${limit}`,
        { method: "GET", token }
      ),
      request<{ items: SearchDealResult[] }>(
        `${ENDPOINTS.deals.list}?search=${encoded}&limit=${limit}`,
        { method: "GET", token }
      ),
      request<{ items: SearchTaskResult[] }>(
        `${ENDPOINTS.tasks.list}?search=${encoded}&limit=${limit}`,
        { method: "GET", token }
      ),
      request<{ meetings: SearchMeetingResult[] }>(
        `${ENDPOINTS.meetings.list}?search=${encoded}&limit=${limit}`,
        { method: "GET", token }
      ),
    ]);

  return {
    leads: leadsRes.status === "fulfilled" ? leadsRes.value.leads || [] : [],
    customers: customersRes.status === "fulfilled" ? customersRes.value.customers || [] : [],
    contacts: contactsRes.status === "fulfilled" ? contactsRes.value.contacts || [] : [],
    deals: dealsRes.status === "fulfilled" ? dealsRes.value.items || [] : [],
    tasks: tasksRes.status === "fulfilled" ? tasksRes.value.items || [] : [],
    meetings: meetingsRes.status === "fulfilled" ? meetingsRes.value.meetings || [] : [],
    pages: matchSystemPages(trimmed, limit),
  };
}
