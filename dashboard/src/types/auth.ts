// Domain types for the Login feature.
//
// These mirror the live auth API, not the Prisma model directly:
//   POST /api/v1/auth/login  { email, password } -> { token, user }
//   GET  /api/v1/auth/me     (Bearer)            -> { user }
//   POST /api/v1/auth/logout (Bearer)            -> message
//
// The backend's `loginSchema` (backend/src/modules/auth/auth.validation.ts)
// accepts exactly `email` and `password` and looks the user up with
// `prisma.user.findUnique({ where: { email } })`. There is no username or
// `identifier` field, so the form sends `email`.

/**
 * What the login form collects.
 *
 * `email` matches the backend field name exactly — no client-side renaming —
 * so the request body is built without translation.
 */
export type LoginFormValues = {
  email: string;
  password: string;
  remember: boolean;
};

/** The signed-in user as the API returns it (`auth.service.ts`). */
export type AuthUser = {
  /** User.id */
  id: number;
  /** User.name — also the display name in the topbar. */
  name: string;
  /** User.email */
  email: string;
  /** User.phone */
  phone: string | null;
  /** Role.name, resolved through the Role relation. */
  role: string;
};

/** Response body of POST /auth/login. */
export type LoginResponse = {
  token: string;
  user: AuthUser;
};

/** Response body of GET /auth/me. */
export type MeResponse = {
  user: AuthUser;
};

/**
 * The client-side session: the issued JWT plus the user it belongs to.
 *
 * The token is the real credential; `user` is cached alongside it so the
 * topbar can render immediately on reload without waiting for /auth/me.
 */
export type AuthSession = {
  token: string;
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
  /** True while the request is in flight. */
  pending?: boolean;
};
