import { apiRequest } from '@/lib/api';

export type InvoiceStatus = 'paid' | 'partial' | 'unpaid';

export type Invoice = {
  id: string;
  invoiceNo: string;
  orphanId: string;
  childCode: string;
  childName: string;
  childNameAr: string | null;
  photoUrl: string | null;
  sponsorCode: string | null;
  sponsorName: string | null;
  sponsorPhone: string | null;
  year: number;
  month: number;
  period: string;
  feeType: string;
  amountPkr: number;
  discountPkr: number;
  netPkr: number;
  paidPkr: number;
  balancePkr: number;
  status: InvoiceStatus;
  overdue: boolean;
  dueDate: string | null;
  note: string | null;
  lastPaidAt: string | null;
  slips: string[];
  createdAt: string;
};

export type FeeTotals = {
  netPkr: number;
  paidPkr: number;
  balancePkr: number;
  discountPkr: number;
  invoices: number;
  paid: number;
  partial: number;
  unpaid: number;
};

export type Receipt = {
  id: string;
  receiptNo: string;
  sponsorCode: string | null;
  sponsorName: string;
  amountPkr: number;
  receivedAt: string;
  method: string;
  bank: string | null;
  reference: string | null;
  note: string | null;
  attachments: string[];
  receivedBy: string | null;
  status: 'completed' | 'rejected';
  allocations: { invoiceNo: string | null; childCode: string; childName: string | null; period: string; amountPkr: number }[];
};

export type LedgerRow = {
  key: string;
  year: number;
  month: number;
  label: string;
  invoicedPkr: number;
  paidPkr: number;
  children: number;
  carriedForwardPkr: number;
};

export type SponsorLedger = {
  rules: { monthlyPkr: number; paidMinPkr: number; pkrPerUsd: number };
  sponsor: {
    code: string;
    name: string;
    phone: string | null;
    email: string | null;
    area: string | null;
    reference: string | null;
    status: string | null;
    addedOn: string | null;
    monthlyPkr: number;
    invoiceToken: string | null;
  };
  children: { id: string; code: string; name: string; nameAr: string | null; photoUrl: string | null; listName: string | null; status: string | null }[];
  totals: FeeTotals;
  invoices: Invoice[];
  history: Receipt[];
  ledger: LedgerRow[];
};

export type MonthReceivables = {
  year: number;
  month: number;
  monthLabel: string;
  totals: FeeTotals;
  notInvoiced: number;
  invoices: Invoice[];
};

export type SponsorOption = { code: string; name: string; phone: string | null; area: string | null; children: number };

export type PublicStatement = {
  sponsor: { code: string; name: string; area: string | null };
  children: { code: string; name: string }[];
  totals: FeeTotals;
  invoices: Invoice[];
  history: { receiptNo: string; amountPkr: number; receivedAt: string; method: string; allocations: Receipt['allocations'] }[];
  ledger: LedgerRow[];
  monthlyPkr: number;
  rules: { monthlyPkr: number };
  generatedAt: string;
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const json = (body: unknown) => ({ method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) });

export const feeApi = {
  receivables: (year: number, month: number, status?: string, q?: string) => {
    const p = new URLSearchParams({ year: String(year), month: String(month) });
    if (status) p.set('status', status);
    if (q) p.set('q', q);
    return apiRequest<MonthReceivables>(`/admin/kafalat/receivables?${p}`);
  },
  ledger: (code: string) => apiRequest<SponsorLedger>(`/admin/kafalat/sponsors/${encodeURIComponent(code)}/ledger`),
  createInvoices: (body: {
    year: number;
    month: number;
    sponsorCode?: string;
    orphanIds?: string[];
    amountPkr?: number;
    dueDate?: string;
    note?: string;
  }) => apiRequest<{ message: string; created: number; existing: number }>('/admin/kafalat/invoices', json(body)),
  updateInvoice: (id: string, body: { amountPkr?: number; discountPkr?: number; dueDate?: string; note?: string }) =>
    apiRequest<{ message: string }>(`/admin/kafalat/invoices/${id}`, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) }),
  deleteInvoice: (id: string) => apiRequest<{ message: string }>(`/admin/kafalat/invoices/${id}`, { method: 'DELETE' }),
  receive: (
    code: string,
    body: {
      amountPkr: number;
      receivedAt: string;
      method: string;
      bank?: string;
      reference?: string;
      note?: string;
      attachmentUrl?: string;
      invoiceIds?: string[];
    },
  ) =>
    apiRequest<{ message: string; receipt: Receipt; dueAfter: number }>(
      `/admin/kafalat/sponsors/${encodeURIComponent(code)}/receipts`,
      json(body),
    ),
  setReceiptStatus: (id: string, status: 'rejected' | 'verified') =>
    apiRequest<{ message: string }>(`/admin/kafalat/receipts/${id}/status`, json({ status })),
  invoiceLink: (code: string) =>
    apiRequest<{ token: string }>(`/admin/kafalat/sponsors/${encodeURIComponent(code)}/invoice-link`, json({})),
  sponsorOptions: (q: string) =>
    apiRequest<{ sponsors: SponsorOption[] }>(`/admin/fop/sponsor-options?q=${encodeURIComponent(q)}`),
  createSponsor: (body: {
    name: string;
    code?: string;
    phone?: string;
    email?: string;
    area?: string;
    reference?: string;
    addedOn?: string;
    childCodes?: string[];
  }) => apiRequest<{ code: string; message: string }>('/admin/fop/sponsors', json(body)),
  updateSponsor: (code: string, body: Record<string, string | null>) =>
    apiRequest<{ message: string }>(`/admin/fop/sponsors/${encodeURIComponent(code)}`, {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    }),
  linkChildren: (code: string, body: { add?: string[]; remove?: string[] }) =>
    apiRequest<{ message: string }>(`/admin/fop/sponsors/${encodeURIComponent(code)}/children`, json(body)),
};

/** Public sponsor statement — no login token. */
export async function fetchPublicStatement(token: string): Promise<PublicStatement> {
  const base = import.meta.env.VITE_API_URL ?? '/api';
  const res = await fetch(`${base}/public/statement/${encodeURIComponent(token)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'This invoice link is not valid');
  return data as PublicStatement;
}

export const invoiceUrl = (token: string) => `${window.location.origin}/invoice/${token}`;

export const METHOD_LABEL: Record<string, string> = {
  bank: 'Bank transfer',
  cash: 'Cash',
  online: 'Online form',
  imported: 'Imported',
  other: 'Other',
};
