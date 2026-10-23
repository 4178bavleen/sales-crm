import { useState } from "react";
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
} from "lucide-react";
import type {
  CreateUserInput,
  RoleName,
  UserRow,
  UserUpdateValues,
} from "../../types/user";
import { ROLE_CONFIG, roleNames } from "../../lib/users";

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
  const [phone, setPhone] = useState(initialUser?.phone ?? "");
  const [roleName, setRoleName] = useState<RoleName>(
    (initialUser?.role?.name as RoleName) ?? "SALES_EMPLOYEE",
  );
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
  }>({});

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
    try {
      if (isCreate) {
        if (!onSubmitCreate) return;
        await onSubmitCreate({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim() ? phone.trim() : undefined,
          roleName,
        });
      } else {
        if (!onSubmitEdit || !initialUser) return;
        const payload: UserUpdateValues = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() ? phone.trim() : null,
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
                {isCreate ? "Add New Team Member" : "Edit User Account"}
              </h2>
              <p className="text-xs text-slate-500">
                {isCreate
                  ? "Set up account credentials and workspace permissions."
                  : `Updating profile details for ${initialUser?.name || "user"}.`}
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

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Phone Number <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Phone
                size={16}
                className="absolute left-3 top-2.5 text-slate-400"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 234-5678"
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Role & System Access <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {roleNames.map((nameKey: RoleName) => {
                const config = ROLE_CONFIG[nameKey];
                const isSelected = roleName === nameKey;
                return (
                  <button
                    key={nameKey}
                    type="button"
                    onClick={() => setRoleName(nameKey)}
                    className={`relative flex flex-col text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm"
                        : "border-slate-200 bg-white hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-bold text-slate-900">
                        {config.label}
                      </span>
                      {isSelected ? (
                        <CheckCircle2
                          size={15}
                          className="text-blue-600 shrink-0"
                        />
                      ) : (
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${config.dotColor}`}
                        />
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-500 line-clamp-2">
                      {config.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Status Toggle (For Edit mode) */}
          {!isCreate && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Account Status
                </p>
                <p className="text-[11px] text-slate-500">
                  {isActive
                    ? "User can sign in and access the CRM."
                    : "User account is suspended; login attempts are blocked."}
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
                    Reset User Password
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
                      Enter a new password for this user:
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
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1d61e7] px-5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {isCreate ? "Create Account" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
