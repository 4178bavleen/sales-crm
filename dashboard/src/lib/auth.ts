import type { AuthSession, AuthUser, LoginFormValues } from "../types/auth";
import { DEMO_ACCOUNTS } from "../types/auth";

/**
 * Local session store for the login flow.
 *
 * This stands in for real authentication. The backend `auth` module exists but
 * every file in it is empty, and the database is migrated but has no user rows,
 * so there is nothing to authenticate against yet. When the real endpoint
 * lands, `signIn` becomes an API call and `getSession`/`signOut` read/write
 * whatever the server issues instead of localStorage.
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
    // Guard against a hand-edited or half-written value.
    if (!parsed?.user?.name) return null;
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

/** Clear the session. */
export function signOut() {
  writeSession(null);
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
  writeSession(session);
  return { ok: true, session };
}
