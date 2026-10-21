import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react";

interface ForgotPasswordFormProps {
  onSwitchMode?: (mode: "login" | "forgot") => void;
}

export default function ForgotPasswordForm({ onSwitchMode }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [touched, setTouched] = useState(false);

  const emailInvalid = touched && email.trim() === "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError("");

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }

    setPending(true);
    // Simulate sending reset link
    await new Promise(r => setTimeout(r, 600));
    setPending(false);
    setSent(true);
  }

  return (
    <div className="w-full">
      {/* Centered Header */}
      <div className="text-center">
        <h2 className="text-[24px] sm:text-[26px] font-bold tracking-tight text-slate-900 leading-tight">
          Reset Your Password
        </h2>
        <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed max-w-xs mx-auto">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {/* Success State */}
      {sent ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-center animate-in fade-in">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <h3 className="mt-2.5 text-sm font-semibold text-emerald-900">
            Reset link sent!
          </h3>
          <p className="mt-1 text-[12.5px] text-emerald-700">
            We sent an email to <span className="font-medium text-emerald-900">{email}</span>. Click the link in the message to set a new password.
          </p>
          <button
            type="button"
            onClick={() => onSwitchMode?.("login")}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
          >
            Return to sign in
          </button>
        </div>
      ) : (
        <>
          {/* Error alert */}
          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700 animate-in fade-in"
            >
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-200 text-[10px] font-bold text-rose-700">
                !
              </span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="reset-email" className="block text-[13px] font-medium text-slate-700 mb-1.5">
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
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-transparent py-2.5 pl-2.5 pr-3 text-[14px] text-slate-800 placeholder:text-slate-400 outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={pending}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-[14px] flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending link...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
                </>
              )}
            </button>
          </form>
        </>
      )}

      {/* Back to Sign In link */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => onSwitchMode?.("login")}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
          <span>Back to Sign In</span>
        </button>
      </div>
    </div>
  );
}
