import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Package,
  Wrench,
  Plus,
  Search,
  RotateCw,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
} from "lucide-react";
import TableSettings, { type TableSettingsColumn } from "../../components/ui/TableSettings";
import {
  fetchProductServices,
  createProductService,
  updateProductService,
  deleteProductService,
  type ProductService,
  type ProductServiceType,
  type CreateProductServicePayload,
} from "../../lib/products-services";

const productColumnOptions: TableSettingsColumn[] = [
  { key: "id", label: "ID" },
  { key: "name", label: "Offering Name" },
  { key: "type", label: "Type" },
  { key: "description", label: "Description" },
  { key: "status", label: "Status" },
  { key: "createdAt", label: "Created Date" },
];

export default function ProductsServices() {
  const [items, setItems] = useState<ProductService[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | ProductServiceType>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "true" | "false">("ALL");

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductService | null>(null);
  const [deleteItem, setDeleteItem] = useState<ProductService | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<ProductServiceType>("PRODUCT");
  const [formDescription, setFormDescription] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetchProductServices({
        page,
        limit: pageSize,
        search: search.trim() || undefined,
        type: typeFilter === "ALL" ? undefined : typeFilter,
        isActive: statusFilter === "ALL" ? undefined : statusFilter,
      });
      setItems(res.productServices);
      setTotalCount(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      console.error("Failed to load products/services:", err);
      setApiError(
        err instanceof Error ? err.message : "Failed to load products and services",
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, typeFilter, statusFilter]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 600));
    try {
      await Promise.all([loadData(), minDelay]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quick summary counts
  const stats = useMemo(() => {
    const total = totalCount;
    const products = items.filter((i) => i.type === "PRODUCT").length;
    const services = items.filter((i) => i.type === "SERVICE").length;
    const active = items.filter((i) => i.isActive).length;
    return { total, products, services, active };
  }, [items, totalCount]);

  // Open Create Form
  const openCreateModal = () => {
    setEditingItem(null);
    setFormName("");
    setFormType("PRODUCT");
    setFormDescription("");
    setFormIsActive(true);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Form
  const openEditModal = (item: ProductService) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormType(item.type);
    setFormDescription(item.description || "");
    setFormIsActive(item.isActive);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Submit Create or Edit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formName.trim().length < 2) {
      setFormError("Name must be at least 2 characters long.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const payload: CreateProductServicePayload = {
        name: formName.trim(),
        type: formType,
        description: formDescription.trim() || null,
        isActive: formIsActive,
      };

      if (editingItem) {
        await updateProductService(editingItem.id, payload);
        showToast(`"${payload.name}" updated successfully.`);
      } else {
        await createProductService(payload);
        showToast(`"${payload.name}" created successfully.`);
      }

      setIsFormModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active status directly
  const handleToggleActive = async (item: ProductService) => {
    try {
      const updated = await updateProductService(item.id, {
        isActive: !item.isActive,
      });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      showToast(
        `"${item.name}" marked as ${updated.isActive ? "Active" : "Inactive"}.`,
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to update status",
        "error",
      );
    }
  };

  // Delete item
  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    try {
      setSubmitting(true);
      await deleteProductService(deleteItem.id);
      showToast(`"${deleteItem.name}" deleted successfully.`);
      setDeleteItem(null);
      loadData();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to delete item",
        "error",
      );
      setDeleteItem(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-sm transition-all animate-in fade-in slide-in-from-bottom-3 ${
            toastMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toastMessage.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Products & Services
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Manage your catalog offerings, service packages, and deal line items.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={loading || refreshing}
            title="Refresh list"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <RotateCw
              size={14}
              className={`text-slate-500 ${
                refreshing || loading ? "animate-spin text-blue-600" : ""
              }`}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Offerings</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#1d61e7]">
              <Layers size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Total catalog entries</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Products</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Package size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.products}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Physical & digital goods</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Services</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Wrench size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.services}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Consulting & operations</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Offerings</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{stats.active}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Available for leads & deals</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {(["ALL", "PRODUCT", "SERVICE"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setTypeFilter(type);
                  setPage(1);
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                  typeFilter === type
                    ? "bg-white text-slate-800 shadow-2xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {type === "ALL" ? "All Types" : type === "PRODUCT" ? "Products" : "Services"}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "ALL" | "true" | "false");
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-hidden transition cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>

          <TableSettings
            columns={productColumnOptions}
            hidden={hiddenColumns}
            onChange={setHiddenColumns}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {loading && !refreshing ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RotateCw className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-xs text-slate-400">Loading catalog...</p>
            </div>
          </div>
        ) : apiError ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="h-8 w-8 text-rose-500" />
            <p className="mt-2 text-sm font-semibold text-slate-800">Error loading data</p>
            <p className="mt-1 text-xs text-slate-500">{apiError}</p>
            <button
              type="button"
              onClick={loadData}
              className="mt-4 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <Package size={24} />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800">
              No products or services found
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {search || typeFilter !== "ALL" || statusFilter !== "ALL"
                ? "Try adjusting your search query or filters."
                : "Get started by adding your first product or service."}
            </p>
            {!search && typeFilter === "ALL" && statusFilter === "ALL" && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#1d61e7] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
              >
                <Plus size={14} />
                <span>Create Item</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  {!hiddenColumns.includes("id") && (
                    <th className="px-5 py-3 w-16 text-center">ID</th>
                  )}
                  {!hiddenColumns.includes("name") && (
                    <th className="px-5 py-3">Offering Name</th>
                  )}
                  {!hiddenColumns.includes("type") && (
                    <th className="px-5 py-3">Type</th>
                  )}
                  {!hiddenColumns.includes("description") && (
                    <th className="px-5 py-3">Description</th>
                  )}
                  {!hiddenColumns.includes("status") && (
                    <th className="px-5 py-3">Status</th>
                  )}
                  {!hiddenColumns.includes("createdAt") && (
                    <th className="px-5 py-3">Created</th>
                  )}
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const isProduct = item.type === "PRODUCT";
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {!hiddenColumns.includes("id") && (
                        <td className="px-5 py-3.5 text-center font-mono text-[11px] text-slate-400">
                          #{item.id}
                        </td>
                      )}

                      {!hiddenColumns.includes("name") && (
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                                isProduct
                                  ? "bg-indigo-50 text-indigo-600"
                                  : "bg-purple-50 text-purple-600"
                              }`}
                            >
                              {isProduct ? <Package size={15} /> : <Wrench size={15} />}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-800">
                                {item.name}
                              </span>
                            </div>
                          </div>
                        </td>
                      )}

                      {!hiddenColumns.includes("type") && (
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              isProduct
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                                : "bg-purple-50 text-purple-700 border border-purple-100"
                            }`}
                          >
                            {item.type}
                          </span>
                        </td>
                      )}

                      {!hiddenColumns.includes("description") && (
                        <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate">
                          {item.description || (
                            <span className="text-slate-300 italic">No description</span>
                          )}
                        </td>
                      )}

                      {!hiddenColumns.includes("status") && (
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(item)}
                            title={`Click to ${item.isActive ? "deactivate" : "activate"}`}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition cursor-pointer ${
                              item.isActive
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                item.isActive ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                            />
                            <span>{item.isActive ? "Active" : "Inactive"}</span>
                          </button>
                        </td>
                      )}

                      {!hiddenColumns.includes("createdAt") && (
                        <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                          {new Date(item.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                      )}

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            title="Edit"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteItem(item)}
                            title="Delete"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && totalCount > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-3">
            <div className="text-xs text-slate-500">
              Showing{" "}
              <strong className="font-semibold text-slate-700">
                {(page - 1) * pageSize + 1}
              </strong>{" "}
              to{" "}
              <strong className="font-semibold text-slate-700">
                {Math.min(page * pageSize, totalCount)}
              </strong>{" "}
              of <strong className="font-semibold text-slate-700">{totalCount}</strong>{" "}
              items
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-xs font-medium text-slate-600">
                  Page {page} of {totalPages || 1}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal Dialog */}
      {isFormModalOpen && (
        <div
          className="dialog-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={() => setIsFormModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="dialog-enter flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  {formType === "PRODUCT" ? <Package size={18} /> : <Wrench size={18} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingItem ? "Edit Offering" : "New Product or Service"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingItem ? "Update catalog details" : "Add a new item to catalog"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  {formError}
                </div>
              )}

              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Offering Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType("PRODUCT")}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition cursor-pointer ${
                      formType === "PRODUCT"
                        ? "border-blue-600 bg-blue-50/60 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Package size={15} />
                    <span>Product</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType("SERVICE")}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition cursor-pointer ${
                      formType === "SERVICE"
                        ? "border-purple-600 bg-purple-50/60 text-purple-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Wrench size={15} />
                    <span>Service</span>
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Enterprise License or Implementation Consulting"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden transition"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief details about scope, pricing, or deliverables..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden transition resize-none"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <div>
                  <span className="text-xs font-semibold text-slate-800">
                    Active in Catalog
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Available for assignment in leads and deal forms
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d61e7] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
                >
                  {submitting && (
                    <RotateCw size={13} className="animate-spin text-white" />
                  )}
                  <span>{editingItem ? "Save Changes" : "Create Item"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteItem && (
        <div
          className="dialog-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={() => setDeleteItem(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="dialog-enter flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-3.5">
                <Trash2 size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Delete "{deleteItem.name}"?
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete this offering? If it is already associated with existing leads or deals, the backend will prevent deletion and recommend deactivating it instead.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteItem(null)}
                disabled={submitting}
                className="w-1/2 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="w-1/2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
              >
                {submitting && (
                  <RotateCw size={13} className="animate-spin text-white" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
