import { ChevronDown, Save } from "lucide-react";
import type {
  FieldMessageProps,
  FieldProps,
  FormSectionProps,
  FormShellProps,
  SelectFieldProps,
  TextAreaFieldProps,
} from "../../types/formControls";
import {
  fieldId,
  inputInvalid,
  inputValid,
  labelClass,
  primaryButtonClass,
  requiredClass,
  secondaryButtonClass,
} from "../../types/formControls";

/** Inline validation message, shared by Field / SelectField. */
export function FieldMessage({ id, hint }: FieldMessageProps) {
  if (!hint) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-rose-600">
      {hint}
    </p>
  );
}

export function Field({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  placeholder,
  invalid = false,
  hint,
}: FieldProps) {
  const id = fieldId(label);
  const hintId = `${id}-hint`;
  return (
    <>
      <label htmlFor={id} className={`${labelClass} ${required ? requiredClass : ""}`}>
        {label}
      </label>
      <div>
        <input
          id={id}
          className={invalid ? inputInvalid : inputValid}
          type={type}
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid && hint ? hintId : undefined}
        />
        {invalid && <FieldMessage id={hintId} hint={hint} />}
      </div>
    </>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
  invalid = false,
  hint,
}: SelectFieldProps) {
  const id = fieldId(label);
  const hintId = `${id}-hint`;
  return (
    <>
      <label htmlFor={id} className={`${labelClass} ${required ? requiredClass : ""}`}>
        {label}
      </label>
      <div>
        <div className="relative">
          <select
            id={id}
            className={`${invalid ? inputInvalid : inputValid} appearance-none pr-9`}
            value={value}
            onChange={event => onChange(event.target.value)}
            required={required}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid && hint ? hintId : undefined}
          >
            <option value="">-None-</option>
            {options.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown
            size={15}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>
        {invalid && <FieldMessage id={hintId} hint={hint} />}
      </div>
    </>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: TextAreaFieldProps) {
  const id = fieldId(label);
  return (
    <>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`${inputValid} resize-y py-2`}
      />
    </>
  );
}

/** Titled card grouping related fields — identical look on every form. */
export function FormSection({
  icon,
  title,
  description,
  aside,
  children,
}: FormSectionProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          )}
        </div>
        {aside && (
          <span className="ml-auto shrink-0 text-xs text-slate-400">{aside}</span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 p-4 md:grid-cols-2 md:p-5">
        {children}
      </div>
    </section>
  );
}

/** Full-page form frame: header with Cancel/Save, error banner, sticky footer. */
export function FormShell({
  title,
  description,
  error,
  dirty,
  onClose,
  onSubmit,
  children,
}: FormShellProps) {
  return (
    <div className="page-enter min-h-[calc(100vh-64px)] bg-slate-100 text-slate-800">
      <form
        onSubmit={event => {
          event.preventDefault();
          onSubmit();
        }}
        noValidate
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-5 py-3.5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-0.5 text-sm text-slate-500">{description}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className={secondaryButtonClass}>
              Cancel
            </button>
            <button type="submit" className={primaryButtonClass}>
              <Save size={15} /> Save
            </button>
          </div>
        </div>

        <main className="space-y-4 p-4 sm:p-5">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-200 text-[10px] font-bold text-rose-700">
                !
              </span>
              {error}
            </div>
          )}
          {children}
        </main>

        <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {dirty ? (
              <span className="flex items-center gap-1.5 font-medium text-amber-600">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Unsaved changes
              </span>
            ) : (
              <span className="text-slate-400">No changes yet</span>
            )}
            <span className="text-slate-400">
              Press{" "}
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                Esc
              </kbd>{" "}
              to go back
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className={secondaryButtonClass}>
              Cancel
            </button>
            <button type="submit" className={primaryButtonClass}>
              <Save size={15} /> Save
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
