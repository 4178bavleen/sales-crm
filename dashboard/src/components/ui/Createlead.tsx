import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CalendarClock,
  Clock,
  Mail,
  Phone,
  Plus,
  Save,
  Sparkles,
  User,
  X,
  AlertCircle,
  FileText,
  CheckCircle2,
} from "lucide-react";
import type { Lead, LeadStatus, Priority } from "../../types/lead";
import type { CreateLeadFormProps } from "../../types/createLeadForm";
import { getSession } from "../../lib/auth";
import { fetchLeadOptions } from "../../lib/leads";

interface SourceItem {
  id: number;
  name: string;
}

interface OwnerItem {
  id: number;
  name: string;
  email?: string;
}

interface ReasonItem {
  id: number;
  name: string;
}

function formatLabel(value: string): string {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase().replace(/_/g, " ");
}

export default function CreateLeadModal({
  initialLead,
  onClose,
  onCreate,
  onUpdate,
}: CreateLeadFormProps) {
  const isEdit = Boolean(initialLead);
  const session = getSession();
  const currentUserId = session?.user?.id;
  const currentUserName = session?.user?.name;

  // Fully dynamic options loaded from backend API
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [owners, setOwners] = useState<OwnerItem[]>([]);
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [noFollowUpReasons, setNoFollowUpReasons] = useState<ReasonItem[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  // Form field state
  const [firstName, setFirstName] = useState(initialLead?.firstName || "");
  const [lastName, setLastName] = useState(initialLead?.lastName || "");
  const [company, setCompany] = useState(initialLead?.company || "");
  const [email, setEmail] = useState(initialLead?.email || "");
  const [phone, setPhone] = useState(initialLead?.phone || "");
  const [sourceId, setSourceId] = useState<number | null>(initialLead?.sourceId ?? null);
  const [ownerId, setOwnerId] = useState<number | null>(initialLead?.ownerId ?? null);
  const [status, setStatus] = useState<LeadStatus | "">(initialLead?.status || "");
  const [priority, setPriority] = useState<Priority | "">(initialLead?.priority || "");
  const [notes, setNotes] = useState(initialLead?.notes || "");

  // Follow-up scheduling
  const formatInitialDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return "";
    }
  };

  const [followUpMode, setFollowUpMode] = useState<"SCHEDULE" | "NO_FOLLOWUP">(
    initialLead?.noFollowUp || !!initialLead?.noFollowUpReasonId ? "NO_FOLLOWUP" : "SCHEDULE",
  );
  const [followUpDate, setFollowUpDate] = useState<string>(
    formatInitialDate(initialLead?.nextFollowUpAt) || "",
  );
  const [noFollowUpReasonId, setNoFollowUpReasonId] = useState<number | null>(
    initialLead?.noFollowUpReasonId ?? null,
  );

  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Fetch all options dynamically from the backend
  useEffect(() => {
    let cancelled = false;
    setIsLoadingOptions(true);

    fetchLeadOptions()
      .then(data => {
        if (cancelled) return;

        if (data.sources) {
          setSources(data.sources);
          if (initialLead?.sourceId != null) {
            setSourceId(initialLead.sourceId);
          } else if (initialLead?.source) {
            const matched = data.sources.find(
              s => s.name.toLowerCase() === initialLead.source.toLowerCase(),
            );
            if (matched) setSourceId(matched.id);
            else if (data.sources.length > 0) setSourceId(data.sources[0].id);
          } else if (data.sources.length > 0) {
            setSourceId(data.sources[0].id);
          }
        }

        if (data.owners) {
          setOwners(data.owners);
          if (initialLead?.ownerId != null) {
            setOwnerId(initialLead.ownerId);
          } else if (initialLead?.owner) {
            const matched = data.owners.find(
              o => o.name.toLowerCase() === initialLead.owner.toLowerCase(),
            );
            if (matched) setOwnerId(matched.id);
            else if (data.owners.length > 0) setOwnerId(data.owners[0].id);
          } else {
            const loggedInOwner = data.owners.find(
              o => o.id === currentUserId || o.name === currentUserName,
            );
            setOwnerId(loggedInOwner ? loggedInOwner.id : data.owners[0]?.id ?? null);
          }
        }

        if (data.statuses && data.statuses.length > 0) {
          setStatuses(data.statuses);
          if (!initialLead?.status) {
            setStatus(data.statuses[0]);
          }
        }

        if (data.priorities && data.priorities.length > 0) {
          setPriorities(data.priorities);
          if (!initialLead?.priority) {
            const defaultMed = data.priorities.find(p => p === "MEDIUM") || data.priorities[0];
            setPriority(defaultMed);
          }
        }

        if (data.noFollowUpReasons && data.noFollowUpReasons.length > 0) {
          setNoFollowUpReasons(data.noFollowUpReasons);
          if (initialLead?.noFollowUpReasonId != null) {
            setNoFollowUpReasonId(initialLead.noFollowUpReasonId);
          } else {
            setNoFollowUpReasonId(data.noFollowUpReasons[0].id);
          }
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error("Failed to fetch lead options:", err);
          setBackendError("Could not load form options from backend. Please refresh the page.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingOptions(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUserId, currentUserName, initialLead]);

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Validation
  const trimmedFirst = firstName.trim();
  const trimmedLast = lastName.trim();
  const contactName = `${trimmedFirst} ${trimmedLast}`.trim();
  const nameInvalid = contactName.length < 2;
  const emailInvalid = !!email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const followUpInvalid =
    followUpMode === "SCHEDULE"
      ? !followUpDate
      : noFollowUpReasonId == null && noFollowUpReasons.length > 0;

  // Quick preset helper (calculated dynamically from current datetime)
  const setTomorrowMorning = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    setFollowUpMode("SCHEDULE");
    setFollowUpDate(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
    );
  };

  const getMinDatetime = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const selectedOwner = owners.find(o => o.id === ownerId);
  const selectedSource = sources.find(s => s.id === sourceId);
  const selectedReason = noFollowUpReasons.find(r => r.id === noFollowUpReasonId);

  // Submit
  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setShowErrors(true);
    setBackendError(null);

    if (nameInvalid || emailInvalid || followUpInvalid || !status || !priority) {
      return;
    }

    setIsSubmitting(true);
    try {
      const isNoFollowUp = followUpMode === "NO_FOLLOWUP";

      const leadPayload: Lead = {
        id: initialLead?.id ?? Date.now(),
        firstName: trimmedFirst,
        lastName: trimmedLast,
        company: company.trim(),
        email: email.trim(),
        phone: phone.trim(),
        source: selectedSource?.name || "",
        sourceId: sourceId,
        owner: selectedOwner?.name || "",
        ownerId: ownerId,
        status: status as LeadStatus,
        priority: priority as Priority,
        createdAt: initialLead?.createdAt ?? new Date().toISOString().slice(0, 10),
        notes: notes.trim() || undefined,
        nextFollowUpAt: isNoFollowUp ? undefined : followUpDate || undefined,
        noFollowUp: isNoFollowUp,
        noFollowUpReasonId: isNoFollowUp ? noFollowUpReasonId : undefined,
      };

      if (isEdit && initialLead && onUpdate) {
        await onUpdate(initialLead.id, leadPayload);
      } else {
        await onCreate(leadPayload);
      }
    } catch (err) {
      setBackendError(
        err instanceof Error
          ? err.message
          : `Failed to ${isEdit ? "update" : "create"} lead. Please verify the entered information.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const initials = `${trimmedFirst[0] || ""}${trimmedLast[0] || ""}`.toUpperCase() || "--";

  return (
    <div className="space-y-6 pb-16 animate-in fade-in-50 duration-200">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            title="Back to leads list (Esc)"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Leads</span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-semibold text-[#1d61e7]">
                {isEdit ? "Edit Lead" : "Create Lead"}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {isEdit ? `Edit Lead: ${contactName || "Untitled"}` : "Create Lead"}
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-600">
              {isEdit
                ? "Update prospect details, status, and follow-up schedule."
                : "Add a new prospect to your CRM and configure ownership and follow-up."}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
          >
            <X size={15} className="text-slate-500" />
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting || isLoadingOptions}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1d61e7] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>{isEdit ? "Saving..." : "Creating Lead..."}</span>
              </>
            ) : (
              <>
                {isEdit ? <Save size={15} /> : <Plus size={15} />}
                <span>{isEdit ? "Save Changes" : "Save Lead"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Backend Error Banner */}
      {backendError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 shadow-2xs flex items-start gap-3">
          <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-rose-900">Submission Error</p>
            <p>{backendError}</p>
          </div>
        </div>
      )}

      {/* Form Validation Banner */}
      {showErrors && (nameInvalid || emailInvalid || followUpInvalid || !status || !priority) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-900 shadow-2xs flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-950 mb-1">Please correct the following fields:</p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-900 font-normal">
              {nameInvalid && <li>Contact Name must be at least 2 characters long.</li>}
              {emailInvalid && <li>Email address format is invalid.</li>}
              {!status && <li>Lead Status is required.</li>}
              {!priority && <li>Priority is required.</li>}
              {followUpInvalid && (
                <li>
                  {followUpMode === "SCHEDULE"
                    ? "Please select a scheduled date and time for next follow-up."
                    : "Please choose a reason why no follow-up is needed."}
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Main Grid: Left 2 Columns for Form, Right 1 Column for Live Data Summary */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6" noValidate>
        {/* Left Form Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION 1: Contact Information */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1d61e7]">
                <User size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">1. Contact Information</h2>
                <p className="text-xs text-slate-500">Prospect identity, company affiliation, and reachability</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  className={`w-full rounded-xl border bg-white py-2.5 px-3.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 ${
                    showErrors && !trimmedFirst ? "border-rose-300 bg-rose-50/20" : "border-slate-200"
                  }`}
                />
                {showErrors && !trimmedFirst && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">First name is required</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Enter last name"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-3.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 ${
                      showErrors && emailInvalid ? "border-rose-300 bg-rose-50/20" : "border-slate-200"
                    }`}
                  />
                </div>
                {showErrors && emailInvalid && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">Valid email address required</p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Phone number"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              {/* Company Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Company / Organization
                </label>
                <div className="relative">
                  <Building2 size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    placeholder="Company name"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Attribution, Ownership & Lead Status */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">2. Attribution & Lead Status</h2>
                <p className="text-xs text-slate-500">Dynamically loaded from backend database</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Lead Source */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Lead Source
                </label>
                <select
                  value={sourceId ?? ""}
                  onChange={e => setSourceId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-medium text-slate-900 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                >
                  {isLoadingOptions && <option value="">Loading sources from backend...</option>}
                  {!isLoadingOptions && sources.length === 0 && (
                    <option value="">No sources found</option>
                  )}
                  {sources.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">Tracks originating acquisition channel.</p>
              </div>

              {/* Lead Owner */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Sales Owner
                </label>
                <select
                  value={ownerId ?? ""}
                  onChange={e => setOwnerId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-medium text-slate-900 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                >
                  {isLoadingOptions && <option value="">Loading owners from backend...</option>}
                  {!isLoadingOptions && owners.length === 0 && (
                    <option value="">No active users found</option>
                  )}
                  {owners.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.email ? `(${u.email})` : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">Assigns team member responsible for lead.</p>
              </div>

              {/* Lead Status (Dynamic from backend) */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Lead Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as LeadStatus)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-medium text-slate-900 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                >
                  {isLoadingOptions && <option value="">Loading statuses from backend...</option>}
                  {!isLoadingOptions && statuses.length === 0 && (
                    <option value="">No status available</option>
                  )}
                  {statuses.map(s => (
                    <option key={s} value={s}>
                      {formatLabel(s)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">Current qualification state of this prospect.</p>
              </div>

              {/* Priority (Dynamic from backend) */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Priority <span className="text-rose-500">*</span>
                </label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as Priority)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-medium text-slate-900 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                >
                  {isLoadingOptions && <option value="">Loading priorities from backend...</option>}
                  {!isLoadingOptions && priorities.length === 0 && (
                    <option value="">No priority available</option>
                  )}
                  {priorities.map(p => (
                    <option key={p} value={p}>
                      {formatLabel(p)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">Urgency level for sales engagement.</p>
              </div>
            </div>
          </div>

          {/* SECTION 3: Next Follow-up Action */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <CalendarClock size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">3. Scheduled Next Follow-up</h2>
                <p className="text-xs text-slate-500">Every active lead requires a scheduled date or a recorded reason.</p>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200 max-w-md">
              <button
                type="button"
                onClick={() => setFollowUpMode("SCHEDULE")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                  followUpMode === "SCHEDULE"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Calendar size={14} className="text-[#1d61e7]" />
                <span>Schedule Follow-up</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFollowUpMode("NO_FOLLOWUP");
                  setFollowUpDate("");
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                  followUpMode === "NO_FOLLOWUP"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <X size={14} className="text-slate-500" />
                <span>No Follow-up Needed</span>
              </button>
            </div>

            {/* Sub-view based on mode */}
            {followUpMode === "SCHEDULE" ? (
              <div className="space-y-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-800">
                      Follow-up Date & Time <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={setTomorrowMorning}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1d61e7] hover:underline cursor-pointer"
                    >
                      <Clock size={12} />
                      <span>Set for Tomorrow 10:00 AM</span>
                    </button>
                  </div>
                  <div className="relative max-w-md">
                    <Calendar size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="datetime-local"
                      min={getMinDatetime()}
                      value={followUpDate}
                      onChange={e => setFollowUpDate(e.target.value)}
                      className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-3.5 text-xs text-slate-900 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 cursor-pointer ${
                        showErrors && followUpInvalid ? "border-rose-300 bg-rose-50/20" : "border-slate-200"
                      }`}
                    />
                  </div>
                  {showErrors && followUpInvalid && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">Please select a follow-up date and time.</p>
                  )}
                  <p className="mt-1 text-[11px] text-slate-500">
                    A reminder will be surfaced on your dashboard and agenda.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1 rounded-xl bg-slate-50/70 border border-slate-200 p-4">
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Select Reason Why No Follow-up is Needed <span className="text-rose-500">*</span>
                </label>
                <select
                  value={noFollowUpReasonId ?? ""}
                  onChange={e => setNoFollowUpReasonId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full max-w-md rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-medium text-slate-900 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                >
                  {isLoadingOptions && <option value="">Loading reasons from backend...</option>}
                  {!isLoadingOptions && noFollowUpReasons.length === 0 && (
                    <option value="">No reason records found in backend</option>
                  )}
                  {noFollowUpReasons.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Recorded in compliance with database requirements.
                </p>
              </div>
            )}
          </div>

          {/* SECTION 4: Notes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <FileText size={19} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">4. Notes & Interaction History</h2>
                <p className="text-xs text-slate-500">Meeting takeaways, budget estimates, or customer requirements.</p>
              </div>
            </div>

            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="Enter notes about this prospect..."
              className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 resize-y"
            />
          </div>
        </div>

        {/* Right 1 Column: Real-time Live Summary (Only Real User Data) */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4 sticky top-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Lead Record Summary
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Live view of current inputs</p>
            </div>

            {/* Real Data Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white shadow-xs">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {contactName || <span className="text-slate-400 italic">No name entered</span>}
                  </p>
                  <p className="text-xs text-slate-600 truncate font-medium">
                    {company || <span className="text-slate-400 italic">No company entered</span>}
                  </p>
                </div>
              </div>

              {/* Contact info */}
              <div className="border-t border-slate-200/60 pt-2.5 space-y-1 text-xs text-slate-700">
                <div className="flex items-center gap-2 truncate">
                  <Mail size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">
                    {email || <span className="text-slate-400 italic">—</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <Phone size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">
                    {phone || <span className="text-slate-400 italic">—</span>}
                  </span>
                </div>
              </div>

              {/* Status & Priority */}
              <div className="border-t border-slate-200/60 pt-2.5 flex flex-wrap items-center gap-1.5">
                {status && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-[#1d61e7]">
                    {formatLabel(status)}
                  </span>
                )}

                {priority && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-200 text-slate-800">
                    {formatLabel(priority)} Priority
                  </span>
                )}

                {selectedSource && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    {selectedSource.name}
                  </span>
                )}
              </div>

              {/* Assigned owner and follow-up */}
              <div className="border-t border-slate-200/60 pt-2.5 space-y-1 text-xs text-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Owner:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedOwner?.name || <span className="text-slate-400 italic">Unassigned</span>}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Next Action:</span>
                  <span className="font-semibold text-slate-900 text-right">
                    {followUpMode === "SCHEDULE" ? (
                      followUpDate ? (
                        new Date(followUpDate).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      ) : (
                        <span className="text-rose-600">Pending Date</span>
                      )
                    ) : (
                      <span className="text-slate-600">
                        {selectedReason?.name ? `No follow-up (${selectedReason.name})` : "No follow-up needed"}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Validation Checklist */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-800 mb-2">Requirements Status</p>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {!nameInvalid ? (
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span className={!nameInvalid ? "text-slate-900 font-medium" : "text-slate-500"}>
                    Contact Name (min 2 chars)
                  </span>
                </div>
                {nameInvalid && <span className="text-[10px] text-rose-600 font-semibold">Required</span>}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {!followUpInvalid ? (
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span className={!followUpInvalid ? "text-slate-900 font-medium" : "text-slate-500"}>
                    Follow-up Action defined
                  </span>
                </div>
                {followUpInvalid && <span className="text-[10px] text-rose-600 font-semibold">Required</span>}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {!emailInvalid ? (
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-rose-300 shrink-0" />
                  )}
                  <span className={!emailInvalid ? "text-slate-700" : "text-rose-600 font-medium"}>
                    Valid Email Format
                  </span>
                </div>
                {emailInvalid && <span className="text-[10px] text-rose-600 font-semibold">Invalid</span>}
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isSubmitting || isLoadingOptions}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1d61e7] py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Save size={14} />
                    <span>{isEdit ? "Save Changes" : "Save Lead Now"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
