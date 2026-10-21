import type { ProfileFormValues, UserProfile } from "../types/profile";
import { permissionsForRole } from "../types/profile";
import { initialProfile } from "../data/profile";
import { getSession, updateSessionUser } from "./auth";

/**
 * Local store for the signed-in user's profile.
 *
 * Stands in for `GET /users/me` until the users API exists. Only the fields the
 * profile form can change (name, phone) are persisted; identity and
 * role-derived data come from the session and the seeded record, so there is a
 * single source of truth for each.
 */

const PROFILE_KEY = "salesflow.profile";

function isBrowser() {
  return typeof window !== "undefined" && !!window.localStorage;
}

/** Fields persisted locally (everything else is derived). */
type StoredProfile = Pick<UserProfile, "name" | "phone">;

function readStored(): Partial<StoredProfile> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<StoredProfile>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * The current profile.
 *
 * Session identity (name/email/role) wins over both the stored copy and the
 * seed, so the profile page and the topbar can never disagree. Permissions are
 * always re-derived from the role.
 */
export function getProfile(): UserProfile {
  const stored = readStored();
  const session = getSession();

  const name = session?.user.name ?? stored.name ?? initialProfile.name;
  const email = session?.user.email ?? initialProfile.email;
  const role = session?.user.role ?? initialProfile.role;

  return {
    ...initialProfile,
    ...stored,
    name,
    email,
    role,
    permissions: permissionsForRole(role),
  };
}

/**
 * Save the editable fields.
 *
 * Mirrors `PATCH /users/me`. Updating the name also patches the session so the
 * topbar re-renders immediately via `useSession`.
 */
export function saveProfile(values: ProfileFormValues): UserProfile {
  const trimmed = {
    name: values.name.trim(),
    phone: values.phone.trim(),
  };

  if (isBrowser()) {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(trimmed));
  }
  updateSessionUser({ name: trimmed.name });

  return getProfile();
}
