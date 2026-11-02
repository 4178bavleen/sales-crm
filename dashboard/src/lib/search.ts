import {
  Home,
  Users,
  Contact,
  UserRound,
  CheckSquare,
  CalendarDays,
  Calendar,
  CalendarClock,
  PhoneCall,
  GitFork,
  Target,
  BarChart3,
  FileText,
  UserCog,
  ShieldCheck,
  Shield,
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
  SearchDocumentResult,
  SearchProductResult,
  SearchUserResult,
  SearchTargetResult,
  SystemPageItem,
} from "../types/search";

export const SYSTEM_PAGES: SystemPageItem[] = [
  { name: "Dashboard", path: "/", icon: Home, tags: ["home", "dashboard", "overview", "kpi", "analytics", "stats", "metrics"] },
  { name: "Leads", path: "/leads", icon: Users, tags: ["leads", "prospects", "pipeline", "inquiries", "sales leads", "new leads", "sources"] },
  { name: "Follow-ups", path: "/follow-ups", icon: CalendarClock, tags: ["follow-ups", "followups", "scheduled calls", "pipeline follow-up", "reminders", "callbacks", "tasks"] },
  { name: "Contacts", path: "/contacts", icon: Contact, tags: ["contacts", "people", "clients", "directory", "phonebook", "address book", "emails"] },
  { name: "Customers", path: "/customers", icon: UserRound, tags: ["customers", "clients", "accounts", "organizations", "buyers", "companies"] },
  { name: "Deals & Pipeline", path: "/deals", icon: GitFork, tags: ["deals", "pipeline", "opportunities", "sales", "revenue", "stages", "forecast", "proposals"] },
  { name: "Daily Calls", path: "/daily-calls", icon: PhoneCall, tags: ["daily calls", "calls", "phone", "telephony", "webphone", "outreach", "dialer", "call logs"] },
  { name: "Tasks", path: "/tasks", icon: CheckSquare, tags: ["tasks", "todos", "action items", "to-do list", "assignments", "deadlines", "pending"] },
  { name: "Meetings", path: "/meetings", icon: CalendarDays, tags: ["meetings", "demos", "calls", "calendar", "appointments", "conferences", "schedule"] },
  { name: "Calendar", path: "/calendar", icon: Calendar, tags: ["calendar", "schedule", "events", "agenda", "month view", "week view", "timetable", "planner"] },
  { name: "Products & Services", path: "/products-services", icon: Package, tags: ["products", "services", "catalog", "pricing", "inventory", "packages", "offerings", "rate card", "sku"] },
  { name: "Sales Targets", path: "/targets", icon: Target, tags: ["targets", "goals", "quotas", "sales targets", "revenue quota", "attainment", "performance", "forecast"] },
  { name: "Reports", path: "/reports", icon: BarChart3, tags: ["reports", "analytics", "charts", "performance", "metrics", "sales reports", "conversion", "trends"] },
  { name: "Documents", path: "/documents", icon: FileText, tags: ["documents", "files", "contracts", "proposals", "agreements", "attachments", "vault", "docs", "versions"] },
  { name: "User Management", path: "/users", icon: UserCog, tags: ["users", "team", "members", "staff", "employees", "user management", "accounts", "reps", "admin"] },
  { name: "Roles & Permissions", path: "/permissions", icon: ShieldCheck, tags: ["permissions", "roles", "access", "security", "privileges", "rbac", "authorization"] },
  { name: "Audit Logs", path: "/audit-logs", icon: Shield, tags: ["audit logs", "audit", "system activity", "logs", "security logs", "compliance", "history", "actions", "events"] },
  { name: "Notifications", path: "/notifications", icon: Bell, tags: ["notifications", "alerts", "inbox", "reminders", "unread notifications", "activity feed"] },
  { name: "Profile", path: "/profile", icon: UserRound, tags: ["profile", "settings", "account", "my profile", "user settings", "password", "preferences"] },
];

export function matchSystemPages(query: string, limit = 6): SystemPageItem[] {
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
      documents: [],
      products: [],
      users: [],
      targets: [],
      pages: [],
    };
  }

  const token = getSession()?.token;
  const encoded = encodeURIComponent(trimmed);

  const [
    leadsRes,
    customersRes,
    contactsRes,
    dealsRes,
    tasksRes,
    meetingsRes,
    documentsRes,
    productsRes,
    usersRes,
    targetsRes,
  ] = await Promise.allSettled([
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
    request<{ items: SearchDocumentResult[] }>(
      `${ENDPOINTS.documents.list}?search=${encoded}&limit=${limit}`,
      { method: "GET", token }
    ),
    request<{ items: SearchProductResult[] }>(
      `${ENDPOINTS.productsServices.list}?search=${encoded}&limit=${limit}`,
      { method: "GET", token }
    ),
    request<{ users: SearchUserResult[] }>(
      `${ENDPOINTS.users.list}?search=${encoded}&limit=${limit}`,
      { method: "GET", token }
    ),
    request<{ items: SearchTargetResult[] }>(
      `${ENDPOINTS.targets.list}?search=${encoded}&limit=${limit}`,
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
    documents: documentsRes.status === "fulfilled" ? documentsRes.value.items || [] : [],
    products: productsRes.status === "fulfilled" ? productsRes.value.items || [] : [],
    users: usersRes.status === "fulfilled" ? usersRes.value.users || [] : [],
    targets: targetsRes.status === "fulfilled" ? targetsRes.value.items || [] : [],
    pages: matchSystemPages(trimmed, limit),
  };
}
