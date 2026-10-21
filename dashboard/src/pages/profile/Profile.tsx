import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CircleCheck,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import type { ProfileFormValues, UserProfile } from "../../types/profile";
import { PERMISSION_DESCRIPTIONS } from "../../types/profile";
import {
  formatProfileDate,
  profileAccountFields,
  profileStats,
} from "../../data/profile";
import { getProfile, saveProfile } from "../../lib/profile";
import Avatar from "../../components/ui/Avatar";
import { Field } from "../../components/ui/FormControls";
import {
  cellClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "../../types/formControls";

/**
 * The signed-in user's profile.
 *
 * Maps onto the backend `User` model plus its Role and Team relations. Name and
 * phone are editable (mirroring `PATCH /users/me`); email is read-only because
 * `User.email` is unique, and role/team are relation-derived. Saving the name
 * also patches the session, so the topbar updates without a reload.
 */
export default function Profile() {
  const [profile, setProfile] = useState<UserProfile>(() => getProfile());
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileFormValues>({
    name: profile.name,
    phone: profile.phone,
  });
  const [showErrors, setShowErrors] = useState(false);

  const nameInvalid = form.name.trim() === "";

  function startEditing() {
    setForm({ name: profile.name, phone: profile.phone });
    setShowErrors(false);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setShowErrors(false);
  }

  function submit() {
    setShowErrors(true);
    if (nameInvalid) return;
    setProfile(saveProfile(form));
    setEditing(false);
  }

  // Esc cancels an in-progress edit.
  useEffect(() => {
    if (!editing) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") cancelEditing();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing]);

  const stats = profileStats(profile);
  const permissions = profile.permissions;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Page header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your account details, activity, and role permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={cancelEditing}
                className={`${secondaryButtonClass} inline-flex items-center gap-2`}
              >
                <X size={15} />
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                className={primaryButtonClass}
              >
                <Save size={15} />
                Save changes
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startEditing}
              className={primaryButtonClass}
            >
              <Pencil size={15} />
              Edit profile
            </button>
          )}
        </div>
      </header>

      {/* Identity card */}
      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="h-20 bg-gradient-to-r from-indigo-500 via-indigo-400 to-blue-400" />
        <div className="px-5 pb-5">
          <div className="-mt-8 flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-end gap-4">
              <Avatar
                name={profile.name}
                seed={profile.name.length}
                size={64}
                className="ring-4 ring-white"
              />
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {profile.name || "Unnamed user"}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium ${
                      profile.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <CircleCheck size={11} />
                    {profile.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  {profile.role}
                  {profile.team ? ` · ${profile.team}` : ""}
                </p>
              </div>
            </div>

            <a
              href={`mailto:${profile.email}`}
              className="mb-1 inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              <Mail size={13} className="text-slate-400" />
              {profile.email}
            </a>
          </div>
        </div>
      </section>

      {/* Activity stats, counted from the list-page seeds */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {stats.map(({ key, label, hint, value, href, Icon }) => (
          <Link
            key={key}
            to={href}
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Icon size={17} />
              </div>
              <ArrowUpRight
                size={15}
                className="text-slate-300 transition group-hover:text-indigo-500"
              />
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {value}
            </p>
            <p className="text-sm font-medium text-slate-700">{label}</p>
            <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        {/* Personal information — the editable part */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
          <div className="flex items-center gap-2">
            <UserRound size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">
              Personal information
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {editing
              ? "Update your name and phone number, then save."
              : "Name and phone can be edited. Email is used to sign in and cannot be changed here."}
          </p>

          {editing ? (
            <div className="mt-4 space-y-3">
              <div className={cellClass}>
                <Field
                  label="Name"
                  value={form.name}
                  onChange={value =>
                    setForm(previous => ({ ...previous, name: value }))
                  }
                  required
                  placeholder="Your full name"
                  invalid={showErrors && nameInvalid}
                  hint="A name is required."
                />
              </div>
              <div className={cellClass}>
                <Field
                  label="Phone"
                  value={form.phone}
                  onChange={value =>
                    setForm(previous => ({ ...previous, phone: value }))
                  }
                  type="tel"
                  placeholder="e.g. 555-100-1001"
                />
              </div>
              <div className={cellClass}>
                <span className="text-sm text-slate-500 sm:pr-4 sm:text-right">
                  Email
                </span>
                <div className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                  <Mail size={14} className="text-slate-400" />
                  {profile.email}
                </div>
              </div>
            </div>
          ) : (
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
          )}
        </section>

        {/* Account card — relation-derived, read-only */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">Account</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Managed by your administrator.
          </p>

          <dl className="mt-4 space-y-3">
            {profileAccountFields.map(({ label, Icon, get }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon size={15} className="mt-0.5 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <dt className="text-[11px] text-slate-400">{label}</dt>
                  <dd className="mt-0.5 truncate text-sm text-slate-700">
                    {get(profile)}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {/* Role permissions — Role -> RolePermission -> Permission.code */}
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">
              Role permissions
            </h3>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
            {permissions.length} granted
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          These come from your role, {profile.role || "unassigned"}.
        </p>

        {permissions.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No permissions are granted to this role.
          </p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {permissions.map(code => (
              <li
                key={code}
                className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CircleCheck size={13} />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-xs text-slate-700">{code}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
                    {PERMISSION_DESCRIPTIONS[code] ?? "Permission granted."}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-4 text-xs text-slate-400">
        Member since {formatProfileDate(profile.memberSince)}. Profile changes
        are stored locally in this demo build.
      </p>
    </div>
  );
}
