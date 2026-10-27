import type {
  CreateUserInput,
  RoleInfo,
  RoleName,
  UserListResponse,
  UserRow,
  UserUpdateValues,
} from "../types/user";
import { request } from "./api";
import { ENDPOINTS } from "./endpoints";
import { getSession } from "./auth";

export const ROLE_CONFIG: Record<
  RoleName,
  {
    label: string;
    description: string;
    color: string;
    dotColor: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    permissions: string[];
  }
> = {
  ADMIN: {
    label: "Administrator",
    description: "Full system administration access",
    color: "bg-purple-500",
    dotColor: "bg-purple-500",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-700",
    badgeBorder: "border-purple-200",
    permissions: [
      "Manage all users and assign roles",
      "Full access to leads, deals, tasks and contacts",
      "Manage system settings and configurations",
      "Export and import CRM datasets",
    ],
  },
  SALES_MANAGER: {
    label: "Sales Manager",
    description: "Manages sales team, leads, deals and targets",
    color: "bg-blue-500",
    dotColor: "bg-blue-500",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    badgeBorder: "border-blue-200",
    permissions: [
      "View and edit all team leads and deals",
      "Assign leads and tasks to team members",
      "View performance reports and analytics",
    ],
  },
  SALES_EMPLOYEE: {
    label: "Sales Employee",
    description: "Manages assigned leads, contacts, deals and follow-ups",
    color: "bg-emerald-500",
    dotColor: "bg-emerald-500",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    badgeBorder: "border-emerald-200",
    permissions: [
      "Create and manage assigned leads",
      "Move deals through the sales pipeline",
      "Schedule and complete assigned tasks",
    ],
  },
  REPORT_VIEWER: {
    label: "Report Viewer",
    description: "Read-only access to permitted reports",
    color: "bg-amber-500",
    dotColor: "bg-amber-500",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-200",
    permissions: [
      "View sales dashboards and deal summaries",
      "Read-only access to pipeline reports",
    ],
  },
};

export const roleNames: RoleName[] = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
  "REPORT_VIEWER",
];

export function roleLabel(name: string): string {
  return (
    ROLE_CONFIG[name as RoleName]?.label ||
    name
      .split("_")
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(" ")
  );
}

function authToken(): string {
  const token = getSession()?.token;
  if (!token) throw new Error("Not signed in");
  return token;
}

export type FetchUsersParams =
  | number
  | {
      page?: number;
      limit?: number;
      search?: string;
      role?: string;
      isActive?: boolean;
    };

export async function fetchUsers(
  paramsOrPage: FetchUsersParams = 1,
  limitArg = 10,
  searchArg?: string,
): Promise<UserListResponse> {
  const params = new URLSearchParams();

  if (typeof paramsOrPage === "object") {
    params.set("page", String(paramsOrPage.page ?? 1));
    params.set("limit", String(paramsOrPage.limit ?? 10));
    if (paramsOrPage.search?.trim()) params.set("search", paramsOrPage.search.trim());
    if (paramsOrPage.role && paramsOrPage.role !== "ALL") params.set("role", paramsOrPage.role);
    if (paramsOrPage.isActive !== undefined) params.set("isActive", String(paramsOrPage.isActive));
  } else {
    params.set("page", String(paramsOrPage));
    params.set("limit", String(limitArg));
    if (searchArg?.trim()) params.set("search", searchArg.trim());
  }

  const data = await request<UserListResponse>(
    `${ENDPOINTS.users.list}?${params.toString()}`,
    { token: authToken() },
  );

  return {
    users: data?.users ?? [],
    pagination:
      data?.pagination ?? {
        page: 1,
        limit: 10,
        total: (data?.users || []).length,
        totalPages: 1,
      },
  };
}

export async function createUser(input: CreateUserInput): Promise<UserRow> {
  const data = await request<{ user: UserRow }>(ENDPOINTS.users.list, {
    method: "POST",
    body: input,
    token: authToken(),
  });
  return data.user;
}

export async function updateUser(
  id: number,
  values: UserUpdateValues,
): Promise<UserRow> {
  const data = await request<{ user: UserRow }>(ENDPOINTS.users.byId(id), {
    method: "PATCH",
    body: values,
    token: authToken(),
  });

  return data.user;
}

export async function deleteUser(id: number): Promise<void> {
  await request(ENDPOINTS.users.byId(id), {
    method: "DELETE",
    token: authToken(),
  });
}

export function exportUsersToCsv(users: UserRow[]): void {
  const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
  const headers = ["ID", "Name", "Email", "Phone", "Role", "Status", "Created At"];
  const rows = users.map((u) => [
    String(u.id),
    u.name,
    u.email,
    u.phone || "",
    roleLabel(u.role?.name || ""),
    u.isActive ? "Active" : "Inactive",
    u.createdAt,
  ]);

  const csv = [headers, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildRoles(users: UserRow[]): RoleInfo[] {
  const counts = new Map<string, number>();
  for (const user of users) {
    const name = user.role?.name;
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return roleNames.map((name) => ({
    name,
    ...ROLE_CONFIG[name],
    userCount: counts.get(name) ?? 0,
  }));
}
