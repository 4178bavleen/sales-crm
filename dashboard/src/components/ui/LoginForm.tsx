import { useState } from "react";
import { Check, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import type { LoginFormProps } from "../../types/auth";

/** Shared field-shell styling: light fill, blue ring on focus. */
const fieldShell =
  "relative flex items-center rounded-xl border border-[#dae2f4] bg-[#edf3fa] transition-all focus-within:border-[#005bfd] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#005bfd]/12";
const fieldIcon = "pointer-events-none flex pl-4 text-[#8a9bb2]";
const fieldInput =
  "w-full bg-transparent py-3.5 pl-3 text-[15px] text-[#1e293b] placeholder-[#94a3b8] outline-none";
const fieldLabel = "mb-2 block text-[13px] font-semibold text-[#28406e]";

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
    <div className="w-full">
      <h1 className="text-[25px] font-bold tracking-tight text-[#0f2a5e]">
        Sign in
      </h1>
      <p className="mt-1.5 text-[13.5px] text-[#5a719b]">
        Use your work email to continue.
      </p>

      {/* Error alert */}
      {displayError && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700"
        >
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-200 text-[10px] font-bold text-rose-700">
            !
          </span>
          <span>{displayError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-7">
        {/* Email */}
        <div>
          <label htmlFor="login-email" className={fieldLabel}>
            Email address
          </label>
          <div
            className={`${fieldShell} ${
              emailInvalid ? "border-rose-300 focus-within:border-rose-400 focus-within:ring-rose-100" : ""
            }`}
          >
            <span className={fieldIcon}>
              <Mail className="h-5 w-5" strokeWidth={1.8} />
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
              className={`${fieldInput} pr-4`}
            />
          </div>
        </div>

        {/* Password */}
        <div className="mt-5">
          <label htmlFor="login-password" className={fieldLabel}>
            Password
          </label>
          <div
            className={`${fieldShell} ${
              passwordInvalid ? "border-rose-300 focus-within:border-rose-400 focus-within:ring-rose-100" : ""
            }`}
          >
            <span className={fieldIcon}>
              <Lock className="h-5 w-5" strokeWidth={1.8} />
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
              className={`${fieldInput} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
              className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center rounded-md pl-2 pr-3.5 text-[#8a9bb2] transition-colors hover:text-[#28406e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#005bfd]"
            >
              {showPassword ? (
                <Eye className="h-5 w-5" strokeWidth={1.8} />
              ) : (
                <EyeOff className="h-5 w-5" strokeWidth={1.8} />
              )}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={remember}
            onClick={() => setRemember(!remember)}
            className="group flex cursor-pointer select-none items-center gap-2.5 text-[13.5px] text-[#41598a]"
          >
            <span
              className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
                remember
                  ? "border-[#005bfd] bg-[#005bfd] text-white"
                  : "border-[#c3d2ea] bg-white group-hover:border-[#8a9bb2]"
              }`}
            >
              {remember && <Check className="h-3.5 w-3.5" strokeWidth={3.2} />}
            </span>
            Remember me
          </button>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={pending}
          className="mt-7 flex w-full cursor-pointer items-center justify-center rounded-xl bg-[#005bfd] px-6 py-3.5 text-[16px] font-semibold text-white shadow-[0_8px_20px_-4px_rgba(0,91,253,0.35)] transition-all hover:bg-[#004ed6] hover:shadow-[0_10px_24px_-4px_rgba(0,91,253,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#005bfd] focus-visible:ring-offset-2 active:bg-[#0042b5] disabled:cursor-not-allowed disabled:opacity-75"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>
    </div>
  );
}
