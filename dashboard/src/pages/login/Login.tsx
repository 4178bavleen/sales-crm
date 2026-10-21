import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BellRing,
  Building2,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LoginFormValues } from "../../types/auth";
import { signIn } from "../../lib/auth";
import LoginForm from "../../components/ui/LoginForm";

/** Current year, computed once at module load rather than during render. */
const CURRENT_YEAR = new Date().getFullYear();

/** The three core pillars listed under the showcase. */
const PILLARS = [
  {
    Icon: TrendingUp,
    title: "Pipeline in one place",
    text: "Track deals by stage and see pipeline value at a glance.",
  },
  {
    Icon: Users,
    title: "Every contact connected",
    text: "Leads, contacts, companies and customers kept in sync.",
  },
  {
    Icon: BellRing,
    title: "Follow-ups that happen",
    text: "Tasks with due dates, priorities and overdue alerts.",
  },
];

/**
 * The modules the workspace covers, shown as a compact checklist.
 *
 * Deliberately qualitative rather than numeric — quoting figures like "$4.2M"
 * would be inventing data for a build with no live backend behind it.
 */
const MODULES = [
  { Icon: TrendingUp, label: "Deals" },
  { Icon: Users, label: "Leads & contacts" },
  { Icon: Building2, label: "Companies" },
  { Icon: BellRing, label: "Tasks" },
];

/** Small trust markers under the pillars. */
const ASSURANCES = [
  { Icon: ShieldCheck, text: "Role-based access" },
  { Icon: CheckCircle2, text: "No account created" },
];

/**
 * Full-bleed login page.
 *
 * Rendered outside the app shell (no sidebar or topbar), since there is no
 * signed-in user yet. Submitting calls the local `signIn` stub and, on success,
 * navigates to the dashboard.
 */
export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(values: LoginFormValues) {
    setPending(true);
    setError("");
    const result = await signIn(values);
    setPending(false);

    if (result.ok) {
      navigate("/", { replace: true });
      return;
    }
    setError(result.error);
  }

  return (
    <div className="login-canvas relative flex min-h-screen flex-col justify-between overflow-x-hidden bg-slate-50 text-slate-900">
      {/* Ambient tint — decorative only. */}
      <div
        aria-hidden="true"
        className="login-glow-conic pointer-events-none fixed inset-0"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-40 left-1/2 h-[450px] w-[700px] -translate-x-1/2 rounded-full bg-indigo-300/30 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -right-20 bottom-0 h-96 w-96 rounded-full bg-indigo-300/25 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-24 top-1/2 h-80 w-80 rounded-full bg-cyan-200/30 blur-[130px]"
      />

      {/* Floating centred experience */}
      <div className="relative z-10 flex w-full flex-grow items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="login-glass-card w-full max-w-6xl rounded-3xl p-6 transition-all duration-300 sm:p-8 lg:p-10">
          {/* Header bar */}
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6 sm:pb-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-lg shadow-indigo-500/25">
                <TrendingUp size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold leading-tight tracking-tight text-slate-900">
                  SalesFlow
                </span>
                <span className="text-[11px] font-medium leading-tight text-slate-500">
                  Workspace CRM
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>All systems operational</span>
            </div>
          </header>

          {/* Inner split: showcase + sign-in console */}
          <div className="grid grid-cols-1 items-center gap-8 pt-8 lg:grid-cols-12 lg:gap-12">
            {/* Left: narrative + feature showcase (7 cols) */}
            <div className="flex flex-col justify-center space-y-6 lg:col-span-7">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
                  <TrendingUp size={14} className="text-indigo-500" />
                  Unified Revenue Pipeline
                </div>

                <h1 className="text-3xl font-extrabold leading-[1.12] tracking-tight text-slate-900 sm:text-4xl lg:text-[2.7rem]">
                  The sales workspace your team{" "}
                  <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 bg-clip-text text-transparent">
                    actually keeps up with.
                  </span>
                </h1>

                <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
                  Leads, contacts, companies, customers, deals and tasks — one
                  consistent home for the whole pipeline.
                </p>
              </div>

              {/* What the workspace covers */}
              <ul className="grid grid-cols-2 gap-2 sm:max-w-md">
                {MODULES.map(({ Icon, label }) => (
                  <li
                    key={label}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-xs font-medium text-slate-600"
                  >
                    <Icon size={14} className="shrink-0 text-indigo-500" />
                    {label}
                  </li>
                ))}
              </ul>

              {/* Three core pillars */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {PILLARS.map(({ Icon, title, text }) => (
                  <div
                    key={title}
                    className="login-inner-bento-subtle group flex h-full flex-col rounded-xl p-3.5 transition-colors hover:border-indigo-300"
                  >
                    <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-transform duration-200 group-hover:scale-105">
                      <Icon size={16} />
                    </div>
                    <h2 className="text-xs font-semibold text-slate-900">
                      {title}
                    </h2>
                    <p className="mt-1 text-[11px] leading-snug text-slate-500">
                      {text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Trust markers */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {ASSURANCES.map(({ Icon, text }) => (
                  <span
                    key={text}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500"
                  >
                    <Icon size={14} className="text-emerald-600" />
                    {text}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: sign-in console (5 cols) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/10 sm:p-7 lg:col-span-5">
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Welcome back
                </h2>
                <p className="mt-1.5 text-xs text-slate-500 sm:text-sm">
                  Enter your credentials to access your pipeline.
                </p>
              </div>

              <LoginForm
                onSubmit={handleSubmit}
                error={error}
                pending={pending}
              />

              {/* Pointer to the other workspace activity */}
              {!error && (
                <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                  <ArrowUpRight size={12} />
                  Sessions are held locally in this build.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Centred compact footer */}
      <footer className="relative z-10 border-t border-slate-200 py-5">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-slate-500">
          <p>
            © {CURRENT_YEAR} Vibrantick Infotech Solutions. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
