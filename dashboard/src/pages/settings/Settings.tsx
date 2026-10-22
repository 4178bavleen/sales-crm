import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  KeyRound,
  ShieldCheck,
  UserRound,
  Users,
  Sliders,
  ArrowRight,
  Lock,
  Globe,
  CheckCircle2,
  Building,
} from "lucide-react";
import type {
  SettingsSection,
  UserRow,
} from "../../types/settings";
import {
  buildRoles,
  fetchUsers,
  roleLabel,
} from "../../lib/settings";
import { getSession } from "../../lib/auth";

/** In-page nav. */
const SECTIONS: { id: SettingsSection; label: string; Icon: typeof KeyRound }[] = [
  { id: "roles", label: "Roles & Permissions", Icon: KeyRound },
  { id: "workspace", label: "Workspace Preferences", Icon: Sliders },
  { id: "security", label: "Security & Policies", Icon: ShieldCheck },
];

export default function Settings() {
  const [section, setSection] = useState<SettingsSection>("roles");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [forbidden, setForbidden] = useState(false);

  // CRM Workspace form dummy states for interactivity
  const [crmCurrency, setCrmCurrency] = useState("USD");
  const [timeZone, setTimeZone] = useState("UTC");
  const [leadAutoAssign, setLeadAutoAssign] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [savedPreferences, setSavedPreferences] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetchUsers(1, 100)
      .then((result) => {
        if (cancelled) return;
        setUsers(result.users);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error && typeof error === "object" && "status" in error && (error.status === 403 || error.status === 401)) {
          setForbidden(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const roles = buildRoles(users);

  function handleSavePreferences(e: React.FormEvent) {
    e.preventDefault();
    setSavedPreferences(true);
    setTimeout(() => setSavedPreferences(false), 3000);
  }

  return (
    <div className="mx-auto max-w-full space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Workspace Settings
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Configure system parameters, review role privileges, and manage security settings.
          </p>
        </div>
      </header>

      {/* Prominent Announcement Banner pointing to User Management in Sidebar */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-5 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                User Management is now in the Sidebar!
                <span className="rounded-full bg-blue-500/30 border border-blue-400/30 px-2 py-0.5 text-[10px] font-semibold text-blue-200">
                  New Location
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Team accounts, role assignments, user creation, and status controls have been elevated to a dedicated page on the sidebar navigation.
              </p>
            </div>
          </div>

          <Link
            to="/users"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/30 hover:bg-blue-500 transition shrink-0"
          >
            <span>Open User Management</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {SECTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition cursor-pointer ${
              section === id
                ? "border-blue-600 font-bold text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* --------------------------- Roles & permissions -------------------------- */}
      {section === "roles" && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Roles & Permission Hierarchy
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Definitions and member distribution for system-level roles configured in the CRM backend.
                </p>
              </div>

              <Link
                to="/users"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <span>Manage Users with Roles</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((role) => (
                <div
                  key={role.name}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <UserRound size={17} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          {roleLabel(role.name)}
                        </h4>
                        <span className="font-mono text-[10px] text-slate-400">
                          {role.name}
                        </span>
                      </div>
                    </div>

                    <span className="rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 shadow-2xs">
                      {role.userCount} {role.userCount === 1 ? "user" : "users"}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                    {role.description}
                  </p>

                  {role.permissions && role.permissions.length > 0 && (
                    <div className="mt-3 border-t border-slate-200/60 pt-3 space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Key Capabilities:
                      </p>
                      {role.permissions.map((p: string, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-[11px] text-slate-600"
                        >
                          <CheckCircle2
                            size={12}
                            className="text-emerald-500 shrink-0"
                          />
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {forbidden && (
              <p className="mt-4 text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                Live user counts require administrator credentials. Your role is{" "}
                <strong>{getSession()?.user.role ?? "UNKNOWN"}</strong>.
              </p>
            )}
          </div>
        </section>
      )}

      {/* ------------------------- Workspace Preferences ------------------------ */}
      {section === "workspace" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSavePreferences} className="max-w-2xl space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                CRM General Preferences
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Tailor default operational defaults for your sales and lead management workflow.
              </p>
            </div>

            {savedPreferences && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Preferences updated successfully!
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Default Currency
                </label>
                <div className="relative">
                  <Globe size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <select
                    value={crmCurrency}
                    onChange={(e) => setCrmCurrency(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                  >
                    <option value="USD">USD ($ - US Dollar)</option>
                    <option value="INR">INR (₹ - Indian Rupee)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                    <option value="GBP">GBP (£ - British Pound)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Workspace Time Zone
                </label>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="Asia/Kolkata">IST (Asia/Kolkata, UTC +5:30)</option>
                  <option value="America/New_York">EST (America/New_York)</option>
                  <option value="Europe/London">GMT (Europe/London)</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={leadAutoAssign}
                  onChange={(e) => setLeadAutoAssign(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    Automatic Lead Round-Robin
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Automatically distribute new incoming leads across active Sales Employees.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    Activity & Notification Digest
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Deliver daily CRM summary reports on pipeline velocity and target completion.
                  </p>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="rounded-xl bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ------------------------- Security & Policies ------------------------ */}
      {section === "security" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Security & Authentication Configuration
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Overview of system security, session controls, and authentication enforcement.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 mb-3">
                <Lock size={16} />
              </div>
              <h4 className="text-xs font-bold text-slate-800">Bcrypt Password Hashing</h4>
              <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                Passwords are salted and hashed with 12 rounds of bcrypt before being stored securely.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 mb-3">
                <ShieldCheck size={16} />
              </div>
              <h4 className="text-xs font-bold text-slate-800">JWT Token Expiry</h4>
              <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                Active bearer tokens are verified on all endpoints and expire after 7 days.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600 mb-3">
                <Building size={16} />
              </div>
              <h4 className="text-xs font-bold text-slate-800">RBAC Enforcement</h4>
              <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                User management and critical admin actions are restricted by server-side middleware.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
