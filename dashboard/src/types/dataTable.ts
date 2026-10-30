import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T, index?: number) => ReactNode;
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
  itemLabel?: string;
};

export type DataTableProps<T> = {
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

export type DataTableCheckboxProps = {
  checked: boolean;
  onChange: () => void;
  label: string;
};
