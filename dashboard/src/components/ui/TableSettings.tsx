import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { TableSettingsProps } from "../../types/tableSettings";

export type {
  TableSettingsColumn,
  TableSettingsProps,
} from "../../types/tableSettings";

/**
 * Toolbar button + popover for toggling table column visibility.
 * Keeps at least one column visible at all times.
 */
export default function TableSettings({
  columns,
  hidden,
  onChange,
  title = "Table settings",
}: TableSettingsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on click outside / Esc
  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visibleCount = columns.length - hidden.length;

  function toggle(key: string) {
    const isHidden = hidden.includes(key);
    if (!isHidden && visibleCount <= 1) return; // always keep one column
    onChange(isHidden ? hidden.filter(value => value !== key) : [...hidden, key]);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title={title}
        aria-label={title}
        aria-expanded={open}
        onClick={() => setOpen(previous => !previous)}
        className={`rounded-md border p-2 ${
          open
            ? "border-blue-100 bg-blue-50 text-blue-600"
            : "border-slate-200 text-slate-500 hover:bg-slate-50"
        }`}
      >
        <SlidersHorizontal size={15} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 z-30 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-xl"
          onClick={event => event.stopPropagation()}
        >
          <p className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Show columns
          </p>
          {columns.map(column => {
            const isChecked = !hidden.includes(column.key);
            const disabled = isChecked && visibleCount <= 1;
            return (
              <label
                key={column.key}
                className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs text-slate-600 ${
                  disabled
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={disabled}
                  onChange={() => toggle(column.key)}
                  className="accent-blue-600"
                />
                {column.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
