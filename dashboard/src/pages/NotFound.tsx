import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Compass,
  Users,
  Contact as ContactIcon,
  Building2,
  LayoutDashboard,
} from "lucide-react";

/** Quick links back into the main sections, so a wrong URL isn't a dead end. */
const quickLinks = [
  { name: "Dashboard", path: "/", Icon: LayoutDashboard },
  { name: "Leads", path: "/leads", Icon: Users },
  { name: "Contacts", path: "/contacts", Icon: ContactIcon },
  { name: "Companies", path: "/companies", Icon: Building2 },
];

/**
 * Fallback shown for any path the router does not match.
 * Replacing the old redirect-to-home means broken links stay visible instead
 * of silently landing on the dashboard.
 */
export default function NotFound() {
  return (
    <div className="page-enter relative -m-4 flex min-h-[calc(100vh-64px)] flex-col items-center justify-center overflow-hidden bg-white px-4 py-16 text-slate-700 md:-m-8">
      {/* Soft background accents — decorative only */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-indigo-50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-slate-100 blur-3xl"
      />

      <div className="relative w-full max-w-xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Compass size={28} className="text-indigo-500" />
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Error 404
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-800 sm:text-5xl">
          Page not found
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate-500">
          We couldn't find the page you were looking for. It may have been
          moved, renamed, or never existed. Check the address or head back to a
          familiar place.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 active:translate-y-px"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
          <button
            type="button"
            onClick={() => history.back()}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400/40 active:translate-y-px"
          >
            Go back
          </button>
        </div>

        {/* Quick links so the user can recover without retyping a URL */}
        <div className="mt-12 border-t border-slate-100 pt-8">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Popular destinations
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {quickLinks.map(({ name, path, Icon }) => (
              <Link
                key={path}
                to={path}
                className="group flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-4 text-xs font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700"
              >
                <Icon
                  size={18}
                  className="text-slate-400 transition group-hover:text-indigo-500"
                />
                {name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
