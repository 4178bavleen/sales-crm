import { useSyncExternalStore } from "react";
import type { AuthSession } from "../types/auth";
import { getSession, subscribeSession } from "./auth";

/** Server snapshot — this app is client-rendered, so there is never a session. */
function getServerSnapshot(): AuthSession | null {
  return null;
}

/**
 * Subscribe to the session store.
 *
 * Using `useSyncExternalStore` means any component that calls this re-renders
 * the moment `signIn`, `signOut`, or `updateSessionUser` changes the session —
 * so the topbar reflects a profile name change without a page reload.
 */
export function useSession(): AuthSession | null {
  return useSyncExternalStore(subscribeSession, getSession, getServerSnapshot);
}
