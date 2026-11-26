import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt,
  Plus,
  Search,
  RotateCw,
  Settings,
  Eye,
  Edit2,
  Trash2,
  Download,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  FileText,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import { TablePagination } from '../../components/ui/DataTable';
import InvoiceFormDialog from '../../components/ui/InvoiceFormDialog';
import { fetchInvoices, deleteInvoice, downloadInvoicePdf, fetchInvoiceSettings, formatInvoiceAmount } from '../../lib/invoices';
import type { Invoice, InvoiceStatus, InvoiceSummaryStats, InvoiceSetting } from '../../types/invoice';

export default function InvoicesList() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<InvoiceSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<InvoiceSummaryStats>({
    totalInvoiced: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    statusCounts: {},
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalCount, setTotalCount] = useState(0);

  const [searchInput, setSearchInput] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form Modal state (Opens centered on page)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState<'create' | 'edit'>('create');
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchInvoices({
        page,
        limit: pageSize,
        search: searchInput.trim() || undefined,
        status: selectedStatus !== 'ALL' ? (selectedStatus as InvoiceStatus) : undefined,
      });

      setInvoices(res.invoices);
      setTotalCount(res.pagination.total || 0);
      setSummary(res.summary);
    } catch (err: any) {
      console.error('[InvoicesList] Load failed:', err);
      const isUserErr = err?.status && err.status < 500 && err.message && !err.message.includes('500');
      setError(isUserErr ? err.message : 'Unable to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchInput, selectedStatus]);

  useEffect(() => {
    loadData();
    fetchInvoiceSettings().then(setSettings).catch(() => null);
  }, [loadData]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteInvoice(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      console.error('[InvoicesList] Delete error:', err);
      const isUserErr = err?.status && err.status < 500 && err.message && !err.message.includes('500');
      alert(isUserErr ? err.message : 'Failed to delete invoice. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async (inv: Invoice) => {
    try {
      await downloadInvoicePdf(inv.id, inv.invoiceNumber);
    } catch (err: any) {
      console.error('[InvoicesList] PDF download error:', err);
      alert('Unable to generate invoice PDF. Please try again.');
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Paid
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" /> Partially Paid
          </span>
        );
      case 'ISSUED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <FileText className="w-3 h-3 text-indigo-600" /> Issued
          </span>
        );
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Send className="w-3 h-3 text-purple-600" /> Sent
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" /> Overdue
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Cancelled
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Draft
          </span>
        );
    }
  };

  const formatCurrency = (val: number | string, currency = 'INR') => {
    return formatInvoiceAmount(val, currency);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#1d61e7]/10 text-[#1d61e7] rounded-xl">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoice Management</h1>
              <p className="text-sm text-slate-500">
                Custom editions, manual &amp; automated invoice dispatch, WhatsApp {settings?.whatsappNumber ? `(${settings.whatsappNumber})` : ''} &amp; Nodemailer email delivery
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/invoices/settings')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            Invoice Settings
          </button>
          <button
            onClick={() => {
              setFormModalMode('create');
              setEditingInvoiceId(null);
              setIsFormModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#1d61e7] hover:bg-[#1853c7] rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* KPI Cards using standard StatCard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Invoiced"
          value={formatCurrency(summary.totalInvoiced)}
          color="blue"
          icon={DollarSign}
          subtext={<span>{totalCount} total invoices issued</span>}
        />

        <StatCard
          label="Collected Revenue"
          value={formatCurrency(summary.totalPaid)}
          color="emerald"
          icon={TrendingUp}
          subtext={<span className="text-emerald-600 font-medium">Synced with Cashflow</span>}
        />

        <StatCard
          label="Outstanding Balance"
          value={formatCurrency(summary.totalOutstanding)}
          color="amber"
          icon={Clock}
          subtext={<span className="text-amber-600 font-medium">Pending client dues</span>}
        />

        <StatCard
          label="WhatsApp Support"
          value={settings?.whatsappNumber ? `+91 ${settings.whatsappNumber}` : 'Not configured'}
          color="emerald"
          icon={MessageSquare}
          subtext={<span>{settings?.companyName ? `${settings.companyName} route` : 'Official delivery route'}</span>}
        />
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by invoice #, customer name..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d61e7] focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              title="Refresh"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'ALL', label: 'All Invoices' },
            { id: 'DRAFT', label: 'Draft' },
            { id: 'ISSUED', label: 'Issued' },
            { id: 'SENT', label: 'Sent' },
            { id: 'PARTIALLY_PAID', label: 'Partially Paid' },
            { id: 'PAID', label: 'Paid' },
            { id: 'OVERDUE', label: 'Overdue' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedStatus(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                selectedStatus === tab.id
                  ? 'bg-[#1d61e7] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
              {summary.statusCounts[tab.id] ? (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                  {summary.statusCounts[tab.id]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-100 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Issue / Due Date</th>
                <th className="py-3 px-4">Edition</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1d61e7]" />
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium text-slate-600">No invoices found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchInput ? 'Try adjusting your search criteria' : 'Create your first invoice to get started'}
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-semibold text-[#1d61e7] hover:underline cursor-pointer">
                      <span onClick={() => navigate(`/invoices/${inv.id}`)}>{inv.invoiceNumber}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      {inv.customer?.company?.name ? (
                        <div>
                          <div className="font-bold text-slate-900">{inv.customer.company.name}</div>
                          {inv.customer?.primaryContact?.fullName && (
                            <div className="text-xs text-slate-500">
                              Attn: {inv.customer.primaryContact.fullName}
                              {inv.customer.primaryContact.phone ? ` • ${inv.customer.primaryContact.phone}` : ''}
                            </div>
                          )}
                        </div>
                      ) : inv.customer?.primaryContact?.fullName ? (
                        <div>
                          <div className="font-bold text-slate-900">{inv.customer.primaryContact.fullName}</div>
                          <div className="text-xs text-slate-400">
                            Individual Client {inv.customer.primaryContact.phone ? `• ${inv.customer.primaryContact.phone}` : ''}
                          </div>
                        </div>
                      ) : (
                        <div className="font-medium text-slate-500">
                          {inv.customer ? `Customer #${inv.customer.id}` : 'Direct Client'}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      <div className="font-medium text-slate-700">Issued: {new Date(inv.issueDate).toLocaleDateString('en-IN')}</div>
                      <div className="text-slate-400">Due: {new Date(inv.dueDate).toLocaleDateString('en-IN')}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      {inv.templateEdition === 'VIBRANT_TECH' && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                          Vibrant Tech
                        </span>
                      )}
                      {inv.templateEdition === 'MODERN_EXECUTIVE' && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
                          Executive Dark
                        </span>
                      )}
                      {inv.templateEdition === 'CLASSIC_CORPORATE' && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300 font-serif">
                          Classic Serif
                        </span>
                      )}
                      {inv.templateEdition === 'MINIMALIST_CLEAN' && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white text-slate-700 border border-slate-300">
                          Minimalist Clean
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                      {formatCurrency(inv.grandTotal, inv.currency)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium">
                      {Number(inv.amountDue) > 0 ? (
                        <span className="text-amber-600 font-semibold">{formatCurrency(inv.amountDue, inv.currency)}</span>
                      ) : (
                        <span className="text-emerald-600">{formatCurrency(0, inv.currency)}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">{getStatusBadge(inv.status)}</td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          title="View Invoice"
                          className="p-1.5 text-slate-500 hover:text-[#1d61e7] hover:bg-blue-50 rounded transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDownload(inv)}
                          title="Download PDF"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setFormModalMode('edit');
                            setEditingInvoiceId(inv.id);
                            setIsFormModalOpen(true);
                          }}
                          title="Edit"
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeleteTarget(inv)}
                          title="Delete"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Standard Table Pagination */}
        <TablePagination
          total={totalCount}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[10, 15, 25, 50]}
          itemLabel="invoices"
        />
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Delete Invoice?</h3>
            <p className="text-sm text-slate-500 mt-2">
              Are you sure you want to delete invoice{' '}
              <strong className="text-slate-700">{deleteTarget.invoiceNumber}</strong>? Invoices with recorded payments
              cannot be deleted.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow-sm"
              >
                {deleting ? 'Deleting...' : 'Delete Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Invoice Modal Dialog (Centered on page) */}
      <InvoiceFormDialog
        isOpen={isFormModalOpen}
        mode={formModalMode}
        invoiceId={editingInvoiceId}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={() => {
          setIsFormModalOpen(false);
          loadData();
        }}
      />
    </div>
  );
}
