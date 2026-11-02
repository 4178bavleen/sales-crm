import React, { useState, useEffect } from "react";
import {
  Mail,
  Server,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Save,
  RotateCw,
  Eye,
  EyeOff,
  BellRing,
} from "lucide-react";
import { request, ApiError } from "../../lib/api";
import { ENDPOINTS } from "../../lib/endpoints";
import { getSession } from "../../lib/auth";
import { useSession } from "../../lib/useSession";

type EmailSettingsState = {
  id: number;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass?: string;
  hasPassword: boolean;
  fromEmail: string;
  fromName: string;
  isEnabled: boolean;
  notifyDeals: boolean;
  notifyDocuments: boolean;
  notifyTargets: boolean;
  notifyFollowUps: boolean;
  updatedAt?: string;
};

export default function Settings() {
  const session = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [testFeedback, setTestFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState("");

  const [form, setForm] = useState<EmailSettingsState>({
    id: 1,
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "",
    smtpPass: "",
    hasPassword: false,
    fromEmail: "",
    fromName: "Sales CRM",
    isEnabled: false,
    notifyDeals: true,
    notifyDocuments: true,
    notifyTargets: true,
    notifyFollowUps: true,
  });

  // Load existing SMTP settings
  useEffect(() => {
    async function loadSettings() {
      const token = getSession()?.token;
      if (!token) return;

      try {
        setLoading(true);
        setFeedback(null);
        const res = await request<any>(
          ENDPOINTS.settings.email,
          { token }
        );

        const data: EmailSettingsState | undefined = res?.data ?? res;
        if (data && typeof data === "object") {
          setForm((prev) => ({
            ...prev,
            ...data,
            smtpPass: "", // keep empty so user can choose to change it or keep existing
          }));
        }
      } catch (err: any) {
        setFeedback({
          type: "error",
          message: err instanceof ApiError ? err.message : "Failed to load email settings.",
        });
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  // Pre-fill test email with current user's email once available
  useEffect(() => {
    if (session?.user.email && !testEmailAddress) {
      setTestEmailAddress(session.user.email);
    }
  }, [session, testEmailAddress]);

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getSession()?.token;
    if (!token) return;

    try {
      setSaving(true);
      setFeedback(null);

      const payload: any = {
        smtpHost: form.smtpHost,
        smtpPort: Number(form.smtpPort),
        smtpSecure: form.smtpSecure,
        smtpUser: form.smtpUser,
        fromEmail: form.fromEmail,
        fromName: form.fromName,
        isEnabled: form.isEnabled,
        notifyDeals: form.notifyDeals,
        notifyDocuments: form.notifyDocuments,
        notifyTargets: form.notifyTargets,
        notifyFollowUps: form.notifyFollowUps,
      };

      // Only send password if user entered a new one
      if (form.smtpPass && form.smtpPass.trim().length > 0) {
        payload.smtpPass = form.smtpPass.trim();
      }

      const res = await request<any>(
        ENDPOINTS.settings.email,
        {
          method: "PUT",
          token,
          body: payload,
        }
      );

      const data: EmailSettingsState | undefined = res?.data ?? res;
      if (data && typeof data === "object") {
        setForm((prev) => ({
          ...prev,
          ...data,
          smtpPass: "",
        }));
      }

      setFeedback({
        type: "success",
        message: "SMTP configuration and alert preferences saved successfully!",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err instanceof ApiError ? err.message : "Failed to save email settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle Send Test Email
  const handleTestEmail = async () => {
    const token = getSession()?.token;
    if (!token) return;

    if (!testEmailAddress || !testEmailAddress.includes("@")) {
      setTestFeedback({
        type: "error",
        message: "Please enter a valid recipient email address for the test.",
      });
      return;
    }

    try {
      setTesting(true);
      setTestFeedback(null);

      const res = await request<any>(
        ENDPOINTS.settings.testEmail,
        {
          method: "POST",
          token,
          body: { targetEmail: testEmailAddress.trim() },
        }
      );

      setTestFeedback({
        type: "success",
        message: res?.message || `Test email dispatched to ${testEmailAddress}! Check your inbox.`,
      });
    } catch (err: any) {
      setTestFeedback({
        type: "error",
        message: err instanceof ApiError ? err.message : "SMTP test failed. Check host, port, or password.",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RotateCw size={28} className="animate-spin text-blue-600" />
          <p className="text-sm font-medium">Loading system settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System Settings
          </h1>
          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
            Admin
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Configure dynamic SMTP server credentials and email notification preferences without touching server environment files.
        </p>
      </div>

      {/* Main Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-start gap-3 rounded-xl p-4 text-sm font-medium border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" />
          )}
          <div className="flex-1">{feedback.message}</div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Master Email Switch */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Mail size={22} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Email Notifications Engine
                </h3>
                <p className="text-xs text-slate-500">
                  When enabled, all CRM alerts will also dispatch email copies directly to assigned users.
                </p>
              </div>
            </div>

            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={form.isEnabled}
                onChange={(e) => setForm((prev) => ({ ...prev, isEnabled: e.target.checked }))}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-focus:outline-none"></div>
              <span className="ml-3 text-sm font-semibold text-slate-800">
                {form.isEnabled ? "Active" : "Disabled"}
              </span>
            </label>
          </div>
        </div>

        {/* Section 2: SMTP Connection Credentials */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Server size={18} className="text-slate-600" />
              Dynamic SMTP Server Credentials
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify your outbound mail server details (Gmail, SendGrid, Amazon SES, Brevo, or custom SMTP).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* SMTP Host */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                SMTP Server Host <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. smtp.gmail.com or smtp.sendgrid.net"
                value={form.smtpHost}
                onChange={(e) => setForm((prev) => ({ ...prev, smtpHost: e.target.value }))}
                required={form.isEnabled}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>

            {/* SMTP Port & Secure Checkbox */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Port <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="587"
                  value={form.smtpPort}
                  onChange={(e) => setForm((prev) => ({ ...prev, smtpPort: parseInt(e.target.value, 10) || 587 }))}
                  required={form.isEnabled}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Encryption
                </label>
                <div className="flex h-[42px] items-center gap-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.smtpSecure}
                      onChange={(e) => setForm((prev) => ({ ...prev, smtpSecure: e.target.checked }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>SSL (Port 465)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* SMTP Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                SMTP Username / Account Email
              </label>
              <input
                type="text"
                placeholder="e.g. notifications@yourdomain.com"
                value={form.smtpUser}
                onChange={(e) => setForm((prev) => ({ ...prev, smtpUser: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>

            {/* SMTP Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  SMTP Password / App Key
                </label>
                {form.hasPassword && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <ShieldCheck size={13} />
                    Password configured
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={form.hasPassword ? "•••••••••••• (Leave blank to keep existing)" : "Enter password or app-password"}
                  value={form.smtpPass || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, smtpPass: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 pr-10 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* From Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Sender "From" Email
              </label>
              <input
                type="email"
                placeholder="e.g. crm-alerts@yourcompany.com"
                value={form.fromEmail}
                onChange={(e) => setForm((prev) => ({ ...prev, fromEmail: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>

            {/* From Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Sender Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. Vibrantick Sales CRM"
                value={form.fromName}
                onChange={(e) => setForm((prev) => ({ ...prev, fromName: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Module Notification Category Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <BellRing size={18} className="text-slate-600" />
              Module Email Trigger Preferences
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select which CRM modules automatically trigger an outbound email copy when a notification fires.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <label className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5 hover:bg-slate-50/60 cursor-pointer">
              <input
                type="checkbox"
                checked={form.notifyDeals}
                onChange={(e) => setForm((prev) => ({ ...prev, notifyDeals: e.target.checked }))}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-semibold text-slate-800">Deals & Pipeline</p>
                <p className="text-xs text-slate-500">Alerts when deals move stages, are won 🎉, or marked lost.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5 hover:bg-slate-50/60 cursor-pointer">
              <input
                type="checkbox"
                checked={form.notifyDocuments}
                onChange={(e) => setForm((prev) => ({ ...prev, notifyDocuments: e.target.checked }))}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-semibold text-slate-800">Documents & Contracts</p>
                <p className="text-xs text-slate-500">Alerts when new files or versions are attached to assigned records.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5 hover:bg-slate-50/60 cursor-pointer">
              <input
                type="checkbox"
                checked={form.notifyTargets}
                onChange={(e) => setForm((prev) => ({ ...prev, notifyTargets: e.target.checked }))}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-semibold text-slate-800">Sales Targets</p>
                <p className="text-xs text-slate-500">Alerts when reps reach 50%, 80%, or 100% of their monthly quotas.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5 hover:bg-slate-50/60 cursor-pointer">
              <input
                type="checkbox"
                checked={form.notifyFollowUps}
                onChange={(e) => setForm((prev) => ({ ...prev, notifyFollowUps: e.target.checked }))}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-semibold text-slate-800">Follow-ups & Daily Calls</p>
                <p className="text-xs text-slate-500">Alerts when scheduled follow-ups and calls are due today.</p>
              </div>
            </label>
          </div>
        </div>

        {/* Action Button: Save Settings */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? <RotateCw size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Save Settings</span>
          </button>
        </div>
      </form>

      {/* Section 4: Live Test Connection & Diagnostics */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Send size={18} className="text-slate-600" />
            Test SMTP Delivery
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Send an instant test email using the currently saved SMTP configuration to ensure delivery succeeds.
          </p>
        </div>

        {testFeedback && (
          <div
            className={`flex items-start gap-3 rounded-xl p-3.5 text-xs font-medium border ${
              testFeedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            {testFeedback.type === "success" ? (
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
            )}
            <div className="flex-1">{testFeedback.message}</div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <input
              type="email"
              placeholder="recipient@example.com"
              value={testEmailAddress}
              onChange={(e) => setTestEmailAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleTestEmail}
            disabled={testing || !form.smtpHost}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-40 cursor-pointer"
          >
            {testing ? <RotateCw size={16} className="animate-spin" /> : <Send size={16} />}
            <span>Send Test Email</span>
          </button>
        </div>
      </div>
    </div>
  );
}
