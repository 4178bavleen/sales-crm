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
  Mail,
  Phone,
  RotateCcw,
} from "lucide-react";
import type { Contact, ContactFormValues } from "../../types/contact";
import { CONTACT_JOB_TITLES } from "../../types/contact";
import { initialContacts } from "../../data/contacts";
import {
  contactColumns,
  contactColumnOptions,
  contactCsvFields,
} from "../../data/contactColumns";
import type { ContactsFilter } from "../../types/contactsPage";
import ContactForm from "../../components/ui/ContactForm";
import DataTable, {
  TablePagination,
} from "../../components/ui/DataTable";
import FilterSidebar, {
  type FilterCheckboxSection,
} from "../../components/ui/FilterSidebar";
import TableSettings from "../../components/ui/TableSettings";
import ContactDetailDialog from "../../components/ui/ContactDetailDialog";
import Avatar from "../../components/ui/Avatar";

// Filter state as one object: one setter, one reset, one dependency.
const emptyFilters: ContactsFilter = { company: [], jobTitle: [] };

const toolbarButtonClass =
  "inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50";
const iconButtonClass = "rounded-md border p-2";
const iconButtonIdle = "border-slate-200 text-slate-500 hover:bg-slate-50";
const iconButtonActive = "border-blue-100 bg-blue-50 text-blue-600";
const searchInputClass =
  "rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-400 focus:bg-white";

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ContactsFilter>(emptyFilters);
  const [sortNewest, setSortNewest] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [view, setView] = useState<"list" | "grid">("list");
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  // `null` = form closed; otherwise the values to seed the form with.
  const [formValues, setFormValues] = useState<ContactFormValues | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formContactId, setFormContactId] = useState<number | null>(null);

  // Esc closes the contact detail dialog
  useEffect(() => {
    if (!detailContact) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDetailContact(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detailContact]);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const active = (Object.keys(filters) as (keyof ContactsFilter)[]).filter(
      key => filters[key].length > 0,
    );
    return contacts
      .filter(contact => {
        const matchesSearch = [
          contact.fullName,
          contact.company,
          contact.jobTitle,
          contact.email,
          contact.phone,
        ].some(value => value.toLowerCase().includes(query));
        if (!matchesSearch) return false;
        return active.every(key =>
          (filters[key] as string[]).includes(contact[key]),
        );
      })
      .sort((a, b) =>
        sortNewest
          ? b.createdAt.localeCompare(a.createdAt)
          : a.createdAt.localeCompare(b.createdAt),
      );
  }, [contacts, search, filters, sortNewest]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredContacts.length / pageSize),
  );
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageContacts = filteredContacts.slice(
    startIndex,
    startIndex + pageSize,
  );

  const visibleContactColumns = useMemo(
    () => contactColumns.filter(column => !hiddenColumns.includes(column.key)),
    [hiddenColumns],
  );

  const hasActiveFilters =
    search !== "" || Object.values(filters).some(list => list.length > 0);

  function updateFilter(key: keyof ContactsFilter, values: string[]) {
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
    setFormContactId(null);
    setFormValues({
      fullName: "",
      company: "",
      jobTitle: "",
      email: "",
      phone: "",
      notes: "",
    });
  }

  function openEditForm(contact: Contact) {
    setFormMode("edit");
    setFormContactId(contact.id);
    setFormValues({
      fullName: contact.fullName,
      company: contact.company,
      jobTitle: contact.jobTitle,
      email: contact.email,
      phone: contact.phone,
      notes: contact.notes,
    });
    setDetailContact(null);
  }

  function saveContact(values: ContactFormValues) {
    if (formContactId === null) {
      const today = new Date().toISOString().slice(0, 10);
      const nextId =
        contacts.reduce((max, contact) => Math.max(max, contact.id), 0) + 1;
      setContacts(previous => [
        {
          id: nextId,
          ...values,
          createdAt: today,
          updatedAt: today,
        },
        ...previous,
      ]);
      resetFilters();
    } else {
      setContacts(previous =>
        previous.map(contact =>
          contact.id === formContactId
            ? {
                ...contact,
                ...values,
                updatedAt: new Date().toISOString().slice(0, 10),
              }
            : contact,
        ),
      );
    }
    setFormValues(null);
    setFormContactId(null);
  }

  function deleteContact(id: number) {
    setContacts(previous => previous.filter(contact => contact.id !== id));
    setSelectedIds(previous => previous.filter(item => item !== id));
    setDetailContact(null);
  }

  async function copyEmail(email: string) {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // Clipboard access can be blocked; silently ignore.
    }
  }

  function exportCsv() {
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [
      contactCsvFields.map(field => field.label),
      ...filteredContacts.map(contact =>
        contactCsvFields.map(field => field.get(contact)),
      ),
    ]
      .map(row => row.map(escapeCsv).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "sales-crm-contacts.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  // Distinct values present in the data, so filters never show dead options.
  const companyOptions = useMemo(
    () => [...new Set(contacts.map(contact => contact.company).filter(Boolean))].sort(),
    [contacts],
  );
  const jobTitleOptions = useMemo(() => {
    const present = new Set(
      contacts.map(contact => contact.jobTitle).filter(Boolean),
    );
    // Keep the canonical order from the lookup list, then any extras.
    return [
      ...CONTACT_JOB_TITLES.filter(title => present.has(title)),
      ...[...present].filter(title => !CONTACT_JOB_TITLES.includes(title)),
    ];
  }, [contacts]);

  const filterSections: FilterCheckboxSection[] = [
    {
      title: "Company",
      items: companyOptions,
      selected: filters.company,
      onChange: values => updateFilter("company", values),
    },
    {
      title: "Job Title",
      items: jobTitleOptions,
      selected: filters.jobTitle,
      onChange: values => updateFilter("jobTitle", values),
    },
  ];

  // Full-page create/edit form replaces the list while open
  if (formValues) {
    return (
      <div className="-m-4 md:-m-8">
        <ContactForm
          mode={formMode}
          contact={formValues}
          onClose={() => {
            setFormValues(null);
            setFormContactId(null);
          }}
          onSubmit={saveContact}
        />
      </div>
    );
  }

  return (
    <div className="relative -m-4 min-h-[calc(100vh-64px)] bg-white text-slate-700 md:-m-8">
      {/* Page header */}
      <header className="flex min-h-[54px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-slate-800">Contacts</h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
            {filteredContacts.length} records
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
            Create Contact
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
            columns={contactColumnOptions}
            hidden={hiddenColumns}
            onChange={setHiddenColumns}
          />
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex h-[calc(100vh-220px)] min-h-0 items-stretch overflow-hidden">
        {showFilters && (
          <FilterSidebar title="Filter Contacts by" sections={filterSections} />
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
                placeholder="Search contacts..."
                className={`${searchInputClass} w-full text-sm`}
              />
            </div>
          </div>

          {view === "list" ? (
            <DataTable<Contact>
              columns={visibleContactColumns}
              rows={pageContacts}
              getRowId={contact => contact.id}
              onRowClick={contact => setDetailContact(contact)}
              selectable
              selectedIds={selectedIds}
              onSelectionChange={ids => setSelectedIds(ids as number[])}
              getRowLabel={contact => contact.fullName}
              renderRowMenu={contact => (
                <>
                  <button
                    type="button"
                    onClick={() => setDetailContact(contact)}
                    className="w-full rounded px-3 py-2 text-left text-xs hover:bg-slate-50"
                  >
                    View details
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditForm(contact)}
                    className="w-full rounded px-3 py-2 text-left text-xs hover:bg-slate-50"
                  >
                    Edit contact
                  </button>
                  <button
                    type="button"
                    onClick={() => copyEmail(contact.email)}
                    className="w-full rounded px-3 py-2 text-left text-xs hover:bg-slate-50"
                  >
                    Copy email
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => deleteContact(contact.id)}
                    className="w-full rounded px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50"
                  >
                    Delete contact
                  </button>
                </>
              )}
              empty={
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <Search size={20} className="text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No contacts found
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
              {pageContacts.map(contact => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => setDetailContact(contact)}
                  className="rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={contact.fullName} seed={contact.id} size={36} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {contact.fullName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {contact.jobTitle || "No job title"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    {(
                      [
                        { Icon: Building2, value: contact.company || "No company" },
                        { Icon: Mail, value: contact.email || "No email" },
                        { Icon: Phone, value: contact.phone || "No phone" },
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
              {pageContacts.length === 0 && (
                <p className="col-span-full py-16 text-center text-sm text-slate-500">
                  No contacts match your filters.
                </p>
              )}
            </div>
          )}

          <TablePagination
            total={filteredContacts.length}
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

      {detailContact && (
        <ContactDetailDialog
          contact={detailContact}
          onClose={() => setDetailContact(null)}
        />
      )}
    </div>
  );
}
