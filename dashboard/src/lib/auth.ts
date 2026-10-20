import type { AuthSession, LoginFormValues } from "../types/auth";
import { DEMO_ACCOUNTS } from "../types/auth";

/**
 * Local session store for the login flow.
 *
 * This stands in for real authentication. The backend `auth` module exists but
 * every file in it is empty, and the database is migrated but has no user rows,
 * so there is nothing to authenticate against yet. When the real endpoint
 * lands, `signIn` becomes an API call and `getSession`/`signOut` read/write
 * whatever the server issues instead of localStorage.
 */

const SESSION_KEY = "salesflow.session";

function isBrowser() {
  return typeof window !== "undefined" && !!window.localStorage;
}

/** Read the stored session, or null when signed out. */
export function getSession(): AuthSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    // Guard against a hand-edited or half-written value.
    if (!parsed?.user?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Persist a session. */
function setSession(session: AuthSession) {
  if (!isBrowser()) return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/** Clear the session. */
export function signOut() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SESSION_KEY);
}

/**
 * The outcome of a sign-in attempt, shaped like a real API response so the
 * caller's handling does not change when the endpoint is wired up.
 */
export type SignInResult =
  | { ok: true; session: AuthSession }
  | { ok: false; error: string };

/**
 * Attempt to sign in.
 *
 * Matches `identifier` against each demo account's email OR name, mirroring how
 * a real lookup would find a `User` row by either. Resolves after a short delay
 * so the form's loading state is exercised.
 */
export async function signIn(values: LoginFormValues): Promise<SignInResult> {
  const identifier = values.identifier.trim().toLowerCase();
  const password = values.password;

  await new Promise(resolve => setTimeout(resolve, 600));

  if (!identifier || !password) {
    return { ok: false, error: "Please enter your username and password." };
  }

  const account = DEMO_ACCOUNTS.find(
    entry =>
      entry.email.toLowerCase() === identifier ||
      entry.name.toLowerCase() === identifier,
  );

  if (!account || account.password !== password) {
    return {
      ok: false,
      error: "Incorrect username or password. Try the demo credentials below.",
    };
  }

  const session: AuthSession = {
    user: { name: account.name, email: account.email, role: account.role },
    signedInAt: new Date().toISOString(),
    remember: values.remember,
  };
  setSession(session);
  return { ok: true, session };
}
