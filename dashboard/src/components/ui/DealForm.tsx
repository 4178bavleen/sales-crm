import { useEffect, useState } from "react";
import {
  IndianRupee,
  Building2,
  Users,
  Package,
  Layers,
  Calendar,
  ListChecks,
  X,
  Trophy,
  XCircle,
  AlertCircle,

} from "lucide-react";
import type { DealFormValues, DealStatus } from "../../types/deal";
import type { DealFormProps, DealOptionsData } from "../../types/dealForm";
import { request } from "../../lib/api";
import { ENDPOINTS } from "../../lib/endpoints";
import { getSession } from "../../lib/auth";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function DealForm({
  mode,
  values,
  options,
  onClose,
  onSubmit,
}: DealFormProps) {
  const isEdit = mode === "edit";

  const [localOptions, setLocalOptions] = useState<DealOptionsData | null>(options ?? null);

  useEffect(() => {
    if (options) {
      setLocalOptions(options);
      return;
    }
    const token = getSession()?.token;
    if (token) {
      request<DealOptionsData>(ENDPOINTS.deals.options, { token })
        .then(res => {
          if (res) setLocalOptions(res);
        })
        .catch(() => {});
    }
  }, [options]);

  const activeOptions = localOptions ?? options;
  const stageList = activeOptions?.stages || [];
  const userList = activeOptions?.users || [];
  const productList = activeOptions?.products || [];
  const leadList = activeOptions?.leads || [];
  const customerList = activeOptions?.customers || [];
  const reasonList = activeOptions?.lostReasons || [];

  const defaultStage = stageList.find(s => s.kind === "OPEN") || stageList[0];
  const defaultUser = userList[0];

  const [name, setName] = useState(values?.name ?? "");
  const [estimatedValue, setEstimatedValue] = useState(values?.estimatedValue ?? "");
  const [stageId, setStageId] = useState<number>(
    values?.stageId ||
      stageList.find(s => s.name === values?.stage)?.id ||
      defaultStage?.id ||
      0,
  );
  const [ownerId, setOwnerId] = useState<number>(
    values?.ownerId ||
      userList.find(u => u.name === values?.owner)?.id ||
      defaultUser?.id ||
      0,
  );
  const [customerId, setCustomerId] = useState<number | null>(
    values?.customerId ?? null,
  );
  const [leadId, setLeadId] = useState<number | null>(values?.leadId ?? null);
  const [productServiceId, setProductServiceId] = useState<number | null>(
    values?.productServiceId ?? null,
  );
  const [expectedCloseDate, setExpectedCloseDate] = useState(
    values?.expectedCloseDate ?? "",
  );
  const [nextAction, setNextAction] = useState(values?.nextAction ?? "");
  const [status, setStatus] = useState<DealStatus>(values?.status ?? "OPEN");
  const [wonRevenue, setWonRevenue] = useState(values?.wonRevenue ?? "");
  const [closedAt, setClosedAt] = useState(values?.closedAt ?? "");
  const [lostReasonId, setLostReasonId] = useState<number | null>(
    values?.lostReasonId ?? (reasonList[0]?.id || null),
  );
  const [lostNote, setLostNote] = useState(values?.lostNote ?? "");

  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Sync initial selections once options load
  useEffect(() => {
    if (!stageId && stageList.length > 0) {
      const def = stageList.find(s => s.kind === "OPEN") || stageList[0];
      if (def) setStageId(def.id);
    }
    if (!ownerId && userList.length > 0) {
      setOwnerId(userList[0].id);
    }
    if (!lostReasonId && reasonList.length > 0) {
      setLostReasonId(reasonList[0].id);
    }
  }, [stageList, userList, reasonList, stageId, ownerId, lostReasonId]);

  // Esc closes the dialog
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // When stage changes, adjust status if necessary
  const currentSelectedStage = stageList.find(s => s.id === stageId);

  const nameInvalid = !name.trim();
  const valueNum = Number(estimatedValue);
  const valueInvalid =
    estimatedValue === "" || Number.isNaN(valueNum) || valueNum < 0;

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setShowErrors(true);
    setErrorText(null);

    if (nameInvalid || valueInvalid) return;

    const chosenStage = stageList.find(s => s.id === stageId);
    const chosenOwner = userList.find(u => u.id === ownerId);
    const chosenProduct = productList.find(p => p.id === productServiceId);
    const chosenLead = leadList.find(l => l.id === leadId);
    const chosenCustomer = customerList.find(c => c.id === customerId);
    const chosenReason = reasonList.find(r => r.id === lostReasonId);

    const isWon = chosenStage?.kind === "WON" || status === "WON";
    const isLost = chosenStage?.kind === "LOST" || status === "LOST";

    const payload: DealFormValues = {
      name: name.trim(),
      customer: chosenCustomer?.company?.name || "",
      customerId: customerId,
      lead: chosenLead?.contactName || "",
      leadId: leadId,
      owner: chosenOwner?.name || "",
      ownerId: ownerId,
      product: chosenProduct?.name || "",
      productServiceId: productServiceId,
      stage: chosenStage?.name || "Qualified",
      stageId: stageId,
      status: isWon ? "WON" : isLost ? "LOST" : "OPEN",
      estimatedValue: String(valueNum),
      expectedCloseDate,
      nextAction: nextAction.trim(),
      wonRevenue: isWon ? (wonRevenue.trim() || String(valueNum)) : "",
      closedAt: isWon ? (closedAt || todayIso()) : "",
      lostReason: isLost ? (chosenReason?.name || "") : "",
      lostReasonId: isLost ? lostReasonId : null,
      lostNote: isLost ? lostNote.trim() : "",
    };

    try {
      setSubmitting(true);
      await onSubmit(payload);
    } catch (err: any) {
      setErrorText(err?.message || "Failed to save deal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit deal" : "Create deal"}
        className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1d61e7]">
              <IndianRupee size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {isEdit ? "Edit Deal" : "Create New Deal"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEdit
                  ? "Update deal pipeline stage, value, and customer relations."
                  : "Add a prospective deal to the pipeline."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error alert if any */}
        {errorText && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 border border-rose-200">
            <AlertCircle size={15} className="shrink-0 text-rose-500" />
            <span className="flex-1">{errorText}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Deal Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Deal Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Acme Corp — Enterprise CRM Expansion"
              className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 ${
                showErrors && nameInvalid
                  ? "border-rose-300 bg-rose-50/20"
                  : "border-slate-200"
              }`}
            />
            {showErrors && nameInvalid && (
              <p className="mt-1 text-[11px] text-rose-500">
                Deal name is required.
              </p>
            )}
          </div>

          {/* Value & Stage row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Estimated Value (INR) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <IndianRupee
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={estimatedValue}
                  onChange={e => setEstimatedValue(e.target.value)}
                  placeholder="50000"
                  className={`w-full rounded-lg border bg-white py-2.5 pl-8 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 ${
                    showErrors && valueInvalid
                      ? "border-rose-300 bg-rose-50/20"
                      : "border-slate-200"
                  }`}
                />
              </div>
              {showErrors && valueInvalid && (
                <p className="mt-1 text-[11px] text-rose-500">
                  A valid non-negative number is required.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Pipeline Stage <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Layers
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={stageId}
                  onChange={e => {
                    const sid = Number(e.target.value);
                    setStageId(sid);
                    const st = stageList.find(s => s.id === sid);
                    if (st) {
                      setStatus(st.kind === "WON" ? "WON" : st.kind === "LOST" ? "LOST" : "OPEN");
                    }
                  }}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                >
                  {stageList.map(stage => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name} {stage.kind !== "OPEN" ? `(${stage.kind})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Owner & Product row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Deal Owner <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Users
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={ownerId}
                  onChange={e => setOwnerId(Number(e.target.value))}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                >
                  {userList.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Product / Service
              </label>
              <div className="relative">
                <Package
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={productServiceId ?? ""}
                  onChange={e =>
                    setProductServiceId(
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="">No product specified</option>
                  {productList.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Customer & Lead row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Customer / Company
              </label>
              <div className="relative">
                <Building2
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={customerId ?? ""}
                  onChange={e =>
                    setCustomerId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="">None (Standalone Deal)</option>
                  {customerList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.company?.name || `Customer #${c.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Source Lead
              </label>
              <div className="relative">
                <Users
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={leadId ?? ""}
                  onChange={e =>
                    setLeadId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="">None</option>
                  {leadList.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.contactName} {l.companyName ? `(${l.companyName})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Expected Close Date & Next Action */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Expected Close Date
              </label>
              <div className="relative">
                <Calendar
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="date"
                  min={todayIso()}
                  value={expectedCloseDate}
                  onChange={e => setExpectedCloseDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Next Action / Step
              </label>
              <div className="relative">
                <ListChecks
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={nextAction}
                  onChange={e => setNextAction(e.target.value)}
                  placeholder="e.g. Send revised SOW with phased pricing"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-800 outline-none transition focus:border-[#1d61e7] focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* WON state extra fields */}
          {(currentSelectedStage?.kind === "WON" || status === "WON") && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                <Trophy size={16} className="text-emerald-600" />
                Won Deal Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Closed Revenue (INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={wonRevenue || estimatedValue}
                    onChange={e => setWonRevenue(e.target.value)}
                    placeholder="Same as estimated"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Closed Date
                  </label>
                  <input
                    type="date"
                    value={closedAt || todayIso()}
                    onChange={e => setClosedAt(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* LOST state extra fields */}
          {(currentSelectedStage?.kind === "LOST" || status === "LOST") && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 space-y-3">
              <div className="flex items-center gap-2 text-rose-800 text-xs font-semibold">
                <XCircle size={16} className="text-rose-600" />
                Lost Deal Details
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Lost Reason <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={lostReasonId ?? ""}
                    onChange={e =>
                      setLostReasonId(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-rose-500"
                  >
                    {reasonList.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Lost Note
                  </label>
                  <textarea
                    rows={2}
                    value={lostNote}
                    onChange={e => setLostNote(e.target.value)}
                    placeholder="Provide details on why this deal was lost..."
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 outline-none focus:border-rose-500 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[#1d61e7] px-5 py-2.5 text-xs font-medium text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
            >
              {submitting
                ? "Saving..."
                : isEdit
                  ? "Update Deal"
                  : "Create Deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
