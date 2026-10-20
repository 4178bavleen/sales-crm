import { useEffect, useState, type ReactNode } from "react";
import {
  CheckSquare,
  Square,
  SlidersHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Extra classes for the body cell (td) */
  className?: string;
  /** Extra classes for the header cell (th) */
  headerClassName?: string;
};

export type TablePaginationProps = {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  selectedCount?: number;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedIds?: (string | number)[];
  onSelectionChange?: (ids: (string | number)[]) => void;
  /** Accessible label for a row's select checkbox */
  getRowLabel?: (row: T) => string;
  /** Dropdown content for the trailing "…" actions column */
  renderRowMenu?: (row: T) => ReactNode;
  /** Content shown when rows is empty */
  empty?: ReactNode;
  /** Renders the pagination footer when provided */
  pagination?: TablePaginationProps;
  /** Table min-width (horizontal scroll threshold) */
  minWidth?: string;
};

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-label={label}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:text-blue-600"
    >
      {checked ? (
        <CheckSquare size={16} className="text-blue-600" />
      ) : (
        <Square size={16} />
      )}
    </button>
  );
}

export function TablePagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  selectedCount = 0,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>
          Total Records{" "}
          <strong className="font-semibold text-slate-800">{total}</strong>
        </span>
        {selectedCount > 0 && (
          <span className="rounded bg-blue-50 px-2 py-1 text-blue-700">
            {selectedCount} selected
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <label className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
          Rows
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            className="rounded border border-slate-200 bg-white px-2 py-1.5 outline-none"
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <span className="whitespace-nowrap text-xs text-slate-500">
          {total === 0 ? 0 : startIndex + 1}–
          {Math.min(startIndex + pageSize, total)} of {total}
        </span>
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="rounded border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="rounded border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </footer>
  );
}

export default function DataTable<T>({
  columns,
  rows,
  getRowId,
  onRowClick,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  getRowLabel,
  renderRowMenu,
  empty,
  pagination,
  minWidth = "min-w-[1050px]",
}: DataTableProps<T>) {
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);

  // Close the row actions menu on any click outside of it
  useEffect(() => {
    if (openMenuId === null) return;
    function close() {
      setOpenMenuId(null);
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenuId]);

  const rowIds = rows.map(getRowId);
  const allSelected =
    rows.length > 0 && rowIds.every(id => selectedIds.includes(id));

  function toggleAll() {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(selectedIds.filter(id => !rowIds.includes(id)));
    } else {
      onSelectionChange(Array.from(new Set([...selectedIds, ...rowIds])));
    }
  }

  function toggleRow(id: string | number) {
    if (!onSelectionChange) return;
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter(value => value !== id)
        : [...selectedIds, id],
    );
  }

  const colSpan = columns.length + (selectable ? 1 : 0) + (renderRowMenu ? 1 : 0);

  const table = (
    <div className="h-full overflow-auto">
      <table className={`w-full ${minWidth} border-collapse text-left`}>
        <thead className="sticky top-0 z-10 bg-slate-50">
          <tr className="border-b border-slate-200">
            {selectable && (
              <th className="w-10 px-3 py-3">
                <Checkbox
                  checked={allSelected}
                  onChange={toggleAll}
                  label="Select all visible rows"
                />
              </th>
            )}
            {columns.map(column => (
              <th
                key={column.key}
                className={`whitespace-nowrap border-l border-slate-200 px-3 py-3 text-[11px] font-semibold text-slate-600 ${
                  column.headerClassName ?? ""
                }`}
              >
                {column.header}
              </th>
            ))}
            {renderRowMenu && (
              <th className="w-10 border-l border-slate-200 px-3 py-3">
                <SlidersHorizontal size={14} className="text-slate-500" />
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const id = getRowId(row);
            return (
              <tr
                key={id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`group border-b border-slate-100 transition-colors hover:bg-blue-50/50 ${
                  onRowClick ? "cursor-pointer " : ""
                }${index % 2 === 1 ? "bg-slate-50/30" : "bg-white"}`}
              >
                {selectable && (
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(id)}
                      onChange={() => toggleRow(id)}
                      label={
                        getRowLabel ? `Select ${getRowLabel(row)}` : "Select row"
                      }
                    />
                  </td>
                )}
                {columns.map(column => (
                  <td key={column.key} className={`px-3 py-3 ${column.className ?? ""}`}>
                    {column.cell(row)}
                  </td>
                ))}
                {renderRowMenu && (
                  <td className="relative px-3 py-3" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(openMenuId === id ? null : id)
                      }
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Row actions"
                    >
                      <MoreHorizontal size={17} />
                    </button>
                    {openMenuId === id && (
                      <div
                        className="absolute right-8 top-8 z-20 w-44 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl"
                        onClick={() => setOpenMenuId(null)}
                      >
                        {renderRowMenu(row)}
                      </div>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="px-6 py-20 text-center">
                {empty ?? <p className="text-sm text-slate-500">No records found.</p>}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  if (!pagination) return table;
  return (
    <>
      {table}
      <TablePagination {...pagination} />
    </>
  );
}
