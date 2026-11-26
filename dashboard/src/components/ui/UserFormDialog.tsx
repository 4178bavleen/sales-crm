import { useEffect, useState } from "react";
import {
  X,
  User,
  Mail,
  Phone,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Plus,
  Trash2,
  Calendar,
} from "lucide-react";
import type {
  CreateUserInput,
  EmployeePhoneInput,
  RoleName,
  UserRow,
  UserUpdateValues,
} from "../../types/user";
import {
  COUNTRY_OPTIONS,
  ROLE_CONFIG,
  countryOption,
  employeeJoiningDate,
  formatEmployeePhone,
  joiningDateInputValue,
  roleLabel,
} from "../../lib/users";
import { fetchRoles, type RoleItem } from "../../lib/permissions";

export type UserFormDialogProps = {
  mode: "create" | "edit";
  initialUser?: UserRow | null;
  currentUserId?: number;
  isOpen: boolean;
  onClose: () => void;
  onSubmitCreate?: (data: CreateUserInput) => Promise<void>;
  onSubmitEdit?: (id: number, data: UserUpdateValues) => Promise<void>;
};

function generatePassword(): string {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
  let pwd = "";
  for (let i = 0; i < 12; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

function blankPhoneEntry(isPrimary = false): EmployeePhoneInput {
  return {
    countryCode: "IN",
    dialCode: "+91",
    number: "",
    label: "",
    isPrimary,
  };
}

function phoneEntryFromLegacy(value?: string | null): EmployeePhoneInput {
  const raw = (value ?? "").trim();
  if (!raw) return blankPhoneEntry(true);
  const country = COUNTRY_OPTIONS.find((option) =>
    raw.startsWith(option.dialCode),
  );
  if (!country) return { ...blankPhoneEntry(true), number: raw };
  return {
    countryCode: country.code,
    dialCode: country.dialCode,
    number: raw.slice(country.dialCode.length).trim(),
    label: "",
    isPrimary: true,
  };
}

export default function UserFormDialog({
  mode,
  initialUser,
  currentUserId,
  isOpen,
  onClose,
  onSubmitCreate,
  onSubmitEdit,
}: UserFormDialogProps) {
  const isCreate = mode === "create";

  const [name, setName] = useState(initialUser?.name ?? "");
  const [email, setEmail] = useState(initialUser?.email ?? "");
  const [joiningDate, setJoiningDate] = useState(() =>
    joiningDateInputValue(
      initialUser ? employeeJoiningDate(initialUser) : undefined,
    ),
  );
  const [phoneEntries, setPhoneEntries] = useState<EmployeePhoneInput[]>(
    () => {
      if (initialUser?.phones?.length) {
        return initialUser.phones.map((entry) => ({
          countryCode: entry.countryCode,
          dialCode: entry.dialCode,
          number: entry.number,
          label: entry.label ?? "",
          isPrimary: entry.isPrimary,
        }));
      }
      if (initialUser?.phone) return [phoneEntryFromLegacy(initialUser.phone)];
      return [blankPhoneEntry(true)];
    },
  );
  const [roleName, setRoleName] = useState<string>(
    initialUser?.role?.name ?? "SALES_EMPLOYEE",
  );
  const [availableRoles, setAvailableRoles] = useState<RoleItem[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState("");
  const [isActive, setIsActive] = useState<boolean>(initialUser?.isActive ?? true);

  // Password fields
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [enablePasswordReset, setEnablePasswordReset] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    phones?: string;
    joiningDate?: string;
  }>({});

  const initialUserId = initialUser?.id;
  const initialRoleName = initialUser?.role?.name;

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setRolesLoading(true);
    setRolesError("");
    fetchRoles()
      .then((roles) => {
        if (!active) return;
        const options = [...roles];
        if (
          initialRoleName &&
          !options.some((role) => role.name === initialRoleName)
        ) {
          options.push({
            id: -1,
            name: initialRoleName,
            description: null,
            _count: { users: 0, permissions: 0 },
          });
        }
        setAvailableRoles(options);
        if (!initialUserId) {
          const preferred =
            options.find((role) => role.name === "SALES_EMPLOYEE") ?? options[0];
          if (preferred) setRoleName(preferred.name);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setRolesError(
            err instanceof Error ? err.message : "Failed to load roles.",
          );
        }
      })
      .finally(() => {
        if (active) setRolesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, initialUserId, initialRoleName]);

  function updatePhoneEntry(
    index: number,
    patch: Partial<EmployeePhoneInput>,
  ): void {
    setPhoneEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    );
    if (fieldErrors.phones) {
      setFieldErrors((prev) => ({ ...prev, phones: undefined }));
    }
  }

  function addPhoneEntry(): void {
    setPhoneEntries((prev) => [
      ...prev,
      blankPhoneEntry(prev.length === 0),
    ]);
    if (fieldErrors.phones) {
      setFieldErrors((prev) => ({ ...prev, phones: undefined }));
    }
  }

  function removePhoneEntry(index: number): void {
    setPhoneEntries((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) return [blankPhoneEntry(true)];
      if (!next.some((entry) => entry.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
    });
    if (fieldErrors.phones) {
      setFieldErrors((prev) => ({ ...prev, phones: undefined }));
    }
  }

  function normalizedPhones(): EmployeePhoneInput[] {
    const entries = phoneEntries
      .filter((entry) => entry.number.trim())
      .map((entry) => ({
        countryCode: entry.countryCode.toUpperCase(),
        dialCode: countryOption(entry.countryCode).dialCode,
        number: entry.number.trim(),
        label: entry.label?.trim() || undefined,
        isPrimary: Boolean(entry.isPrimary),
      }));

    const hasPrimary = entries.some((entry) => entry.isPrimary);
    const normalized = entries.map((entry, index) => ({
      ...entry,
      isPrimary: hasPrimary ? entry.isPrimary : index === 0,
    }));
    if (!hasPrimary && normalized[0]) normalized[0].isPrimary = true;
    return normalized;
  }

  if (!isOpen) return null;

  const isSelf = Boolean(initialUser && initialUser.id === currentUserId);

  function validate(): boolean {
    const errors: typeof fieldErrors = {};

    if (!name.trim()) {
      errors.name = "Full name is required";
    } else if (name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    if (!email.trim()) {
      errors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    if (!joiningDate) {
      errors.joiningDate = "Joining date is required";
    }

    const phones = normalizedPhones();
    if (phones.filter((entry) => entry.isPrimary).length > 1) {
      errors.phones = "Only one phone number can be primary";
    } else if (
      phones.some((entry) => !/^[\d\s()-]{3,30}$/.test(entry.number))
    ) {
      errors.phones = "Use digits, spaces, dashes or brackets only";
    }

    if (!roleName) {
      errors.role = "Select a role for this employee";
    }

    if (isCreate) {
      if (!password) {
        errors.password = "A temporary password is required";
      } else if (password.length < 8) {
        errors.password = "Password must be at least 8 characters long";
      }
    } else if (enablePasswordReset) {
      if (!password) {
        errors.password = "New password cannot be empty";
      } else if (password.length < 8) {
        errors.password = "Password must be at least 8 characters long";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    if (!validate()) return;

    setIsSubmitting(true);
    const phones = normalizedPhones();
    const primaryPhone = phones.find((entry) => entry.isPrimary);
    try {
      if (isCreate) {
        if (!onSubmitCreate) return;
        await onSubmitCreate({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: primaryPhone ? formatEmployeePhone(primaryPhone) : undefined,
          phones,
          joiningDate,
          roleName,
        });
      } else {
        if (!onSubmitEdit || !initialUser) return;
        const payload: UserUpdateValues = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: primaryPhone ? formatEmployeePhone(primaryPhone) : null,
          phones,
          joiningDate,
          roleName,
          isActive,
        };

        if (enablePasswordReset && password.trim()) {
          payload.password = password.trim();
        }

        await onSubmitEdit(initialUser.id, payload);
      }
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleQuickGenerate() {
    const generated = generatePassword();
    setPassword(generated);
    setShowPassword(true);
    setFieldErrors((prev) => ({ ...prev, password: undefined }));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-gradient-to-r from-slate-50/80 to-white">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                isCreate
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              }`}
            >
              {isCreate ? <User size={20} /> : <Shield size={20} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isCreate ? "Add New Employee" : "Edit Employee"}
              </h2>
              <p className="text-xs text-slate-500">
                {isCreate
                  ? "Set up employee credentials and workspace access."
                  : `Updating details for ${initialUser?.name || "employee"}.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-800"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Full Name & Email */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-2.5 text-slate-400"
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) {
                      setFieldErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  placeholder="e.g. Sarah Jenkins"
                  className={`w-full rounded-xl border pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition ${
                    fieldErrors.name
                      ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                      : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  }`}
                />
              </div>
              {fieldErrors.name && (
                <p className="mt-1 text-[11px] text-rose-600 font-medium">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-2.5 text-slate-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder="s.jenkins@vibrantick.com"
                  className={`w-full rounded-xl border pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition ${
                    fieldErrors.email
                      ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                      : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-[11px] text-rose-600 font-medium">
                  {fieldErrors.email}
                </p>
              )}
            </div>
          </div>

          <div className="max-w-xs">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Joining Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar
                size={16}
                className="absolute left-3 top-2.5 text-slate-400"
              />
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => {
                  setJoiningDate(e.target.value);
                  if (fieldErrors.joiningDate) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      joiningDate: undefined,
                    }));
                  }
                }}
                className={`w-full rounded-xl border pl-9 pr-3.5 py-2 text-xs text-slate-800 outline-none transition ${
                  fieldErrors.joiningDate
                    ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                    : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                }`}
              />
            </div>
            {fieldErrors.joiningDate && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium">
                {fieldErrors.joiningDate}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Phone Numbers{" "}
                <span className="text-slate-400 font-normal">
                  (optional, multiple countries supported)
                </span>
              </label>
              <button
                type="button"
                onClick={addPhoneEntry}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
              >
                <Plus size={13} /> Add number
              </button>
            </div>

            <div className="space-y-2.5">
              {phoneEntries.map((entry, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2.5"
                >
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                    <select
                      value={entry.countryCode}
                      onChange={(e) => {
                        const country = countryOption(e.target.value);
                        updatePhoneEntry(index, {
                          countryCode: country.code,
                          dialCode: country.dialCode,
                        });
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {COUNTRY_OPTIONS.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name} ({country.dialCode})
                        </option>
                      ))}
                    </select>

                    <div className="relative">
                      <Phone
                        size={14}
                        className="absolute left-3 top-2.5 text-slate-400"
                      />
                      <input
                        type="tel"
                        value={entry.number}
                        onChange={(e) =>
                          updatePhoneEntry(index, { number: e.target.value })
                        }
                        placeholder="98765 43210"
                        className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <input
                      type="text"
                      value={entry.label ?? ""}
                      onChange={(e) =>
                        updatePhoneEntry(index, { label: e.target.value })
                      }
                      placeholder="Location / label (e.g. Office, WhatsApp)"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <label className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-medium text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(entry.isPrimary)}
                        onChange={() =>
                          setPhoneEntries((prev) =>
                            prev.map((item, i) => ({
                              ...item,
                              isPrimary: i === index,
                            })),
                          )
                        }
                        className="h-3.5 w-3.5 accent-blue-600"
                      />
                      Primary
                    </label>
                    <button
                      type="button"
                      onClick={() => removePhoneEntry(index)}
                      disabled={phoneEntries.length === 1}
                      aria-label={`Remove phone number ${index + 1}`}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {fieldErrors.phones && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium">
                {fieldErrors.phones}
              </p>
            )}
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Role & System Access <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {rolesLoading ? (
                <div className="col-span-full flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 text-xs text-slate-500">
                  <Loader2 size={14} className="animate-spin text-blue-600" />
                  Loading roles…
                </div>
              ) : rolesError ? (
                <div className="col-span-full flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-700">
                  <span>{rolesError}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setRolesError("");
                      setRolesLoading(true);
                      fetchRoles()
                        .then((roles) => {
                          setAvailableRoles(roles);
                          if (!initialUserId && roles.length > 0) {
                            setRoleName(roles[0].name);
                          }
                        })
                        .catch((err: unknown) => {
                          setRolesError(
                            err instanceof Error
                              ? err.message
                              : "Failed to load roles.",
                          );
                        })
                        .finally(() => setRolesLoading(false));
                    }}
                    className="font-semibold underline cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : availableRoles.length === 0 ? (
                <div className="col-span-full rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-700">
                  No roles found. Create one in Employee Management → Roles first.
                </div>
              ) : (
                availableRoles.map((role) => {
                  const config = ROLE_CONFIG[role.name as RoleName];
                  const label = config?.label ?? roleLabel(role.name);
                  const description =
                    config?.description ?? role.description ?? "Custom role";
                  const dotColor = config?.dotColor ?? "bg-slate-400";
                  const isSelected = roleName === role.name;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setRoleName(role.name)}
                      className={`relative flex flex-col text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm"
                          : "border-slate-200 bg-white hover:bg-slate-50/80"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold text-slate-900">
                          {label}
                        </span>
                        {isSelected ? (
                          <CheckCircle2
                            size={15}
                            className="text-blue-600 shrink-0"
                          />
                        ) : (
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${dotColor}`}
                          />
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-500 line-clamp-2">
                        {description}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
            {fieldErrors.role && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium">
                {fieldErrors.role}
              </p>
            )}
          </div>

          {/* Active Status Toggle (For Edit mode) */}
          {!isCreate && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Employee Status
                </p>
                <p className="text-[11px] text-slate-500">
                  {isActive
                    ? "Employee can sign in and access the CRM."
                    : "Employee account is suspended; login attempts are blocked."}
                </p>
                {isSelf && (
                  <p className="text-[10px] text-amber-600 mt-0.5">
                    Note: Deactivating your own account is disabled.
                  </p>
                )}
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                disabled={isSelf}
                onClick={() => setIsActive((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  isActive ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}

          {/* Password Section */}
          {isCreate ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleQuickGenerate}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  <Sparkles size={12} />
                  Generate Strong
                </button>
              </div>

              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-2.5 text-slate-400"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        password: undefined,
                      }));
                    }
                  }}
                  placeholder="Minimum 8 characters"
                  className={`w-full rounded-xl border pl-9 pr-10 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition font-mono ${
                    fieldErrors.password
                      ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                      : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-[11px] text-rose-600 font-medium">
                  {fieldErrors.password}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setEnablePasswordReset((prev) => !prev)}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-50 text-left transition"
              >
                <div className="flex items-center gap-2">
                  <KeyRound size={15} className="text-slate-500" />
                  <span className="text-xs font-semibold text-slate-800">
                    Reset Employee Password
                  </span>
                </div>
                <span className="text-xs font-medium text-blue-600">
                  {enablePasswordReset ? "Cancel reset" : "Change password"}
                </span>
              </button>

              {enablePasswordReset && (
                <div className="p-3.5 border-t border-slate-100 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Enter a new password for this employee:
                    </span>
                    <button
                      type="button"
                      onClick={handleQuickGenerate}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                    >
                      <Sparkles size={11} />
                      Generate
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            password: undefined,
                          }));
                        }
                      }}
                      placeholder="Enter at least 8 characters"
                      className="w-full rounded-lg border border-slate-200 px-3 pr-10 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-[11px] text-rose-600 font-medium">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Boolean(rolesError)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1d61e7] px-5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {isCreate ? "Add Employee" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
