export type RoleName =
  | "ADMIN"
  | "SALES_MANAGER"
  | "SALES_EMPLOYEE"
  | "REPORT_VIEWER";

export type UserRole = { id: number; name: string };

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

export type CreateUserInput = {
  name: string;
  email: string;
  password?: string;
  phone?: string | null;
  roleName: RoleName;
  isActive?: boolean;
};

export type UserUpdateValues = {
  name?: string;
  email?: string;
  password?: string;
  phone?: string | null;
  roleName?: RoleName;
  isActive?: boolean;
};

export type UsersFilterState = {
  search: string;
  role: RoleName | "ALL";
  status: "ALL" | "ACTIVE" | "INACTIVE";
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type UserListResponse = {
  users: UserRow[];
  pagination: Pagination;
};

export type RoleInfo = {
  name: RoleName;
  description: string;
  userCount: number;
  label: string;
  color: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  permissions: string[];
};

export type SettingsSection = "roles" | "workspace" | "security" | "users";
