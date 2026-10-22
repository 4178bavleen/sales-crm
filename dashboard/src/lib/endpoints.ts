// REST endpoint paths, defined relative to the API base URL.
//
// The base URL itself lives ONLY in `.env` (`VITE_API_URL`) and is read here.
// No host or port is ever hardcoded in source, so pointing the dashboard at a
// different backend is an env change, not a code change.
//
// Paths are kept as a single source of truth so a route rename happens in one
// place instead of scattered string literals across the codebase. They mirror
// `backend/src/app.ts` and each module's `*.routes.ts`.

/** Base URL of the API, e.g. http://localhost:5000/api/v1 (from .env). */
export const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error(
    "VITE_API_URL is not set. Add it to dashboard/.env"
  );
}

/** Strip any trailing slash so joining never produces a double slash. */
const BASE = API_URL.replace(/\/+$/, "");

/**
 * Endpoints, grouped by module.
 *
 * Each entry is a path relative to `API_URL`; callers pass them straight to
 * `request()` in src/lib/api.ts, which prefixes `BASE`.
 */
export const ENDPOINTS = {
  auth: {
    login: "/auth/login",
    me: "/auth/me",
    logout: "/auth/logout",
  },
  /** Current user's own profile (no admin needed). */
  profile: {
    me: "/auth/me",
  },
  /** Admin-only user management. */
  users: {
    list: "/users",
    /** GET / PATCH / DELETE — the method is chosen by the caller. */
    byId: (id: number) => `/users/${id}`,
  },
  /** Leads management. */
  leads: {
    list: "/leads",
    options: "/leads/options",
    stats: "/leads/stats",
    byId: (id: number) => `/leads/${id}`,
    assign: (id: number) => `/leads/${id}/assign`,
    status: (id: number) => `/leads/${id}/status`,
  },
  
  tasks: {
    list: "/tasks",
    options: "/tasks/options",
    byId: (id: number) => `/tasks/${id}`,
    create: "/tasks",
    update: (id: number) => `/tasks/${id}`,
    updateStatus: (id: number) => `/tasks/${id}/status`,
    delete: (id: number) => `/tasks/${id}`,
  },

  deals: {
    list: "/deals",
    options: "/deals/options",
    byId: (id: number) => `/deals/${id}`,
    create: "/deals",
    update: (id: number) => `/deals/${id}`,
    delete: (id: number) => `/deals/${id}`,
    moveStage: (id: number) => `/deals/${id}/stage`,
    close: (id: number) => `/deals/${id}/close`,
  },

  permissions: {
    roles: "/permissions/roles",
    list: "/permissions/permissions",
    rolePermissions: (roleId: number) => `/permissions/roles/${roleId}/permissions`,
    me: "/permissions/me",
  },

  meetings: {
    list: "/meetings",
    options: "/meetings/options",
    byId: (id: number) => `/meetings/${id}`,
    create: "/meetings",
    update: (id: number) => `/meetings/${id}`,
    delete: (id: number) => `/meetings/${id}`,
  },

  targets: {
    list: "/targets",
    options: "/targets/options",
    byId: (id: number) => `/targets/${id}`,
    create: "/targets",
    update: (id: number) => `/targets/${id}`,
    delete: (id: number) => `/targets/${id}`,
  },

  health: "/health",
} as const;

/** Join the base URL with a path into an absolute request URL. */
export function apiUrl(path: string): string {
  return `${BASE}${path}`;
}
