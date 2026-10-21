// Domain types for the Profile feature.
//
// These mirror what the auth API actually returns — nothing more. Verified
// against the live endpoints:
//   GET /api/v1/auth/me  -> { id, name, email, phone, role }
//   GET /api/v1/users/:id -> { id, name, email, phone, isActive,
//                              createdAt, updatedAt, role: { id, name } }
//
// Fields that had no backend source (team, lastLoginAt, memberSince as a fake
// date, permissions from a hardcoded map, and derived activity counts) were
// removed rather than faked.

/**
 * The signed-in user's record, as the API returns it.
 *
 * `role` is flattened from the nested relation; `roleId` keeps the id for
 * display-free callers.
 */
export type UserProfile = {
  /** User.id */
  id: number;
  /** User.name */
  name: string;
  /** User.email — unique, so not editable from the profile. */
  email: string;
  /** User.phone (nullable in the schema). */
  phone: string;
  /** Role.name, from the `role` relation. */
  role: string;
  /** Role.id, from the `role` relation. */
  roleId: number;
  /** User.isActive */
  isActive: boolean;
  /** User.createdAt (ISO datetime) — "member since". */
  createdAt: string;
  /** User.updatedAt (ISO datetime). */
  updatedAt: string;
};
