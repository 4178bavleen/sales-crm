import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getSession } from "../../lib/auth";

/**
 * Guards the app shell: without a session the user is sent to /login.
 *
 * The attempted path is stashed in location state so the login page could send
 * the user back where they were headed once real auth lands.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
