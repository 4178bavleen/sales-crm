import { request } from './api';
import { ENDPOINTS, apiUrl } from './endpoints';
import { getSession } from './auth';
import type {
  Invoice,
  InvoiceFilters,
  InvoiceListResponse,
  InvoiceSetting,
  CreateInvoicePayload,
  UpdateInvoicePayload,
  RecordPaymentPayload,
  InvoiceCurrenciesResponse,
} from '../types/invoice';

function getToken(): string | undefined {
  return getSession()?.token;
}

export async function fetchInvoices(filters: InvoiceFilters = {}): Promise<InvoiceListResponse> {
  const token = getToken();
  const query = new URLSearchParams();

  if (filters.page) query.set('page', String(filters.page));
  if (filters.limit) query.set('limit', String(filters.limit));
  if (filters.status) query.set('status', filters.status);
  if (filters.customerId) query.set('customerId', String(filters.customerId));
  if (filters.dealId) query.set('dealId', String(filters.dealId));
  if (filters.startDate) query.set('startDate', filters.startDate);
  if (filters.endDate) query.set('endDate', filters.endDate);
  if (filters.search) query.set('search', filters.search);
  if (filters.sortBy) query.set('sortBy', filters.sortBy);
  if (filters.sortOrder) query.set('sortOrder', filters.sortOrder);

  const qs = query.toString();
  const url = `${ENDPOINTS.invoices.list}${qs ? `?${qs}` : ''}`;

  const res = await request<any>(url, { token });
  const data = res?.data !== undefined ? res.data : res;

  return {
    invoices: data.invoices || [],
    pagination: data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 },
    summary: data.summary || {
      totalInvoiced: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      statusCounts: {},
    },
  };
}

export async function fetchInvoiceById(id: number): Promise<Invoice> {
  const token = getToken();
  const res = await request<any>(ENDPOINTS.invoices.byId(id), { token });
  return (res?.data !== undefined ? res.data : res) as Invoice;
}

export async function fetchNextInvoiceNumber(): Promise<string> {
  const token = getToken();
  const res = await request<any>(`${ENDPOINTS.invoices.list}/next-number`, { token });
  const data = res?.data !== undefined ? res.data : res;
  return data?.invoiceNumber || '';
}

export async function fetchInvoiceCurrencies(): Promise<InvoiceCurrenciesResponse> {
  const token = getToken();
  const res = await request<any>(ENDPOINTS.invoices.currencies, { token });
  const data = res?.data !== undefined ? res.data : res;
  return {
    currencies: Array.isArray(data) ? data : data?.currencies || [],
    defaultCurrency: res?.defaultCurrency || data?.defaultCurrency || 'INR',
  };
}

export function formatInvoiceAmount(
  amount: number | string | null | undefined,
  currencyCode = 'INR',
  locale = 'en-IN',
  symbol?: string
): string {
  const num = Number(amount || 0);
  try {
    return new Intl.NumberFormat(locale || 'en-IN', {
      style: 'currency',
      currency: currencyCode || 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    const formattedNum = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${symbol || currencyCode || '₹'} ${formattedNum}`;
  }
}

export async function createInvoice(payload: CreateInvoicePayload): Promise<Invoice> {
  const token = getToken();
  const res = await request<any>(ENDPOINTS.invoices.create, {
    method: 'POST',
    token,
    body: payload,
  });
  return (res?.data !== undefined ? res.data : res) as Invoice;
}

export async function updateInvoice(id: number, payload: UpdateInvoicePayload): Promise<Invoice> {
  const token = getToken();
  const res = await request<any>(ENDPOINTS.invoices.update(id), {
    method: 'PATCH',
    token,
    body: payload,
  });
  return (res?.data !== undefined ? res.data : res) as Invoice;
}

export async function deleteInvoice(id: number): Promise<void> {
  const token = getToken();
  await request<any>(ENDPOINTS.invoices.delete(id), {
    method: 'DELETE',
    token,
  });
}

export async function recordInvoicePayment(id: number, payload: RecordPaymentPayload): Promise<any> {
  const token = getToken();
  const res = await request<any>(ENDPOINTS.invoices.payments(id), {
    method: 'POST',
    token,
    body: payload,
  });
  return res?.data !== undefined ? res.data : res;
}

export async function downloadInvoicePdf(id: number, invoiceNumber: string): Promise<void> {
  const token = getToken();
  const url = apiUrl(ENDPOINTS.invoices.pdf(id));

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error('Failed to download invoice PDF. Please try again.');
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `Invoice-${invoiceNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(blobUrl);
}

export async function sendInvoiceEmail(
  id: number,
  payload: { recipientEmail?: string; cc?: string[]; subject?: string; message?: string }
): Promise<any> {
  const token = getToken();
  const res = await request<any>(ENDPOINTS.invoices.email(id), {
    method: 'POST',
    token,
    body: payload,
  });
  return res?.data !== undefined ? res.data : res;
}

export async function sendInvoiceWhatsApp(
  id: number,
  payload: { recipientPhone?: string; customMessage?: string }
): Promise<any> {
  const token = getToken();
  const res = await request<any>(ENDPOINTS.invoices.whatsapp(id), {
    method: 'POST',
    token,
    body: payload,
  });
  return res?.data !== undefined ? res.data : res;
}

export async function fetchInvoiceSettings(): Promise<InvoiceSetting> {
  const token = getToken();
  const res = await request<any>(ENDPOINTS.invoices.settings, { token });
  return (res?.data !== undefined ? res.data : res) as InvoiceSetting;
}

export async function updateInvoiceSettings(payload: Partial<InvoiceSetting>): Promise<InvoiceSetting> {
  const token = getToken();
  const res = await request<any>(ENDPOINTS.invoices.settings, {
    method: 'PUT',
    token,
    body: payload,
  });
  return (res?.data !== undefined ? res.data : res) as InvoiceSetting;
}

export function parseTermsList(rawTerms?: string | null): string[] {
  if (!rawTerms || typeof rawTerms !== 'string') return [];
  const trimmed = rawTerms.trim();
  if (!trimmed) return [];

  // 1. If explicit newlines exist
  if (trimmed.includes('\n')) {
    return trimmed
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  // 2. If numbered clauses like "1. ... 2. ... 3. ..." in a single line
  const numberedSplit = trimmed.split(/(?:^|\s+)(?=(?:[0-9]+[\.\)]|\([0-9]+\))\s+)/);
  if (numberedSplit.length > 1) {
    return numberedSplit
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  // 3. If semicolon-separated bullet clauses
  if (trimmed.includes(';') && trimmed.split(';').length > 1) {
    return trimmed
      .split(';')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  return [trimmed];
}

export function cleanTermClause(term: string): string {
  return term
    .replace(/^(?:[0-9]+[\.\)]|\([0-9]+\))\s*/, '')
    .replace(/^[-•*]\s*/, '')
    .trim();
}

export const STANDARD_TERMS_PRESETS = [
  {
    label: 'Net 15 Payment',
    clause: 'Payment is due within 15 days of invoice date.',
  },
  {
    label: 'Net 30 Payment',
    clause: 'Payment is due within 30 days of invoice date.',
  },
  {
    label: 'Wire Transfer Reference',
    clause: 'Please quote the invoice number when making electronic transfer.',
  },
  {
    label: 'Local Jurisdiction',
    clause: 'All disputes are subject to local jurisdiction.',
  },
  {
    label: 'Late Payment Interest',
    clause: 'Interest @ 18% p.a. will be levied on overdue payments beyond due date.',
  },
  {
    label: 'Milestone / Sign-off',
    clause: 'Scope changes or milestone deliverables are subject to written sign-off.',
  },
  {
    label: 'Computer Generated',
    clause: 'This is a computer-generated tax invoice and requires no physical signature.',
  },
];
