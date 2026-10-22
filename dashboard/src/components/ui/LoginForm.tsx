import { useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import type { LoginFormProps } from "../../types/auth";

export default function LoginForm({ onSubmit, error, pending = false }: LoginFormProps) {
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
    if (!email) { setLocalError("Please enter your email address."); return; }
    if (!password) { setLocalError("Please enter your password."); return; }
    onSubmit({ email, password, remember });
  }

  const displayError = localError || error;

  return (
    <div className="w-full flex flex-col">
      <div className="mb-8">
        <h2 className="text-[34px] font-bold tracking-tight text-slate-900 leading-tight">Welcome Back</h2>
        <p className="mt-1.5 text-[15px] text-slate-500 font-normal">Sign in to your Sales CRM account</p>
      </div>

      {displayError && (
        <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700 animate-in fade-in">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-200 text-[10px] font-bold text-rose-700">!</span>
          <span>{displayError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="login-email" className="block text-[14px] font-semibold text-slate-800 mb-2">Email address</label>
          <div className={`relative flex items-center h-[52px] rounded-xl border bg-white transition-all ${emailInvalid ? "border-rose-300 ring-2 ring-rose-100" : "border-slate-200 hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"}`}>
            <span className="pl-4 text-slate-400 shrink-0 pointer-events-none"><Mail className="h-[18px] w-[18px]" strokeWidth={1.7} /></span>
            <input id="login-email" name="email" type="email" autoComplete="email" value={emailValue} onChange={e => setEmailValue(e.target.value)} placeholder="you@company.com" aria-invalid={emailInvalid || undefined} className="w-full bg-transparent h-full pl-3 pr-4 text-[14px] text-slate-800 placeholder:text-slate-400 outline-none" />
          </div>
        </div>

        <div>
          <label htmlFor="login-password" className="block text-[14px] font-semibold text-slate-800 mb-2">Password</label>
          <div className={`relative flex items-center h-[52px] rounded-xl border bg-white transition-all ${passwordInvalid ? "border-rose-300 ring-2 ring-rose-100" : "border-slate-200 hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"}`}>
            <span className="pl-4 text-slate-400 shrink-0 pointer-events-none"><Lock className="h-[18px] w-[18px]" strokeWidth={1.7} /></span>
            <input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" aria-invalid={passwordInvalid || undefined} className="w-full bg-transparent h-full pl-3 pr-12 text-[14px] text-slate-800 placeholder:text-slate-400 outline-none" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.7} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.7} />}
            </button>
          </div>
        </div>

        <div className="flex items-center">
          <label className="flex items-center gap-2.5 cursor-pointer select-none group">
            <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border transition-colors shrink-0 ${remember ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white group-hover:border-slate-400"}`}>
              {remember && <Check className="h-3 w-3 stroke-[3]" />}
            </span>
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="sr-only" />
            <span className="text-[14px] text-slate-700 font-normal">Remember me</span>
          </label>
        </div>

        <button type="submit" disabled={pending} className="w-full h-[54px] rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-[15px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed">
          {pending ? (<><Loader2 className="h-[18px] w-[18px] animate-spin" /><span>Signing in...</span></>) : (<><span>Sign in</span><ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.2} /></>)}
        </button>
      </form>

      <div className="mt-10 text-center text-[12px] text-slate-400 font-normal">
        &copy; 2026 Vibrantick Infotech Solutions. All rights reserved.
      </div>
    </div>
  );
}
