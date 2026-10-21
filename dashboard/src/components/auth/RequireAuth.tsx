import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getSession, refreshSession } from "../../lib/auth";

/**
 * Guards the app shell: without a session the user is sent to /login.
 *
 * The stored token is verified against GET /auth/me once on mount, so an
 * expired (7h) or revoked token cannot keep someone inside the app. A 401 clears
 * the session and this redirect fires on the next render.
 *
 * The attempted path is stashed in location state so the login page can send the
 * user back where they were headed.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  // Whether a cached session existed at mount. When there is none there is
  // nothing to verify, so the redirect can happen without any state update.
  const [hadSession] = useState(() => getSession() !== null);
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(hadSession);

  useEffect(() => {
    if (!hadSession) return;

    let cancelled = false;
    void refreshSession().then(session => {
      if (cancelled) return;
      setAuthed(session !== null);
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [hadSession]);

  // Avoid flashing the login page while the token is still being verified.
  if (hadSession && !ready) return null;

  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
