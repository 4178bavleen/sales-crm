import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List,
  Download,
  Building2,
  Handshake,
  Layers,
  CircleDollarSign,
  RotateCcw,
} from "lucide-react";
import type { Customer, CustomerFormValues } from "../../types/customer";
import { CUSTOMER_OWNERS } from "../../types/customer";
import { initialCustomers } from "../../data/customers";
import {
  customerColumns,
  customerColumnOptions,
  customerCsvFields,
  formatCurrency,
} from "../../data/customerColumns";
import type { CustomersFilter } from "../../types/customersPage";
import { initialCompanies } from "../../data/companies";
import CustomerForm from "../../components/ui/CustomerForm";
import DataTable, {
  TablePagination,
} from "../../components/ui/DataTable";
import FilterSidebar, {
  type FilterCheckboxSection,
} from "../../components/ui/FilterSidebar";
import TableSettings from "../../components/ui/TableSettings";
import CustomerDetailDialog from "../../components/ui/CustomerDetailDialog";

// Filter state as one object: one setter, one reset, one dependency.
const emptyFilters: CustomersFilter = { industry: [], owner: [] };

const toolbarButtonClass =
  "inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50";
const iconButtonClass = "rounded-md border p-2";
const iconButtonIdle = "border-slate-200 text-slate-500 hover:bg-slate-50";
const iconButtonActive = "border-blue-100 bg-blue-50 text-blue-600";
const searchInputClass =
  "rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-400 focus:bg-white";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<CustomersFilter>(emptyFilters);
  const [sortNewest, setSortNewest] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [view, setView] = useState<"list" | "grid">("list");
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  // `null` = form closed; otherwise the values to seed the form with.
  const [formValues, setFormValues] = useState<CustomerFormValues | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formCustomerId, setFormCustomerId] = useState<number | null>(null);

  // Esc closes the customer detail dialog
  useEffect(() => {
    if (!detailCustomer) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDetailCustomer(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detailCustomer]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const active = (Object.keys(filters) as (keyof CustomersFilter)[]).filter(
      key => filters[key].length > 0,
    );
    return customers
      .filter(customer => {
        const matchesSearch = [
          customer.company,
          customer.industry,
          customer.primaryContact,
          customer.owner,
          customer.notes,
        ].some(value => value.toLowerCase().includes(query));
        if (!matchesSearch) return false;
        return active.every(key =>
          (filters[key] as string[]).includes(customer[key]),
        );
      })
      .sort((a, b) =>
        sortNewest
          ? b.convertedAt.localeCompare(a.convertedAt)
          : a.convertedAt.localeCompare(b.convertedAt),
      );
  }, [customers, search, filters, sortNewest]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCustomers.length / pageSize),
  );
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageCustomers = filteredCustomers.slice(
    startIndex,
    startIndex + pageSize,
  );

  const visibleCustomerColumns = useMemo(
    () => customerColumns.filter(column => !hiddenColumns.includes(column.key)),
    [hiddenColumns],
  );

  const hasActiveFilters =
    search !== "" || Object.values(filters).some(list => list.length > 0);

  function updateFilter(key: keyof CustomersFilter, values: string[]) {
    setFilters(previous => ({ ...previous, [key]: values }));
    setPage(1);
  }

  function resetFilters() {
    setSearch("");
    setFilters(emptyFilters);
    setPage(1);
  }

  function openCreateForm() {
    setFormMode("create");
    setFormCustomerId(null);
    setFormValues({
      company: "",
      primaryContact: "",
      owner: CUSTOMER_OWNERS[0] ?? "",
      convertedAt: new Date().toISOString().slice(0, 10),
      notes: "",
    });
  }

  function openEditForm(customer: Customer) {
    setFormMode("edit");
    setFormCustomerId(customer.id);
    setFormValues({
      company: customer.company,
      primaryContact: customer.primaryContact,
      owner: customer.owner,
      convertedAt: customer.convertedAt,
      notes: customer.notes,
    });
    setDetailCustomer(null);
  }

  function saveCustomer(values: CustomerFormValues) {
    // Industry is not a Customer column — it belongs to the linked Company, so
    // it is resolved from the companies seed exactly as the API would nest it.
    const industry =
      initialCompanies.find(company => company.name === values.company)?.industry ??
      "";
    if (formCustomerId === null) {
      const nextId =
        customers.reduce((max, customer) => Math.max(max, customer.id), 0) + 1;
      setCustomers(previous => [
        {
          id: nextId,
          ...values,
          industry,
          // A brand-new customer has no deals yet; metrics come from the Deal
          // relation once deals are attached.
          dealCount: 0,
          pipelineValue: 0,
          createdAt: values.convertedAt,
          updatedAt: values.convertedAt,
        },
        ...previous,
      ]);
      resetFilters();
    } else {
      setCustomers(previous =>
        previous.map(customer =>
          customer.id === formCustomerId
            ? {
                ...customer,
                ...values,
                industry,
                updatedAt: new Date().toISOString().slice(0, 10),
              }
            : customer,
        ),
      );
    }
    setFormValues(null);
    setFormCustomerId(null);
  }

  function deleteCustomer(id: number) {
    setCustomers(previous => previous.filter(customer => customer.id !== id));
    setSelectedIds(previous => previous.filter(item => item !== id));
    setDetailCustomer(null);
  }

  function exportCsv() {
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [
      customerCsvFields.map(field => field.label),
      ...filteredCustomers.map(customer =>
        customerCsvFields.map(field => field.get(customer)),
      ),
    ]
      .map(row => row.map(escapeCsv).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "sales-crm-customers.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  // Distinct values present in the data, so filters never show dead options.
  const industryOptions = useMemo(
    () =>
      [...new Set(customers.map(customer => customer.industry).filter(Boolean))].sort(),
    [customers],
  );

  const ownerOptions = useMemo(() => {
    const present = new Set(customers.map(customer => customer.owner).filter(Boolean));
    // Keep the canonical order from the owners list, then any extras.
    return [
      ...CUSTOMER_OWNERS.filter(owner => present.has(owner)),
      ...[...present].filter(owner => !CUSTOMER_OWNERS.includes(owner)),
    ];
  }, [customers]);

  const filterSections: FilterCheckboxSection[] = [
    {
      title: "Industry",
      items: industryOptions,
      selected: filters.industry,
      onChange: values => updateFilter("industry", values),
    },
    {
      title: "Owner",
      items: ownerOptions,
      selected: filters.owner,
      onChange: values => updateFilter("owner", values),
    },
  ];

  // Full-page create/edit form replaces the list while open
  if (formValues) {
    return (
      <div className="-m-4 md:-m-8">
        <CustomerForm
          mode={formMode}
          values={formValues}
          onClose={() => {
            setFormValues(null);
            setFormCustomerId(null);
          }}
          onSubmit={saveCustomer}
        />
      </div>
    );
  }

  return (
    <div className="relative -m-4 min-h-[calc(100vh-64px)] bg-white text-slate-700 md:-m-8">
      {/* Page header */}
      <header className="flex min-h-[54px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-slate-800">Customers</h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
            {filteredCustomers.length} records
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search records"
              className={`${searchInputClass} w-48 sm:w-56`}
            />
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-md border border-blue-500 bg-white px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50"
          >
            <Plus size={15} />
            Create Customer
          </button>
          <button
            type="button"
            onClick={exportCsv}
            title="Export CSV"
            className={`${iconButtonClass} ${iconButtonIdle}`}
          >
            <Download size={15} />
          </button>
        </div>
      </header>

      {/* Action toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`${toolbarButtonClass} ${
              showFilters ? "border-blue-100 bg-blue-50 text-blue-700" : ""
            }`}
          >
            <Filter size={14} />
            Filter
          </button>
          <button
            type="button"
            onClick={() => setSortNewest(!sortNewest)}
            className={toolbarButtonClass}
          >
            <ArrowUpDown size={14} />
            {sortNewest ? "Newest first" : "Oldest first"}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-xs text-blue-600 hover:bg-blue-50"
            >
              <RotateCcw size={13} />
              Reset
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {(
            [
              { key: "list", title: "List view", Icon: List },
              { key: "grid", title: "Grid view", Icon: LayoutGrid },
            ] as const
          ).map(({ key, title, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              title={title}
              className={`${iconButtonClass} ${
                view === key ? iconButtonActive : iconButtonIdle
              }`}
            >
              <Icon size={15} />
            </button>
          ))}
          <TableSettings
            columns={customerColumnOptions}
            hidden={hiddenColumns}
            onChange={setHiddenColumns}
          />
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex h-[calc(100vh-220px)] min-h-0 items-stretch overflow-hidden">
        {showFilters && (
          <FilterSidebar title="Filter Customers by" sections={filterSections} />
        )}

        <section className="flex min-w-0 flex-1 flex-col">
          {/* Mobile search */}
          <div className="shrink-0 border-b border-slate-100 p-3 sm:hidden">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search customers..."
                className={`${searchInputClass} w-full text-sm`}
              />
            </div>
          </div>

          {view === "list" ? (
            <DataTable<Customer>
              columns={visibleCustomerColumns}
              rows={pageCustomers}
              getRowId={customer => customer.id}
              onRowClick={customer => setDetailCustomer(customer)}
              selectable
              selectedIds={selectedIds}
              onSelectionChange={ids => setSelectedIds(ids as number[])}
              getRowLabel={customer => customer.company}
              renderRowMenu={customer => (
                <>
                  <button
                    type="button"
                    onClick={() => setDetailCustomer(customer)}
                    className="w-full rounded px-3 py-2 text-left text-xs hover:bg-slate-50"
                  >
                    View details
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditForm(customer)}
                    className="w-full rounded px-3 py-2 text-left text-xs hover:bg-slate-50"
                  >
                    Edit customer
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => deleteCustomer(customer.id)}
                    className="w-full rounded px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50"
                  >
                    Delete customer
                  </button>
                </>
              )}
              empty={
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <Search size={20} className="text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No customers found
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Try changing your search or filters.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-3 text-xs font-medium text-blue-600 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              }
            />
          ) : (
            <div className="grid min-h-0 flex-1 gap-3 overflow-auto p-4 sm:grid-cols-2 xl:grid-cols-3">
              {pageCustomers.map(customer => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => setDetailCustomer(customer)}
                  className="rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                        <Building2 size={17} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {customer.company}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {customer.industry || "No industry"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    {(
                      [
                        {
                          Icon: Handshake,
                          value: customer.owner || "No owner",
                        },
                        {
                          Icon: Layers,
                          value: `${customer.dealCount} ${
                            customer.dealCount === 1 ? "deal" : "deals"
                          }`,
                        },
                        {
                          Icon: CircleDollarSign,
                          value: formatCurrency(customer.pipelineValue),
                        },
                      ] as const
                    ).map(({ Icon, value }, index) => (
                      <p key={index} className="flex items-center gap-2">
                        <Icon size={13} className="shrink-0" />
                        <span className="truncate">{value}</span>
                      </p>
                    ))}
                  </div>
                </button>
              ))}
              {pageCustomers.length === 0 && (
                <p className="col-span-full py-16 text-center text-sm text-slate-500">
                  No customers match your filters.
                </p>
              )}
            </div>
          )}

          <TablePagination
            total={filteredCustomers.length}
            page={currentPage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={size => {
              setPageSize(size);
              setPage(1);
            }}
            selectedCount={selectedIds.length}
          />
        </section>
      </div>

      {detailCustomer && (
        <CustomerDetailDialog
          customer={detailCustomer}
          onClose={() => setDetailCustomer(null)}
        />
      )}
    </div>
  );
}
