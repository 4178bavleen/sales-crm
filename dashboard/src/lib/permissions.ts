import { request } from "./api";
import { ENDPOINTS } from "./endpoints";
import { getSession } from "./auth";

function authToken(): string {
  const token = getSession()?.token;
  if (!token) throw new Error("Not signed in");
  return token;
}

export type PermissionItem = {
  id: number;
  code: string;
  description: string;
};

export type RoleItem = {
  id: number;
  name: string;
  description: string | null;
  _count: {
    users: number;
    permissions: number;
  };
};

export type RolePermissionsDetail = {
  id: number;
  name: string;
  description: string | null;
  permissions: PermissionItem[];
};

export type CreateRoleInput = {
  name: string;
  description?: string;
  codes?: string[];
};

export async function fetchRoles(): Promise<RoleItem[]> {
  const res = await request<{ roles: RoleItem[] }>(ENDPOINTS.permissions.roles, {
    token: authToken(),
  });
  return res.roles;
}

export async function fetchPermissions(): Promise<PermissionItem[]> {
  const res = await request<{ permissions: PermissionItem[] }>(
    ENDPOINTS.permissions.list,
    { token: authToken() },
  );
  return res.permissions;
}

export async function fetchRolePermissions(
  roleId: number,
): Promise<RolePermissionsDetail> {
  const res = await request<{ role: RolePermissionsDetail }>(
    ENDPOINTS.permissions.rolePermissions(roleId),
    { token: authToken() },
  );
  return res.role;
}

export async function updateRolePermissions(
  roleId: number,
  codes: string[],
): Promise<RolePermissionsDetail> {
  const res = await request<{ role: RolePermissionsDetail }>(
    ENDPOINTS.permissions.rolePermissions(roleId),
    {
      method: "PUT",
      body: { codes },
      token: authToken(),
    },
  );
  return res.role;
}

export async function createRole(input: CreateRoleInput): Promise<RoleItem> {
  const res = await request<{ role: RoleItem }>(ENDPOINTS.permissions.roles, {
    method: "POST",
    body: input,
    token: authToken(),
  });
  return res.role;
}

export async function updateRole(
  roleId: number,
  input: { name?: string; description?: string },
): Promise<RoleItem> {
  const res = await request<{ role: RoleItem }>(
    `${ENDPOINTS.permissions.roles}/${roleId}`,
    {
      method: "PATCH",
      body: input,
      token: authToken(),
    },
  );
  return res.role;
}

export async function deleteRole(
  roleId: number,
  reassignToRoleId?: number,
): Promise<void> {
  const url = reassignToRoleId
    ? `${ENDPOINTS.permissions.roles}/${roleId}?reassignToRoleId=${reassignToRoleId}`
    : `${ENDPOINTS.permissions.roles}/${roleId}`;
  await request<{ message: string }>(url, {
    method: "DELETE",
    token: authToken(),
  });
}
