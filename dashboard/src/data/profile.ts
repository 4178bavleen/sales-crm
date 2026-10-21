import {
  CalendarDays,
  CircleCheck,
  Clock,
  Handshake,
  ListChecks,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { ProfileField, ProfileStat, UserProfile } from "../types/profile";
import { permissionsForRole } from "../types/profile";
import { DEMO_ACCOUNTS } from "../types/auth";
import { initialCustomers } from "./customers";
import { initialDeals } from "./deals";
import { initialTasks } from "./tasks";

/**
 * The signed-in user's record, mirroring a `users` row.
 *
 * The backend database is migrated but empty and the auth module has no
 * implementation, so this is seeded from the demo account rather than fetched.
 * `permissions` is resolved through Role -> RolePermission -> Permission.
 */
const demo = DEMO_ACCOUNTS[0];

export const initialProfile: UserProfile = {
  name: demo?.name ?? "",
  email: demo?.email ?? "",
  phone: "555-100-1001",
  role: demo?.role ?? "",
  team: "Inside Sales",
  isActive: true,
  lastLoginAt: "2026-10-20T09:14:00.000Z",
  memberSince: "2024-03-11",
  permissions: permissionsForRole(demo?.role ?? ""),
};

export function formatProfileDate(date: string) {
  if (!date) return "—";
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Absolute date + time, used for User.lastLoginAt. */
export function formatProfileDateTime(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Read-only rows for the Account card. These map to `User` columns and the
 * Role/Team relations, none of which the profile form is allowed to change.
 */
export const profileAccountFields: ProfileField[] = [
  {
    label: "Role",
    Icon: ShieldCheck,
    get: profile => profile.role || "—",
  },
  {
    label: "Team",
    Icon: Users,
    get: profile => profile.team || "No team",
  },
  {
    label: "Status",
    Icon: CircleCheck,
    get: profile => (profile.isActive ? "Active" : "Inactive"),
  },
  {
    label: "Last Sign-in",
    Icon: Clock,
    get: profile => formatProfileDateTime(profile.lastLoginAt),
  },
  {
    label: "Member Since",
    Icon: CalendarDays,
    get: profile => formatProfileDate(profile.memberSince),
  },
];

/**
 * Activity stats for a profile.
 *
 * Values are counted from the same seed arrays the list pages use
 * (Deal.ownerId -> User, Task.assignedToId -> User, Customer.ownerId -> User),
 * so the numbers stay correct if the seeds change and never drift from the
 * pages they link to.
 */
export function profileStats(profile: UserProfile): ProfileStat[] {
  return [
    {
      key: "deals",
      label: "Deals owned",
      hint: "Deals where you are the owner",
      value: initialDeals.filter(deal => deal.owner === profile.name).length,
      href: "/deals",
      Icon: Handshake,
    },
    {
      key: "tasks",
      label: "Tasks assigned",
      hint: "Tasks currently assigned to you",
      value: initialTasks.filter(task => task.assignedTo === profile.name).length,
      href: "/tasks",
      Icon: ListChecks,
    },
    {
      key: "customers",
      label: "Customers owned",
      hint: "Customers where you are the owner",
      value: initialCustomers.filter(customer => customer.owner === profile.name)
        .length,
      href: "/customers",
      Icon: Users,
    },
  ];
}
