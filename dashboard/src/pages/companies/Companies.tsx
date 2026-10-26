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
  Globe,
  MapPin,
  Users,
  RotateCcw,
} from "lucide-react";
import type { Company, CompanyFormValues } from "../../types/company";
import { COMPANY_INDUSTRIES } from "../../types/company";
import {
  companyColumns,
  companyColumnOptions,
  companyCsvFields,
  industryStyles,
} from "../../columns/companyColumns";
import type { CompaniesFilter } from "../../types/companiesPage";
import CompanyForm from "../../components/ui/CompanyForm";
import DataTable, {
  TablePagination,
} from "../../components/ui/DataTable";
import FilterSidebar, {
  type FilterCheckboxSection,
} from "../../components/ui/FilterSidebar";
import TableSettings from "../../components/ui/TableSettings";
import CompanyDetailDialog from "../../components/ui/CompanyDetailDialog";

// Filter state as one object: one setter, one reset, one dependency.
const emptyFilters: CompaniesFilter = { industry: [], country: [] };

const toolbarButtonClass =
  "inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50";
const iconButtonClass = "rounded-md border p-2";
const iconButtonIdle = "border-slate-200 text-slate-500 hover:bg-slate-50";
const iconButtonActive = "border-blue-100 bg-blue-50 text-blue-600";
const searchInputClass =
  "rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-400 focus:bg-white";

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<CompaniesFilter>(emptyFilters);
  const [sortNewest, setSortNewest] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [view, setView] = useState<"list" | "grid">("list");
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailCompany, setDetailCompany] = useState<Company | null>(null);
  // `null` = form closed; otherwise the values to seed the form with.
  const [formValues, setFormValues] = useState<CompanyFormValues | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formCompanyId, setFormCompanyId] = useState<number | null>(null);

  // Esc closes the company detail dialog
  useEffect(() => {
    if (!detailCompany) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDetailCompany(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detailCompany]);

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();
    const active = (Object.keys(filters) as (keyof CompaniesFilter)[]).filter(
      key => filters[key].length > 0,
    );
    return companies
      .filter(company => {
        const matchesSearch = [
          company.name,
          company.industry,
          company.website,
          company.phone,
          company.city,
          company.state,
          company.country,
        ].some(value => value.toLowerCase().includes(query));
        if (!matchesSearch) return false;
        return active.every(key =>
          (filters[key] as string[]).includes(company[key]),
        );
      })
      .sort((a, b) =>
        sortNewest
          ? b.createdAt.localeCompare(a.createdAt)
          : a.createdAt.localeCompare(b.createdAt),
      );
  }, [companies, search, filters, sortNewest]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCompanies.length / pageSize),
  );
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageCompanies = filteredCompanies.slice(
    startIndex,
    startIndex + pageSize,
  );

  const visibleCompanyColumns = useMemo(() => {
    const base = companyColumns.filter(column => !hiddenColumns.includes(column.key));
    const snoCol = {
      key: "sno",
      header: "S.No",
      className: "w-14 text-center text-xs font-bold text-slate-900 whitespace-nowrap",
      headerClassName: "w-14 text-center whitespace-nowrap",
      cell: (_company: Company, index?: number) => (
        <span className="text-slate-900 font-bold">
          {startIndex + (index ?? 0) + 1}
        </span>
      ),
    };
    return [snoCol, ...base];
  }, [hiddenColumns, startIndex]);

  const hasActiveFilters =
    search !== "" || Object.values(filters).some(list => list.length > 0);

  function updateFilter(key: keyof CompaniesFilter, values: string[]) {
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
    setFormCompanyId(null);
    setFormValues({
      name: "",
      website: "",
      industry: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      country: "",
      notes: "",
    });
  }

  function openEditForm(company: Company) {
    setFormMode("edit");
    setFormCompanyId(company.id);
    setFormValues({
      name: company.name,
      website: company.website,
      industry: company.industry,
      phone: company.phone,
      address: company.address,
      city: company.city,
      state: company.state,
      country: company.country,
      notes: company.notes,
    });
    setDetailCompany(null);
  }

  function saveCompany(values: CompanyFormValues) {
    if (formCompanyId === null) {
      const today = new Date().toISOString().slice(0, 10);
      const nextId =
        companies.reduce((max, company) => Math.max(max, company.id), 0) + 1;
      setCompanies(previous => [
        {
          id: nextId,
          ...values,
          contactCount: 0,
          createdAt: today,
          updatedAt: today,
        },
        ...previous,
      ]);
      resetFilters();
    } else {
      setCompanies(previous =>
        previous.map(company =>
          company.id === formCompanyId
            ? {
                ...company,
                ...values,
                updatedAt: new Date().toISOString().slice(0, 10),
              }
            : company,
        ),
      );
    }
    setFormValues(null);
    setFormCompanyId(null);
  }

  function deleteCompany(id: number) {
    setCompanies(previous => previous.filter(company => company.id !== id));
    setSelectedIds(previous => previous.filter(item => item !== id));
    setDetailCompany(null);
  }

  function exportCsv() {
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [
      companyCsvFields.map(field => field.label),
      ...filteredCompanies.map(company =>
        companyCsvFields.map(field => field.get(company)),
      ),
    ]
      .map(row => row.map(escapeCsv).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "sales-crm-companies.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  // Distinct values present in the data, so filters never show dead options.
  const industryOptions = useMemo(() => {
    const present = new Set(
      companies.map(company => company.industry).filter(Boolean),
    );
    // Keep canonical order from the lookup list, then any extras.
    return [
      ...COMPANY_INDUSTRIES.filter(industry => present.has(industry)),
      ...[...present].filter(industry => !COMPANY_INDUSTRIES.includes(industry)),
    ];
  }, [companies]);

  const countryOptions = useMemo(
    () =>
      [...new Set(companies.map(company => company.country).filter(Boolean))].sort(),
    [companies],
  );

  const filterSections: FilterCheckboxSection[] = [
    {
      title: "Industry",
      items: industryOptions,
      selected: filters.industry,
      onChange: values => updateFilter("industry", values),
    },
    {
      title: "Country",
      items: countryOptions,
      selected: filters.country,
      onChange: values => updateFilter("country", values),
    },
  ];

  // Full-page create/edit form replaces the list while open
  if (formValues) {
    return (
      <div className="-m-4 md:-m-8">
        <CompanyForm
          mode={formMode}
          values={formValues}
          onClose={() => {
            setFormValues(null);
            setFormCompanyId(null);
          }}
          onSubmit={saveCompany}
        />
      </div>
    );
  }

  return (
    <div className="relative -m-4 min-h-[calc(100vh-64px)] bg-white text-slate-700 md:-m-8">
      {/* Page header */}
      <header className="flex min-h-[54px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-slate-800">Companies</h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
            {filteredCompanies.length} records
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
            Create Company
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
            columns={companyColumnOptions}
            hidden={hiddenColumns}
            onChange={setHiddenColumns}
          />
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex h-[calc(100vh-220px)] min-h-0 items-stretch overflow-hidden">
        {showFilters && (
          <FilterSidebar title="Filter Companies by" sections={filterSections} />
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
                placeholder="Search companies..."
                className={`${searchInputClass} w-full text-sm`}
              />
            </div>
          </div>

          {view === "list" ? (
            <DataTable<Company>
              columns={visibleCompanyColumns}
              rows={pageCompanies}
              getRowId={company => company.id}
              onRowClick={company => setDetailCompany(company)}
              selectable
              selectedIds={selectedIds}
              onSelectionChange={ids => setSelectedIds(ids as number[])}
              getRowLabel={company => company.name}
              renderRowMenu={company => (
                <>
                  <button
                    type="button"
                    onClick={() => setDetailCompany(company)}
                    className="w-full rounded px-3 py-2 text-left text-xs hover:bg-slate-50"
                  >
                    View details
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditForm(company)}
                    className="w-full rounded px-3 py-2 text-left text-xs hover:bg-slate-50"
                  >
                    Edit company
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => deleteCompany(company.id)}
                    className="w-full rounded px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50"
                  >
                    Delete company
                  </button>
                </>
              )}
              empty={
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <Search size={20} className="text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No companies found
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
              {pageCompanies.map(company => (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => setDetailCompany(company)}
                  className="rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                        <Building2 size={17} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {company.name}
                        </p>
                        {company.industry && (
                          <span
                            className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-medium ${
                              industryStyles[company.industry] ??
                              industryStyles.Other
                            }`}
                          >
                            {company.industry}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    {(
                      [
                        { Icon: Users, value: `${company.contactCount} contacts` },
                        { Icon: Globe, value: company.website || "No website" },
                        {
                          Icon: MapPin,
                          value:
                            [company.city, company.country]
                              .filter(Boolean)
                              .join(", ") || "No location",
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
              {pageCompanies.length === 0 && (
                <p className="col-span-full py-16 text-center text-sm text-slate-500">
                  No companies match your filters.
                </p>
              )}
            </div>
          )}

          <TablePagination
            total={filteredCompanies.length}
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

      {detailCompany && (
        <CompanyDetailDialog
          company={detailCompany}
          onClose={() => setDetailCompany(null)}
        />
      )}
    </div>
  );
}
