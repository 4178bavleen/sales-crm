import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Handshake, ShieldCheck, TrendingUp, Users } from "lucide-react";
import type { LoginFormValues } from "../../types/auth";
import { signIn } from "../../lib/auth";
import LoginForm from "../../components/ui/LoginForm";

/** Current year, computed once at module load rather than during render. */
const CURRENT_YEAR = new Date().getFullYear();

/** Value props shown on the left panel, hidden on small screens. */
const HIGHLIGHTS = [
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
    Icon: Handshake,
    title: "Follow-ups that happen",
    text: "Tasks with due dates, priorities and overdue alerts.",
  },
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
    <div className="flex min-h-screen bg-slate-50">
      {/* Left: brand + value props (large screens only) */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-slate-950 p-10 lg:flex xl:p-14">
        {/* Layered depth: a soft radial wash, a faint grid, and two glows.
            All decorative, so they are hidden from assistive tech. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_15%_0%,rgba(79,70,229,0.28),transparent_55%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:56px_56px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-28 -top-24 h-80 w-80 rounded-full bg-indigo-600/35 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-blue-500/25 blur-3xl"
        />
        {/* A hairline divider against the light form side */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-px bg-white/10"
        />

        <div className="relative">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-4 backdrop-blur">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/30">
              <TrendingUp size={15} />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">
              SalesFlow
            </span>
          </div>

          <h1 className="mt-12 max-w-md text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">
            The sales workspace your team{" "}
            <span className="bg-gradient-to-r from-indigo-300 to-blue-200 bg-clip-text text-transparent">
              actually keeps up with
            </span>
            .
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
            Leads, contacts, companies, customers, deals and tasks — one
            consistent home for the whole pipeline.
          </p>

          <ul className="mt-10 space-y-3">
            {HIGHLIGHTS.map(({ Icon, title, text }) => (
              <li
                key={title}
                className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 backdrop-blur-sm transition-colors hover:border-white/15 hover:bg-white/[0.06]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-400/20">
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-400">
                    {text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">
          © {CURRENT_YEAR} Vibrantick Infotech Solutions. All rights reserved.
        </p>
      </aside>

      {/* Right: the form */}
      <main className="flex w-full flex-col items-center justify-center px-5 py-10 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Brand, for small screens where the left panel is hidden */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <TrendingUp size={18} />
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-800">
              SalesFlow
            </span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-slate-800">
            Sign in
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Welcome back. Enter your details to continue.
          </p>

          <div className="mt-7">
            <LoginForm onSubmit={handleSubmit} error={error} pending={pending} />
          </div>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck size={14} />
            Demo build — sign-in is simulated locally, no account is created.
          </p>
        </div>
      </main>
    </div>
  );
}
