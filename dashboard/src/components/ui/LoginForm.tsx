import { useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, Loader2, Lock, UserRound } from "lucide-react";
import type { LoginFormProps, LoginFormValues } from "../../types/auth";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../../types/auth";

/** Light input styling, matching the app's indigo form accents. */
const inputClass =
  "block w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const inputInvalidClass =
  "block w-full rounded-xl border border-rose-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 hover:border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100";
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
  const [filled, setFilled] = useState(false);

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

  /** Fill in the demo account, mirroring the design's "Auto-fill" affordance. */
  function autoFill() {
    setForm(previous => ({
      ...previous,
      identifier: DEMO_ACCOUNTS[0]?.email ?? "",
      password: DEMO_PASSWORD,
    }));
    setShowErrors(false);
    setFilled(true);
    window.setTimeout(() => setFilled(false), 2500);
  }

  function submit() {
    setShowErrors(true);
    if (identifierInvalid || passwordInvalid || pending) return;
    onSubmit(form);
  }

  const demo = DEMO_ACCOUNTS[0];

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        submit();
      }}
      noValidate
    >
      

      {/* Identifier */}
      <div className="mb-4 space-y-1.5">
        <label htmlFor="identifier" className={labelClass}>
          Username or email
        </label>
        <div className="relative rounded-xl">
          <UserRound
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
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
            className={
              showErrors && identifierInvalid ? inputInvalidClass : inputClass
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
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
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
            className={`${
              showErrors && passwordInvalid ? inputInvalidClass : inputClass
            } pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(previous => !previous)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
            className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center pr-3.5 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Remember me */}
      <div className="flex items-center pt-1">
        <input
          id="remember_me"
          name="remember_me"
          type="checkbox"
          checked={form.remember}
          onChange={event => update("remember", event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 accent-indigo-600 focus:ring-indigo-500"
        />
        <label
          htmlFor="remember_me"
          className="ml-2.5 block select-none text-xs text-slate-600 sm:text-sm"
        >
          Remember me
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className={`group mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-150 hover:from-indigo-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 active:scale-[0.99] ${
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
