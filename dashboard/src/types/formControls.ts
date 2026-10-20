import type { ReactNode } from "react";

/**
 * Shared form-control types used by every create/edit form
 * (leads, contacts, and future resources).
 */

export type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  invalid?: boolean;
  hint?: string;
};

export type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
  invalid?: boolean;
  hint?: string;
};

export type TextAreaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
};

export type FieldMessageProps = {
  id: string;
  hint?: string;
};

export type FormSectionProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
};

export type FormShellProps = {
  title: string;
  description: string;
  /** Optional inline error banner shown above the sections. */
  error?: string;
  /** Whether the form has unsaved changes. */
  dirty: boolean;
  onClose: () => void;
  /** Called when the form is submitted (Enter key or a Save button). */
  onSubmit: () => void;
  children: ReactNode;
};

/** Style tokens shared by every form control so all forms look identical. */
export const fieldId = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const inputBase =
  "h-10 w-full rounded-md border bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-2";
export const inputValid = `${inputBase} border-slate-300 hover:border-slate-400 focus:border-indigo-500 focus:ring-indigo-100`;
export const inputInvalid = `${inputBase} border-rose-300 hover:border-rose-400 focus:border-rose-500 focus:ring-rose-100`;
export const labelClass =
  "flex items-center justify-end pr-4 text-sm text-slate-500 max-sm:justify-start max-sm:pr-0";
export const requiredClass = "after:ml-1 after:text-rose-500 after:content-['*']";
export const cellClass =
  "grid grid-cols-1 gap-y-2 sm:grid-cols-[minmax(115px,0.65fr)_minmax(0,1.5fr)] sm:items-center";
export const primaryButtonClass =
  "inline-flex h-9 items-center gap-2 rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 active:translate-y-px";
export const secondaryButtonClass =
  "h-9 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400/40 active:translate-y-px";
