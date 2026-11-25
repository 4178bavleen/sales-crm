import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { parseTermsList, cleanTermClause, STANDARD_TERMS_PRESETS } from '../../lib/invoices';

interface TermsClauseManagerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  helperText?: string;
}

export const TermsClauseManager: React.FC<TermsClauseManagerProps> = ({
  value,
  onChange,
  label = 'Terms & Conditions',
  helperText = 'Each bullet point will be cleanly presented on the invoice and PDF.',
}) => {
  const [clauses, setClauses] = useState<string[]>(() => {
    const list = parseTermsList(value);
    return list.length > 0
      ? list.map(cleanTermClause)
      : [
          'Payment is due within 15 days of invoice date.',
          'Please quote the invoice number when making electronic transfer.',
          'All disputes are subject to local jurisdiction.',
        ];
  });

  useEffect(() => {
    const parsed = parseTermsList(value);
    if (parsed.length > 0) {
      const cleaned = parsed.map(cleanTermClause);
      if (cleaned.join('\n') !== clauses.join('\n')) {
        setClauses(cleaned);
      }
    }
  }, [value]);

  const updateParentFromClauses = (newClauses: string[]) => {
    setClauses(newClauses);
    const valid = newClauses.map((c) => c.trim()).filter(Boolean);
    if (valid.length === 0) {
      onChange('');
    } else {
      const formatted = valid.map((c) => `• ${c}`).join('\n');
      onChange(formatted);
    }
  };

  const handleClauseChange = (index: number, text: string) => {
    const updated = [...clauses];
    updated[index] = text;
    updateParentFromClauses(updated);
  };

  const handleAddClause = (text = '', atIndex?: number) => {
    const updated = [...clauses];
    if (typeof atIndex === 'number') {
      updated.splice(atIndex, 0, text);
    } else {
      updated.push(text);
    }
    updateParentFromClauses(updated);
  };

  const handleRemoveClause = (index: number) => {
    if (clauses.length <= 1) {
      updateParentFromClauses(['']);
      return;
    }
    const updated = clauses.filter((_, i) => i !== index);
    updateParentFromClauses(updated);
  };

  const handleAddPreset = (presetClause: string) => {
    if (clauses.some((c) => c.toLowerCase().includes(presetClause.slice(0, 15).toLowerCase()))) {
      return;
    }
    const updated = [...clauses.filter((c) => c.trim().length > 0), presetClause];
    updateParentFromClauses(updated);
  };

  const handleResetDefaults = () => {
    const defaults = [
      'Payment is due within 15 days of invoice date.',
      'Please quote the invoice number when making electronic transfer.',
      'All disputes are subject to local jurisdiction.',
    ];
    updateParentFromClauses(defaults);
  };

  return (
    <div className="space-y-2">
      {/* Clean Header Bar */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-900 tracking-tight">{label}</label>
            <span className="text-[11px] text-slate-400">
              ({clauses.filter((c) => c.trim()).length} {clauses.filter((c) => c.trim()).length === 1 ? 'bullet' : 'bullets'})
            </span>
          </div>
          {helperText && <p className="text-[11px] text-slate-500 mt-0.5">{helperText}</p>}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick preset dropdown - clean, zero clutter */}
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                handleAddPreset(e.target.value);
                e.target.value = '';
              }
            }}
            className="text-[11px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer transition"
          >
            <option value="" disabled>
              + Insert standard clause...
            </option>
            {STANDARD_TERMS_PRESETS.map((p, i) => (
              <option key={i} value={p.clause}>
                {p.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-[11px] text-slate-400 hover:text-slate-700 transition"
            title="Reset to standard defaults"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Clean Minimalist Bullet List Box */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 space-y-2 shadow-2xs focus-within:border-slate-300 transition">
        {clauses.map((clause, idx) => (
          <div key={idx} className="flex items-start gap-2.5 group">
            {/* Standard Round Bullet Dot */}
            <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-2 shrink-0 group-focus-within:bg-[#1d61e7] transition" />

            {/* Seamless Borderless Text Input */}
            <input
              type="text"
              value={clause}
              onChange={(e) => handleClauseChange(idx, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddClause('', idx + 1);
                } else if (e.key === 'Backspace' && clause === '' && clauses.length > 1) {
                  e.preventDefault();
                  handleRemoveClause(idx);
                }
              }}
              placeholder="Enter condition or requirement..."
              className="flex-1 text-xs text-slate-800 bg-transparent border-none p-0 focus:outline-none focus:ring-0 placeholder:text-slate-300 leading-relaxed font-normal"
            />

            {/* Subtle delete icon on hover */}
            <button
              type="button"
              onClick={() => handleRemoveClause(idx)}
              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition p-0.5 rounded"
              title="Remove bullet point"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* Minimal Add Bullet Button */}
        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleAddClause('')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1d61e7] hover:text-blue-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add bullet point
          </button>
          <span className="text-[10px] text-slate-400">Press Enter for next line</span>
        </div>
      </div>
    </div>
  );
};
