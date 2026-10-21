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
  // Fail loudly at startup rather than firing requests at `undefined/auth/login`.
  throw new Error(
    "VITE_API_URL is not set. Add it to dashboard/.env, e.g.\n" +
      "VITE_API_URL=http://localhost:5000/api/v1",
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
  users: {
    list: "/users",
    byId: (id: number) => `/users/${id}`,
  },
  health: "/health",
} as const;

/** Join the base URL with a path into an absolute request URL. */
export function apiUrl(path: string): string {
  return `${BASE}${path}`;
}
