// Mock data for the Settings page.
//
// UI ONLY: the settings page is not wired to the backend yet, so these rows
// stand in for GET /api/v1/users. Replace with the API response when the page is
// connected; the shape already matches `UserRow`.
//
// The four role names and descriptions are not invented — they mirror the
// backend's own Zod enum (backend/src/modules/users/user.validation.ts) and the
// seeded Role.description column (backend/prisma/seed/role.seed.ts).

import type { RoleName, UserRow } from "../types/settings";

export const initialUsers: UserRow[] = [
  {
    id: 1,
    name: "Ava Mitchell",
    email: "ava.mitchell@salesflow.example.com",
    phone: "555-100-1001",
    isActive: true,
    createdAt: "2024-03-11T09:00:00.000Z",
    updatedAt: "2026-10-20T14:22:00.000Z",
    role: { id: 1, name: "ADMIN" },
  },
  {
    id: 2,
    name: "Daniel Okafor",
    email: "daniel.okafor@salesflow.example.com",
    phone: "555-100-1002",
    isActive: true,
    createdAt: "2024-06-02T09:00:00.000Z",
    updatedAt: "2026-10-19T11:05:00.000Z",
    role: { id: 2, name: "SALES_MANAGER" },
  },
  {
    id: 3,
    name: "Priya Raman",
    email: "priya.raman@salesflow.example.com",
    phone: "555-100-1003",
    isActive: true,
    createdAt: "2025-01-15T09:00:00.000Z",
    updatedAt: "2026-10-21T08:40:00.000Z",
    role: { id: 3, name: "SALES_EMPLOYEE" },
  },
  {
    id: 4,
    name: "Marcus Bell",
    email: "marcus.bell@salesflow.example.com",
    phone: null,
    isActive: false,
    createdAt: "2025-04-09T09:00:00.000Z",
    updatedAt: "2026-09-30T16:18:00.000Z",
    role: { id: 3, name: "SALES_EMPLOYEE" },
  },
  {
    id: 5,
    name: "Sofia Lindqvist",
    email: "sofia.lindqvist@salesflow.example.com",
    phone: "555-100-1005",
    isActive: true,
    createdAt: "2025-08-21T09:00:00.000Z",
    updatedAt: "2026-10-18T10:02:00.000Z",
    role: { id: 4, name: "REPORT_VIEWER" },
  },
];

/**
 * Role definitions.
 *
 * `userCount` is filled in by `buildRoles` from whatever user list is on screen,
 * so the count always agrees with the table above it.
 */
export const roleDefinitions: { name: RoleName; description: string }[] = [
  { name: "ADMIN", description: "Full system administration access" },
  {
    name: "SALES_MANAGER",
    description: "Manages sales team, leads, deals and targets",
  },
  {
    name: "SALES_EMPLOYEE",
    description: "Manages assigned leads, contacts, deals and follow-ups",
  },
  {
    name: "REPORT_VIEWER",
    description: "Read-only access to permitted reports",
  },
];

import { roleNames, buildRoles } from "../lib/users";
export { roleNames, buildRoles };
