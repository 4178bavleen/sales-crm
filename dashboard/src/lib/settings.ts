import type { Preferences, UserRow, UserUpdateValues } from "../types/settings";

/**
 * Local store for the Settings page.
 *
 * UI ONLY: the page is not wired to the backend, so user edits are applied to
 * the in-memory list here rather than sent anywhere. When the API is connected,
 * `updateUser` becomes a PATCH and this module keeps only the preference
 * helpers.
 *
 * Preferences are already real: they persist to localStorage.
 */

/* -------------------------------------------------------------------------- */
/* Users (local only)                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Apply an edit to a user.
 *
 * Mirrors what PATCH /api/v1/users/:id would do, including bumping `updatedAt`;
 * the change lives only in React state for the current session.
 */
export function applyUserUpdate(
  user: UserRow,
  values: UserUpdateValues,
): UserRow {
  return {
    ...user,
    ...(values.name !== undefined ? { name: values.name } : {}),
    ...(values.email !== undefined ? { email: values.email } : {}),
    ...(values.phone !== undefined ? { phone: values.phone } : {}),
    ...(values.isActive !== undefined ? { isActive: values.isActive } : {}),
    ...(values.roleName !== undefined
      ? { role: { ...user.role, name: values.roleName } }
      : {}),
    updatedAt: new Date().toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/* Preferences (localStorage)                                                 */
/* -------------------------------------------------------------------------- */

const PREFS_KEY = "salesflow.preferences";

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "light",
  emailNotifications: true,
  dealAlerts: true,
  taskReminders: true,
  weeklyDigest: false,
  dateFormat: "medium",
  defaultPageSize: 10,
};

function isBrowser() {
  return typeof window !== "undefined" && !!window.localStorage;
}

/**
 * Read preferences, merged over the defaults.
 *
 * Merging rather than replacing means a stored object written by an older build
 * (missing keys, or holding a removed one) still loads safely.
 */
export function readPreferences(): Preferences {
  if (!isBrowser()) return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return { ...DEFAULT_PREFERENCES, ...parsed, theme: "light" };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/** Persist preferences. Returns the stored object. */
export function writePreferences(next: Preferences): Preferences {
  if (isBrowser()) {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  }
  return next;
}

/** Human label for a role name, e.g. SALES_MANAGER -> "Sales Manager". */
export function roleLabel(name: string): string {
  return name
    .split("_")
    .map(part => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}
