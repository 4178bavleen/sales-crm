import type { UserProfile } from "../types/profile";
import { ApiError, request } from "./api";
import { ENDPOINTS } from "./endpoints";
import { getSession } from "./auth";

/**
 * Profile data comes from the backend, never from local seeds.
 *
 *   GET   /api/v1/auth/me      -> { id, name, email, phone, role }
 *   GET   /api/v1/users/:id    -> adds isActive, createdAt, updatedAt, role.id
 *
 * The richer `/users/:id` row is preferred (it carries `isActive` and the
 * timestamps the Account card shows); if it is unavailable the session user is
 * used as a fallback so the page still renders something real.
 */

/** Shape of the nested role on GET /users/:id. */
type ApiRole = { id: number; name: string } | string | null;

/** Shape of a users-module row. */
type ApiUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  role?: ApiRole;
};

/** Response of GET /users/:id. */
type UserResponse = { user: ApiUser };

function roleName(role: ApiRole | undefined): string {
  if (!role) return "";
  return typeof role === "string" ? role : role.name;
}

function roleId(role: ApiRole | undefined): number {
  if (!role || typeof role === "string") return 0;
  return role.id;
}

/** Normalise an API user (flat from /auth/me or nested from /users/:id). */
function toProfile(user: ApiUser): UserProfile {
  return {
    id: user.id,
    name: user.name ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    role: roleName(user.role),
    roleId: roleId(user.role),
    isActive: user.isActive ?? true,
    createdAt: user.createdAt ?? "",
    updatedAt: user.updatedAt ?? "",
  };
}

/**
 * Fetch the signed-in user's profile.
 *
 * Throws `ApiError` on failure so the page can show a real error instead of
 * invented data.
 */
export async function fetchProfile(): Promise<UserProfile> {
  const session = getSession();
  if (!session) throw new ApiError("Not signed in", 401);

  try {
    const data = await request<UserResponse>(ENDPOINTS.users.byId(session.user.id), {
      token: session.token,
    });
    if (data?.user) return toProfile(data.user);
  } catch (error) {
    // A 404/403 on /users/:id is possible for a non-admin viewer; the session
    // user is still genuine data from the login response, so fall back to it.
    if (!(error instanceof ApiError)) throw error;
  }

  return toProfile({
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    phone: session.user.phone,
    role: session.user.role,
  });
}
