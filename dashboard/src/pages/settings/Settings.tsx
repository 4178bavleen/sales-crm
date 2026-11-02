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
  MessageSquare,
  Smartphone,
  KeyRound,
  FileCode,
} from "lucide-react";
import { request, ApiError } from "../../lib/api";
import { ENDPOINTS } from "../../lib/endpoints";
import { getSession } from "../../lib/auth";

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

type WhatsAppSettingsState = {
  id: number;
  phoneNumberId: string;
  wabaId: string;
  accessToken?: string;
  hasAccessToken: boolean;
  templateName: string;
  templateLanguage: string;
  isEnabled: boolean;
  notifyDeals: boolean;
  notifyDocuments: boolean;
  notifyTargets: boolean;
  notifyFollowUps: boolean;
  updatedAt?: string;
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState<"email" | "whatsapp">("email");

  // Email (SMTP) State
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailTesting, setEmailTesting] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [emailTestFeedback, setEmailTestFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState("");

  const [emailForm, setEmailForm] = useState<EmailSettingsState>({
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

  // WhatsApp (Meta Cloud API) State
  const [whatsAppLoading, setWhatsAppLoading] = useState(true);
  const [whatsAppSaving, setWhatsAppSaving] = useState(false);
  const [whatsAppTesting, setWhatsAppTesting] = useState(false);
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [whatsAppFeedback, setWhatsAppFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [whatsAppTestFeedback, setWhatsAppTestFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");

  const [whatsAppForm, setWhatsAppForm] = useState<WhatsAppSettingsState>({
    id: 1,
    phoneNumberId: "",
    wabaId: "",
    accessToken: "",
    hasAccessToken: false,
    templateName: "crm_alert_notification",
    templateLanguage: "en_US",
    isEnabled: false,
    notifyDeals: true,
    notifyDocuments: true,
    notifyTargets: true,
    notifyFollowUps: true,
  });

  // Load Email Settings
  useEffect(() => {
    async function loadEmailSettings() {
      const token = getSession()?.token;
      if (!token) return;

      try {
        setEmailLoading(true);
        setEmailFeedback(null);
        const res = await request<any>(ENDPOINTS.settings.email, { token });

        const data: EmailSettingsState | undefined = res?.data ?? res;
        if (data && typeof data === "object") {
          setEmailForm((prev) => ({
            ...prev,
            ...data,
            smtpPass: "",
          }));
        }
      } catch (err: any) {
        setEmailFeedback({
          type: "error",
          message: err instanceof ApiError ? err.message : "Failed to load email settings.",
        });
      } finally {
        setEmailLoading(false);
      }
    }

    loadEmailSettings();
  }, []);

  // Load WhatsApp Settings
  useEffect(() => {
    async function loadWhatsAppSettings() {
      const token = getSession()?.token;
      if (!token) return;

      try {
        setWhatsAppLoading(true);
        setWhatsAppFeedback(null);
        const res = await request<any>(ENDPOINTS.settings.whatsapp, { token });

        const data: WhatsAppSettingsState | undefined = res?.data ?? res;
        if (data && typeof data === "object") {
          setWhatsAppForm((prev) => ({
            ...prev,
            ...data,
            accessToken: "",
          }));
        }
      } catch (err: any) {
        setWhatsAppFeedback({
          type: "error",
          message: err instanceof ApiError ? err.message : "Failed to load WhatsApp settings.",
        });
      } finally {
        setWhatsAppLoading(false);
      }
    }

    loadWhatsAppSettings();
  }, []);

  // Handle Save Email Settings
  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getSession()?.token;
    if (!token) return;

    try {
      setEmailSaving(true);
      setEmailFeedback(null);

      const payload: any = {
        smtpHost: emailForm.smtpHost,
        smtpPort: Number(emailForm.smtpPort),
        smtpSecure: emailForm.smtpSecure,
        smtpUser: emailForm.smtpUser,
        fromEmail: emailForm.fromEmail,
        fromName: emailForm.fromName,
        isEnabled: emailForm.isEnabled,
        notifyDeals: emailForm.notifyDeals,
        notifyDocuments: emailForm.notifyDocuments,
        notifyTargets: emailForm.notifyTargets,
        notifyFollowUps: emailForm.notifyFollowUps,
      };

      if (emailForm.smtpPass && emailForm.smtpPass.trim().length > 0) {
        payload.smtpPass = emailForm.smtpPass.trim();
      }

      const res = await request<any>(ENDPOINTS.settings.email, {
        method: "PUT",
        token,
        body: payload,
      });

      const data: EmailSettingsState | undefined = res?.data ?? res;
      if (data && typeof data === "object") {
        setEmailForm((prev) => ({
          ...prev,
          ...data,
          smtpPass: "",
        }));
      }

      setEmailFeedback({
        type: "success",
        message: "SMTP configuration and alert preferences saved successfully!",
      });
    } catch (err: any) {
      setEmailFeedback({
        type: "error",
        message: err instanceof ApiError ? err.message : "Failed to save email settings.",
      });
    } finally {
      setEmailSaving(false);
    }
  };

  // Handle Test Email
  const handleTestEmail = async () => {
    const token = getSession()?.token;
    if (!token) return;

    if (!testEmailAddress || !testEmailAddress.includes("@")) {
      setEmailTestFeedback({
        type: "error",
        message: "Please enter a valid recipient email address for the test.",
      });
      return;
    }

    try {
      setEmailTesting(true);
      setEmailTestFeedback(null);

      const res = await request<any>(ENDPOINTS.settings.testEmail, {
        method: "POST",
        token,
        body: { targetEmail: testEmailAddress.trim() },
      });

      setEmailTestFeedback({
        type: "success",
        message: res?.message || `Test email dispatched to ${testEmailAddress}! Check your inbox.`,
      });
    } catch (err: any) {
      setEmailTestFeedback({
        type: "error",
        message: err instanceof ApiError ? err.message : "SMTP test failed. Check host, port, or password.",
      });
    } finally {
      setEmailTesting(false);
    }
  };

  // Handle Save WhatsApp Settings
  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getSession()?.token;
    if (!token) return;

    try {
      setWhatsAppSaving(true);
      setWhatsAppFeedback(null);

      const payload: any = {
        phoneNumberId: whatsAppForm.phoneNumberId,
        wabaId: whatsAppForm.wabaId,
        templateName: whatsAppForm.templateName,
        templateLanguage: whatsAppForm.templateLanguage,
        isEnabled: whatsAppForm.isEnabled,
        notifyDeals: whatsAppForm.notifyDeals,
        notifyDocuments: whatsAppForm.notifyDocuments,
        notifyTargets: whatsAppForm.notifyTargets,
        notifyFollowUps: whatsAppForm.notifyFollowUps,
      };

      if (whatsAppForm.accessToken && whatsAppForm.accessToken.trim().length > 0) {
        payload.accessToken = whatsAppForm.accessToken.trim();
      }

      const res = await request<any>(ENDPOINTS.settings.whatsapp, {
        method: "PUT",
        token,
        body: payload,
      });

      const data: WhatsAppSettingsState | undefined = res?.data ?? res;
      if (data && typeof data === "object") {
        setWhatsAppForm((prev) => ({
          ...prev,
          ...data,
          accessToken: "",
        }));
      }

      setWhatsAppFeedback({
        type: "success",
        message: "WhatsApp Cloud API settings and notification preferences saved successfully!",
      });
    } catch (err: any) {
      setWhatsAppFeedback({
        type: "error",
        message: err instanceof ApiError ? err.message : "Failed to save WhatsApp settings.",
      });
    } finally {
      setWhatsAppSaving(false);
    }
  };

  // Handle Test WhatsApp
  const handleTestWhatsApp = async () => {
    const token = getSession()?.token;
    if (!token) return;

    const cleaned = testPhoneNumber.replace(/[^0-9]/g, "");
    if (!cleaned || cleaned.length < 8) {
      setWhatsAppTestFeedback({
        type: "error",
        message: "Please enter a valid phone number with country code (e.g., 919876543210).",
      });
      return;
    }

    try {
      setWhatsAppTesting(true);
      setWhatsAppTestFeedback(null);

      const res = await request<any>(ENDPOINTS.settings.testWhatsapp, {
        method: "POST",
        token,
        body: { targetPhone: cleaned },
      });

      setWhatsAppTestFeedback({
        type: "success",
        message: res?.message || `Test message dispatched to +${cleaned}! Check WhatsApp.`,
      });
    } catch (err: any) {
      setWhatsAppTestFeedback({
        type: "error",
        message: err instanceof ApiError ? err.message : "WhatsApp test failed. Check Phone Number ID or Token.",
      });
    } finally {
      setWhatsAppTesting(false);
    }
  };

  const isLoading = emailLoading || whatsAppLoading;

  if (isLoading) {
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
    <div className="space-y-6">
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
          Configure dynamic notification channels (Email SMTP & Official Meta WhatsApp) and alert preferences.
        </p>
      </div>

      {/* Channel Switcher Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("email")}
          className={`flex items-center gap-2.5 pb-3.5 px-3 text-sm font-semibold transition border-b-2 cursor-pointer ${
            activeTab === "email"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Mail size={18} />
          <span>Email Alerts (SMTP)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("whatsapp")}
          className={`flex items-center gap-2.5 pb-3.5 px-3 text-sm font-semibold transition border-b-2 cursor-pointer ${
            activeTab === "whatsapp"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <MessageSquare size={18} />
          <span>WhatsApp Alerts (Meta Cloud API)</span>
        </button>
      </div>

      {/* TAB 1: EMAIL (SMTP) */}
      {activeTab === "email" && (
        <div className="space-y-6">
          {emailFeedback && (
            <div
              className={`flex items-start gap-3 rounded-xl p-4 text-sm font-medium border ${
                emailFeedback.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              {emailFeedback.type === "success" ? (
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" />
              )}
              <div className="flex-1">{emailFeedback.message}</div>
            </div>
          )}

          <form onSubmit={handleSaveEmail} className="space-y-6">
            {/* Master Switch */}
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
                    checked={emailForm.isEnabled}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, isEnabled: e.target.checked }))}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-focus:outline-none"></div>
                  <span className="ml-3 text-sm font-semibold text-slate-800">
                    {emailForm.isEnabled ? "Active" : "Disabled"}
                  </span>
                </label>
              </div>
            </div>

            {/* SMTP Server Credentials */}
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
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    SMTP Server Host <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. smtp.gmail.com or smtp.sendgrid.net"
                    value={emailForm.smtpHost}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, smtpHost: e.target.value }))}
                    required={emailForm.isEnabled}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Port <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="587 or 465"
                      value={emailForm.smtpPort}
                      onChange={(e) => setEmailForm((prev) => ({ ...prev, smtpPort: Number(e.target.value) }))}
                      required={emailForm.isEnabled}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Security
                    </label>
                    <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 cursor-pointer h-[42px]">
                      <input
                        type="checkbox"
                        checked={emailForm.smtpSecure}
                        onChange={(e) => setEmailForm((prev) => ({ ...prev, smtpSecure: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-medium">SSL (Port 465)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    SMTP Username / Login
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. notifications@company.com"
                    value={emailForm.smtpUser}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, smtpUser: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      SMTP Password / App Password
                    </label>
                    {emailForm.hasPassword && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                        <ShieldCheck size={13} />
                        Password Configured
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showEmailPassword ? "text" : "password"}
                      placeholder={emailForm.hasPassword ? "••••••••••••  (Leave blank to keep current)" : "Enter password or App Password"}
                      value={emailForm.smtpPass || ""}
                      onChange={(e) => setEmailForm((prev) => ({ ...prev, smtpPass: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 pr-10 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmailPassword(!showEmailPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showEmailPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Sender From Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sales CRM Notifications"
                    value={emailForm.fromName}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, fromName: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Sender From Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. noreply@company.com"
                    value={emailForm.fromEmail}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, fromEmail: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Event Category Toggles */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <BellRing size={18} className="text-slate-600" />
                  Email Alert Triggers
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select which business events trigger automated outbound emails.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5 hover:bg-slate-50/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailForm.notifyDeals}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, notifyDeals: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Deals & Pipelines</p>
                    <p className="text-xs text-slate-500">Alerts when deals are won, lost, or moved to a new stage.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5 hover:bg-slate-50/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailForm.notifyDocuments}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, notifyDocuments: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Documents & Contracts</p>
                    <p className="text-xs text-slate-500">Alerts when new files or versions are attached.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5 hover:bg-slate-50/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailForm.notifyTargets}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, notifyTargets: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Sales Targets</p>
                    <p className="text-xs text-slate-500">Alerts when reps reach target milestones.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5 hover:bg-slate-50/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailForm.notifyFollowUps}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, notifyFollowUps: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Follow-ups & Tasks</p>
                    <p className="text-xs text-slate-500">Alerts when scheduled follow-ups and calls are due today.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={emailSaving}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
              >
                {emailSaving ? <RotateCw size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Save Email Settings</span>
              </button>
            </div>
          </form>

          {/* Test SMTP Delivery */}
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

            {emailTestFeedback && (
              <div
                className={`flex items-start gap-3 rounded-xl p-3.5 text-xs font-medium border ${
                  emailTestFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                }`}
              >
                {emailTestFeedback.type === "success" ? (
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
                )}
                <div className="flex-1">{emailTestFeedback.message}</div>
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
                disabled={emailTesting || !emailForm.smtpHost}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-40 cursor-pointer"
              >
                {emailTesting ? <RotateCw size={16} className="animate-spin" /> : <Send size={16} />}
                <span>Send Test Email</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WHATSAPP (META CLOUD API) */}
      {activeTab === "whatsapp" && (
        <div className="space-y-6">
          {whatsAppFeedback && (
            <div
              className={`flex items-start gap-3 rounded-xl p-4 text-sm font-medium border ${
                whatsAppFeedback.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              {whatsAppFeedback.type === "success" ? (
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" />
              )}
              <div className="flex-1">{whatsAppFeedback.message}</div>
            </div>
          )}

          <form onSubmit={handleSaveWhatsApp} className="space-y-6">
            {/* Master Switch */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <MessageSquare size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Official Meta WhatsApp Alerts Engine
                    </h3>
                    <p className="text-xs text-slate-500">
                      Dispatches instant WhatsApp template notifications to user mobile numbers via Meta Cloud API.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={whatsAppForm.isEnabled}
                    onChange={(e) => setWhatsAppForm((prev) => ({ ...prev, isEnabled: e.target.checked }))}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-focus:outline-none"></div>
                  <span className="ml-3 text-sm font-semibold text-slate-800">
                    {whatsAppForm.isEnabled ? "Active" : "Disabled"}
                  </span>
                </label>
              </div>
            </div>

            {/* Meta Cloud API Credentials */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Smartphone size={18} className="text-slate-600" />
                  Meta WhatsApp Cloud API Configuration
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Obtain these credentials from your Meta for Developers dashboard under WhatsApp &gt; API Setup.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phone Number ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 109283746592837"
                    value={whatsAppForm.phoneNumberId}
                    onChange={(e) => setWhatsAppForm((prev) => ({ ...prev, phoneNumberId: e.target.value }))}
                    required={whatsAppForm.isEnabled}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none font-mono text-xs"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Found in Meta App Dashboard &gt; WhatsApp &gt; API Setup &gt; Phone number ID</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    WhatsApp Business Account ID (WABA ID)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 982736451029384"
                    value={whatsAppForm.wabaId}
                    onChange={(e) => setWhatsAppForm((prev) => ({ ...prev, wabaId: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none font-mono text-xs"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Your Meta Business Account ID linked to the number</p>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      System User Permanent Access Token <span className="text-rose-500">*</span>
                    </label>
                    {whatsAppForm.hasAccessToken && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                        <KeyRound size={13} />
                        Token Saved
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showAccessToken ? "text" : "password"}
                      placeholder={whatsAppForm.hasAccessToken ? "••••••••••••••••••••••••••••••••••••••••  (Leave blank to keep current)" : "EAAx... (Permanent System User Token)"}
                      value={whatsAppForm.accessToken || ""}
                      onChange={(e) => setWhatsAppForm((prev) => ({ ...prev, accessToken: e.target.value }))}
                      required={whatsAppForm.isEnabled && !whatsAppForm.hasAccessToken}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 pr-10 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAccessToken(!showAccessToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showAccessToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Generate in Meta Business Settings &gt; System Users &gt; Generate Token with <code>whatsapp_business_messaging</code></p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FileCode size={14} className="text-slate-500" />
                    Meta Template Name
                  </label>
                  <input
                    type="text"
                    placeholder="crm_alert_notification"
                    value={whatsAppForm.templateName}
                    onChange={(e) => setWhatsAppForm((prev) => ({ ...prev, templateName: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none font-mono text-xs"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Approved Meta template name (Utility category recommended)</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Template Language Code
                  </label>
                  <input
                    type="text"
                    placeholder="en_US"
                    value={whatsAppForm.templateLanguage}
                    onChange={(e) => setWhatsAppForm((prev) => ({ ...prev, templateLanguage: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none font-mono text-xs"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Language code in Meta (e.g. <code>en_US</code>, <code>en_GB</code>, <code>es_LA</code>)</p>
                </div>
              </div>
            </div>

            {/* Event Category Toggles */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <BellRing size={18} className="text-slate-600" />
                  WhatsApp Alert Triggers
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select which business events automatically send WhatsApp notifications to users' mobile numbers.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5 hover:bg-slate-50/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsAppForm.notifyDeals}
                    onChange={(e) => setWhatsAppForm((prev) => ({ ...prev, notifyDeals: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Deals & Pipelines</p>
                    <p className="text-xs text-slate-500">Alerts when deals are won, lost, or moved to a new stage.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5 hover:bg-slate-50/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsAppForm.notifyDocuments}
                    onChange={(e) => setWhatsAppForm((prev) => ({ ...prev, notifyDocuments: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Documents & Quotes</p>
                    <p className="text-xs text-slate-500">Alerts when new files or versions are uploaded.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5 hover:bg-slate-50/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsAppForm.notifyTargets}
                    onChange={(e) => setWhatsAppForm((prev) => ({ ...prev, notifyTargets: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Sales Targets</p>
                    <p className="text-xs text-slate-500">Alerts when sales targets reach key thresholds.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5 hover:bg-slate-50/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsAppForm.notifyFollowUps}
                    onChange={(e) => setWhatsAppForm((prev) => ({ ...prev, notifyFollowUps: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Follow-ups & Tasks</p>
                    <p className="text-xs text-slate-500">Alerts when scheduled follow-ups and calls are due today.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={whatsAppSaving}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
              >
                {whatsAppSaving ? <RotateCw size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Save WhatsApp Settings</span>
              </button>
            </div>
          </form>

          {/* Test WhatsApp Delivery */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Send size={18} className="text-slate-600" />
                Test WhatsApp Cloud API Delivery
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Send a live test message to your personal mobile number (include country code without '+', e.g. <code>919876543210</code> or <code>15551234567</code>).
              </p>
            </div>

            {whatsAppTestFeedback && (
              <div
                className={`flex items-start gap-3 rounded-xl p-3.5 text-xs font-medium border ${
                  whatsAppTestFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                }`}
              >
                {whatsAppTestFeedback.type === "success" ? (
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
                )}
                <div className="flex-1">{whatsAppTestFeedback.message}</div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="e.g. 919876543210 (with country code)"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleTestWhatsApp}
                disabled={whatsAppTesting || !whatsAppForm.phoneNumberId}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-40 cursor-pointer"
              >
                {whatsAppTesting ? <RotateCw size={16} className="animate-spin" /> : <Send size={16} />}
                <span>Send Test WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
