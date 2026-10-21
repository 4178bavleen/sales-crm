// Domain types for the Login feature.
// Mirrors the backend Prisma `User` model for the fields a login touches
// (backend/prisma/schema.prisma).
//
// API boundary notes (for when the auth API is wired up):
//   identifier -> matched against User.email (unique) OR User.name
//   password   -> verified server-side against User.passwordHash.
//                 The hash is never sent to the client, so this is the only
//                 User field the login form handles that has no client copy.
//   session    -> a real API would return a token/session; here it is a
//                 locally stored flag (see auth.ts) because the backend auth
//                 module has no implementation yet.

/**
 * What the login form collects.
 *
 * `identifier` is deliberately a single field: the `User` model has no
 * `username` column, identifying people by `email` (unique) and `name`. This
 * accepts either, so a user can sign in with a name or an email address.
 */
export type LoginFormValues = {
  identifier: string;
  password: string;
  remember: boolean;
};

/** The signed-in user as the frontend knows it. */
export type AuthUser = {
  /** User.name — also the display name in the topbar. */
  name: string;
  /** User.email */
  email: string;
  /** User.role.name, resolved through the Role relation. */
  role: string;
};

/** The locally stored session (stands in for a real token). */
export type AuthSession = {
  user: AuthUser;
  /** ISO timestamp of when the session was created. */
  signedInAt: string;
  /** True when the user asked to stay signed in. */
  remember: boolean;
};

export type LoginFormProps = {
  onSubmit: (values: LoginFormValues) => void;
  /** Message shown when the previous attempt failed. */
  error?: string;
  /** True while the (simulated) request is in flight. */
  pending?: boolean;
};

/**
 * Demo accounts, standing in for real `users` rows.
 *
 * The backend database is migrated but empty and the auth module has no
 * implementation, so there is nothing real to authenticate against. Each entry
 * pairs the two identifiers a `User` row can be found by — `name` and `email` —
 * with the role that would come from its Role relation.
 */
export const DEMO_ACCOUNTS: {
  name: string;
  email: string;
  role: string;
  password: string;
}[] = [
  {
    name: "Gabriel Deora",
    email: "gabriel@salesflow.example.com",
    role: "Sales Manager",
    password: "salesflow",
  },
];

/** The demo password, surfaced as a hint on the login page. */
export const DEMO_PASSWORD = DEMO_ACCOUNTS[0]?.password ?? "";
