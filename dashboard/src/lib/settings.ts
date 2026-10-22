import type {
  RoleInfo,
  RoleName,
  UserListResponse,
  UserRow,
  UserUpdateResponse,
  UserUpdateValues,
} from "../types/settings";
import { request } from "./api";
import { ENDPOINTS } from "./endpoints";
import { getSession } from "./auth";

/* -------------------------------------------------------------------------- */
/* Users (real API, admin-only)                                               */
/* -------------------------------------------------------------------------- */

function authToken(): string {
  const token = getSession()?.token;
  if (!token) throw new Error("Not signed in");
  return token;
}

/** Fetch one page of users. Requires an ADMIN token — 403 otherwise. */
export async function fetchUsers(
  page = 1,
  limit = 10,
  search?: string,
): Promise<UserListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search?.trim()) params.set("search", search.trim());

  const data = await request<UserListResponse>(
    `${ENDPOINTS.users.list}?${params.toString()}`,
    { token: authToken() },
  );

  return {
    users: data?.users ?? [],
    pagination:
      data?.pagination ?? { page, limit, total: 0, totalPages: 1 },
  };
}

/**
 * Update a user with PATCH /api/v1/users/:id.
 *
 * The backend's `updateUserSchema` requires at least one field, so an empty
 * patch is rejected before it leaves the client.
 */
export async function updateUser(
  id: number,
  values: UserUpdateValues,
): Promise<UserRow> {
  if (Object.keys(values).length === 0) {
    throw new Error("Provide at least one field to update");
  }

  const data = await request<UserUpdateResponse>(ENDPOINTS.users.byId(id), {
    method: "PATCH",
    body: values,
    token: authToken(),
  });

  return data.user;
}

/* -------------------------------------------------------------------------- */
/* Roles                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The four role names the backend accepts, with the descriptions seeded into
 * `Role.description` (backend/prisma/seed/role.seed.ts).
 *
 * NOT fetched: `backend/src/app.ts` mounts only /auth and /users, so there is no
 * roles endpoint. These values mirror the backend's own Zod enums and the seed;
 * `userCount` IS derived from real data (the fetched user list).
 */
const ROLE_DEFINITIONS: { name: RoleName; description: string }[] = [
  { name: "ADMIN", description: "Full system administration access" },
  {
    name: "SALES_MANAGER",
    description: "Manages sales team, leads, deals and targets",
  },
  {
    name: "SALES_EMPLOYEE",
    description: "Manages assigned leads, contacts, deals and follow-ups",
  },
  {
    name: "REPORT_VIEWER",
    description: "Read-only access to permitted reports",
  },
];

/** The four role names, for selects. */
export const roleNames: RoleName[] = ROLE_DEFINITIONS.map((role) => role.name);

/** Build the role list, counting holders from the users actually returned. */
export function buildRoles(users: UserRow[]): RoleInfo[] {
  const counts = new Map<string, number>();
  for (const user of users) {
    const name = user.role?.name;
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return ROLE_DEFINITIONS.map((role) => ({
    ...role,
    userCount: counts.get(role.name) ?? 0,
  }));
}

/** Human label for a role name, e.g. SALES_MANAGER -> "Sales Manager". */
export function roleLabel(name: string): string {
  return name
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}