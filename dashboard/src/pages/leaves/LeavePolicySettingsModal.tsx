import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Settings2,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  FileText,
  Calendar,
  HeartPulse,
  Palmtree,
  Clock,
  Sparkles,
  Search,
  Check,
} from "lucide-react";
import type {
  LeavePolicy,
  LeaveAccrualPeriod,
  CreateLeavePolicyPayload,
} from "../../types/leave";
import {
  fetchLeavePolicies,
  createLeavePolicy,
  updateLeavePolicy,
  deleteLeavePolicy,
} from "../../lib/leaves";

interface LeavePolicySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPoliciesChanged: () => void;
}

const ACCRUAL_OPTIONS: {
  value: LeaveAccrualPeriod;
  label: string;
  sub: string;
}[] = [
  { value: "YEARLY", label: "Yearly", sub: "Annual allowance (Jan - Dec)" },
  { value: "MONTHLY", label: "Monthly", sub: "Accrues each calendar month" },
  { value: "QUARTERLY", label: "Quarterly", sub: "Accrues every 3 months" },
  { value: "HALF_YEARLY", label: "Half-Yearly", sub: "Accrues every 6 months" },
];

function getCategoryIcon(code: string, name: string) {
  const text = `${code} ${name}`.toUpperCase();
  if (text.includes("SICK") || text.includes("MEDICAL")) return HeartPulse;
  if (text.includes("EARNED") || text.includes("VACATION") || text.includes("PRIVILEGE")) return Palmtree;
  if (text.includes("COMP") || text.includes("OVERTIME")) return Clock;
  if (text.includes("BEREAVEMENT") || text.includes("UNPAID")) return FileText;
  return Calendar;
}

export default function LeavePolicySettingsModal({
  isOpen,
  onClose,
  onPoliciesChanged,
}: LeavePolicySettingsModalProps) {
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");

  // Form State for Add / Edit
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState<string>("");
  const [formCode, setFormCode] = useState<string>("");
  const [formQuota, setFormQuota] = useState<number>(12);
  const [formPeriod, setFormPeriod] = useState<LeaveAccrualPeriod>("YEARLY");
  const [formIsPaid, setFormIsPaid] = useState<boolean>(true);
  const [formRequiresDoc, setFormRequiresDoc] = useState<boolean>(false);
  const [formDocDesc, setFormDocDesc] = useState<string>("");
  const [formDesc, setFormDesc] = useState<string>("");

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeavePolicies();
      setPolicies(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load leave policies.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadPolicies();
      setIsEditing(false);
      setEditingId(null);
    }
  }, [isOpen, loadPolicies]);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setEditingId(null);
    setFormName("");
    setFormCode("");
    setFormQuota(12);
    setFormPeriod("YEARLY");
    setFormIsPaid(true);
    setFormRequiresDoc(false);
    setFormDocDesc("");
    setFormDesc("");
    setIsEditing(true);
    setError(null);
  };

  const handleStartEdit = (policy: LeavePolicy) => {
    setEditingId(policy.id);
    setFormName(policy.name);
    setFormCode(policy.code);
    setFormQuota(policy.quota);
    setFormPeriod(policy.period);
    setFormIsPaid(policy.isPaid);
    setFormRequiresDoc(policy.requiresDocument);
    setFormDocDesc(policy.documentDescription || "");
    setFormDesc(policy.description || "");
    setIsEditing(true);
    setError(null);
  };

  const handleCancelForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setError(null);
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formName.trim()) {
      setError("Please provide a category name.");
      return;
    }

    if (formQuota < 0) {
      setError("Quota cannot be negative.");
      return;
    }

    setActionLoading(true);
    try {
      const payload: CreateLeavePolicyPayload = {
        name: formName.trim(),
        code: formCode.trim() ? formCode.trim().toUpperCase() : undefined,
        quota: Number(formQuota),
        period: formPeriod,
        isPaid: formIsPaid,
        requiresDocument: formRequiresDoc,
        documentDescription: formRequiresDoc ? formDocDesc.trim() || null : null,
        description: formDesc.trim() || null,
      };

      if (editingId) {
        await updateLeavePolicy(editingId, payload);
        setSuccessMsg(`"${formName}" updated successfully.`);
      } else {
        await createLeavePolicy(payload);
        setSuccessMsg(`"${formName}" created successfully.`);
      }

      setIsEditing(false);
      setEditingId(null);
      await loadPolicies();
      onPoliciesChanged();
    } catch (err: any) {
      setError(err?.message || "Failed to save leave category.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (policy: LeavePolicy) => {
    setActionLoading(true);
    try {
      await updateLeavePolicy(policy.id, { isActive: !policy.isActive });
      await loadPolicies();
      onPoliciesChanged();
    } catch (err: any) {
      setError(err?.message || "Failed to update category status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePolicy = async (policy: LeavePolicy) => {
    if (!window.confirm(`Are you sure you want to remove or deactivate "${policy.name}"?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await deleteLeavePolicy(policy.id);
      setSuccessMsg(res.message || `"${policy.name}" removed successfully.`);
      await loadPolicies();
      onPoliciesChanged();
    } catch (err: any) {
      setError(err?.message || "Failed to remove category.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredPolicies = policies.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Leave Categories & Allowances</span>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider">
                  Admin Setup
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure annual/monthly quotas, paid status, and document requirements
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={handleStartAdd}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Category</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Feedback / Alert */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 flex items-center justify-between gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Add / Edit Form Card */}
          {isEditing ? (
            <form
              onSubmit={handleSavePolicy}
              className="rounded-2xl border border-blue-200 bg-blue-50/20 p-5 space-y-5 shadow-sm animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span>{editingId ? "Edit Leave Category" : "New Leave Category"}</span>
                </h4>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Category Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Casual Leave, Bereavement Leave"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none shadow-xs"
                    required
                  />
                </div>

                {/* System Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    System Code
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CASUAL, BEREAVEMENT"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono font-medium text-slate-900 focus:border-blue-500 focus:outline-none shadow-xs"
                  />
                </div>

                {/* Quota / Allowance */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Quota Allowance (Days) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formQuota}
                    onChange={(e) => setFormQuota(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 12"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none shadow-xs"
                    required
                  />
                </div>

                {/* Period / Frequency selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Accrual Frequency <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ACCRUAL_OPTIONS.map((opt) => {
                      const isSel = formPeriod === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormPeriod(opt.value)}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs font-medium transition cursor-pointer text-left ${
                            isSel
                              ? "border-blue-600 bg-blue-50/80 text-blue-900 font-semibold ring-1 ring-blue-600"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <div>
                            <div>{opt.label}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{opt.sub.slice(0, 18)}</div>
                          </div>
                          {isSel && <Check size={12} className="text-blue-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Paid Leave Card */}
                <div
                  onClick={() => setFormIsPaid(!formIsPaid)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer ${
                    formIsPaid
                      ? "border-emerald-200 bg-emerald-50/40 text-emerald-900"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">Paid Leave</div>
                    <div className="text-[11px] text-slate-500">Employee receives full salary</div>
                  </div>
                  <div
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition ${
                      formIsPaid ? "bg-emerald-600" : "bg-slate-200"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                        formIsPaid ? "translate-x-4" : ""
                      }`}
                    />
                  </div>
                </div>

                {/* Requires Document Card */}
                <div
                  onClick={() => setFormRequiresDoc(!formRequiresDoc)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer ${
                    formRequiresDoc
                      ? "border-rose-200 bg-rose-50/40 text-rose-900"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">Requires Document / Slip</div>
                    <div className="text-[11px] text-slate-500">Doctor prescription or certificate</div>
                  </div>
                  <div
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition ${
                      formRequiresDoc ? "bg-rose-600" : "bg-slate-200"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                        formRequiresDoc ? "translate-x-4" : ""
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Document Description if required */}
              {formRequiresDoc && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Document Prompt Instructions
                  </label>
                  <input
                    type="text"
                    value={formDocDesc}
                    onChange={(e) => setFormDocDesc(e.target.value)}
                    placeholder="e.g. Doctor's medical certificate or hospital prescription is required"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none shadow-xs"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Employee Policy Guidance
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Explain when employees can apply for this leave..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none shadow-xs"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-blue-100">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {actionLoading ? (
                    <>
                      <RotateCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingId ? "Update Category" : "Save New Category"}</span>
                  )}
                </button>
              </div>
            </form>
          ) : null}

          {/* Search Bar & Counter */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
              <input
                type="text"
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8.5 pr-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-800">{filteredPolicies.length}</span> of{" "}
              <span className="font-bold text-slate-800">{policies.length}</span> categories
            </div>
          </div>

          {/* Policy List / Table */}
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <RotateCw className="w-7 h-7 animate-spin text-blue-600 mb-2.5" />
              <p className="text-xs font-medium">Loading leave categories & quotas...</p>
            </div>
          ) : filteredPolicies.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No leave categories found. Click &quot;Add Category&quot; to create one.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Quota & Frequency</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPolicies.map((p) => {
                    const isInactive = !p.isActive;
                    const Icon = getCategoryIcon(p.code, p.name);
                    let periodBadge = "Per Year";
                    if (p.period === "MONTHLY") periodBadge = "Per Month";
                    else if (p.period === "QUARTERLY") periodBadge = "Per Quarter";
                    else if (p.period === "HALF_YEARLY") periodBadge = "Per Half-Year";

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-slate-50/70 transition ${
                          isInactive ? "opacity-60 bg-slate-50/30" : ""
                        }`}
                      >
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{p.name}</span>
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                  {p.code}
                                </span>
                              </div>
                              {p.description && (
                                <div className="text-[10px] text-slate-400 font-normal line-clamp-1 mt-0.5">
                                  {p.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900">
                            {p.quota} {p.quota === 1 ? "Day" : "Days"}
                          </span>
                          <span className="text-[11px] text-slate-500 ml-1">
                            / {periodBadge}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              p.isPaid
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {p.isPaid ? "Paid Leave" : "Unpaid"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {p.requiresDocument ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              <FileText className="h-3 w-3" />
                              <span>Required</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Optional</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(p)}
                            disabled={actionLoading}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition cursor-pointer ${
                              p.isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                            }`}
                            title={p.isActive ? "Click to deactivate" : "Click to activate"}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${p.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                            <span>{p.isActive ? "Active" : "Inactive"}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(p)}
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                              title="Edit policy"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePolicy(p)}
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Deactivate / remove policy"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 bg-slate-50/50 text-xs text-slate-500 shrink-0">
          <div>
            Total <span className="font-bold text-slate-800">{policies.length}</span> categories configured. Active categories appear immediately in employee leave forms and stat cards.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
