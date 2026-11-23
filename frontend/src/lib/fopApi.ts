import { apiRequest } from '@/lib/api';
import type { KafalatRules, MonthState } from '@/lib/kafalatApi';

export type FopSponsorRow = {
  code: string;
  name: string;
  area: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  status: string | null;
  reference: string | null;
  addedOn: string | null;
  children: number;
  childCodes: string[];
  paidChildrenThisMonth: number;
  donations: number;
  totalPkr: number;
  lastDonationAt: string | null;
};

export type FopSponsorList = {
  year: number;
  month: number;
  monthLabel: string;
  totals: { sponsors: number; children: number; fullyPaid: number; pending: number };
  sponsors: FopSponsorRow[];
};

export type FopSponsorProfile = {
  year: number;
  rules: KafalatRules;
  sponsor: {
    code: string;
    name: string;
    area: string | null;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    status: string | null;
    reference: string | null;
    addedOn: string | null;
  };
  stats: { children: number; totalPkr: number; totalUsd: number; donations: number; lastDonationAt: string | null };
  children: {
    id: string;
    code: string;
    nameEn: string | null;
    nameAr: string | null;
    listName: string | null;
    photoUrl: string | null;
    totalPkr: number;
    months: { month: number; label: string; paidPkr: number; state: MonthState }[];
  }[];
  donations: {
    id: string;
    childCode: string;
    sponsorName: string;
    sponsorPhone: string | null;
    year: number;
    monthLabels: string[];
    amountPkr: number;
    submittedAt: string;
    bank: string | null;
    status: string;
    attachments: string[];
    note: string | null;
  }[];
  reminders: { year: number; month: number; sentAt: string }[];
};

export type ReminderGroup = {
  sponsorCode: string | null;
  sponsorName: string;
  phone: string | null;
  area: string | null;
  whatsapp: string | null;
  children: { id: string; code: string | null; name: string | null; state: MonthState; paidPkr: number }[];
  duePkr: number;
  remindedAt: string | null;
  reminders: number;
};

export type ReminderList = {
  year: number;
  month: number;
  monthLabel: string;
  rules: KafalatRules;
  totals: { sponsors: number; children: number; duePkr: number; withWhatsapp: number; reminded: number };
  sponsors: ReminderGroup[];
};

export type DonationSummaryMonth = {
  month: number;
  label: string;
  submissions: number;
  firstSubmissionAt: string | null;
  children: number;
  sponsored: number;
  notDue: number;
  paid: number;
  partial: number;
  pending: number;
  unsponsored: number;
  receivedPkr: number;
  receivedUsd: number;
  expectedPkr: number;
  byBank: { bank: string; pkr: number; submissions: number }[];
};

export type OnlineBankCard = {
  bank: string;
  accountNo: string | null;
  pkr: number;
  usd: number;
  submissions: number;
  lastAt: string | null;
};

export type OnlineDonationRow = {
  id: string;
  childId: string | null;
  orphanCode: string | null;
  rawCode: string | null;
  orphanName: string | null;
  sponsorName: string;
  sponsorPhone: string | null;
  monthLabels: string[];
  bank: string | null;
  accountNo: string | null;
  amountPkr: number;
  splitCount: number;
  submittedAt: string;
  attachments: string[];
  note: string | null;
  status: string;
};

export type BankDetail = {
  bank: string;
  accounts: string[];
  pkr: number;
  usd: number;
  records: number;
  donors: number;
  firstAt: string | null;
  lastAt: string | null;
  monthly: { ym: string; pkr: number }[];
};

export type EventRegistration = {
  id: string;
  externalId: number | null;
  event: string;
  fullName: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  heardFrom: string | null;
  persons: number;
  paymentUpload: string | null;
  note: string | null;
  status: string | null;
  addedOn: string | null;
};

export const fopApi = {
  sponsors: (q = ''): Promise<FopSponsorList> =>
    apiRequest(`/admin/fop/sponsors${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  sponsor: (code: string, year: number): Promise<FopSponsorProfile> =>
    apiRequest(`/admin/fop/sponsors/${encodeURIComponent(code)}?year=${year}`),
  reminders: (year: number, month: number): Promise<ReminderList> =>
    apiRequest(`/admin/fop/reminders?year=${year}&month=${month}`),
  logReminders: (payload: {
    year: number;
    month: number;
    message: string;
    items: { sponsorCode: string | null; sponsorName: string; phone: string | null }[];
  }): Promise<{ ok: boolean; message: string }> =>
    apiRequest('/admin/fop/reminders/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  donationSummary: (year: number): Promise<{ year: number; rules: KafalatRules; months: DonationSummaryMonth[] }> =>
    apiRequest(`/admin/fop/donation-summary?year=${year}`),
  onlineSummary: (from: string, to: string): Promise<{ banks: OnlineBankCard[]; totalPkr: number }> =>
    apiRequest(`/admin/fop/online-donations/summary?from=${from}&to=${to}`),
  onlineDonations: (params: {
    from: string;
    to: string;
    bank?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ page: number; pageSize: number; total: number; totalPkr: number; donations: OnlineDonationRow[] }> => {
    const qs = new URLSearchParams({ from: params.from, to: params.to });
    if (params.bank) qs.set('bank', params.bank);
    if (params.q) qs.set('q', params.q);
    qs.set('page', String(params.page ?? 1));
    qs.set('pageSize', String(params.pageSize ?? 50));
    return apiRequest(`/admin/fop/online-donations?${qs.toString()}`);
  },
  banks: (): Promise<{ banks: BankDetail[] }> => apiRequest('/admin/fop/banks'),
  events: (
    q = '',
  ): Promise<{
    events: { event: string; registrations: number; persons: number }[];
    sources: { source: string; n: number }[];
    registrations: EventRegistration[];
  }> => apiRequest(`/admin/fop/events${q ? `?q=${encodeURIComponent(q)}` : ''}`),
};

/** Fill {name} {children} {codes} {month} {amount} in a reminder template. */
export function fillTemplate(
  template: string,
  g: ReminderGroup,
  monthLabel: string,
  year: number,
): string {
  const names = g.children.map((c) => `${c.code ?? ''} ${c.name ?? ''}`.trim()).join(', ');
  return template
    .replace(/\{name\}/g, g.sponsorName)
    .replace(/\{children\}/g, names)
    .replace(/\{codes\}/g, g.children.map((c) => c.code).filter(Boolean).join(', '))
    .replace(/\{count\}/g, String(g.children.length))
    .replace(/\{month\}/g, `${monthLabel} ${year}`)
    .replace(/\{amount\}/g, `PKR ${g.duePkr.toLocaleString('en-US')}`);
}

export function waLink(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function isoDay(d: Date): string {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
}
