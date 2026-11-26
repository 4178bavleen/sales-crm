export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'SENT'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export type InvoiceTaxType = 'INTRA_STATE' | 'INTER_STATE' | 'EXEMPT';

export interface InvoiceCurrency {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export interface InvoiceCurrenciesResponse {
  currencies: InvoiceCurrency[];
  defaultCurrency: string;
}

export type InvoiceTemplateEdition =
  | 'MODERN_EXECUTIVE'
  | 'CLASSIC_CORPORATE'
  | 'MINIMALIST_CLEAN'
  | 'VIBRANT_TECH';

export type InvoicePaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'UPI'
  | 'CHEQUE'
  | 'OTHER';

export interface InvoiceItem {
  id?: number;
  productServiceId?: number | null;
  itemName: string;
  hsnCode?: string | null;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  lineTotal: number;
}

export interface InvoicePayment {
  id: number;
  invoiceId: number;
  amount: number | string;
  paymentDate: string;
  paymentMethod: InvoicePaymentMethod;
  reference?: string | null;
  notes?: string | null;
  financialTransactionId?: number | null;
  createdAt: string;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId?: number | null;
  dealId?: number | null;
  createdById?: number | null;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: string;
  taxType: InvoiceTaxType;
  templateEdition: InvoiceTemplateEdition;
  subtotal: number | string;
  totalDiscount: number | string;
  taxAmount: number | string;
  grandTotal: number | string;
  amountPaid: number | string;
  amountDue: number | string;
  notes?: string | null;
  terms?: string | null;
  pdfUrl?: string | null;
  emailSentAt?: string | null;
  whatsappSentAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: number;
    company?: {
      id?: number;
      name?: string;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      phone?: string | null;
    } | null;
    primaryContact?: {
      id?: number;
      fullName?: string;
      email?: string | null;
      phone?: string | null;
    } | null;
  } | null;
  deal?: {
    id: number;
    name: string;
    estimatedValue?: number | string | null;
    status?: string;
  } | null;
  createdBy?: {
    id: number;
    name: string;
    email: string;
  } | null;
  items: InvoiceItem[];
  payments: InvoicePayment[];
}

export interface InvoiceSetting {
  id: number;
  companyName: string;
  companyLogo?: string | null;
  companyEmail: string;
  companyPhone: string;
  whatsappNumber: string;
  addressLine1?: string | null;
  city: string;
  state: string;
  country: string;
  pincode?: string | null;
  gstin?: string | null;
  panNumber?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankIfsc?: string | null;
  bankBranch?: string | null;
  upiId?: string | null;
  invoicePrefix: string;
  nextNumber: number;
  defaultTemplate: InvoiceTemplateEdition;
  brandColor: string;
  defaultNotes?: string | null;
  defaultTerms?: string | null;
  autoInvoiceOnDealWon: boolean;
  autoSyncCashflow: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface CreateInvoicePayload {
  customerId: number;
  dealId?: number | null;
  billingAddress?: string | null;
  invoiceNumber?: string;
  issueDate: string;
  dueDate: string;
  status?: InvoiceStatus;
  templateEdition?: InvoiceTemplateEdition;
  taxType?: InvoiceTaxType;
  currency?: string;
  totalDiscount?: number;
  notes?: string | null;
  terms?: string | null;
  items: Array<{
    productServiceId?: number | null;
    itemName: string;
    hsnCode?: string | null;
    description?: string | null;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    taxPercent?: number;
  }>;
}

export interface UpdateInvoicePayload extends Partial<CreateInvoicePayload> {}

export interface RecordPaymentPayload {
  amount: number;
  paymentDate?: string;
  paymentMethod: InvoicePaymentMethod;
  reference?: string | null;
  notes?: string | null;
  syncToCashflow?: boolean;
}

export interface InvoiceFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: InvoiceStatus;
  customerId?: number;
  dealId?: number;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'issueDate' | 'dueDate' | 'grandTotal' | 'invoiceNumber';
  sortOrder?: 'asc' | 'desc';
}

export interface InvoiceSummaryStats {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  statusCounts: Record<string, number>;
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary: InvoiceSummaryStats;
}
