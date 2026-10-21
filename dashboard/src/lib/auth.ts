import type {
  AuthSession,
  AuthUser,
  LoginFormValues,
  LoginResponse,
  MeResponse,
} from "../types/auth";
import { ApiError, request } from "./api";
import { ENDPOINTS } from "./endpoints";

/**
 * Session store backed by the real auth API.
 *
 * `signIn` posts to /auth/login and stores the returned JWT; `signOut` tells
 * the server and clears local state; `getSession` reads the cached snapshot.
 *
 * The session is cached in a module variable so `getSession` returns a stable
 * reference — required by `useSyncExternalStore` (see src/lib/useSession.ts),
 * which lets the topbar re-render as soon as the profile changes the name.
 */

const SESSION_KEY = "salesflow.session";

function isBrowser() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readStored(): AuthSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    // Guard against a hand-edited, half-written, or pre-integration value.
    // A session without a token cannot authenticate anything, so it is dropped.
    if (!parsed?.token || !parsed?.user?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Cached snapshot of the session (undefined = not read yet). */
let cached: AuthSession | null | undefined;

/** Read the stored session, or null when signed out. */
export function getSession(): AuthSession | null {
  if (cached === undefined) cached = readStored();
  return cached;
}

type SessionListener = () => void;
const listeners = new Set<SessionListener>();

/** Subscribe to session changes. Returns an unsubscribe function. */
export function subscribeSession(listener: SessionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  for (const listener of listeners) listener();
}

/** Persist (or clear) a session and notify subscribers. */
function writeSession(session: AuthSession | null) {
  cached = session;
  if (isBrowser()) {
    if (session) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }
  emit();
}

/**
 * Patch the signed-in user's own fields (e.g. after a profile edit) without
 * touching the auth token. Keeps the topbar in sync immediately.
 */
export function updateSessionUser(patch: Partial<AuthUser>) {
  const session = getSession();
  if (!session) return;
  writeSession({ ...session, user: { ...session.user, ...patch } });
}

/**
 * Clear the session.
 *
 * The token is cleared locally first: the user must be signed out even if the
 * network call fails, and the server's logout is stateless (it returns a
 * message without invalidating the JWT).
 */
export function signOut() {
  const token = getSession()?.token;
  writeSession(null);

  if (token) {
    // Fire and forget — a failure here must not block the local sign-out.
    void request<unknown>(ENDPOINTS.auth.logout, { method: "POST", token }).catch(
      () => undefined,
    );
  }
}

/**
 * The outcome of a sign-in attempt.
 */
export type SignInResult =
  | { ok: true; session: AuthSession }
  | { ok: false; error: string };

/**
 * Turn an API failure into a message worth showing a user.
 *
 * The backend currently reports failed credentials as HTTP 500 with the generic
 * "Internal server error" (its `AuthError` extends `Error`, not `AppError`, so
 * the error middleware mislabels it). Mapping 401/403/500 to the same neutral
 * wording keeps the form useful without leaking whether an email exists.
 */
function describeAuthFailure(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return "Cannot reach the server. Check that the backend is running.";
    }
    if (error.status === 401 || error.status === 403 || error.status >= 500) {
      return "Incorrect email or password. Please try again.";
    }
    // 400 and anything else: the server's own wording is more specific.
    if (error.message && error.message !== "Internal server error") {
      return error.message;
    }
    return "Sign in failed. Please try again.";
  }
  return "Something went wrong. Please try again.";
}

/**
 * Attempt to sign in against POST /api/v1/auth/login.
 *
 * Sends the email exactly as the backend expects and stores the issued token.
 */
export async function signIn(values: LoginFormValues): Promise<SignInResult> {
  const email = (values.email || "").trim().toLowerCase();
  const password = values.password;

  if (!email || !password) {
    return { ok: false, error: "Please enter your email and password." };
  }

  try {
    const data = await request<LoginResponse>(ENDPOINTS.auth.login, {
      method: "POST",
      body: { email, password },
    });

    if (!data?.token || !data?.user) {
      return { ok: false, error: "Sign in failed. Please try again." };
    }

    const session: AuthSession = {
      token: data.token,
      user: data.user,
      signedInAt: new Date().toISOString(),
      remember: values.remember,
    };
    writeSession(session);
    return { ok: true, session };
  } catch (error) {
    return { ok: false, error: describeAuthFailure(error) };
  }
}

/**
 * Re-read the signed-in user from GET /api/v1/auth/me.
 *
 * Used on load so a stale cached `user` (renamed in another tab, role changed,
 * account deactivated) corrects itself. A 401 means the token is no longer
 * valid, so the session is cleared and the caller is sent back to /login.
 */
export async function refreshSession(): Promise<AuthSession | null> {
  const session = getSession();
  if (!session) return null;

  try {
    const data = await request<MeResponse>(ENDPOINTS.auth.me, {
      token: session.token,
    });
    if (!data?.user) return session;
    const next: AuthSession = { ...session, user: data.user };
    writeSession(next);
    return next;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      writeSession(null);
      return null;
    }
    // Network hiccup: keep the cached session rather than signing the user out.
    return session;
  }
}
