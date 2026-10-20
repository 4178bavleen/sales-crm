import { useState } from "react";
import { Search, ChevronDown } from "lucide-react";

export type FilterCheckboxSection = {
  title: string;
  items: string[];
};

export type FilterSelect = {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

const selectClass =
  "rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600 outline-none hover:border-slate-300 focus:border-blue-500";

function FilterSection({
  title,
  items,
  query,
}: {
  title: string;
  items: string[];
  query: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const normalized = query.trim().toLowerCase();
  const visible = normalized
    ? items.filter(item => item.toLowerCase().includes(normalized))
    : items;
  if (visible.length === 0) return null;
  return (
    <section>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mb-2 flex w-full items-center gap-2 text-left text-xs font-semibold text-slate-700"
      >
        <ChevronDown
          size={14}
          className={`transition-transform ${expanded ? "" : "-rotate-90"}`}
        />
        <span>{title}</span>
      </button>
      {expanded && (
        <div className="space-y-1.5">
          {visible.map(item => (
            <label
              key={item}
              className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selected.includes(item)}
                onChange={() =>
                  setSelected(previous =>
                    previous.includes(item)
                      ? previous.filter(value => value !== item)
                      : [...previous, item],
                  )
                }
                className="mt-0.5 accent-blue-600"
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}

type FilterSidebarProps = {
  /** Heading, e.g. "Filter Leads by" */
  title?: string;
  /** Collapsible checkbox groups (dividers added between them) */
  sections?: FilterCheckboxSection[];
  /** Quick-filter dropdowns rendered under a "Quick Filters" heading */
  selects?: FilterSelect[];
  className?: string;
};

export default function FilterSidebar({
  title = "Filter by",
  sections = [],
  selects = [],
  className = "",
}: FilterSidebarProps) {
  const [query, setQuery] = useState("");
  return (
    <aside
      className={`hidden h-full w-[210px] shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-slate-200 bg-white p-4 lg:flex ${className}`}
    >
      <h2 className="mb-3 text-xs font-semibold text-slate-800">{title}</h2>
      <div className="relative mb-5">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search filters"
          className="w-full rounded-md border border-slate-200 py-2 pl-8 pr-2 text-xs outline-none focus:border-blue-400"
        />
      </div>
      <div className="space-y-5">
        {sections.map((section, index) => (
          <div
            key={section.title}
            className={index > 0 ? "border-t border-slate-100 pt-4" : undefined}
          >
            <FilterSection
              title={section.title}
              items={section.items}
              query={query}
            />
          </div>
        ))}
      </div>
      {selects.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="mb-3 text-xs font-semibold text-slate-700">
            Quick Filters
          </p>
          {selects.map((select, index) => (
            <label
              key={select.label}
              className={`block text-[11px] text-slate-500 ${
                index === selects.length - 1 ? "" : "mb-3"
              }`}
            >
              {select.label}
              <select
                value={select.value}
                onChange={e => select.onChange(e.target.value)}
                className={`${selectClass} mt-1.5 w-full`}
              >
                {select.options.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
    </aside>
  );
}
