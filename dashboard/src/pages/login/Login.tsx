import { useState } from "react";
import type { CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { LoginFormValues } from "../../types/auth";
import { signIn } from "../../lib/auth";
import LoginForm from "../../components/ui/LoginForm";
import LoginHero from "../../components/ui/LoginHero";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  async function handleLoginSubmit(values: LoginFormValues) {
    setPending(true);
    setError("");
    const result = await signIn(values);
    setPending(false);

    if (result.ok) {
      navigate(from, { replace: true });
      return;
    }
    setError(result.error);
  }

  return (
    <div
      className="relative min-h-screen w-full bg-cover bg-center bg-no-repeat lg:h-[100dvh] lg:overflow-hidden selection:bg-[#0062ff] selection:text-white"
      style={
        {
          backgroundImage: "url('/bg/login.png')",
          // The page's vertical rhythm. The card reads these to work out how
          // much height is actually left for it, so the two columns can never
          // overrun the viewport.
          "--login-pad-top": "clamp(1.5rem,6vh,5rem)",
          "--login-pad-bottom": "clamp(1rem,8vh,7.5rem)",
          "--login-card-mt": "clamp(0.75rem,4vh,2.6875rem)",
        } as CSSProperties
      }
    >
      <div className="flex w-full min-h-screen flex-col items-start justify-between gap-4 sm:gap-[clamp(16px,3.2vh,32px)] box-border pl-6 pr-6 pt-[clamp(16px,3.4vh,32px)] pb-[clamp(16px,3.4vh,32px)] sm:pl-12 sm:pr-12 sm:pt-[clamp(16px,3.4vh,32px)] sm:pb-[clamp(16px,3.4vh,32px)] lg:h-full lg:min-h-0 lg:flex-row lg:gap-12 lg:overflow-hidden lg:pl-[clamp(1.5rem,7vw,133px)] lg:pr-[clamp(1.5rem,13vw,254px)] lg:pt-[var(--login-pad-top)] lg:pb-[var(--login-pad-bottom)]">
        {/* Left Column / Hero Section */}
        <LoginHero />

        {/* Right Column / Elevated Login Card */}
        <div className="w-full max-w-[486px] lg:w-[clamp(360px,36vw,486px)] lg:shrink-0 lg:mt-[var(--login-card-mt)] lg:h-[min(555px,calc(100dvh-var(--login-pad-top)-var(--login-pad-bottom)-var(--login-card-mt)))] compact-md:mx-auto">
          <div className="w-full h-full rounded-[24px] bg-white px-6 py-[clamp(12px,2.4vh,16px)] sm:px-[56px] sm:py-[clamp(1.25rem,3.2vh,2.75rem)] lg:py-[clamp(1.5rem,4.2vh,2.75rem)] shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12),0_1px_3px_rgba(0,0,0,0.05)] border border-slate-100/70 animate-in fade-in zoom-in-95 duration-200 flex flex-col justify-between">
            <LoginForm
              onSubmit={handleLoginSubmit}
              error={error}
              pending={pending}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
