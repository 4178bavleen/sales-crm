// Domain types for the Settings feature.
//
// UI ONLY — nothing here is wired to the backend yet. The user and role lists
// are held in local state (see src/data/settings.ts) and will be replaced by API
// calls later. The shapes below intentionally match the backend so that swap is
// mechanical:
//   GET /api/v1/users      -> { users[], pagination }   (admin only)
//   PATCH /api/v1/users/:id -> { user }                 (admin only)

/** The nested role relation on a user row. */
export type UserRole = { id: number; name: string };

/** Fields an edit can change (mirrors the backend's updateUserSchema). */
export type UserUpdateValues = {
  name?: string;
  email?: string;
  phone?: string | null;
  roleName?: RoleName;
  isActive?: boolean;
};

/** A user row, shaped like the backend's `select` in user.service.ts. */
export type UserRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  role: UserRole;
};

/** The `pagination` block returned alongside the user list. */
export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/** Response of GET /api/v1/users. */
export type UserListResponse = {
  users: UserRow[];
  pagination: Pagination;
};

/** Response of PATCH /api/v1/users/:id. */
export type UserUpdateResponse = { user: UserRow };

/** The four role names the backend accepts. */
export type RoleName =
  | "ADMIN"
  | "SALES_MANAGER"
  | "SALES_EMPLOYEE"
  | "REPORT_VIEWER";

/**
 * A role as shown in the Roles section.
 *
 * `description` mirrors the Prisma `Role.description` column seeded in
 * backend/prisma/seed/role.seed.ts. `userCount` is counted from the local list.
 */
export type RoleInfo = {
  name: RoleName;
  description: string;
  /** How many users in the list hold this role. */
  userCount: number;
  label?: string;
  color?: string;
  badgeBg?: string;
  badgeText?: string;
  badgeBorder?: string;
  permissions?: string[];
};

/** Section ids used by the settings nav. */
export type SettingsSection = "users" | "roles" | "workspace" | "security";
