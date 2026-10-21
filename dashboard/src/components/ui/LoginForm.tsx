import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, UserRound } from "lucide-react";
import type { LoginFormProps, LoginFormValues } from "../../types/auth";

/**
 * Light input styling, matching the app's indigo form accents.
 *
 * The `peer` class on each input plus the `peer-focus:` rules on the leading
 * icon let the icon pick up the indigo tint while the field is focused, which
 * ties the two together without any JS.
 */
const inputClass =
  "peer block w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const inputInvalidClass =
  "peer block w-full rounded-xl border border-rose-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 hover:border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100";
const iconClass =
  "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors peer-focus:text-indigo-500";
const iconInvalidClass =
  "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-400 transition-colors";
const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600";

/** Compact inline notice used for both errors and success feedback. */
const noticeBase =
  "mb-5 flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-medium transition-all duration-300";

/**
 * The login form.
 *
 * Collects a single `identifier` (matched against `User.email` or `User.name`),
 * a password, and a remember-me choice. Validation and submission live in the
 * page; this component only reports what the user typed.
 */
export default function LoginForm({
  onSubmit,
  error,
  pending = false,
}: LoginFormProps) {
  const [form, setForm] = useState<LoginFormValues>({
    identifier: "",
    password: "",
    remember: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const identifierInvalid = form.identifier.trim() === "";
  const passwordInvalid = form.password === "";
  const clientError =
    showErrors && identifierInvalid
      ? "Please enter your username or email."
      : showErrors && passwordInvalid
        ? "Please enter your password."
        : "";
  const message = clientError || error || "";

  function update<K extends keyof LoginFormValues>(
    key: K,
    value: LoginFormValues[K],
  ) {
    setForm(previous => ({ ...previous, [key]: value }));
  }

  function submit() {
    setShowErrors(true);
    if (identifierInvalid || passwordInvalid || pending) return;
    onSubmit(form);
  }

  const showIdentifierInvalid = showErrors && identifierInvalid;
  const showPasswordInvalid = showErrors && passwordInvalid;

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        submit();
      }}
      noValidate
    >
      {/* Error banner: client validation or a failed sign-in attempt. */}
      {message && (
        <div
          role="alert"
          className={`${noticeBase} border-rose-200 bg-rose-50 text-rose-700`}
        >
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-200 text-[10px] font-bold text-rose-700">
            !
          </span>
          <span>{message}</span>
        </div>
      )}

      {/* Identifier */}
      <div className="mb-4 space-y-1.5">
        <label htmlFor="identifier" className={labelClass}>
          Username or email
        </label>
        <div className="relative rounded-xl">
          <UserRound
            size={16}
            className={showIdentifierInvalid ? iconInvalidClass : iconClass}
          />
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            autoFocus
            value={form.identifier}
            onChange={event => update("identifier", event.target.value)}
            placeholder="gabriel@salesflow.example.com"
            aria-invalid={showIdentifierInvalid ? true : undefined}
            className={
              showIdentifierInvalid ? inputInvalidClass : inputClass
            }
          />
        </div>
      </div>

      {/* Password */}
      <div className="mb-4 space-y-1.5">
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <div className="relative rounded-xl">
          <Lock
            size={16}
            className={showPasswordInvalid ? iconInvalidClass : iconClass}
          />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={form.password}
            onChange={event => update("password", event.target.value)}
            placeholder="Enter your password"
            aria-invalid={showPasswordInvalid ? true : undefined}
            className={`${
              showPasswordInvalid ? inputInvalidClass : inputClass
            } pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(previous => !previous)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
            className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center rounded-md pr-3.5 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Remember me — aligned with the submit button's rhythm below. */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <label className="flex cursor-pointer select-none items-center gap-2.5 text-xs text-slate-600 sm:text-sm">
          <input
            id="remember_me"
            name="remember_me"
            type="checkbox"
            checked={form.remember}
            onChange={event => update("remember", event.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-indigo-600 focus:ring-indigo-500"
          />
          Remember me
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className={`group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-150 hover:from-indigo-500 hover:to-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:scale-[0.99] ${
          pending ? "cursor-not-allowed opacity-80" : ""
        }`}
      >
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Verifying workspace session...
          </>
        ) : (
          <>
            Sign In to Workspace
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-1"
            />
          </>
        )}
      </button>
    </form>
  );
}
