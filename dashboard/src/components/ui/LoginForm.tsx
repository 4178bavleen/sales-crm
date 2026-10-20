import { useState } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  UserRound,
} from "lucide-react";
import type { LoginFormProps, LoginFormValues } from "../../types/auth";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../../types/auth";
import { primaryButtonClass } from "../../types/formControls";

/** Shared input styling — matches the app's indigo form accents. */
const inputClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const inputInvalidClass =
  "h-11 w-full rounded-lg border border-rose-300 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

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

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        submit();
      }}
      noValidate
    >
      {/* Error banner */}
      {message && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700"
        >
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-200 text-[10px] font-bold text-rose-700">
            !
          </span>
          <span>{message}</span>
        </div>
      )}

      {/* Identifier */}
      <div className="mb-4">
        <label htmlFor="identifier" className={labelClass}>
          Username or email
        </label>
        <div className="relative">
          <UserRound
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
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
            aria-invalid={showErrors && identifierInvalid ? true : undefined}
            className={showErrors && identifierInvalid ? inputInvalidClass : inputClass}
          />
        </div>
      </div>

      {/* Password */}
      <div className="mb-4">
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <div className="relative">
          <Lock
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={form.password}
            onChange={event => update("password", event.target.value)}
            placeholder="Enter your password"
            aria-invalid={showErrors && passwordInvalid ? true : undefined}
            className={`${showErrors && passwordInvalid ? inputInvalidClass : inputClass} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(previous => !previous)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Remember me */}
      <div className="mb-5">
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.remember}
            onChange={event => update("remember", event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
          />
          Remember me
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className={`${primaryButtonClass} h-11 w-full justify-center text-sm ${
          pending ? "cursor-not-allowed opacity-70" : ""
        }`}
      >
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            <LogIn size={16} />
            Sign In
          </>
        )}
      </button>

      {/* Demo credentials hint */}
      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Demo credentials
        </p>
        <div className="mt-1.5 space-y-0.5 text-xs text-slate-500">
          <p>
            Username{" "}
            <span className="font-medium text-slate-700">
              {DEMO_ACCOUNTS[0]?.name ?? "—"}
            </span>{" "}
            or email{" "}
            <span className="font-medium text-slate-700">
              {DEMO_ACCOUNTS[0]?.email ?? "—"}
            </span>
          </p>
          <p>
            Password{" "}
            <span className="font-medium text-slate-700">{DEMO_PASSWORD}</span>
          </p>
        </div>
      </div>
    </form>
  );
}
