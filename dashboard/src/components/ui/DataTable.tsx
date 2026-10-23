import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import type {
  DataTableCheckboxProps,
  DataTableProps,
  TablePaginationProps,
} from "../../types/dataTable";

export type {
  DataTableColumn,
  DataTableProps,
  TablePaginationProps,
} from "../../types/dataTable";

function Checkbox({ checked, onChange, label }: DataTableCheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
    />
  );
}

export function TablePagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, total);

  // Generate pagination pages like: 1, 2, 3, 4, 5, ..., 25
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  };

  const pages = getPageNumbers();

  return (
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-white px-5 py-3.5">
      <div className="text-xs text-slate-600">
        Showing <span className="font-semibold text-slate-800">{startIndex}–{endIndex}</span> of{" "}
        <span className="font-semibold text-slate-800">{total}</span> leads
      </div>

      <div className="flex items-center gap-2">
        {/* Previous page */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pages.map((p, index) => {
            if (p === "...") {
              return (
                <span key={`ellipsis-${index}`} className="px-1 text-xs text-slate-400">
                  ...
                </span>
              );
            }
            const pageNum = p as number;
            const isActive = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium transition ${
                  isActive
                    ? "border border-blue-600 bg-white font-semibold text-blue-600 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next page */}
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>

        {/* Page size select */}
        <div className="ml-2">
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none hover:border-slate-300"
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        </div>
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
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);

  // Close row actions menu on click outside, scroll, or resize
  useEffect(() => {
    if (openMenuId === null) return;
    function close() {
      setOpenMenuId(null);
      setMenuPosition(null);
    }
    document.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
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
    <div className="w-full overflow-x-auto">
      <table className={`w-full ${minWidth} border-collapse text-left text-slate-800`}>
        <thead>
          <tr className="border-b border-slate-200 bg-white">
            {selectable && (
              <th className="w-10 px-4 py-3.5">
                <Checkbox
                  checked={allSelected}
                  onChange={toggleAll}
                  label="Select all rows"
                />
              </th>
            )}
            {columns.map(column => (
              <th
                key={column.key}
                className={`whitespace-nowrap px-4 py-3.5 text-xs font-semibold text-slate-700 ${
                  column.headerClassName ?? ""
                }`}
              >
                {column.header}
              </th>
            ))}
            {renderRowMenu && (
              <th className="whitespace-nowrap px-4 py-3.5 text-right text-xs font-semibold text-slate-700">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
          {rows.map((row, index) => {
            const id = getRowId(row);
            const isSelected = selectedIds.includes(id);
            return (
              <tr
                key={id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`group transition-colors hover:bg-slate-50/70 ${
                  isSelected ? "bg-blue-50/30" : "bg-white"
                } ${onRowClick ? "cursor-pointer" : ""} ${
                  openMenuId === id ? "relative z-30" : ""
                }`}
              >
                {selectable && (
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleRow(id)}
                      label={getRowLabel ? `Select ${getRowLabel(row)}` : "Select row"}
                    />
                  </td>
                )}
                {columns.map(column => (
                  <td key={column.key} className={`px-4 py-3 text-xs text-slate-800 ${column.className ?? ""}`}>
                    {column.cell(row, index)}
                  </td>
                ))}
                {renderRowMenu && (
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        if (openMenuId === id) {
                          setOpenMenuId(null);
                          setMenuPosition(null);
                          return;
                        }
                        const rect = e.currentTarget.getBoundingClientRect();
                        const spaceBelow = window.innerHeight - rect.bottom;
                        const openUp = spaceBelow < 250;
                        setMenuPosition({
                          top: openUp ? Math.max(10, rect.top - 240) : rect.bottom + 4,
                          right: Math.max(10, window.innerWidth - rect.right),
                        });
                        setOpenMenuId(id);
                      }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                      aria-label="Row actions"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="px-6 py-16 text-center">
                {empty ?? <p className="text-sm text-slate-500">No records found.</p>}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const activeRow = openMenuId !== null ? rows.find(r => getRowId(r) === openMenuId) : null;

  const content = (
    <>
      {table}
      {openMenuId !== null && menuPosition !== null && activeRow && renderRowMenu && createPortal(
        <div
          style={{
            position: "fixed",
            top: `${menuPosition.top}px`,
            right: `${menuPosition.right}px`,
          }}
          className="z-[9999] w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl text-left"
          onClick={e => {
            e.stopPropagation();
            setOpenMenuId(null);
            setMenuPosition(null);
          }}
        >
          {renderRowMenu(activeRow)}
        </div>,
        document.body,
      )}
    </>
  );

  if (!pagination) return content;
  return (
    <div>
      {content}
      <TablePagination {...pagination} />
    </div>
  );
}
