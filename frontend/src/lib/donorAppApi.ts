import { apiRequest } from '@/lib/api';

/** Admin client for the mobile donor app: payment accounts, approvals, complaints. */

const BASE = '/admin/app';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

function jsonInit(method: string, payload?: unknown): RequestInit {
  return {
    method,
    headers: JSON_HEADERS,
    body: payload === undefined ? undefined : JSON.stringify(payload),
  };
}

function qs(params: Record<string, string | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// ---------------------------------------------------------------------------
// Payment accounts
// ---------------------------------------------------------------------------

export type PaymentAccount = {
  id: string;
  label: string;
  bankName: string | null;
  accountTitle: string;
  accountNumber: string;
  iban: string | null;
  branch: string | null;
  instructions: string | null;
  isActive: boolean;
  updatedAt: string | null;
};

export type PaymentAccountInput = {
  label: string;
  bankName?: string;
  accountTitle: string;
  accountNumber: string;
  iban?: string;
  branch?: string;
  instructions?: string;
};

type AccountResult = { account: PaymentAccount; message: string };

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type RequestKind = 'sponsorship' | 'payment';

export type AppRequestChild = {
  id: string;
  code: string | null;
  name: string | null;
  photoUrl: string | null;
  sponsorCode: string | null;
};

export type AppRequestDonor = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  sponsorCode: string | null;
};

export type AppRequest = {
  id: string;
  kind: RequestKind;
  status: RequestStatus;
  year: number;
  months: number[];
  monthLabels: string[];
  amountPkr: number;
  slipUrl: string | null;
  note: string | null;
  adminNote: string | null;
  account: string | null;
  createdAt: string;
  decidedAt: string | null;
  children: AppRequestChild[];
  donor: AppRequestDonor;
};

export type RequestCounts = {
  pending: number;
  pending_sponsorship: number;
  pending_payment: number;
  approved: number;
  rejected: number;
};

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export type TicketCategory = 'payment' | 'child_update' | 'account' | 'other';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type TicketSummary = {
  id: string;
  ticketNo: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string | null;
  resolvedAt: string | null;
  lastMessage: { body: string; role: 'donor' | 'admin'; at: string } | null;
  messages: number;
  child: { id: string; code: string | null } | null;
  donor: { name: string | null; email: string | null; phone: string | null; sponsorCode: string | null };
};

export type TicketMessage = {
  id: string;
  role: 'donor' | 'admin';
  author: string | null;
  body: string;
  attachmentUrl: string | null;
  createdAt: string;
};

export type TicketDetail = TicketSummary & { thread: TicketMessage[] };

export type TicketCounts = { total: number; pending: number; resolved: number };

export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  payment: 'Payment',
  child_update: 'Child update',
  account: 'Account',
  other: 'Other',
};

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export type AppBadges = { requests: number; tickets: number };

export const donorAppApi = {
  // Payment accounts
  listAccounts: () => apiRequest<{ accounts: PaymentAccount[] }>(`${BASE}/payment-accounts`),
  createAccount: (input: PaymentAccountInput) =>
    apiRequest<AccountResult>(`${BASE}/payment-accounts`, jsonInit('POST', input)),
  updateAccount: (id: string, input: PaymentAccountInput) =>
    apiRequest<AccountResult>(`${BASE}/payment-accounts/${encodeURIComponent(id)}`, jsonInit('PATCH', input)),
  activateAccount: (id: string) =>
    apiRequest<AccountResult>(`${BASE}/payment-accounts/${encodeURIComponent(id)}/activate`, jsonInit('POST', {})),
  deactivateAccount: (id: string) =>
    apiRequest<AccountResult>(`${BASE}/payment-accounts/${encodeURIComponent(id)}/deactivate`, jsonInit('POST', {})),
  deleteAccount: (id: string) =>
    apiRequest<{ message: string }>(`${BASE}/payment-accounts/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Approvals
  listRequests: (filter: { status?: RequestStatus; kind?: RequestKind | null }) =>
    apiRequest<{ counts: RequestCounts; requests: AppRequest[] }>(
      `${BASE}/requests${qs({ status: filter.status, kind: filter.kind ?? undefined })}`,
    ),
  approveRequest: (id: string, note?: string) =>
    apiRequest<{ message: string; sponsorCode: string | null; receiptNo: string | null }>(
      `${BASE}/requests/${encodeURIComponent(id)}/approve`,
      jsonInit('POST', note ? { note } : {}),
    ),
  rejectRequest: (id: string, note: string) =>
    apiRequest<{ message: string }>(`${BASE}/requests/${encodeURIComponent(id)}/reject`, jsonInit('POST', { note })),

  // Tickets
  listTickets: (status?: 'pending' | 'resolved' | null) =>
    apiRequest<{ counts: TicketCounts; tickets: TicketSummary[] }>(
      `${BASE}/tickets${qs({ status: status ?? undefined })}`,
    ),
  getTicket: (id: string) => apiRequest<TicketDetail>(`${BASE}/tickets/${encodeURIComponent(id)}`),
  replyTicket: (id: string, input: { body: string; status?: TicketStatus; attachment?: File | null }) => {
    const formData = new FormData();
    formData.append('body', input.body);
    if (input.status) formData.append('status', input.status);
    if (input.attachment) formData.append('attachment', input.attachment);
    return apiRequest<TicketDetail>(`${BASE}/tickets/${encodeURIComponent(id)}/messages`, { method: 'POST', formData });
  },
  setTicketStatus: (id: string, status: TicketStatus) =>
    apiRequest<TicketDetail>(`${BASE}/tickets/${encodeURIComponent(id)}`, jsonInit('PATCH', { status })),

  badges: () => apiRequest<AppBadges>(`${BASE}/badges`),
};

/** True when the URL looks like an image we can show inline. */
export function looksLikeImage(url: string | null | undefined): boolean {
  if (!url) return false;
  const u = url.split('?')[0].toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/.test(u) || /^data:image\//.test(url);
}
