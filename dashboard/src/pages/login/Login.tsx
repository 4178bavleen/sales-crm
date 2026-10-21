import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ShieldCheck, TrendingUp } from "lucide-react";
import type { LoginFormValues } from "../../types/auth";
import { signIn } from "../../lib/auth";
import LoginForm from "../../components/ui/LoginForm";

/**
 * What the workspace covers, shown as plain lines on the left.
 *
 * Deliberately text-only — a row of icon tiles turned the pitch into a spec
 * sheet and competed with the card. Each line maps to a real module.
 */
const COVERAGE = [
  "Deals grouped by stage, with a running pipeline value",
  "Leads, contacts, companies and customers in one place",
  "Tasks with due dates, priorities and overdue alerts",
];

/** Header facts shown under the divider. Icons live here only — the coverage
 *  lines above deliberately stay text-only. */
const FACTS = [
  { Icon: ShieldCheck, label: "Role-based access" },
  { Icon: Building2, label: "Built for sales teams" },
];

/**
 * Full-bleed login page.
 *
 * Rendered outside the app shell (no sidebar or topbar), since there is no
 * signed-in user yet. One card sits on a light blue background image and holds
 * both halves: a soft panel with the product pitch on the left, the form on the
 * right, split by a hairline divider. The right half is fixed-width so the form
 * never stretches. Below `lg` the pitch drops away and the form fills the card.
 * Submitting calls the local `signIn` stub and, on success, navigates to the
 * dashboard.
 *
 * The pitch panel is tinted rather than left transparent: the background is
 * brightest on the left, so bare dark text loses contrast where the gradient
 * deepens.
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
    <div
      className="relative min-h-screen w-full overflow-x-hidden flex items-center justify-center bg-[#f0f6fd]"
      style={{
        backgroundImage: "url('/login-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="w-full max-w-[1060px] mx-auto px-6 sm:px-10 lg:px-12 py-8 lg:py-12">
        {/* One card holding both halves: pitch on the left, form on the right.
            A single white surface reads as one product, not two boxes.

            Height: `min-h` stops it hugging its content and leaving a wide band
            of empty background, while `max-h-...vh` guarantees it can never
            overflow a short viewport — on a 720px-tall window the card shrinks
            back toward its content height instead of forcing a scrollbar. */}
        <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-[0_24px_60px_-10px_rgba(18,52,122,0.16),0_10px_24px_-6px_rgba(18,52,122,0.1)] backdrop-blur-2xl flex flex-col lg:flex-row lg:min-h-[640px] xl:min-h-[700px] lg:max-h-[calc(100vh-6rem)]">

          {/* Left: product pitch. Hidden below lg, where the form leads. */}
          <div className="hidden lg:flex lg:flex-1 flex-col justify-center border-r border-[#e6eefa] bg-[#f7fafe] p-9 xl:p-11 overflow-y-auto">
            {/* Brand — one icon only, on the mark itself */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#005bfd] text-white shadow-[0_8px_20px_-4px_rgba(0,91,253,0.45)]">
                <TrendingUp className="h-[22px] w-[22px]" strokeWidth={2.2} />
              </div>
              <div className="flex flex-col">
                <span className="text-[19px] font-bold leading-tight tracking-tight text-[#0f2a5e]">
                  SalesFlow
                </span>
                <span className="text-[12px] font-medium leading-tight text-[#4a6a9e]">
                  Workspace CRM
                </span>
              </div>
            </div>

            <h2 className="mt-8 text-[29px] xl:text-[32px] font-extrabold leading-[1.18] tracking-tight text-[#0f2a5e]">
              The sales workspace your team{" "}
              <span className="text-[#005bfd]">actually keeps up with.</span>
            </h2>

            <p className="mt-4 text-[14.5px] leading-relaxed text-[#3c5480]">
              One home for every stage of the pipeline, so nothing slips through
              the cracks.
            </p>

            {/* Coverage — plain text, no icon tiles */}
            <ul className="mt-7 space-y-3">
              {COVERAGE.map(line => (
                <li
                  key={line}
                  className="border-l-2 border-[#005bfd]/30 pl-3.5 text-[14px] leading-snug text-[#28406e]"
                >
                  {line}
                </li>
              ))}
            </ul>

            {/* Facts — the one place icons return, since these are badges */}
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#dfe8fb] pt-4">
              {FACTS.map(({ Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#3c5480]"
                >
                  <Icon className="h-[14px] w-[14px] shrink-0 text-[#005bfd]" strokeWidth={2.2} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Right: the form */}
          <div className="w-full lg:w-[460px] xl:w-[480px] shrink-0 flex flex-col justify-center p-8 sm:p-10 lg:p-11">
            <LoginForm
              onSubmit={handleSubmit}
              error={error}
              pending={pending}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
