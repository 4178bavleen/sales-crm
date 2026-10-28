import {
  LayoutDashboard,
  Users,
  GitFork,
  UserRound,
  Building2,
  Briefcase,
  CheckSquare,
  CalendarDays,
  Calendar as CalendarIcon,
  BarChart3,
  Layers,
  UserCog,
  ShieldCheck,
  Bell,
} from "lucide-react";
import { request } from "./api";
import { ENDPOINTS } from "./endpoints";
import { getSession } from "./auth";
import type {
  GlobalSearchResults,
  SearchLeadResult,
  SearchDealResult,
  SearchContactResult,
  SearchTaskResult,
  SearchMeetingResult,
  SystemPageItem,
} from "../types/search";

export const SYSTEM_PAGES: SystemPageItem[] = [
  { name: "Executive Dashboard", path: "/", icon: LayoutDashboard, tags: ["home", "dashboard", "overview", "kpi"] },
  { name: "Leads & Prospects", path: "/leads", icon: Users, tags: ["leads", "prospects", "pipeline", "inquiries"] },
  { name: "Deals & Pipeline Board", path: "/deals", icon: GitFork, tags: ["deals", "pipeline", "opportunities", "sales", "revenue"] },
  { name: "Contacts Directory", path: "/contacts", icon: UserRound, tags: ["contacts", "people", "clients", "directory"] },
  { name: "Companies", path: "/companies", icon: Building2, tags: ["companies", "accounts", "organizations"] },
  { name: "Customers", path: "/customers", icon: Briefcase, tags: ["customers", "clients", "accounts"] },
  { name: "Tasks & Action Items", path: "/tasks", icon: CheckSquare, tags: ["tasks", "todos", "action items"] },
  { name: "Meetings & Demos", path: "/meetings", icon: CalendarDays, tags: ["meetings", "demos", "calls", "calendar"] },
  { name: "Calendar View", path: "/calendar", icon: CalendarIcon, tags: ["calendar", "schedule", "events"] },
  { name: "Sales Reports & Analytics", path: "/reports", icon: BarChart3, tags: ["reports", "analytics", "charts", "performance", "metrics"] },
  { name: "Sales Targets & Quotas", path: "/targets", icon: Layers, tags: ["targets", "goals", "quotas"] },
  { name: "Products & Services", path: "/products-services", icon: Layers, tags: ["products", "services", "catalog", "pricing"] },
  { name: "User Management", path: "/users", icon: UserCog, tags: ["users", "team", "members", "staff"] },
  { name: "Roles & Permissions", path: "/permissions", icon: ShieldCheck, tags: ["permissions", "roles", "access", "security"] },
  { name: "Notifications", path: "/notifications", icon: Bell, tags: ["notifications", "alerts", "inbox"] },
  { name: "My Profile", path: "/profile", icon: UserRound, tags: ["profile", "settings", "account"] },
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
      deals: [],
      contacts: [],
      tasks: [],
      meetings: [],
      pages: [],
    };
  }

  const token = getSession()?.token;
  const encoded = encodeURIComponent(trimmed);

  const [leadsRes, contactsRes, dealsRes, tasksRes, meetingsRes] =
    await Promise.allSettled([
      request<{ leads: SearchLeadResult[] }>(
        `${ENDPOINTS.leads.list}?search=${encoded}&limit=${limit}`,
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
    contacts: contactsRes.status === "fulfilled" ? contactsRes.value.contacts || [] : [],
    deals: dealsRes.status === "fulfilled" ? dealsRes.value.items || [] : [],
    tasks: tasksRes.status === "fulfilled" ? tasksRes.value.items || [] : [],
    meetings: meetingsRes.status === "fulfilled" ? meetingsRes.value.meetings || [] : [],
    pages: matchSystemPages(trimmed, limit),
  };
}
