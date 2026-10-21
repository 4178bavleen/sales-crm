import { useEffect, useState } from "react";
import {
  CircleDollarSign,
  Handshake,
  ListChecks,
  Trophy,
  XCircle,
} from "lucide-react";
import type { DealFormValues, DealStatus } from "../../types/deal";
import {
  DEAL_LOST_REASONS,
  DEAL_OWNERS,
  DEAL_PRODUCTS,
  PIPELINE_STAGE_ROWS,
} from "../../types/deal";
import type { DealFormProps } from "../../types/dealForm";
import { cellClass } from "../../types/formControls";
import { initialCustomers } from "../../data/customers";
import { initialLeads } from "../../data/leads";
import {
  Field,
  FormSection,
  FormShell,
  SelectField,
  TextAreaField,
} from "./FormControls";

const STAGE_NAMES = PIPELINE_STAGE_ROWS.map(([name]) => name);
const STATUS_OPTIONS: DealStatus[] = ["OPEN", "WON", "LOST"];

const emptyValues: DealFormValues = {
  name: "",
  customer: "",
  lead: "",
  owner: DEAL_OWNERS[0] ?? "",
  product: "",
  stage: STAGE_NAMES[0] ?? "",
  status: "OPEN",
  estimatedValue: "",
  expectedCloseDate: "",
  nextAction: "",
  wonRevenue: "",
  closedAt: "",
  lostReason: "",
  lostNote: "",
};

/**
 * Full-page create/edit form for a deal.
 *
 * Maps onto the backend `Deal` model. Won-only fields (wonRevenue, closedAt)
 * appear only when status = WON, and lost-only fields (lostReason, lostNote)
 * only when status = LOST — matching the schema's rule that those columns are
 * set only in that state.
 */
export default function DealForm({
  mode,
  values,
  onClose,
  onSubmit,
}: DealFormProps) {
  const initialValues: DealFormValues = values ?? emptyValues;
  const [form, setForm] = useState<DealFormValues>(initialValues);
  const [showErrors, setShowErrors] = useState(false);

  const isEdit = mode === "edit";
  const dirty = (Object.keys(initialValues) as (keyof DealFormValues)[]).some(
    key => form[key] !== initialValues[key],
  );

  function update<K extends keyof DealFormValues>(
    key: K,
    value: DealFormValues[K],
  ) {
    setForm(previous => ({ ...previous, [key]: value }));
  }

  // Esc closes the form (same as the back button)
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const customerOptions = initialCustomers.map(customer => customer.company);
  const leadOptions = initialLeads.map(
    lead => `${lead.firstName} ${lead.lastName}`,
  );

  const name = form.name.trim();
  const nameInvalid = !name;
  const valueInvalid =
    form.estimatedValue !== "" && Number.isNaN(Number(form.estimatedValue));
  const errorMessage = nameInvalid
    ? "Please enter the deal name before saving."
    : valueInvalid
      ? "Estimated value must be a number."
      : "";

  function submit() {
    setShowErrors(true);
    if (nameInvalid || valueInvalid) return;

    // Status-dependent fields are cleared when they don't apply, so a deal
    // never carries a lost reason while being Won (or vice versa).
    const isWon = form.status === "WON";
    const isLost = form.status === "LOST";

    onSubmit({
      name,
      customer: form.customer,
      lead: form.lead,
      owner: form.owner,
      product: form.product,
      stage: form.stage,
      status: form.status,
      estimatedValue: form.estimatedValue.trim(),
      expectedCloseDate: form.expectedCloseDate,
      nextAction: form.nextAction.trim(),
      wonRevenue: isWon ? form.wonRevenue.trim() : "",
      closedAt: isWon ? form.closedAt : "",
      lostReason: isLost ? form.lostReason : "",
      lostNote: isLost ? form.lostNote.trim() : "",
    });
  }

  return (
    <FormShell
      title={isEdit ? "Edit Deal" : "Create Deal"}
      description={
        isEdit
          ? "Update this deal's stage, value, and ownership."
          : "Add a deal to the pipeline and set its expected value."
      }
      error={errorMessage}
      dirty={dirty}
      onClose={onClose}
      onSubmit={submit}
    >
      {/* Maps to: Deal (name, customerId, leadId, productServiceId, stageId, status) */}
      <FormSection
        icon={<CircleDollarSign size={17} />}
        title="Deal Information"
        description="What is being sold, and to whom."
        aside="* Required fields"
      >
        <div className={cellClass}>
          <Field
            label="Deal Name"
            value={form.name}
            onChange={value => update("name", value)}
            required
            placeholder="e.g. Rangoni — Florence rollout"
            invalid={showErrors && nameInvalid}
            hint="Deal name is required."
          />
        </div>
        <div className={cellClass}>
          <SelectField
            label="Customer"
            value={form.customer}
            onChange={value => update("customer", value)}
            options={customerOptions}
          />
        </div>
        <div className={cellClass}>
          <SelectField
            label="Source Lead"
            value={form.lead}
            onChange={value => update("lead", value)}
            options={leadOptions}
          />
        </div>
        <div className={cellClass}>
          <SelectField
            label="Product"
            value={form.product}
            onChange={value => update("product", value)}
            options={DEAL_PRODUCTS}
          />
        </div>
        <div className={cellClass}>
          <SelectField
            label="Stage"
            value={form.stage}
            onChange={value => update("stage", value)}
            options={STAGE_NAMES}
          />
        </div>
        <div className={cellClass}>
          <SelectField
            label="Status"
            value={form.status}
            onChange={value => update("status", value as DealStatus)}
            options={STATUS_OPTIONS}
          />
        </div>
      </FormSection>

      {/* Maps to: Deal (ownerId, estimatedValue, expectedCloseDate, nextAction) */}
      <FormSection
        icon={<Handshake size={17} />}
        title="Value & Ownership"
        description="Pipeline value, who owns it, and the next step."
      >
        <div className={cellClass}>
          <Field
            label="Estimated Value"
            value={form.estimatedValue}
            onChange={value => update("estimatedValue", value)}
            type="number"
            placeholder="0"
            invalid={showErrors && valueInvalid}
            hint="Enter a number."
          />
        </div>
        <div className={cellClass}>
          <Field
            label="Expected Close"
            value={form.expectedCloseDate}
            onChange={value => update("expectedCloseDate", value)}
            type="date"
          />
        </div>
        <div className={cellClass}>
          <SelectField
            label="Owner"
            value={form.owner}
            onChange={value => update("owner", value)}
            options={DEAL_OWNERS}
          />
        </div>
        <div className={cellClass}>
          <TextAreaField
            label="Next Action"
            value={form.nextAction}
            onChange={value => update("nextAction", value)}
            placeholder="The agreed next step for this deal."
            rows={2}
          />
        </div>
      </FormSection>

      {/* Maps to: Deal.closedRevenue / Deal.closedAt — only when WON */}
      {form.status === "WON" && (
        <FormSection
          icon={<Trophy size={17} />}
          title="Closed Revenue"
          description="Recorded because this deal is marked Won."
        >
          <div className={cellClass}>
            <Field
              label="Revenue"
              value={form.wonRevenue}
              onChange={value => update("wonRevenue", value)}
              type="number"
              placeholder="0"
            />
          </div>
          <div className={cellClass}>
            <Field
              label="Closed At"
              value={form.closedAt}
              onChange={value => update("closedAt", value)}
              type="date"
            />
          </div>
        </FormSection>
      )}

      {/* Maps to: Deal.lostReasonId / Deal.lostNote — only when LOST */}
      {form.status === "LOST" && (
        <FormSection
          icon={<XCircle size={17} />}
          title="Loss Details"
          description="Recorded because this deal is marked Lost."
        >
          <div className={cellClass}>
            <SelectField
              label="Lost Reason"
              value={form.lostReason}
              onChange={value => update("lostReason", value)}
              options={DEAL_LOST_REASONS}
            />
          </div>
          <div className={cellClass}>
            <TextAreaField
              label="Lost Note"
              value={form.lostNote}
              onChange={value => update("lostNote", value)}
              placeholder="Why the deal was lost."
              rows={2}
            />
          </div>
        </FormSection>
      )}

      {/* Read-only note about the pipeline value semantics */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <ListChecks size={17} />
          </div>
          <p className="text-xs text-slate-500">
            Estimated value is pipeline value, not revenue. Revenue is only
            recorded on a Won deal.
          </p>
        </div>
      </section>
    </FormShell>
  );
}
