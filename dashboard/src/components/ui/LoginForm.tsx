import { useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import type { LoginFormProps } from "../../types/auth";

export default function LoginForm({
  onSubmit,
  onSwitchMode,
  error,
  pending = false,
}: LoginFormProps) {
  const [emailValue, setEmailValue] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [localError, setLocalError] = useState("");
  const [touched, setTouched] = useState(false);
  const [socialNotice, setSocialNotice] = useState("");

  const emailInvalid = touched && emailValue.trim() === "";
  const passwordInvalid = touched && password === "";

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setTouched(true);
    setLocalError("");
    setSocialNotice("");

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

  function handleSocialClick(provider: "Google" | "Microsoft") {
    setSocialNotice(`${provider} sign-in is enabled for corporate single sign-on.`);
  }

  const displayError = localError || error;

  return (
    <div className="w-full">
      {/* Centered Card Header */}
      <div className="text-center">
        <h2 className="text-[24px] sm:text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
          Welcome Back
        </h2>
        <p className="mt-1.5 text-[13px] text-slate-500">
          Sign in to your Sales CRM account
        </p>
      </div>

      {/* Error / notice alerts */}
      {displayError && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700 animate-in fade-in"
        >
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-200 text-[10px] font-bold text-rose-700">
            !
          </span>
          <span>{displayError}</span>
        </div>
      )}

      {socialNotice && !displayError && (
        <div
          role="status"
          className="mt-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-[12.5px] text-blue-700"
        >
          <span>{socialNotice}</span>
          <button
            type="button"
            onClick={() => setSocialNotice("")}
            className="text-xs font-semibold hover:text-blue-900 ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="login-email" className="block text-[13px] font-medium text-slate-700 mb-1.5">
            Email address
          </label>
          <div
            className={`relative flex items-center rounded-lg border bg-white transition-all ${
              emailInvalid
                ? "border-rose-300 ring-2 ring-rose-100"
                : "border-slate-200 hover:border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100"
            }`}
          >
            <span className="pl-3 text-slate-400 shrink-0 pointer-events-none">
              <Mail className="h-4 w-4" strokeWidth={1.9} />
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
              className="w-full bg-transparent py-2.5 pl-2.5 pr-3 text-[14px] text-slate-800 placeholder:text-slate-400 outline-none"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="login-password" className="block text-[13px] font-medium text-slate-700 mb-1.5">
            Password
          </label>
          <div
            className={`relative flex items-center rounded-lg border bg-white transition-all ${
              passwordInvalid
                ? "border-rose-300 ring-2 ring-rose-100"
                : "border-slate-200 hover:border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100"
            }`}
          >
            <span className="pl-3 text-slate-400 shrink-0 pointer-events-none">
              <Lock className="h-4 w-4" strokeWidth={1.9} />
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
              className="w-full bg-transparent py-2.5 pl-2.5 pr-10 text-[14px] text-slate-800 placeholder:text-slate-400 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" strokeWidth={1.9} />
              ) : (
                <Eye className="h-4 w-4" strokeWidth={1.9} />
              )}
            </button>
          </div>
        </div>

        {/* Remember me & Forgot password row */}
        <div className="flex items-center justify-between text-[13px] pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <span
              className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                remember
                  ? "border-blue-600 bg-blue-600 text-white"
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
            <span className="text-slate-600">Remember me</span>
          </label>

          <button
            type="button"
            onClick={() => onSwitchMode?.("forgot")}
            className="text-[12.5px] font-medium text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
          >
            Forgot password?
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={pending}
          className="mt-2 w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-[14px] flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-5 flex items-center justify-center">
        <div className="w-full border-t border-slate-200" />
        <span className="absolute bg-white px-3 text-[11px] font-medium text-slate-400 tracking-wider">
          OR
        </span>
      </div>

      {/* Social Sign-in Buttons */}
      <div className="space-y-2.5">
        {/* Continue with Google */}
        <button
          type="button"
          onClick={() => handleSocialClick("Google")}
          className="w-full py-2.5 px-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 text-slate-700 font-medium text-[13px] sm:text-[13.5px] flex items-center justify-center gap-2.5 transition-all cursor-pointer bg-white"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Continue with Microsoft */}
        <button
          type="button"
          onClick={() => handleSocialClick("Microsoft")}
          className="w-full py-2.5 px-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 text-slate-700 font-medium text-[13px] sm:text-[13.5px] flex items-center justify-center gap-2.5 transition-all cursor-pointer bg-white"
        >
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 21 21">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          <span>Continue with Microsoft</span>
        </button>
      </div>
    </div>
  );
}
