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
      "Manage all employees and assign roles",
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

export type CountryOption = {
  code: string;
  dialCode: string;
  name: string;
};

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "IN", dialCode: "+91", name: "India" },
  { code: "US", dialCode: "+1", name: "United States" },
  { code: "GB", dialCode: "+44", name: "United Kingdom" },
  { code: "AE", dialCode: "+971", name: "United Arab Emirates" },
  { code: "CA", dialCode: "+1", name: "Canada" },
  { code: "AU", dialCode: "+61", name: "Australia" },
  { code: "SG", dialCode: "+65", name: "Singapore" },
  { code: "MY", dialCode: "+60", name: "Malaysia" },
  { code: "SA", dialCode: "+966", name: "Saudi Arabia" },
  { code: "QA", dialCode: "+974", name: "Qatar" },
  { code: "KW", dialCode: "+965", name: "Kuwait" },
  { code: "BH", dialCode: "+973", name: "Bahrain" },
  { code: "OM", dialCode: "+968", name: "Oman" },
  { code: "IL", dialCode: "+972", name: "Israel" },
  { code: "TR", dialCode: "+90", name: "Turkey" },
  { code: "DE", dialCode: "+49", name: "Germany" },
  { code: "FR", dialCode: "+33", name: "France" },
  { code: "IT", dialCode: "+39", name: "Italy" },
  { code: "ES", dialCode: "+34", name: "Spain" },
  { code: "NL", dialCode: "+31", name: "Netherlands" },
  { code: "BE", dialCode: "+32", name: "Belgium" },
  { code: "CH", dialCode: "+41", name: "Switzerland" },
  { code: "AT", dialCode: "+43", name: "Austria" },
  { code: "SE", dialCode: "+46", name: "Sweden" },
  { code: "NO", dialCode: "+47", name: "Norway" },
  { code: "DK", dialCode: "+45", name: "Denmark" },
  { code: "FI", dialCode: "+358", name: "Finland" },
  { code: "PL", dialCode: "+48", name: "Poland" },
  { code: "IE", dialCode: "+353", name: "Ireland" },
  { code: "PT", dialCode: "+351", name: "Portugal" },
  { code: "RU", dialCode: "+7", name: "Russia" },
  { code: "UA", dialCode: "+380", name: "Ukraine" },
  { code: "BR", dialCode: "+55", name: "Brazil" },
  { code: "MX", dialCode: "+52", name: "Mexico" },
  { code: "AR", dialCode: "+54", name: "Argentina" },
  { code: "CL", dialCode: "+56", name: "Chile" },
  { code: "CO", dialCode: "+57", name: "Colombia" },
  { code: "ZA", dialCode: "+27", name: "South Africa" },
  { code: "NG", dialCode: "+234", name: "Nigeria" },
  { code: "KE", dialCode: "+254", name: "Kenya" },
  { code: "EG", dialCode: "+20", name: "Egypt" },
  { code: "PK", dialCode: "+92", name: "Pakistan" },
  { code: "BD", dialCode: "+880", name: "Bangladesh" },
  { code: "NP", dialCode: "+977", name: "Nepal" },
  { code: "LK", dialCode: "+94", name: "Sri Lanka" },
  { code: "CN", dialCode: "+86", name: "China" },
  { code: "JP", dialCode: "+81", name: "Japan" },
  { code: "KR", dialCode: "+82", name: "South Korea" },
  { code: "ID", dialCode: "+62", name: "Indonesia" },
  { code: "TH", dialCode: "+66", name: "Thailand" },
  { code: "VN", dialCode: "+84", name: "Vietnam" },
  { code: "PH", dialCode: "+63", name: "Philippines" },
  { code: "TW", dialCode: "+886", name: "Taiwan" },
  { code: "HK", dialCode: "+852", name: "Hong Kong" },
  { code: "NZ", dialCode: "+64", name: "New Zealand" },
];

export function countryOption(code: string): CountryOption {
  return (
    COUNTRY_OPTIONS.find((option) => option.code === code) ?? {
      code,
      dialCode: "",
      name: code,
    }
  );
}

export function formatEmployeePhone(phone: {
  dialCode: string;
  number: string;
}): string {
  return `${phone.dialCode}${phone.number.replace(/\s+/g, "")}`.trim();
}

export function employeeJoiningDate(user: {
  joiningDate?: string | null;
  createdAt: string;
}): string {
  return user.joiningDate ?? user.createdAt;
}

export function joiningDateInputValue(value?: string | null): string {
  return value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);
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
  const headers = [
    "ID",
    "Name",
    "Email",
    "Phone",
    "Other Phone Numbers",
    "Role",
    "Status",
    "Joining Date",
  ];
  const rows = users.map((u) => [
    String(u.id),
    u.name,
    u.email,
    u.phone || "",
    (u.phones ?? [])
      .filter((phone) => !phone.isPrimary)
      .map(
        (phone) =>
          `${formatEmployeePhone(phone)}${phone.label ? ` (${phone.label})` : ""}`,
      )
      .join("; "),
    roleLabel(u.role?.name || ""),
    u.isActive ? "Active" : "Inactive",
    employeeJoiningDate(u),
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
