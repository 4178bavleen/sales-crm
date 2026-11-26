import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Landmark,
  FileText,
  RotateCw,
  Save,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Image as ImageIcon,
  Upload,
  Trash2,
  Lock,
} from 'lucide-react';
import { fetchInvoiceSettings, updateInvoiceSettings, resolveOrderNotice } from '../../lib/invoices';
import type { InvoiceTemplateEdition } from '../../types/invoice';
import { useSession } from '../../lib/useSession';

export default function InvoiceSettings() {
  const navigate = useNavigate();
  const session = useSession();

  // Access guard — only ADMIN can view/edit invoice settings
  if (session && session.user.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-500 space-y-4">
        <Lock className="w-12 h-12 text-slate-300" />
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-700">Access Restricted</p>
          <p className="text-sm text-slate-500 mt-1">
            Invoice settings can only be managed by an Administrator.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/invoices')}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1d61e7] hover:bg-[#1853c7] rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </button>
      </div>
    );
  }

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form fields
  const [companyName, setCompanyName] = useState('Vibrantick Infotech Solutions');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyEmail, setCompanyEmail] = useState('info@vibrantick.in');
  const [companyPhone, setCompanyPhone] = useState('+91 8699792040');
  const [whatsappNumber, setWhatsappNumber] = useState('8699792040');
  const [addressLine1, setAddressLine1] = useState('SCO 12, Level 2, IT Park');
  const [city, setCity] = useState('Mohali');
  const [state, setState] = useState('Punjab');
  const [country, setCountry] = useState('India');
  const [pincode, setPincode] = useState('160071');
  const [gstin, setGstin] = useState('03ABCDE1234F1Z5');
  const [panNumber, setPanNumber] = useState('ABCDE1234F');

  const [bankName, setBankName] = useState('HDFC Bank');
  const [bankAccountNo, setBankAccountNo] = useState('50200012345678');
  const [bankIfsc, setBankIfsc] = useState('HDFC0001234');
  const [bankBranch, setBankBranch] = useState('IT Park Branch');
  const [upiId, setUpiId] = useState('8699792040@upi');

  const [invoicePrefix, setInvoicePrefix] = useState('VIS');
  const [nextNumber, setNextNumber] = useState<number>(40);
  const [defaultTemplate, setDefaultTemplate] = useState<InvoiceTemplateEdition>('VIBRANT_TECH');
  const [brandColor, setBrandColor] = useState('#1d61e7');
  const [defaultNotes, setDefaultNotes] = useState(
    'Thank you for partnering with Vibrantick Infotech Solutions.'
  );
  const [orderNotice, setOrderNotice] = useState(
    'Order to be Placed - In favor of VIBRANTICK INFOTECH SOLUTIONS'
  );

  const [autoInvoiceOnDealWon, setAutoInvoiceOnDealWon] = useState(true);
  const [autoSyncCashflow, setAutoSyncCashflow] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const s = await fetchInvoiceSettings();
        if (s) {
          setCompanyName(s.companyName || 'Vibrantick Infotech Solutions');
          setCompanyLogo(s.companyLogo || null);
          setCompanyEmail(s.companyEmail || 'info@vibrantick.in');
          setCompanyPhone(s.companyPhone || '+91 8699792040');
          setWhatsappNumber(s.whatsappNumber || '8699792040');
          setAddressLine1(s.addressLine1 || '');
          setCity(s.city || 'Mohali');
          setState(s.state || 'Punjab');
          setCountry(s.country || 'India');
          setPincode(s.pincode || '');
          setGstin(s.gstin || '');
          setPanNumber(s.panNumber || '');

          setBankName(s.bankName || '');
          setBankAccountNo(s.bankAccountNo || '');
          setBankIfsc(s.bankIfsc || '');
          setBankBranch(s.bankBranch || '');
          setUpiId(s.upiId || '');

          let rawPrefix = s.invoicePrefix || 'VIS';
          if (/^VIS(?:-INV)?[-/]*$/i.test(rawPrefix)) {
            rawPrefix = 'VIS';
          }
          setInvoicePrefix(rawPrefix);
          setNextNumber(Number(s.nextNumber || 40));
          setDefaultTemplate(s.defaultTemplate || 'VIBRANT_TECH');
          setBrandColor(s.brandColor || '#1d61e7');
          setDefaultNotes(s.defaultNotes || '');
          setOrderNotice(resolveOrderNotice(null, s.defaultTerms, s.companyName));
          setAutoInvoiceOnDealWon(Boolean(s.autoInvoiceOnDealWon));
          setAutoSyncCashflow(Boolean(s.autoSyncCashflow));
        }
      } catch (err: any) {
        console.error('[InvoiceSettings] Load error:', err);
        setErrorMsg('Unable to load invoice settings. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleOrderNoticeChange = (val: string) => {
    setOrderNotice(val);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const finalTerms =
        orderNotice.trim() ||
        `Order to be Placed - In favor of ${(companyName || 'Vibrantick Infotech Solutions').toUpperCase()}`;

      await updateInvoiceSettings({
        companyName,
        companyLogo,
        companyEmail,
        companyPhone,
        whatsappNumber,
        addressLine1,
        city,
        state,
        country,
        pincode,
        gstin,
        panNumber,
        bankName,
        bankAccountNo,
        bankIfsc,
        bankBranch,
        upiId,
        invoicePrefix,
        nextNumber: Number(nextNumber) || 1001,
        defaultTemplate,
        brandColor,
        defaultNotes,
        defaultTerms: finalTerms,
        autoInvoiceOnDealWon,
        autoSyncCashflow,
      });

      setSuccessMsg('Invoice settings and branding updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('[InvoiceSettings] Save error:', err);
      const isUserErr = err?.status && err.status < 500 && err.message && !err.message.includes('500');
      setErrorMsg(isUserErr ? err.message : 'Failed to update invoice settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      alert('Please upload a PNG or JPG/JPEG image for PDF rendering compatibility');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCompanyLogo(base64);
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <RotateCw className="w-8 h-8 animate-spin text-sky-500 mb-3" />
        <p className="text-sm font-medium">Loading settings...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoice Customization & Settings</h1>
            <p className="text-sm text-slate-500">
              Company branding, bank details, numbering rules, WhatsApp delivery & Deal Won automation
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#1d61e7] hover:bg-[#1853c7] rounded-lg shadow-sm transition disabled:opacity-50"
        >
          {saving ? <RotateCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 0. Custom Company Logo & Brand Artwork */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#1d61e7]" />
            Company Logo (PDF & Web Invoices)
          </h3>
          <span className="text-xs text-slate-400 font-medium">Used across all generated invoices</span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <img
            src={companyLogo || '/favicon/favicon.png'}
            alt="Company Logo Preview"
            className="h-36 w-auto max-w-[320px] sm:h-40 sm:max-w-[360px] object-contain drop-shadow-md"
          />

          {/* Action buttons & URL input */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1d61e7] hover:bg-[#1853c7] rounded-lg shadow-2xs transition">
                <Upload className="w-3.5 h-3.5" />
                Upload Logo Image
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => setCompanyLogo('/favicon/favicon.png')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Use Default VIS Logo
              </button>

              {companyLogo && (
                <button
                  type="button"
                  onClick={() => setCompanyLogo(null)}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-500">
                Or provide an image URL:
              </label>
              <input
                type="text"
                value={companyLogo || ''}
                onChange={(e) => setCompanyLogo(e.target.value.trim() || null)}
                placeholder="https://example.com/logo.png or data:image/png;base64,..."
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d61e7] font-mono text-slate-700"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Supported formats: PNG, JPG, WebP, SVG. Recommended height: 40-80px with transparent background.
            </p>
          </div>
        </div>
      </div>

      {/* 1. Company Branding & Details */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Building className="w-4 h-4 text-sky-600" />
          Company Information & Tax Identifiers
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Company Email</label>
            <input
              type="email"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Official Phone Number</label>
            <input
              type="text"
              value={companyPhone}
              onChange={(e) => setCompanyPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 text-emerald-700">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              Official WhatsApp Sender Number
            </label>
            <input
              type="text"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="e.g. 919876543210"
              className="w-full px-3 py-2 text-sm bg-emerald-50/50 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-semibold text-emerald-900"
              required
            />
            <p className="text-[11px] text-slate-400">Used as the sender and support contact number on WhatsApp invoice dispatches</p>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-slate-700">Registered Office Address</label>
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">City / District</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">State / Region</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">GSTIN (Goods & Services Tax ID)</label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              placeholder="e.g. 03ABCDE1234F1Z5"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Company PAN Number</label>
            <input
              type="text"
              value={panNumber}
              onChange={(e) => setPanNumber(e.target.value)}
              placeholder="e.g. ABCDE1234F"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* 2. Bank & UPI Payment Instructions */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Landmark className="w-4 h-4 text-emerald-600" />
          Banking & UPI Payment Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Bank Name</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Bank Account Number</label>
            <input
              type="text"
              value={bankAccountNo}
              onChange={(e) => setBankAccountNo(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">IFSC Code</label>
            <input
              type="text"
              value={bankIfsc}
              onChange={(e) => setBankIfsc(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Bank Branch</label>
            <input
              type="text"
              value={bankBranch}
              onChange={(e) => setBankBranch(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-slate-700">UPI ID / VPA</label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. 8699792040@upi"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* 3. Numbering System */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <FileText className="w-4 h-4 text-indigo-600" />
          Invoice Numbering System
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Invoice Prefix</label>
            <input
              type="text"
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value)}
              placeholder="e.g. VIS"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              required
            />
            <p className="text-[11px] text-slate-400">e.g. VIS (Outputs: VIS/2026-27/040)</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Next Number Sequence</label>
            <input
              type="number"
              value={nextNumber}
              onChange={(e) => setNextNumber(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              required
            />
            <p className="text-[11px] text-slate-400">Next created invoice will use this sequence number (3-digit padded)</p>
          </div>
        </div>

        {/* Order Placement Instruction & Default Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Order Placement Instruction (Printed in Terms & Instructions)
            </label>
            <input
              type="text"
              value={orderNotice}
              onChange={(e) => handleOrderNoticeChange(e.target.value)}
              placeholder="e.g. Order to be Placed - In favor of VIBRANTICK INFOTECH SOLUTIONS"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium text-slate-800"
            />
            <p className="text-[11px] text-slate-400">
              First instruction line printed under 'Terms & Instructions' on invoice web views and PDFs.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Default Customer Note (Thank You Note)</label>
            <textarea
              rows={3}
              value={defaultNotes}
              onChange={(e) => setDefaultNotes(e.target.value)}
              placeholder="Thank you and looking forward to a fruitful relationship with our company."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <p className="text-[11px] text-slate-400">
              Note printed above the Authorized Signatory on customer invoices.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Automations & Financial Sync */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Automation & CRM Hooks
        </h3>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              id="autoInvoiceDealWon"
              checked={autoInvoiceOnDealWon}
              onChange={(e) => setAutoInvoiceOnDealWon(e.target.checked)}
              className="mt-1 rounded text-sky-600 focus:ring-sky-500"
            />
            <div>
              <label htmlFor="autoInvoiceDealWon" className="text-sm font-semibold text-slate-900 cursor-pointer">
                Automatic Invoice Generation on Deal Won
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Whenever any sales pipeline deal is closed as WON, automatically generate a ready Tax Invoice linked to
                the customer and deal value.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              id="autoSyncCashflow"
              checked={autoSyncCashflow}
              onChange={(e) => setAutoSyncCashflow(e.target.checked)}
              className="mt-1 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <label htmlFor="autoSyncCashflow" className="text-sm font-semibold text-slate-900 cursor-pointer">
                Automatic Cashflow & Income Synchronization
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                When payments are recorded against invoices, automatically record a corresponding 'Client Payment'
                income entry in Expense Management for instant cashflow reconciliation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
