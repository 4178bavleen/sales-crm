import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  Clock,
  Globe,
  Mail,
  Phone,
  Plus,
  Sparkles,
  User,
  UserCheck,
  X,
} from "lucide-react";
import type { LeadStatus, Priority } from "../../types/lead";
import type { CreateLeadFormProps } from "../../types/createLeadForm";
import { getSession } from "../../lib/auth";
import { fetchLeadOptions } from "../../lib/leads";

interface SourceOption {
  id: number;
  name: string;
  icon: string;
}

interface OwnerOption {
  id: number;
  name: string;
  role: string;
  initials: string;
}

const STATUSES: { value: LeadStatus; label: string; badgeClass: string; dotClass: string }[] = [
  {
    value: "NEW",
    label: "New",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-300",
    dotClass: "bg-blue-600",
  },
  {
    value: "CONTACTED",
    label: "Contacted",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-300",
    dotClass: "bg-purple-600",
  },
  {
    value: "QUALIFIED",
    label: "Qualified",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300",
    dotClass: "bg-amber-600",
  },
  {
    value: "CONVERTED",
    label: "Converted",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300",
    dotClass: "bg-emerald-600",
  },
];

const PRIORITIES: { value: Priority; label: string; dotClass: string }[] = [
  { value: "LOW", label: "Low", dotClass: "bg-slate-400" },
  { value: "MEDIUM", label: "Medium", dotClass: "bg-blue-500" },
  { value: "HIGH", label: "High", dotClass: "bg-amber-500" },
  { value: "URGENT", label: "Urgent", dotClass: "bg-rose-500" },
];

export default function CreateLeadModal({ onClose, onCreate }: CreateLeadFormProps) {
  const sessionUser = getSession()?.user;
  const defaultOwner = sessionUser?.name || "admin";

  const [sources, setSources] = useState<SourceOption[]>([]);
  const [owners, setOwners] = useState<OwnerOption[]>([]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState<LeadStatus>("NEW");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [owner, setOwner] = useState(defaultOwner);
  const [notes, setNotes] = useState("");
  const [isNoFollowUp, setIsNoFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Fetch dynamic sources and owners from backend
  useEffect(() => {
    let cancelled = false;
    fetchLeadOptions()
      .then(data => {
        if (cancelled) return;
        if (data.sources && data.sources.length > 0) {
          const iconMap: Record<string, string> = {
            website: "🌐",
            referral: "🤝",
            linkedin: "💼",
            google: "📢",
            cold: "📞",
            webinar: "🎓",
          };
          const mappedSources: SourceOption[] = data.sources.map(s => {
            const lower = s.name.toLowerCase();
            const matchedKey = Object.keys(iconMap).find(k => lower.includes(k));
            return {
              id: s.id,
              name: s.name,
              icon: matchedKey ? iconMap[matchedKey] : "📌",
            };
          });
          setSources(mappedSources);
          setSource(prev => prev || mappedSources[0]?.name || "");
        }

        if (data.owners && data.owners.length > 0) {
          const mappedOwners = data.owners.map(u => ({
            id: u.id,
            name: u.name,
            role: u.name === "admin" ? "Administrator" : "Sales Representative",
            initials:
              u.name
                .split(" ")
                .map(p => p[0] || "")
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase() || "US",
          }));
          mappedOwners.push({ id: 0, name: "Unassigned", role: "Queue", initials: "UN" });
          setOwners(mappedOwners);
        }
      })
      .catch(err => {
        console.warn("Could not load backend options, using fallback:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Validation according to backend createLeadSchema
  const trimmedFirst = firstName.trim();
  const trimmedLast = lastName.trim();
  const contactName = `${trimmedFirst} ${trimmedLast}`.trim();
  const nameInvalid = contactName.length < 2;
  const emailInvalid = !!email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const followUpInvalid = !isNoFollowUp && !followUpDate;

  function setQuickFollowUp(days: number) {
    setIsNoFollowUp(false);
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(10, 0, 0, 0);
    // Format to YYYY-MM-DDTHH:mm for datetime-local input
    const pad = (n: number) => String(n).padStart(2, "0");
    const val = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    setFollowUpDate(val);
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setShowErrors(true);
    setBackendError(null);
    if (nameInvalid || emailInvalid || followUpInvalid) return;

    setIsSubmitting(true);
    try {
      await onCreate({
        id: Date.now(),
        firstName: trimmedFirst,
        lastName: trimmedLast,
        company: company.trim(),
        email: email.trim(),
        phone: phone.trim(),
        source,
        owner,
        status,
        priority,
        createdAt: new Date().toISOString().slice(0, 10),
        notes: notes.trim() || undefined,
        nextFollowUpAt: isNoFollowUp ? undefined : followUpDate || undefined,
        noFollowUp: isNoFollowUp,
      });
    } catch (err) {
      setBackendError(err instanceof Error ? err.message : "Failed to create lead. Please check your inputs.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const initials = `${(trimmedFirst[0] || "N").toUpperCase()}${(trimmedLast[0] || "L").toUpperCase()}`;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-200">
      {/* Top Header matching Leads page */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            title="Back to leads list"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Leads</span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-medium text-[#1d61e7]">Create Lead</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Create Lead
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              Add a new prospect to your sales pipeline and assign an owner
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
          >
            <X size={14} className="text-slate-500" />
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
          >
            <Plus size={15} />
            {isSubmitting ? "Creating Lead..." : "Create Lead"}
          </button>
        </div>
      </div>

      {backendError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 shadow-2xs">
          <p className="font-semibold">{backendError}</p>
        </div>
      )}

      {showErrors && (nameInvalid || emailInvalid || followUpInvalid) && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 shadow-2xs">
          <p className="font-semibold mb-1">Please correct the following before saving:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {nameInvalid && <li>Contact Name must be at least 2 characters long (first and last name).</li>}
            {emailInvalid && <li>Please enter a valid email address.</li>}
            {followUpInvalid && <li>Please select a next follow-up date or choose "No follow-up needed".</li>}
          </ul>
        </div>
      )}

      {/* Main Form Grid */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6" noValidate>
        {/* Left 2 Columns: Contact, Product & Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1d61e7]">
                <User size={19} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Contact Information</h2>
                <p className="text-xs text-slate-500">Primary prospect details and company association</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="e.g. Sarah"
                    className={`w-full rounded-lg border bg-white py-2 px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 ${
                      showErrors && !trimmedFirst ? "border-rose-300 bg-rose-50/20" : "border-slate-200"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="e.g. Jenkins"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="sarah.jenkins@company.com"
                    className={`w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 ${
                      showErrors && emailInvalid ? "border-rose-300 bg-rose-50/20" : "border-slate-200"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (555) 234-5678"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Company Name
                </label>
                <div className="relative">
                  <Building2 size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    placeholder="e.g. Apex Global Technologies"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Lead Source Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Sparkles size={19} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Lead Source</h2>
                <p className="text-xs text-slate-500">Acquisition channel according to schema</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2.5">
                Lead Source
              </label>
              <div className="flex flex-wrap gap-2">
                {sources.map(s => {
                  const isSelected = source === s.name;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSource(s.name)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                        isSelected
                          ? "border-blue-600 bg-blue-50 text-blue-700 shadow-2xs"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{s.icon}</span>
                      <span>{s.name}</span>
                      {isSelected && <Check size={12} className="text-blue-600 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Notes Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Globe size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Notes & Deal Context</h2>
                <p className="text-xs text-slate-500">Record conversation insights, specific pain points or next actions</p>
              </div>
            </div>

            <div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                placeholder="Add notes about prospect needs, budget estimates, timeline, or key decision makers..."
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 resize-y"
              />
            </div>
          </div>
        </div>

        {/* Right 1 Column: Pipeline Status, Assignment, Follow-up & Live Preview */}
        <div className="space-y-6">
          {/* Pipeline & Priority Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <UserCheck size={19} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Pipeline & Status</h2>
                <p className="text-xs text-slate-500">Lead state and owner assignment</p>
              </div>
            </div>

            {/* Status Selectable Pills */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Lead Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.map(item => {
                  const isSelected = status === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setStatus(item.value)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? `${item.badgeClass} ring-2 ring-blue-500/20 font-bold`
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${item.dotClass}`} />
                        <span>{item.label}</span>
                      </div>
                      {isSelected && <Check size={13} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Priority
              </label>
              <div className="grid grid-cols-4 gap-1.5 rounded-lg border border-slate-200 bg-slate-50/70 p-1">
                {PRIORITIES.map(p => {
                  const isSelected = priority === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${p.dotClass}`} />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Owner Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Lead Owner
              </label>
              <div className="space-y-1.5">
                {owners.map(u => {
                  const isSelected = owner === u.name;
                  return (
                    <div
                      key={u.id}
                      onClick={() => setOwner(u.name)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border transition cursor-pointer select-none ${
                        isSelected
                          ? "border-[#1d61e7] bg-blue-50/30"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                          {u.initials}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-800 leading-none">{u.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{u.role}</p>
                        </div>
                      </div>
                      {isSelected && <Check size={14} className="text-[#1d61e7]" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Follow-up & Scheduling Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock size={19} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Follow-up Schedule</h2>
                <p className="text-xs text-slate-500">Required next activity date</p>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">Quick Presets</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuickFollowUp(1)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFollowUp(3)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  In 3 Days
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFollowUp(7)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Next Week
                </button>
              </div>
            </div>

            {/* Datetime Input */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Follow-up Date & Time {!isNoFollowUp && <span className="text-rose-500">*</span>}
              </label>
              <div className="relative">
                <Calendar size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="datetime-local"
                  disabled={isNoFollowUp}
                  value={followUpDate}
                  onChange={e => {
                    setFollowUpDate(e.target.value);
                    if (isNoFollowUp) setIsNoFollowUp(false);
                  }}
                  className={`w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400 ${
                    showErrors && followUpInvalid ? "border-rose-300 bg-rose-50/20" : "border-slate-200"
                  }`}
                />
              </div>
            </div>

            {/* No Follow-up Toggle */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isNoFollowUp}
                  onChange={e => {
                    setIsNoFollowUp(e.target.checked);
                    if (e.target.checked) setFollowUpDate("");
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-700">No follow-up needed for this lead</span>
              </label>
              {isNoFollowUp && (
                <p className="mt-1 text-[11px] text-slate-400 pl-6">
                  Reason will be recorded as "No follow-up needed" in accordance with CRM rules.
                </p>
              )}
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Card Preview</p>
              <span className="text-[11px] text-slate-400">Live preview</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {contactName || "Sarah Jenkins"}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {company || "Company Name"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                STATUSES.find(s => s.value === status)?.badgeClass || ""
              }`}>
                {status}
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                {priority}
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                {source}
              </span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
