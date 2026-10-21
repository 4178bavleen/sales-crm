// Domain types for the Profile feature.
// Mirrors the backend Prisma `User` model plus its Role/Team relations
// (backend/prisma/schema.prisma).
//
// API boundary notes (for when the profile API is wired up):
//   name        -> User.name
//   email       -> User.email      (unique; read-only here)
//   phone       -> User.phone      (nullable)
//   role        -> User.roleId -> Role.name
//   team        -> User.teamId  -> Team.name (nullable)
//   isActive    -> User.isActive
//   lastLoginAt -> User.lastLoginAt
//   memberSince -> User.createdAt
//   permissions -> Role -> RolePermission -> Permission.code
//   stats.*     -> derived counts over the User's relations
//                  (ownedDeals / assignedTasks / ownedCustomers)
// The profile is fetched once from GET /users/me once the API exists; until
// then it is stored locally (see src/lib/profile.ts).

import type { ComponentType, SVGProps } from "react";

/** Icon component signature used by the profile UI (lucide icons). */
export type ProfileIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

/** The signed-in user's own record. */
export type UserProfile = {
  /** User.name */
  name: string;
  /** User.email — unique, so not editable from the profile. */
  email: string;
  /** User.phone */
  phone: string;
  /** User.roleId -> Role.name */
  role: string;
  /** User.teamId -> Team.name. Empty string when the user has no team. */
  team: string;
  /** User.isActive */
  isActive: boolean;
  /** User.lastLoginAt (ISO datetime). */
  lastLoginAt: string;
  /** User.createdAt (ISO date). */
  memberSince: string;
  /** Role -> RolePermission -> Permission.code */
  permissions: string[];
};

/** The two fields the profile form can change. */
export type ProfileFormValues = {
  name: string;
  phone: string;
};

/**
 * A number derived from one of the User's relations, shown as a stat tile.
 * `href` lets each tile jump to the page that owns those records.
 */
export type ProfileStat = {
  key: "deals" | "tasks" | "customers";
  label: string;
  hint: string;
  value: number;
  href: string;
  Icon: ProfileIcon;
};

/** A read-only label/value row in the account details card. */
export type ProfileField = {
  label: string;
  Icon: ProfileIcon;
  get: (profile: UserProfile) => string;
};

/**
 * Permission codes granted to each role (Role.name).
 *
 * Codes match the backend `Permission.code` column — the schema's own comment
 * gives the shape: `users.manage`, `records.delete`, `data.export`,
 * `revenue.view`, `deals.edit_closed`.
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  "Sales Manager": [
    "users.manage",
    "records.delete",
    "data.export",
    "revenue.view",
    "deals.edit_closed",
    "deals.manage",
    "leads.manage",
    "tasks.manage",
  ],
  "Sales Employee": [
    "data.export",
    "revenue.view",
    "deals.manage",
    "leads.manage",
    "tasks.manage",
  ],
  "Report Viewer": ["data.export", "revenue.view"],
};

/** Human descriptions for each permission code (Permission.description). */
export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  "users.manage": "Invite, edit, and deactivate user accounts.",
  "records.delete": "Permanently delete records across the CRM.",
  "data.export": "Export lists and reports to CSV.",
  "revenue.view": "View revenue values and closed-deal amounts.",
  "deals.edit_closed": "Reopen or amend deals that are already won or lost.",
  "deals.manage": "Create, edit, and move deals through the pipeline.",
  "leads.manage": "Create, edit, and convert leads.",
  "tasks.manage": "Create and assign tasks to other users.",
};

/** The permission codes a role is granted, or an empty list for unknown roles. */
export function permissionsForRole(role: string): string[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
