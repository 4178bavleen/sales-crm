import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  RotateCw,
  Building,
  Layers,
  AlertCircle,
  Receipt,
  Sparkles,
  Eye,
  Check,
  User,
  Phone,
  Mail,
  Palette,
  Copy,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  createInvoice,
  updateInvoice,
  fetchInvoiceById,
  fetchInvoiceSettings,
  fetchNextInvoiceNumber,
  parseTermsList,
  cleanTermClause,
} from '../../lib/invoices';
import { TermsClauseManager } from './TermsClauseManager';
import { fetchCustomers } from '../../lib/customers';
import { fetchProductServices } from '../../lib/products-services';
import type {
  InvoiceTemplateEdition,
  InvoiceTaxType,
  InvoiceStatus,
  CreateInvoicePayload,
  InvoiceSetting,
} from '../../types/invoice';

// Standard Indian Statutory GST Slabs
export const GST_SLABS = [
  { rate: 18, label: '18% GST (Standard Services / IT)', tag: '18% Standard' },
  { rate: 12, label: '12% GST (Business Services)', tag: '12% Low' },
  { rate: 5, label: '5% GST (Reduced)', tag: '5% Reduced' },
  { rate: 0, label: '0% GST (Exempt / Nil-Rated)', tag: '0% Exempt' },
  { rate: 28, label: '28% GST (Luxury / High Slab)', tag: '28% Luxury' },
];

// Quick Vibrantick Professional Service Presets
export const SERVICE_PRESETS = [
  {
    name: 'Custom Web & Mobile Development',
    description: 'SAC: 998314 - Full-stack software engineering and architecture',
    unitPrice: 75000,
    taxPercent: 18,
  },
  {
    name: 'IT Consulting & Architecture Advisory',
    description: 'SAC: 998311 - Technical advisory, cloud strategy & system review',
    unitPrice: 45000,
    taxPercent: 18,
  },
  {
    name: 'UI/UX & Product Design System',
    description: 'SAC: 998315 - Interface design, prototyping & component library',
    unitPrice: 35000,
    taxPercent: 18,
  },
  {
    name: 'Monthly DevOps & Cloud Maintenance',
    description: 'SAC: 998313 - Infrastructure monitoring, security & SLA support',
    unitPrice: 30000,
    taxPercent: 18,
  },
];

interface FormItem {
  id?: number;
  productServiceId?: number | null;
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
}

export interface InvoiceFormDialogProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  invoiceId?: number | null;
  onClose: () => void;
  onSuccess: (invoice?: any) => void;
}

// Visual Edition Configuration & Theme Specs
export const TEMPLATE_EDITIONS: Array<{
  id: InvoiceTemplateEdition;
  name: string;
  subtitle: string;
  badge: string;
  accentColor: string;
  headerClass: string;
  previewBg: string;
  description: string;
}> = [
  {
    id: 'VIBRANT_TECH',
    name: 'Vibrant Tech',
    subtitle: 'VIS Cyan & Indigo Gradient',
    badge: 'Gradient Tech',
    accentColor: '#0284c7',
    headerClass: 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white',
    previewBg: 'bg-gradient-to-r from-sky-500 to-indigo-500',
    description: 'Modern dynamic gradient header with high-contrast tech typography and cyan accents.',
  },
  {
    id: 'MODERN_EXECUTIVE',
    name: 'Modern Executive',
    subtitle: 'Corporate Slate & Indigo',
    badge: 'Executive Dark',
    accentColor: '#4f46e5',
    headerClass: 'bg-slate-900 text-white',
    previewBg: 'bg-slate-900',
    description: 'Authoritative deep slate header bar with crisp indigo grid lines and bold metrics.',
  },
  {
    id: 'CLASSIC_CORPORATE',
    name: 'Classic Corporate',
    subtitle: 'Formal Serif & Ledger Frame',
    badge: 'Formal Serif',
    accentColor: '#1e293b',
    headerClass: 'bg-slate-800 text-white font-serif',
    previewBg: 'bg-slate-800',
    description: 'Traditional double-lined corporate border layout with elegant serif typography.',
  },
  {
    id: 'MINIMALIST_CLEAN',
    name: 'Minimalist Clean',
    subtitle: 'Swiss Monochrome Hairlines',
    badge: 'Monochrome',
    accentColor: '#0f172a',
    headerClass: 'bg-white text-slate-900 border-b-2 border-slate-900',
    previewBg: 'bg-slate-100 border border-slate-300 text-slate-900',
    description: 'Contemporary Scandinavian monochrome layout focusing purely on clean whitespace.',
  },
];

// Helper to reliably extract customer presentation data from backend response
export function resolveCustomerInfo(c: any) {
  if (!c) {
    return {
      title: 'Unknown Client',
      subtitle: '',
      companyName: '',
      contactName: '',
      phone: '',
      email: '',
      dropdownLabel: 'Unknown Client',
    };
  }

  // Handle company whether string, object, or nested details
  const companyName = (
    typeof c.company === 'string' && c.company !== '—' && c.company !== '-'
      ? c.company
      : c.company?.name || c.companyDetails?.name || c.companyName || ''
  ).trim();

  // Handle contact whether string, object, or nested details
  const contactName = (
    typeof c.primaryContact === 'string' && c.primaryContact !== '—' && c.primaryContact !== '-'
      ? c.primaryContact
      : c.primaryContact?.fullName ||
        c.contactDetails?.fullName ||
        c.primaryContactName ||
        c.contactPerson ||
        c.fullName ||
        ''
  ).trim();

  const phone = (
    c.contactDetails?.phone ||
    c.primaryContact?.phone ||
    c.companyDetails?.phone ||
    c.company?.phone ||
    c.phone ||
    ''
  ).trim();

  const email = (
    c.contactDetails?.email ||
    c.primaryContact?.email ||
    c.companyDetails?.email ||
    c.company?.email ||
    c.email ||
    ''
  ).trim();

  let title = '';
  let subtitle = '';

  if (companyName && contactName) {
    title = companyName;
    subtitle = `Contact: ${contactName}`;
  } else if (companyName) {
    title = companyName;
    subtitle = 'Corporate Account';
  } else if (contactName) {
    title = contactName;
    subtitle = 'Individual Client';
  } else {
    title = `Customer #${c.id}`;
    subtitle = 'Direct Account';
  }

  const parts = [title];
  if (subtitle) parts.push(`(${subtitle})`);
  if (phone) parts.push(`• ${phone}`);
  const dropdownLabel = parts.join(' ');

  return {
    title,
    subtitle,
    companyName: companyName || title,
    contactName,
    phone,
    email,
    dropdownLabel,
  };
}

export default function InvoiceFormDialog({
  isOpen,
  mode,
  invoiceId,
  onClose,
  onSuccess,
}: InvoiceFormDialogProps) {
  const isEdit = mode === 'edit' && Boolean(invoiceId);

  // Tabs: 'form' (interactive fields) vs 'preview' (live visual invoice sheet)
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingNumber, setFetchingNumber] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reference data
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState<InvoiceSetting | null>(null);

  // Form states
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [dealId, setDealId] = useState<number | ''>('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().slice(0, 10);
  });
  const [status, setStatus] = useState<InvoiceStatus>('DRAFT');
  const [templateEdition, setTemplateEdition] = useState<InvoiceTemplateEdition>('VIBRANT_TECH');
  const [taxType, setTaxType] = useState<InvoiceTaxType>('INTRA_STATE');
  const [totalDiscount, setTotalDiscount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState(
    '1. Payment is due within 15 days of invoice date.\n2. Please quote the invoice number when making electronic transfer.\n3. All disputes are subject to local jurisdiction.'
  );

  const [items, setItems] = useState<FormItem[]>([
    {
      itemName: 'Software Development & Consulting',
      description: 'Monthly retainership and delivery services',
      quantity: 1,
      unitPrice: 50000,
      discountPercent: 0,
      taxPercent: 18,
    },
  ]);

  // Selected customer object for preview and detail card
  const selectedCustomer = useMemo(() => {
    if (!customerId) return null;
    return customers.find((c) => c.id === Number(customerId)) || null;
  }, [customers, customerId]);

  const customerMeta = useMemo(() => {
    return resolveCustomerInfo(selectedCustomer);
  }, [selectedCustomer]);

  // Handle re-generating or refreshing next invoice number
  const handleRefreshInvoiceNumber = async () => {
    setFetchingNumber(true);
    try {
      const nextNum = await fetchNextInvoiceNumber();
      if (nextNum) {
        setInvoiceNumber(nextNum);
      }
    } catch (err: any) {
      console.warn('[InvoiceFormDialog] Auto-number fetch warning:', err);
    } finally {
      setFetchingNumber(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const [custRes, prodRes, settingsRes] = await Promise.all([
          fetchCustomers({ limit: 100 }).catch((err) => {
            console.error('[InvoiceFormDialog] Error fetching customers:', err);
            return { customers: [] };
          }),
          fetchProductServices().catch(() => ({ productServices: [] })),
          fetchInvoiceSettings().catch(() => null),
        ]);

        if (!isMounted) return;

        const customerList = Array.isArray(custRes)
          ? custRes
          : Array.isArray(custRes?.customers)
          ? custRes.customers
          : [];
        setCustomers(customerList);
        setProducts(prodRes?.productServices || []);
        setSettings(settingsRes);

        if (settingsRes && !isEdit) {
          setTemplateEdition(settingsRes.defaultTemplate || 'VIBRANT_TECH');
          setNotes(settingsRes.defaultNotes || 'Thank you for partnering with Vibrantick Infotech Solutions.');
          setTerms(
            settingsRes.defaultTerms ||
              '1. Payment is due within 15 days of invoice date.\n2. Please quote the invoice number when making electronic transfer.\n3. All disputes are subject to local jurisdiction.'
          );
        }

        if (isEdit && invoiceId) {
          const inv = await fetchInvoiceById(invoiceId);
          if (!isMounted) return;

          setCustomerId(inv.customerId || '');
          setDealId(inv.dealId || '');
          setInvoiceNumber(inv.invoiceNumber);
          setIssueDate(new Date(inv.issueDate).toISOString().slice(0, 10));
          setDueDate(new Date(inv.dueDate).toISOString().slice(0, 10));
          setStatus(inv.status);
          setTemplateEdition(inv.templateEdition);
          setTaxType(inv.taxType);
          setTotalDiscount(Number(inv.totalDiscount || 0));
          setNotes(inv.notes || '');
          setTerms(inv.terms || '');

          if (inv.items && inv.items.length > 0) {
            setItems(
              inv.items.map((i) => ({
                id: i.id,
                productServiceId: i.productServiceId || null,
                itemName: i.itemName,
                description: i.description || '',
                quantity: Number(i.quantity) || 1,
                unitPrice: Number(i.unitPrice) || 0,
                discountPercent: Number(i.discountPercent) || 0,
                taxPercent: Number(i.taxPercent) || 0,
              }))
            );
          }
        } else {
          // CREATE MODE: Automatically generate and populate next invoice number!
          try {
            const nextNum = await fetchNextInvoiceNumber();
            if (isMounted && nextNum) {
              setInvoiceNumber(nextNum);
            }
          } catch (numErr) {
            console.warn('[InvoiceFormDialog] Failed to preview next invoice number:', numErr);
          }
        }
      } catch (err: any) {
        console.error('[InvoiceFormDialog] Initialization error:', err);
        if (isMounted) {
          const isUserErr = err?.status && err.status < 500 && err.message && !err.message.includes('500');
          setError(isUserErr ? err.message : 'Unable to initialize invoice form. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [isOpen, isEdit, invoiceId]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        itemName: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        taxPercent: taxType === 'EXEMPT' ? 0 : 18,
      },
    ]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) {
      alert('Invoice must have at least one line item');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: keyof FormItem, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleSelectProduct = (idx: number, prodIdStr: string) => {
    const prodId = parseInt(prodIdStr, 10);
    const product = products.find((p) => p.id === prodId);
    if (!product) return;

    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        productServiceId: product.id,
        itemName: product.name,
        description: product.description || '',
        unitPrice: Number(product.unitPrice || 0),
        taxPercent: taxType === 'EXEMPT' ? 0 : 18,
      };
      return copy;
    });
  };

  const duplicateItem = (idx: number) => {
    setItems((prev) => {
      const target = prev[idx];
      const copy = [...prev];
      copy.splice(idx + 1, 0, { ...target });
      return copy;
    });
  };

  const moveItem = (idx: number, dir: 'up' | 'down') => {
    setItems((prev) => {
      const copy = [...prev];
      const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= copy.length) return prev;
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const applyGstToAll = (rate: number) => {
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        taxPercent: taxType === 'EXEMPT' ? 0 : rate,
      }))
    );
  };


  const computedTotals = useMemo(() => {
    let grossTotal = 0;
    let itemDiscountsTotal = 0;
    let subtotal = 0;
    let totalTax = 0;

    items.forEach((item) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice) || 0;
      const disc = Math.min(100, Math.max(0, Number(item.discountPercent) || 0));
      const effectiveTaxRate = taxType === 'EXEMPT' ? 0 : Number(item.taxPercent) || 0;

      const raw = qty * price;
      const itemDiscAmount = raw * (disc / 100);
      const taxable = Math.max(0, raw - itemDiscAmount);
      const tax = taxable * (effectiveTaxRate / 100);

      grossTotal += raw;
      itemDiscountsTotal += itemDiscAmount;
      subtotal += taxable;
      totalTax += tax;
    });

    const disc = Number(totalDiscount) || 0;
    const grandTotal = Math.max(0, subtotal + totalTax - disc);
    const effectiveTaxRate =
      subtotal > 0 ? (totalTax / subtotal) * 100 : Number(items[0]?.taxPercent) || 18;

    return {
      grossTotal,
      itemDiscountsTotal,
      subtotal,
      totalTax,
      effectiveTaxRate,
      cgst: taxType === 'INTRA_STATE' ? totalTax / 2 : 0,
      sgst: taxType === 'INTRA_STATE' ? totalTax / 2 : 0,
      igst: taxType === 'INTER_STATE' ? totalTax : 0,
      grandTotal,
    };
  }, [items, taxType, totalDiscount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError('Please select a customer for this invoice');
      setActiveTab('form');
      return;
    }

    if (items.some((i) => !i.itemName.trim())) {
      setError('Please provide an item description for all line items');
      setActiveTab('form');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateInvoicePayload = {
        customerId: Number(customerId),
        dealId: dealId ? Number(dealId) : null,
        invoiceNumber: invoiceNumber.trim() || undefined,
        issueDate,
        dueDate,
        status,
        templateEdition,
        taxType,
        currency: 'INR',
        totalDiscount: Number(totalDiscount) || 0,
        notes: notes.trim() || null,
        terms: terms.trim() || null,
        items: items.map((i) => ({
          productServiceId: i.productServiceId || null,
          itemName: i.itemName.trim(),
          description: i.description?.trim() || null,
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unitPrice) || 0,
          discountPercent: Number(i.discountPercent) || 0,
          taxPercent: taxType === 'EXEMPT' ? 0 : Number(i.taxPercent) || 0,
        })),
      };

      let result;
      if (isEdit && invoiceId) {
        result = await updateInvoice(invoiceId, payload);
      } else {
        result = await createInvoice(payload);
      }
      onSuccess(result);
    } catch (err: any) {
      console.error('[InvoiceFormDialog] Submit error:', err);
      const isUserErr = err?.status && err.status < 500 && err.message && !err.message.includes('500');
      setError(isUserErr ? err.message : 'Failed to save invoice. Please check the fields and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeThemeMeta = useMemo(() => {
    return TEMPLATE_EDITIONS.find((t) => t.id === templateEdition) || TEMPLATE_EDITIONS[0];
  }, [templateEdition]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-[60.6rem] rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Top Header with Navigation Tabs */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1d61e7]/10 flex items-center justify-center text-[#1d61e7] shadow-2xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {isEdit ? `Edit Invoice ${invoiceNumber || ''}` : 'Create New Invoice'}
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-[#1d61e7] border border-blue-200">
                  {activeThemeMeta.name}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isEdit
                  ? 'Update line items, tax details, customer notes or invoice styling'
                  : 'Generate a professional GST tax invoice with live calculations and edition preview'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Form vs Live Preview */}
            <div className="hidden sm:flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`px-3 py-1.5 rounded-md transition ${
                  activeTab === 'form'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Invoice Form
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  activeTab === 'preview'
                    ? 'bg-white text-[#1d61e7] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Live Design Preview
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher for mobile */}
        <div className="sm:hidden flex border-b border-slate-200 bg-slate-100 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-2 text-center border-b-2 ${
              activeTab === 'form'
                ? 'border-[#1d61e7] text-[#1d61e7] bg-white'
                : 'border-transparent text-slate-500'
            }`}
          >
            Invoice Form
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-2 text-center border-b-2 inline-flex items-center justify-center gap-1.5 ${
              activeTab === 'preview'
                ? 'border-[#1d61e7] text-[#1d61e7] bg-white'
                : 'border-transparent text-slate-500'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Live Preview
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <RotateCw className="w-8 h-8 animate-spin text-[#1d61e7] mb-2" />
              <p className="text-xs font-semibold text-slate-600">Loading invoice form & client data...</p>
            </div>
          ) : activeTab === 'preview' ? (
            /* TAB 2: LIVE TEMPLATE DESIGN PREVIEW */
            <div className="space-y-6">
              {/* Quick Edition Switcher Bar */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#1d61e7]" />
                  <span className="text-xs font-bold text-slate-800">Selected Template Edition:</span>
                  <span className="text-xs font-bold text-[#1d61e7]">{activeThemeMeta.name}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_EDITIONS.map((ed) => (
                    <button
                      key={ed.id}
                      type="button"
                      onClick={() => setTemplateEdition(ed.id)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition ${
                        templateEdition === ed.id
                          ? 'bg-[#1d61e7] text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {ed.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rendered Live Invoice Preview Sheet */}
              <div
                className={`bg-white rounded-xl border shadow-lg overflow-hidden transition-all ${
                  templateEdition === 'CLASSIC_CORPORATE'
                    ? 'border-2 border-slate-800 font-serif'
                    : templateEdition === 'MINIMALIST_CLEAN'
                    ? 'border border-slate-300'
                    : 'border-slate-200'
                }`}
              >
                {/* Header Banner */}
                <div className={`p-6 ${activeThemeMeta.headerClass}`}>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="flex items-center gap-4 sm:gap-6">
                      <img
                        src={settings?.companyLogo || '/favicon/favicon.png'}
                        alt={settings?.companyName || 'Company Logo'}
                        className="h-20 w-20 sm:h-28 sm:w-28 md:h-32 md:w-32 object-contain flex-shrink-0 drop-shadow-md"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/favicon/favicon.png';
                        }}
                      />
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                          {settings?.companyName || 'Vibrantick Infotech Solutions'}
                        </h2>
                        <p className="text-xs opacity-90 mt-0.5">
                          GSTIN: {settings?.gstin || '03ABCDE1234F1Z5'} • PAN: {settings?.panNumber || 'ABCDE1234F'}
                        </p>
                        <p className="text-xs opacity-80 mt-0.5">
                          {settings?.addressLine1 || 'SCO 12, IT Park'}, {settings?.city || 'Mohali'},{' '}
                          {settings?.state || 'Punjab'} - {settings?.pincode || '160071'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right sm:border-l sm:border-white/20 sm:pl-6 flex-shrink-0">
                      <div className="text-xs uppercase tracking-wider font-semibold opacity-80">Tax Invoice</div>
                      <div className="text-lg font-black font-mono mt-0.5">
                        {invoiceNumber || 'VIS-INV-PREVIEW'}
                      </div>
                      <div className="text-xs opacity-90 mt-1">
                        Status: <span className="font-bold underline">{status}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invoice Meta Grid */}
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-200 text-xs">
                    <div>
                      <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                        Billed To (Client):
                      </div>
                      <div className="font-bold text-slate-900 text-sm">{customerMeta.title}</div>
                      {customerMeta.contactName && (
                        <div className="text-slate-600 mt-0.5">Attn: {customerMeta.contactName}</div>
                      )}
                      {customerMeta.email && (
                        <div className="text-slate-500 mt-0.5">Email: {customerMeta.email}</div>
                      )}
                      {customerMeta.phone && (
                        <div className="text-slate-500 mt-0.5">Phone: {customerMeta.phone}</div>
                      )}
                    </div>

                    <div className="sm:text-right space-y-1">
                      <div>
                        <span className="text-slate-500">Invoice Date:</span>{' '}
                        <span className="font-semibold text-slate-800">
                          {new Date(issueDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Due Date:</span>{' '}
                        <span className="font-semibold text-slate-800">
                          {new Date(dueDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Place of Supply:</span>{' '}
                        <span className="font-semibold text-slate-800">
                          {taxType === 'INTRA_STATE'
                            ? 'Punjab (Intra-State)'
                            : taxType === 'INTER_STATE'
                            ? 'Inter-State (IGST)'
                            : 'Exempt / Non-GST'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b-2 border-slate-200 bg-slate-50/70 text-slate-600">
                          <th className="py-2.5 px-3 font-bold">#</th>
                          <th className="py-2.5 px-3 font-bold">Description</th>
                          <th className="py-2.5 px-3 text-right font-bold">Qty</th>
                          <th className="py-2.5 px-3 text-right font-bold">Rate</th>
                          <th className="py-2.5 px-3 text-right font-bold">Disc</th>
                          <th className="py-2.5 px-3 text-right font-bold">Tax</th>
                          <th className="py-2.5 px-3 text-right font-bold">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((it, idx) => {
                          const raw = (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0);
                          const disc = raw * ((Number(it.discountPercent) || 0) / 100);
                          const taxable = raw - disc;
                          const taxRate = taxType === 'EXEMPT' ? 0 : Number(it.taxPercent) || 0;
                          const lineTotal = taxable + taxable * (taxRate / 100);

                          return (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900">{it.itemName || 'Untitled Item'}</div>
                                {it.description && (
                                  <div className="text-[11px] text-slate-500 mt-0.5">{it.description}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-700">{it.quantity}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                ₹{Number(it.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                                {it.discountPercent > 0 ? `${it.discountPercent}%` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                                {taxType === 'EXEMPT' ? '0%' : `${it.taxPercent}%`}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">
                                ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations & Bank Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                    <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                        Payment Instructions & Bank Details
                      </div>
                      <div className="space-y-1 text-slate-600 text-[11px]">
                        <div>Bank: <span className="font-semibold text-slate-800">{settings?.bankName || 'HDFC Bank'}</span></div>
                        <div>Account No: <span className="font-mono font-semibold text-slate-800">{settings?.bankAccountNo || '50200012345678'}</span></div>
                        <div>IFSC: <span className="font-mono font-semibold text-slate-800">{settings?.bankIfsc || 'HDFC0001234'}</span></div>
                        <div>Branch: <span className="text-slate-800">{settings?.bankBranch || 'IT Park'}</span></div>
                        <div>UPI ID: <span className="font-mono text-[#1d61e7] font-semibold">{settings?.upiId || '8699792040@upi'}</span></div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Taxable Subtotal:</span>
                        <span className="font-semibold font-mono text-slate-900">
                          ₹{computedTotals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {totalDiscount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Overall Discount:</span>
                          <span className="font-semibold font-mono">
                            -₹{Number(totalDiscount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      {taxType === 'INTRA_STATE' && (
                        <>
                          <div className="flex justify-between text-slate-500 text-[11px]">
                            <span>CGST ({(computedTotals.effectiveTaxRate / 2).toFixed(1)}%):</span>
                            <span className="font-mono">
                              ₹{computedTotals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-500 text-[11px]">
                            <span>SGST ({(computedTotals.effectiveTaxRate / 2).toFixed(1)}%):</span>
                            <span className="font-mono">
                              ₹{computedTotals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </>
                      )}

                      {taxType === 'INTER_STATE' && (
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>IGST ({computedTotals.effectiveTaxRate.toFixed(1)}%):</span>
                          <span className="font-mono">
                            ₹{computedTotals.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      <div className="pt-2 border-t-2 border-slate-900 flex justify-between items-center text-slate-900">
                        <span className="font-bold text-xs uppercase tracking-wider">Grand Total (INR):</span>
                        <span className="font-black text-lg text-[#1d61e7] font-mono">
                          ₹{computedTotals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes & Terms - Clean documentation style */}
                  {(notes || terms) && (
                    <div className="pt-4 border-t border-slate-200 text-xs text-slate-700 space-y-3">
                      {terms && (
                        <div>
                          <div className="font-bold text-slate-900 text-xs mb-2">Terms & Conditions</div>
                          <ul className="space-y-1.5 pl-0.5">
                            {parseTermsList(terms).map((clause, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 shrink-0" />
                                <span>{cleanTermClause(clause)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {notes && (
                        <div className="p-2.5 bg-slate-50 border-l-4 border-slate-900 rounded-r-lg text-[11px] leading-relaxed">
                          <span className="font-bold text-slate-900 block mb-0.5 tracking-wider uppercase text-[10px]">
                            NOTE
                          </span>
                          <span className="text-slate-600">{notes}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* TAB 1: INTERACTIVE FORM */
            <>
              {/* 1. Client & Invoice Overview */}
              <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Building className="w-4 h-4 text-[#1d61e7]" />
                    Client & Invoice Details
                  </h4>
                  <span className="text-[11px] text-slate-400">Step 1 of 3</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Customer Selection */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Customer / Client <span className="text-rose-500">*</span></span>
                      {selectedCustomer && (
                        <span className="text-[11px] text-[#1d61e7] font-semibold">
                          Selected: {customerMeta.title}
                        </span>
                      )}
                    </label>
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1d61e7] shadow-2xs font-medium text-slate-800"
                      required
                    >
                      {loading ? (
                        <option value="">Loading customer records...</option>
                      ) : customers.length === 0 ? (
                        <option value="">No customer accounts found</option>
                      ) : (
                        <option value="">Choose Customer / Client ({customers.length} available)...</option>
                      )}
                      {customers.map((c) => {
                        const info = resolveCustomerInfo(c);
                        return (
                          <option key={c.id} value={c.id}>
                            {info.dropdownLabel}
                          </option>
                        );
                      })}
                    </select>

                    {/* Rich Customer Information Card when selected */}
                    {selectedCustomer && (
                      <div className="mt-2.5 p-3 bg-white rounded-xl border border-blue-100 shadow-2xs flex flex-wrap items-center gap-y-2 gap-x-4 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                          <Building className="w-3.5 h-3.5 text-[#1d61e7]" />
                          <span>{customerMeta.title}</span>
                        </div>
                        {customerMeta.contactName && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{customerMeta.contactName}</span>
                          </div>
                        )}
                        {customerMeta.phone && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{customerMeta.phone}</span>
                          </div>
                        )}
                        {customerMeta.email && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Mail className="w-3.5 h-3.5 text-sky-600" />
                            <span>{customerMeta.email}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Invoice Number with Auto-Generation Support */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        Invoice Number <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleRefreshInvoiceNumber}
                        disabled={fetchingNumber}
                        className="text-[11px] text-[#1d61e7] hover:underline inline-flex items-center gap-1 font-semibold disabled:opacity-50"
                        title="Generate next auto-sequence number"
                      >
                        <Sparkles className="w-3 h-3" />
                        {fetchingNumber ? 'Generating...' : 'Auto-Gen'}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="e.g. VIS-INV-2026-1001"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1d61e7] font-mono font-semibold text-slate-900 shadow-2xs"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Auto-generated sequence from VIS system settings. Editable if required.
                    </p>
                  </div>

                  {/* Issue Date */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Issue Date</label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1d61e7] shadow-2xs"
                      required
                    />
                  </div>

                  {/* Due Date */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1d61e7] shadow-2xs"
                      required
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Initial Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1d61e7] shadow-2xs font-semibold"
                    >
                      <option value="DRAFT">Draft (Internal)</option>
                      <option value="ISSUED">Issued (Ready to deliver)</option>
                      <option value="SENT">Sent to Customer</option>
                      <option value="PAID">Mark as Paid</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>

                  {/* GST Tax Mode */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">GST Mode / Place of Supply</label>
                    <select
                      value={taxType}
                      onChange={(e) => setTaxType(e.target.value as InvoiceTaxType)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1d61e7] shadow-2xs font-medium"
                    >
                      <option value="INTRA_STATE">Intra-State: CGST + SGST (50% / 50%)</option>
                      <option value="INTER_STATE">Inter-State: IGST (100%)</option>
                      <option value="EXEMPT">Exempt / Non-GST (0%)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Visual Edition & Theme Picker */}
              <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Palette className="w-4 h-4 text-[#1d61e7]" />
                      Invoice Theme & Design Edition
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Choose an edition to preview its layout, typography and color banner
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className="inline-flex items-center gap-1 text-xs text-[#1d61e7] hover:underline font-bold"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview Full Page
                  </button>
                </div>

                {/* 4 Interactive Visual Design Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  {TEMPLATE_EDITIONS.map((ed) => {
                    const isSelected = templateEdition === ed.id;
                    return (
                      <div
                        key={ed.id}
                        onClick={() => setTemplateEdition(ed.id)}
                        className={`cursor-pointer rounded-xl border p-3 flex flex-col justify-between transition-all relative overflow-hidden bg-white shadow-2xs ${
                          isSelected
                            ? 'border-[#1d61e7] ring-2 ring-[#1d61e7]/20 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#1d61e7] text-white flex items-center justify-center shadow-2xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}

                        <div>
                          {/* Mini Layout Mockup Bar */}
                          <div className={`h-8 rounded-lg mb-2.5 flex items-center px-2.5 ${ed.previewBg}`}>
                            <div className="w-2.5 h-2.5 rounded-full bg-white/70 mr-1.5" />
                            <div className="h-1.5 w-12 rounded-full bg-white/60" />
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">{ed.name}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{ed.subtitle}</p>
                          <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                            {ed.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-blue-50 text-[#1d61e7]'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {ed.badge}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {isSelected ? 'Active Theme' : 'Click to Select'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Line Items Table & GST Breakdown */}
              <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4 shadow-2xs">
                {/* Header Toolbar */}
                <div className="space-y-3 pb-3 border-b border-slate-200">
                  {/* Row 1: Title + Set GST pills */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="flex items-center gap-2 text-base font-bold text-slate-900">
                        <Layers className="w-5 h-5 text-[#1d61e7]" />
                        Invoice Line Items &amp; GST Rates
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 ml-7">
                        Configure services, statutory GST tax slabs, SAC codes, and line-level discounts.
                      </p>
                    </div>
                    {taxType !== 'EXEMPT' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-slate-500">Set GST:</span>
                        <button
                          type="button"
                          onClick={() => applyGstToAll(18)}
                          className="px-3 py-1 text-xs font-bold rounded-lg bg-[#1d61e7] text-white hover:bg-[#1853c7] transition"
                          title="Apply 18% standard GST to all line items"
                        >
                          18% GST
                        </button>
                        <button
                          type="button"
                          onClick={() => applyGstToAll(12)}
                          className="px-3 py-1 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                          title="Apply 12% GST to all line items"
                        >
                          12% GST
                        </button>
                        <button
                          type="button"
                          onClick={() => applyGstToAll(0)}
                          className="px-3 py-1 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                          title="Apply 0% (Exempt) to all line items"
                        >
                          0% Exempt
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Row 2: Tax type status + item count + Add Item button */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                          taxType === 'INTRA_STATE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : taxType === 'INTER_STATE'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {taxType === 'INTRA_STATE'
                          ? 'Intra-State: CGST (50%) + SGST (50%)'
                          : taxType === 'INTER_STATE'
                          ? 'Inter-State: IGST (100%)'
                          : 'GST Exempt (0%)'}
                      </span>
                      <span className="text-slate-300 font-light">|</span>
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#1d61e7] border border-blue-200">
                        <Layers className="w-3 h-3" />
                        {items.length} {items.length === 1 ? 'Item' : 'Items'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={addItem}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-[#1d61e7] hover:bg-[#1853c7] rounded-xl shadow-sm transition"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </button>
                  </div>
                </div>

                {/* Line Items Cards */}
                <div className="space-y-3.5">
                  {items.map((item, idx) => {
                    const raw = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                    const disc = raw * ((Number(item.discountPercent) || 0) / 100);
                    const taxable = Math.max(0, raw - disc);
                    const taxRate = taxType === 'EXEMPT' ? 0 : Number(item.taxPercent) || 0;
                    const taxAmount = taxable * (taxRate / 100);
                    const lineTotal = taxable + taxAmount;

                    return (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
                      >
                        {/* ── Header row ── */}
                        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="shrink-0 px-2 py-0.5 rounded-lg bg-blue-100 font-mono text-xs font-bold text-blue-700">
                              #{idx + 1}
                            </span>
                            <span className="text-sm font-bold text-slate-800 truncate">
                              {item.itemName || 'New Item'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {products.length > 0 && (
                              <select
                                onChange={(e) => handleSelectProduct(idx, e.target.value)}
                                defaultValue=""
                                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#1d61e7] min-w-[160px]"
                              >
                                <option value="" disabled>Auto-fill from Catalog...</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} (₹{Number(p.unitPrice).toLocaleString('en-IN')})
                                  </option>
                                ))}
                              </select>
                            )}

                            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => moveItem(idx, 'up')}
                                disabled={idx === 0}
                                className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 transition"
                                title="Move up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveItem(idx, 'down')}
                                disabled={idx === items.length - 1}
                                className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 transition"
                                title="Move down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => duplicateItem(idx)}
                              className="p-1.5 text-slate-400 hover:text-[#1d61e7] hover:bg-blue-50 rounded-lg transition"
                              title="Duplicate"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* ── Fields grid ── */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-3 px-4 py-4 items-start">

                          {/* Service / Item Title + SAC — col 5 */}
                          <div className="md:col-span-5 space-y-2">
                            <div>
                              <label className="text-xs font-semibold text-slate-700">
                                Service / Item Title <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Custom Web Application Development"
                                value={item.itemName}
                                onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                                className="mt-1 w-full px-3 py-2 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d61e7] focus:border-transparent"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-600">
                                SAC / Description
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. SAC: 998314 – Monthly retainership and delivery services"
                                value={item.description}
                                onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                className="mt-1 w-full px-3 py-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1d61e7]"
                              />
                            </div>
                          </div>

                          {/* Qty / Units — col 2 */}
                          <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-slate-700">Qty / Units</label>
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 1)}
                              className="mt-1 w-full px-3 py-2 text-sm font-mono font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d61e7] focus:border-transparent"
                              required
                            />
                            <p className="mt-1 text-[11px] text-slate-400 font-mono">
                              Base: ₹{raw.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </p>
                          </div>

                          {/* Rate — col 2 */}
                          <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-slate-700">Rate (₹)</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="mt-1 w-full px-3 py-2 text-sm font-mono font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d61e7] focus:border-transparent"
                              required
                            />
                            <p className="mt-1 text-[11px] text-slate-400 font-mono">
                              Taxable: ₹{taxable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </p>
                          </div>

                          {/* Disc % — col 1 */}
                          <div className="md:col-span-1">
                            <label className="text-xs font-semibold text-slate-700">Disc %</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPercent}
                              onChange={(e) => handleItemChange(idx, 'discountPercent', parseFloat(e.target.value) || 0)}
                              className="mt-1 w-full px-2.5 py-2 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d61e7] focus:border-transparent"
                            />
                            {disc > 0 && (
                              <p className="mt-1 text-[11px] text-emerald-600 font-mono font-semibold whitespace-nowrap">
                                −₹{disc.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </p>
                            )}
                          </div>

                          {/* GST Rate Slabs — col 2 */}
                          <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-slate-700">GST Rate Slabs</label>
                            {taxType === 'EXEMPT' ? (
                              <div className="mt-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-semibold text-slate-500">
                                0% (Exempt)
                              </div>
                            ) : (
                              <select
                                value={item.taxPercent}
                                onChange={(e) => handleItemChange(idx, 'taxPercent', parseFloat(e.target.value) || 0)}
                                className="mt-1 w-full px-2.5 py-2 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d61e7] focus:border-transparent"
                              >
                                {GST_SLABS.map((slab) => (
                                  <option key={slab.rate} value={slab.rate}>{slab.label}</option>
                                ))}
                              </select>
                            )}
                            {/* Tax breakdown pill */}
                            {taxRate > 0 && taxType !== 'EXEMPT' && (
                              <div className="mt-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-[11px] font-mono font-semibold text-blue-700 leading-snug">
                                {taxType === 'INTRA_STATE' && (
                                  <>CGST {(taxRate / 2).toFixed(1)}% + SGST {(taxRate / 2).toFixed(1)}%<br />= ₹{taxAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</>
                                )}
                                {taxType === 'INTER_STATE' && (
                                  <>IGST {taxRate}% = ₹{taxAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</>
                                )}
                              </div>
                            )}
                            {taxType === 'EXEMPT' && (
                              <p className="mt-1 text-[11px] text-slate-400 font-mono">Nil Rated</p>
                            )}
                          </div>
                        </div>

                        {/* ── Footer strip ── */}
                        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-blue-50/60 border-t border-blue-100 rounded-b-2xl">
                          <div className="flex items-center gap-4 text-[12px] text-slate-600">
                            <span>
                              Taxable Value:{' '}
                              <strong className="text-slate-800 font-mono">
                                ₹{taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </strong>
                            </span>
                            {taxRate > 0 && (
                              <>
                                <span className="text-slate-300">|</span>
                                <span>
                                  GST Amount ({taxRate}%):{' '}
                                  <strong className="text-slate-800 font-mono">
                                    ₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </strong>
                                </span>
                              </>
                            )}
                            {disc > 0 && (
                              <>
                                <span className="text-slate-300">|</span>
                                <span className="text-emerald-600 font-semibold font-mono">
                                  Discount: −₹{disc.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Line Total:</span>
                            <span className="text-base font-black font-mono text-[#1d61e7]">
                              ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Subtotal & Comprehensive GST Calculation Summary */}
                <div className="pt-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-end gap-5">
                  <div className="space-y-3 w-full md:w-72">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Extra Overall Discount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={totalDiscount}
                        onChange={(e) => setTotalDiscount(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1d61e7] font-mono shadow-2xs font-semibold"
                      />
                      <p className="text-[10px] text-slate-400">
                        Additional lumpsum discount applied directly to the net invoice total.
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] space-y-1 text-slate-600 shadow-2xs">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        GST Compliance Summary
                      </div>
                      <div>
                        Tax Regime:{' '}
                        <span className="font-semibold text-slate-900">
                          {taxType === 'INTRA_STATE'
                            ? 'Intra-State (Punjab)'
                            : taxType === 'INTER_STATE'
                            ? 'Inter-State (IGST)'
                            : 'Exempt / Non-GST'}
                        </span>
                      </div>
                      <div>
                        Total Items:{' '}
                        <span className="font-mono font-semibold text-slate-900">{items.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side Totals Card */}
                  <div className="w-full md:w-84 bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Gross Item Total:</span>
                      <span className="font-semibold text-slate-800 font-mono">
                        ₹{computedTotals.grossTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {computedTotals.itemDiscountsTotal > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Total Item Discounts:</span>
                        <span className="font-semibold font-mono">
                          -₹{computedTotals.itemDiscountsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-700 font-semibold pt-1 border-t border-slate-100">
                      <span>Net Taxable Value:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        ₹{computedTotals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Overall Invoice Discount:</span>
                        <span className="font-semibold font-mono">
                          -₹{Number(totalDiscount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {taxType === 'INTRA_STATE' && (
                      <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                        <div className="flex justify-between text-slate-600 text-[11px]">
                          <span>
                            CGST (Central GST @ {(computedTotals.effectiveTaxRate / 2).toFixed(1).replace(/\.0$/, '')}%):
                          </span>
                          <span className="font-mono font-medium text-slate-800">
                            ₹{computedTotals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600 text-[11px]">
                          <span>
                            SGST (State GST @ {(computedTotals.effectiveTaxRate / 2).toFixed(1).replace(/\.0$/, '')}%):
                          </span>
                          <span className="font-mono font-medium text-slate-800">
                            ₹{computedTotals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}

                    {taxType === 'INTER_STATE' && (
                      <div className="flex justify-between text-slate-600 text-[11px] pt-1.5 border-t border-slate-100">
                        <span>
                          IGST (Integrated GST @ {computedTotals.effectiveTaxRate.toFixed(1).replace(/\.0$/, '')}%):
                        </span>
                        <span className="font-mono font-medium text-slate-800">
                          ₹{computedTotals.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    <div className="pt-3 border-t-2 border-slate-900 flex justify-between items-center text-slate-900">
                      <span className="font-bold text-xs uppercase tracking-wider">Grand Total (INR):</span>
                      <span className="font-black text-xl text-[#1d61e7] font-mono">
                        ₹{computedTotals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Notes & Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Customer Notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instructions, project reference, or thank you note..."
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1d61e7] text-slate-800"
                  />
                </div>

                <TermsClauseManager
                  value={terms}
                  onChange={setTerms}
                  label="Terms & Conditions"
                  helperText="Each clause will appear as a separate numbered/bulleted line on customer invoice views and generated PDF."
                />
              </div>
            </>
          )}

          {/* Sticky Modal Bottom Footer */}
          <div className="border-t border-slate-200 pt-4 flex items-center justify-between sticky bottom-0 bg-white">
            <div className="text-xs text-slate-500 font-medium">
              Grand Total:{' '}
              <span className="font-black text-slate-900 font-mono">
                ₹{computedTotals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#1d61e7] hover:bg-[#1853c7] rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {submitting ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isEdit ? 'Update Invoice' : 'Create & Save Invoice'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
