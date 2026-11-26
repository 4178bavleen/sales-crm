import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Printer,
  Mail,
  MessageSquare,
  CreditCard,
  Edit2,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  Send,
  ExternalLink,
  X,
  Landmark,
  Info,
} from 'lucide-react';
import {
  fetchInvoiceById,
  downloadInvoicePdf,
  sendInvoiceEmail,
  sendInvoiceWhatsApp,
  recordInvoicePayment,
  fetchInvoiceSettings,
  formatInvoiceAmount,
  parseTermsList,
  cleanTermClause,
} from '../../lib/invoices';
import InvoiceFormDialog from '../../components/ui/InvoiceFormDialog';
import type { Invoice, InvoicePaymentMethod, InvoiceSetting } from '../../types/invoice';

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<InvoiceSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<InvoicePaymentMethod>('BANK_TRANSFER');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [syncToCashflow, setSyncToCashflow] = useState(true);
  const [recordingPayment, setRecordingPayment] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null);

  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState('');
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsAppResult, setWhatsAppResult] = useState<any | null>(null);

  const loadInvoice = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [inv, s] = await Promise.all([
        fetchInvoiceById(parseInt(id, 10)),
        fetchInvoiceSettings().catch(() => null),
      ]);
      setInvoice(inv);
      setSettings(s);
      setPaymentAmount(Number(inv.amountDue));
      setEmailRecipient(inv.customer?.primaryContact?.email || '');
      setWhatsAppPhone(
        inv.customer?.primaryContact?.phone || inv.customer?.company?.phone || ''
      );
    } catch (err: any) {
      console.error('[InvoiceView] Load error:', err);
      const isUserErr = err?.status && err.status < 500 && err.message && !err.message.includes('500');
      setError(isUserErr ? err.message : 'Unable to load invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const handleDownload = async () => {
    if (!invoice) return;
    try {
      await downloadInvoicePdf(invoice.id, invoice.invoiceNumber);
    } catch (err: any) {
      console.error('[InvoiceView] PDF download error:', err);
      alert('Unable to download PDF. Please try again.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || !paymentAmount || paymentAmount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    setRecordingPayment(true);
    try {
      await recordInvoicePayment(invoice.id, {
        amount: Number(paymentAmount),
        paymentMethod,
        reference: paymentReference.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
        syncToCashflow,
      });

      setShowPaymentModal(false);
      setPaymentReference('');
      setPaymentNotes('');
      await loadInvoice();
    } catch (err: any) {
      console.error('[InvoiceView] Payment error:', err);
      const isUserErr = err?.status && err.status < 500 && err.message && !err.message.includes('500');
      alert(isUserErr ? err.message : 'Failed to record payment. Please try again.');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || !emailRecipient) {
      alert('Recipient email is required');
      return;
    }

    setSendingEmail(true);
    setEmailFeedback(null);
    try {
      const res = await sendInvoiceEmail(invoice.id, {
        recipientEmail: emailRecipient,
        subject: emailSubject.trim() || undefined,
        message: emailMessage.trim() || undefined,
      });

      setEmailFeedback(res.note || 'Invoice email sent successfully with PDF attached');
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailFeedback(null);
        loadInvoice();
      }, 2000);
    } catch (err: any) {
      console.error('[InvoiceView] Email send error:', err);
      const isUserErr = err?.status && err.status < 500 && err.message && !err.message.includes('500');
      alert(isUserErr ? err.message : 'Failed to send invoice email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || !whatsAppPhone) {
      alert('Recipient phone is required');
      return;
    }

    setSendingWhatsApp(true);
    try {
      const res = await sendInvoiceWhatsApp(invoice.id, {
        recipientPhone: whatsAppPhone,
        customMessage: whatsAppMessage.trim() || undefined,
      });

      setWhatsAppResult(res);
      await loadInvoice();
    } catch (err: any) {
      console.error('[InvoiceView] WhatsApp error:', err);
      const isUserErr = err?.status && err.status < 500 && err.message && !err.message.includes('500');
      alert(isUserErr ? err.message : 'Failed to dispatch WhatsApp message. Please try again.');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const formatCurrency = (val: number | string) => {
    return formatInvoiceAmount(val, invoice?.currency || 'INR');
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <RotateCw className="w-8 h-8 animate-spin text-sky-500 mb-3" />
        <p className="text-sm font-medium">Loading invoice...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Invoice not found</h2>
        <p className="text-sm text-slate-500">{error || 'This invoice may have been deleted.'}</p>
        <button
          onClick={() => navigate('/invoices')}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </button>
      </div>
    );
  }

  // Theme edition accent colors
  const editionStyles: Record<string, { banner: string; text: string; light: string }> = {
    VIBRANT_TECH: { banner: 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white', text: 'text-sky-600', light: 'bg-sky-50' },
    MODERN_EXECUTIVE: { banner: 'bg-slate-900 text-white', text: 'text-indigo-600', light: 'bg-indigo-50' },
    CLASSIC_CORPORATE: { banner: 'bg-slate-800 text-white font-serif', text: 'text-slate-800 font-serif', light: 'bg-slate-100' },
    MINIMALIST_CLEAN: { banner: 'bg-white text-slate-900 border-b-2 border-slate-900', text: 'text-slate-900', light: 'bg-slate-50' },
  };

  const theme = editionStyles[invoice.templateEdition] || editionStyles.VIBRANT_TECH;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Action Toolbar (Hidden during print) */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/invoices')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            title="Back to list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{invoice.invoiceNumber}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-sky-100 text-sky-800">
                {invoice.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Created {new Date(invoice.createdAt).toLocaleDateString('en-IN')} by{' '}
              {invoice.createdBy?.name || 'Administrator'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {Number(invoice.amountDue) > 0 && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition"
            >
              <CreditCard className="w-4 h-4" />
              Record Payment
            </button>
          )}

          <button
            onClick={() => setShowEmailModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
          >
            <Mail className="w-4 h-4 text-sky-600" />
            Send Email
          </button>

          <button
            onClick={() => setShowWhatsAppModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            WhatsApp {settings?.whatsappNumber ? `(${settings.whatsappNumber})` : ''}
          </button>

          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            PDF
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            Print
          </button>

          <button
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
          >
            <Edit2 className="w-4 h-4 text-amber-600" />
            Edit
          </button>
        </div>
      </div>

      {/* Invoice Document Canvas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden print:border-none print:shadow-none">
        {/* Banner Header */}
        <div className={`p-8 ${theme.banner}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="flex items-center gap-5 sm:gap-6">
              <img
                src={settings?.companyLogo || '/favicon/favicon.png'}
                alt={settings?.companyName || 'Company Logo'}
                className="h-24 w-24 sm:h-32 sm:w-32 md:h-36 md:w-36 object-contain flex-shrink-0 drop-shadow-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/favicon/favicon.png';
                }}
              />
              <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {settings?.companyName || 'Vibrantick Infotech Solutions'}
                </h2>
                <p className="text-xs opacity-90 mt-1">
                  {settings?.addressLine1 || 'SCO 12, Level 2, IT Park'}, {settings?.city || 'Mohali'} • GSTIN: {settings?.gstin || '03ABCDE1234F1Z5'}
                </p>
                {(settings?.companyEmail || settings?.companyPhone) && (
                  <p className="text-xs opacity-80 mt-0.5">
                    {[settings.companyEmail, settings.companyPhone].filter(Boolean).join(' | ')}
                  </p>
                )}
              </div>
            </div>

            <div className="sm:text-right flex-shrink-0">
              <span className="text-xs uppercase tracking-wider opacity-80 font-mono">Invoice Number</span>
              <div className="text-2xl font-black font-mono tracking-tight">{invoice.invoiceNumber}</div>
              <div className="text-xs opacity-90 mt-1">
                Edition: {invoice.templateEdition.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Meta & Client Grid */}
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b border-slate-100">
            {/* Bill To */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Billed To</span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {invoice.customer?.company?.name || invoice.customer?.primaryContact?.fullName || 'Valued Client'}
                </h3>
                {invoice.customer?.primaryContact?.fullName && (
                  <p className="text-sm text-slate-600 mt-0.5">Attn: {invoice.customer.primaryContact.fullName}</p>
                )}
                {invoice.customer?.primaryContact?.email && (
                  <p className="text-sm text-slate-500 mt-0.5">{invoice.customer.primaryContact.email}</p>
                )}
                {invoice.customer?.primaryContact?.phone && (
                  <p className="text-sm text-slate-500">{invoice.customer.primaryContact.phone}</p>
                )}
                {(invoice.customer?.company?.address || invoice.customer?.company?.city) && (
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-sm">
                    {[
                      invoice.customer.company?.address,
                      invoice.customer.company?.city,
                      invoice.customer.company?.state,
                      invoice.customer.company?.country,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Dates & Details */}
            <div className="space-y-2 md:text-right flex flex-col justify-start md:items-end">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Invoice Timeline</span>
              <div className="text-sm space-y-1">
                <div className="flex justify-between md:justify-end gap-6 text-slate-600">
                  <span className="font-medium text-slate-400">Issue Date:</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(invoice.issueDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex justify-between md:justify-end gap-6 text-slate-600">
                  <span className="font-medium text-slate-400">Due Date:</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(invoice.dueDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex justify-between md:justify-end gap-6 text-slate-600">
                  <span className="font-medium text-slate-400">GST Tax Mode:</span>
                  <span className="font-semibold text-slate-800 font-mono text-xs">
                    {invoice.taxType.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-4">Item & Description</th>
                  <th className="py-3 px-3 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-3 text-center">Disc %</th>
                  <th className="py-3 px-3 text-center">GST %</th>
                  <th className="py-3 px-4 text-right">Amount ({invoice.currency || '₹'})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-4 px-3 text-slate-400 text-xs font-mono">{idx + 1}</td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-900">{item.itemName}</div>
                      {item.description && <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>}
                    </td>
                    <td className="py-4 px-3 text-center text-slate-700">{Number(item.quantity)}</td>
                    <td className="py-4 px-4 text-right font-mono text-slate-700">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="py-4 px-3 text-center text-slate-500">{Number(item.discountPercent)}%</td>
                    <td className="py-4 px-3 text-center text-slate-500">{Number(item.taxPercent)}%</td>
                    <td className="py-4 px-4 text-right font-bold text-slate-900 font-mono">
                      {formatCurrency(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Bank Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100 items-start">
            {/* Bank Instructions */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-sky-600" />
                Bank Transfer & UPI Instructions
              </h4>
              <div className="text-xs text-slate-600 space-y-1 font-mono">
                <div>
                  <span className="text-slate-400">Beneficiary:</span> Vibrantick Infotech Solutions
                </div>
                <div>
                  <span className="text-slate-400">Bank:</span> HDFC Bank (IT Park Branch)
                </div>
                <div>
                  <span className="text-slate-400">Account No:</span> 50200012345678
                </div>
                <div>
                  <span className="text-slate-400">IFSC Code:</span> {settings?.bankIfsc || 'HDFC0001234'}
                </div>
                <div>
                  <span className="text-slate-400">UPI ID:</span> {settings?.upiId || 'Not Configured'}
                </div>
                {settings?.whatsappNumber && (
                  <div className="pt-2 text-emerald-700 font-sans font-semibold">
                    WhatsApp Support: +91 {settings.whatsappNumber}
                  </div>
                )}
              </div>
            </div>

            {/* Calculations Box */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600 py-1">
                <span>Subtotal (Taxable):</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {formatCurrency(invoice.subtotal)}
                </span>
              </div>

              {Number(invoice.totalDiscount) > 0 && (
                <div className="flex justify-between text-emerald-600 py-1">
                  <span>Discount:</span>
                  <span className="font-semibold font-mono">
                    -{formatCurrency(invoice.totalDiscount)}
                  </span>
                </div>
              )}

              {invoice.taxType === 'INTRA_STATE' && (
                <>
                  <div className="flex justify-between text-slate-500 text-xs py-0.5">
                    <span>Central GST (CGST):</span>
                    <span className="font-mono">{formatCurrency(Number(invoice.taxAmount) / 2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-xs py-0.5">
                    <span>State GST (SGST):</span>
                    <span className="font-mono">{formatCurrency(Number(invoice.taxAmount) / 2)}</span>
                  </div>
                </>
              )}

              {invoice.taxType === 'INTER_STATE' && (
                <div className="flex justify-between text-slate-500 text-xs py-0.5">
                  <span>Integrated GST (IGST):</span>
                  <span className="font-mono">{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}

              <div className="pt-3 border-t-2 border-slate-900 flex justify-between items-center text-slate-900">
                <span className="text-base font-bold">Grand Total:</span>
                <span className="text-2xl font-black font-mono text-slate-900">
                  {formatCurrency(invoice.grandTotal)}
                </span>
              </div>

              {Number(invoice.amountPaid) > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold py-1">
                  <span>Amount Paid:</span>
                  <span className="font-mono">{formatCurrency(invoice.amountPaid)}</span>
                </div>
              )}

              <div className="flex justify-between text-rose-600 font-bold py-1 border-t border-slate-100">
                <span>Balance Due:</span>
                <span className="font-mono text-lg">{formatCurrency(invoice.amountDue)}</span>
              </div>
            </div>
          </div>

          {/* Notes & Terms - Clean, uncluttered layout matching modern documentation standards */}
          {(invoice.notes || invoice.terms) && (
            <div className="pt-8 border-t border-slate-100 space-y-6">
              {invoice.terms && (
                <div className="space-y-2.5">
                  <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                    Terms & Conditions
                  </h4>
                  <ul className="space-y-2">
                    {parseTermsList(invoice.terms).map((clause, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-2 shrink-0" />
                        <span>{cleanTermClause(clause)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {invoice.notes && (
                <div className="p-3.5 bg-slate-50 border-l-4 border-slate-900 rounded-r-xl">
                  <div className="font-bold text-slate-900 text-[11px] flex items-center gap-1.5 mb-1 tracking-wider uppercase">
                    <Info className="w-3.5 h-3.5 text-slate-700" />
                    NOTE
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {invoice.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Payment Receipts History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="pt-8 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Payment Receipts & Cashflow Link
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Reference</th>
                      <th className="py-2.5 px-3">Cashflow Sync</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 px-3 text-slate-700">
                          {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{p.paymentMethod.replace('_', ' ')}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono">{p.reference || '—'}</td>
                        <td className="py-2.5 px-3">
                          {p.financialTransactionId ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Synced to Income
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Manual</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                          {formatCurrency(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Record Payment
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Payment Amount ({invoice.currency || '₹'})</label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  max={Number(invoice.amountDue)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || '')}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  required
                />
                <p className="text-[11px] text-slate-400">Total balance due: {formatCurrency(invoice.amountDue)}</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as InvoicePaymentMethod)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="UPI">UPI</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Transaction Reference #</label>
                <input
                  type="text"
                  placeholder="e.g. UTR / Cheque # / UPI Ref"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800">
                <input
                  type="checkbox"
                  id="syncCashflow"
                  checked={syncToCashflow}
                  onChange={(e) => setSyncToCashflow(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="syncCashflow" className="cursor-pointer font-medium">
                  Automatically sync to Expense & Income Management (Client Payment)
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  {recordingPayment ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-sky-600" />
                Dispatch Invoice via Email
              </h3>
              <button onClick={() => setShowEmailModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {emailFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {emailFeedback}
              </div>
            )}

            <form onSubmit={handleSendEmail} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Recipient Email</label>
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email Subject</label>
                <input
                  type="text"
                  placeholder={`Tax Invoice #${invoice.invoiceNumber} from Vibrantick Infotech Solutions`}
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Custom Message (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Additional note to client..."
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-800">
                📎 <strong>Invoice-{invoice.invoiceNumber}.pdf</strong> will be rendered and attached automatically.
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1d61e7] hover:bg-[#1853c7] rounded-lg shadow-sm"
                >
                  {sendingEmail ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {sendingEmail ? 'Dispatching...' : 'Send Invoice Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send WhatsApp Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                WhatsApp Delivery {settings?.whatsappNumber ? `(Official: ${settings.whatsappNumber})` : ''}
              </h3>
              <button
                onClick={() => {
                  setShowWhatsAppModal(false);
                  setWhatsAppResult(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendWhatsApp} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Client WhatsApp Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210 or 919876543210"
                  value={whatsAppPhone}
                  onChange={(e) => setWhatsAppPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Custom Message (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Optional custom message to prepend..."
                  value={whatsAppMessage}
                  onChange={(e) => setWhatsAppMessage(e.target.value)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 space-y-1">
                <p>
                  <strong>Sender Number:</strong> {settings?.whatsappNumber ? `+91 ${settings.whatsappNumber}` : 'Not configured'} {settings?.companyName ? `(${settings.companyName})` : ''}
                </p>
                <p className="text-[11px] text-emerald-700">
                  Dual dispatch mode: automated Cloud API trigger + 1-click direct WhatsApp Web/App pre-formatted link.
                </p>
              </div>

              {whatsAppResult && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    WhatsApp Link & Message Ready!
                  </div>
                  <p className="text-slate-500">{whatsAppResult.note}</p>
                  <a
                    href={whatsAppResult.directWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition shadow-sm text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Launch WhatsApp Web / App Now
                  </a>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowWhatsAppModal(false);
                    setWhatsAppResult(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={sendingWhatsApp}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  {sendingWhatsApp ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {sendingWhatsApp ? 'Preparing...' : 'Generate & Dispatch WhatsApp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      <InvoiceFormDialog
        isOpen={showEditModal}
        mode="edit"
        invoiceId={invoice.id}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => {
          setShowEditModal(false);
          loadInvoice();
        }}
      />
    </div>
  );
}
