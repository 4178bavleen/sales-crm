import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { LoginFormValues } from "../../types/auth";
import { signIn } from "../../lib/auth";
import LoginForm from "../../components/ui/LoginForm";
import ForgotPasswordForm from "../../components/ui/ForgotPasswordForm";
import SalesCrmLogo from "../../components/ui/SalesCrmLogo";

export type AuthMode = "login" | "forgot";

interface LoginProps {
  initialMode?: AuthMode;
}

export default function Login({ initialMode }: LoginProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Derive mode directly from location path or initialMode
  const mode: AuthMode = initialMode
    ? initialMode
    : location.pathname === "/forgot-password"
    ? "forgot"
    : "login";

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

  function handleSwitchMode(nextMode: AuthMode) {
    setError("");
    const nextPath = nextMode === "login" ? "/login" : "/forgot-password";
    navigate(nextPath, { replace: true, state: location.state });
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center bg-gradient-to-br from-[#dfeafd] via-[#edf4fe] to-[#d5e5fc] px-4 py-8 sm:py-12 overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Dynamic ambient color glow spheres */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-20 w-[550px] h-[550px] rounded-full bg-blue-500/20 blur-[130px] -z-0"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 -right-24 w-[600px] h-[600px] rounded-full bg-indigo-500/18 blur-[140px] -z-0"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-36 left-1/4 w-[500px] h-[500px] rounded-full bg-sky-400/25 blur-[120px] -z-0"
      />

      {/* Subtle modern dot-grid texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35] -z-0"
        style={{
          backgroundImage: "radial-gradient(rgba(24, 64, 150, 0.16) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Invisible spacer so the card centers perfectly vertically */}
      <div className="h-4 sm:h-8" />

      {/* Main Centered Login Section */}
      <main className="relative z-10 w-full max-w-[440px] flex flex-col items-center my-auto">
        {/* Brand Logo centered prominently above the card */}
        <div className="mb-6 flex flex-col items-center">
          <button
            type="button"
            onClick={() => handleSwitchMode("login")}
            className="focus:outline-none cursor-pointer flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          >
            <SalesCrmLogo className="scale-120" />
          </button>
        </div>

        {/* Focused Elevated Card */}
        <div className="w-full rounded-2xl bg-white/95 p-7 sm:p-9 shadow-[0_24px_60px_-12px_rgba(20,55,120,0.18),0_8px_24px_-6px_rgba(20,55,120,0.08)] border border-white/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
          {mode === "login" ? (
            <LoginForm
              onSubmit={handleLoginSubmit}
              onSwitchMode={handleSwitchMode}
              error={error}
              pending={pending}
            />
          ) : (
            <ForgotPasswordForm onSwitchMode={handleSwitchMode} />
          )}
        </div>
      </main>

      {/* Clean centered footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-slate-500 font-medium">
        &copy; 2026 Sales CRM. All rights reserved.
      </footer>
    </div>
  );
}
