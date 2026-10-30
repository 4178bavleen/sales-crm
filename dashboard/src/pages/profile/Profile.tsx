import { useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CircleCheck,
  Clock,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { UserProfile } from "../../types/profile";
import { fetchProfile } from "../../lib/profile";
import { ApiError } from "../../lib/api";
import Avatar from "../../components/ui/Avatar";

/** Absolute date, for User.createdAt ("member since"). */
function formatDate(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Absolute date + time, for User.updatedAt. */
function formatDateTime(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * The signed-in user's profile, read-only.
 *
 * Every value comes from the backend:
 *   GET /api/v1/users/:id (Authorization: Bearer <jwt>)
 *
 * There is no edit affordance: the backend has no self-service update route
 * (`PATCH /users/:id` exists but is admin-only), so a form here could not save.
 * Nothing on this page is seeded or placeholder data.
 */
export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetchProfile()
      .then(data => {
        if (cancelled) return;
        setProfile(data);
      })
      .catch(error => {
        if (cancelled) return;
        setLoadError(
          error instanceof ApiError
            ? error.message
            : "Could not load your profile.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-5xl items-center gap-2 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin" />
        Loading your profile…
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{loadError || "Could not load your profile."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Page header */}
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Profile</h1>
        <p className="mt-1 text-xs text-slate-600">
          Your account details, as returned by the server.
        </p>
      </header>

      {/* Identity card */}
      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-600 shadow-sm">
        <div className="px-5 pb-5 pt-5">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar
              name={profile.name}
              seed={profile.id}
              size={64}
              className="ring-4 ring-white"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-white drop-shadow-sm">
                  {profile.name || "Unnamed user"}
                </h2>
                <span
                  className="inline-flex items-center gap-1 rounded bg-white/25 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm"
                >
                  <CircleCheck size={11} />
                  {profile.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-indigo-50">
                {profile.role || "No role assigned"}
              </p>
              <a
                href={`mailto:${profile.email}`}
                className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-indigo-50 hover:text-white"
              >
                <Mail size={13} className="text-indigo-100" />
                {profile.email}
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        {/* Personal information — read-only */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
          <div className="flex items-center gap-2">
            <UserRound size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">
              Personal information
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Managed by your administrator.
          </p>

          <dl className="mt-4 space-y-3">
            <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
              <UserRound size={15} className="mt-0.5 text-slate-400" />
              <div className="min-w-0">
                <dt className="text-[11px] text-slate-400">Name</dt>
                <dd className="mt-0.5 text-sm text-slate-700">
                  {profile.name || "—"}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
              <Phone size={15} className="mt-0.5 text-slate-400" />
              <div className="min-w-0">
                <dt className="text-[11px] text-slate-400">Phone</dt>
                <dd className="mt-0.5 text-sm text-slate-700">
                  {profile.phone || "Not set"}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail size={15} className="mt-0.5 text-slate-400" />
              <div className="min-w-0">
                <dt className="text-[11px] text-slate-400">Email</dt>
                <dd className="mt-0.5 break-words text-sm text-slate-700">
                  {profile.email}
                </dd>
              </div>
            </div>
          </dl>
        </section>

        {/* Account card — read-only, straight from the API */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">Account</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Managed by your administrator.
          </p>

          <dl className="mt-4 space-y-3">
            <div className="flex items-start gap-3">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <dt className="text-[11px] text-slate-400">Role</dt>
                <dd className="mt-0.5 truncate text-sm text-slate-700">
                  {profile.role || "—"}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CircleCheck size={15} className="mt-0.5 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <dt className="text-[11px] text-slate-400">Status</dt>
                <dd className="mt-0.5 truncate text-sm text-slate-700">
                  {profile.isActive ? "Active" : "Inactive"}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CalendarDays size={15} className="mt-0.5 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <dt className="text-[11px] text-slate-400">Member since</dt>
                <dd className="mt-0.5 truncate text-sm text-slate-700">
                  {formatDate(profile.createdAt)}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock size={15} className="mt-0.5 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <dt className="text-[11px] text-slate-400">Last updated</dt>
                <dd className="mt-0.5 truncate text-sm text-slate-700">
                  {formatDateTime(profile.updatedAt)}
                </dd>
              </div>
            </div>
          </dl>
        </section>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        {profile.createdAt
          ? `Member since ${formatDate(profile.createdAt)} · Last updated ${formatDateTime(profile.updatedAt)}`
          : "Account timeline is not available."}
      </p>
    </div>
  );
}
