import { useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import type { LoginFormProps } from "../../types/auth";
import SalesCrmLogo from "./SalesCrmLogo";

export default function LoginForm({
  onSubmit,
  error,
  pending = false,
}: LoginFormProps) {
  const [emailValue, setEmailValue] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [localError, setLocalError] = useState("");
  const [touched, setTouched] = useState(false);

  const emailInvalid = touched && emailValue.trim() === "";
  const passwordInvalid = touched && password === "";

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setTouched(true);
    setLocalError("");

    const email = emailValue.trim();
    if (!email) {
      setLocalError("Please enter your email address.");
      return;
    }
    if (!password) {
      setLocalError("Please enter your password.");
      return;
    }

    onSubmit({ email, password, remember });
  }

  const displayError = localError || error;

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Top Content */}
      <div>
        {/* Centered Sales CRM Logo */}
        <div className="flex justify-center mb-[10px] sm:mb-[clamp(0.75rem,2vh,1.125rem)] tiny:hidden">
          <SalesCrmLogo size="lg" />
        </div>

        {/* Header */}
        <div className="text-center">
          <h2 className="text-[24px] sm:text-[clamp(22px,6.5vh,28px)] font-bold tracking-tight text-slate-900 leading-tight">
            Welcome Back
          </h2>
          <p className="mt-0.5 sm:mt-1 text-[12.5px] sm:text-[13.5px] text-slate-500 font-normal">
            Sign in to your Sales CRM account
          </p>
        </div>

        {/* Error Alert */}
        {displayError && (
          <div
            role="alert"
            className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-[13px] text-rose-700 animate-in fade-in"
          >
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-200 text-[10px] font-bold text-rose-700">
              !
            </span>
            <span>{displayError}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-[14px] sm:mt-[clamp(0.5rem,2.6vh,1.75rem)] space-y-[10px] sm:space-y-[clamp(0.375rem,1.6vh,1rem)]"
        >
          {/* Email */}
          <div>
            <label
              htmlFor="login-email"
              className="block text-[12px] sm:text-[13px] font-medium text-slate-900 mb-1 sm:mb-1.5 text-left"
            >
              Email address
            </label>
            <div
              className={`relative flex items-center h-[42px] sm:h-[46px] tiny:h-[36px] rounded-xl border bg-white transition-all ${
                emailInvalid
                  ? "border-rose-300 ring-2 ring-rose-100"
                  : "border-slate-200 hover:border-slate-300 focus-within:border-[#0062ff] focus-within:ring-2 focus-within:ring-blue-100"
              }`}
            >
              <span className="pl-3.5 text-slate-400 shrink-0 pointer-events-none">
                <Mail className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                value={emailValue}
                onChange={e => setEmailValue(e.target.value)}
                placeholder="you@company.com"
                aria-invalid={emailInvalid || undefined}
                className="w-full bg-transparent h-full pl-2.5 pr-3 text-[13.5px] sm:text-[14px] text-slate-800 placeholder:text-slate-400 outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="login-password"
              className="block text-[12px] sm:text-[13px] font-medium text-slate-900 mb-1 sm:mb-1.5 text-left"
            >
              Password
            </label>
            <div
              className={`relative flex items-center h-[42px] sm:h-[46px] tiny:h-[36px] rounded-xl border bg-white transition-all ${
                passwordInvalid
                  ? "border-rose-300 ring-2 ring-rose-100"
                  : "border-slate-200 hover:border-slate-300 focus-within:border-[#0062ff] focus-within:ring-2 focus-within:ring-blue-100"
              }`}
            >
              <span className="pl-3.5 text-slate-400 shrink-0 pointer-events-none">
                <Lock className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                aria-invalid={passwordInvalid || undefined}
                className="w-full bg-transparent h-full pl-2.5 pr-10 text-[13.5px] sm:text-[14px] text-slate-800 placeholder:text-slate-400 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" strokeWidth={1.8} />
                ) : (
                  <Eye className="h-4 w-4" strokeWidth={1.8} />
                )}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center justify-start text-[12px] sm:text-[13px] pt-1 sm:pt-1.5">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-[4px] border transition-colors ${
                  remember
                    ? "border-[#0062ff] bg-[#0062ff] text-white"
                    : "border-slate-300 bg-white group-hover:border-slate-400"
                }`}
              >
                {remember && <Check className="h-3 w-3 stroke-[3]" />}
              </span>
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="sr-only"
              />
              <span className="text-slate-700 font-normal">Remember me</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={pending}
            className="!mt-[12px] sm:!mt-[clamp(0.5rem,2.4vh,1.5rem)] w-full h-[42px] sm:h-[46px] tiny:h-[36px] rounded-xl bg-[#0062ff] hover:bg-[#0052d9] active:bg-[#0047bd] text-white font-medium text-[14px] sm:text-[14.5px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer copyright inside card */}
      <div className="pt-[4px] sm:pt-[clamp(2px,1.2vh,6px)] pb-0 text-center text-[11px] sm:text-[12px] text-slate-400 font-normal">
        &copy; 2026 Sales CRM. All rights reserved.
      </div>
    </div>
  );
}
