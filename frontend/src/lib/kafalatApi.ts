import { apiRequest } from '@/lib/api';

export type MonthState = 'paid' | 'partial' | 'pending' | 'upcoming' | 'not_due' | 'unsponsored';

export type KafalatRules = { monthlyPkr: number; paidMinPkr: number; pkrPerUsd: number };

export type KafalatDonation = {
  id: string;
  donationId: string | null;
  sponsorCode: string | null;
  sponsorName: string;
  sponsorPhone: string | null;
  year: number;
  months: number[];
  monthLabels: string[];
  amountPkr: number;
  amountUsd: number;
  perMonthPkr: number;
  meetsMinimum: boolean;
  fullAmount: boolean;
  submittedAt: string;
  attachments: string[];
  note: string | null;
  status: 'received' | 'verified' | 'rejected';
  source: 'manual' | 'import' | 'online_form' | 'app';
  bank: string | null;
  rawCode: string | null;
  splitCount: number;
};

export type UnmatchedDonation = {
  id: string;
  rawCode: string | null;
  orphanName: string | null;
  sponsorName: string;
  sponsorPhone: string | null;
  year: number;
  monthLabels: string[];
  amountPkr: number;
  submittedAt: string;
  attachments: string[];
  note: string | null;
  status: string;
  bank: string | null;
};

export function getUnmatchedDonations(): Promise<{ donations: UnmatchedDonation[] }> {
  return apiRequest('/admin/kafalat/unmatched');
}

export function assignKafalatDonation(id: string, code: string): Promise<{ ok: boolean; message: string }> {
  return apiRequest(`/admin/kafalat/donations/${id}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
}

export type KafalatDonor = {
  name: string;
  phone: string | null;
  phones?: string[];
  donations: number;
  totalPkr: number;
  totalUsd: number;
  firstAt: string | null;
  lastAt: string | null;
  lastPkr?: number;
};

export type KafalatMonth = {
  month: number;
  label: string;
  paidPkr: number;
  paidUsd: number;
  donations: number;
  state: MonthState;
};

export type KafalatSponsor = {
  code: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  area?: string | null;
  status?: string | null;
  addedOn?: string | null;
};

export type KafalatProfile = {
  rules: KafalatRules;
  year: number;
  years: number[];
  orphan: {
    id: string;
    code: string | null;
    nameEn: string | null;
    nameAr: string | null;
    guardianNameEn: string | null;
    guardianNameAr: string | null;
    guardianIdNumber: string | null;
    orphanIdNumber: string | null;
    dateOfBirth: string | null;
    age: number | null;
    sex: string | null;
    location: string | null;
    whatsapp: string | null;
    listName: string | null;
    organization: string | null;
    status: string | null;
    recordKind: string;
    photoUrl: string | null;
    monthlyPkr: number;
  };
  sponsor: KafalatSponsor | null;
  stats: {
    totalPkr: number;
    totalUsd: number;
    donations: number;
    donors: number;
    monthsPaid: number;
    monthsPartial: number;
    monthsPending: number;
    outstandingPkr: number;
    lastDonationAt: string | null;
  };
  months: KafalatMonth[];
  donors: KafalatDonor[];
  donations: KafalatDonation[];
};

export type KafalatReportRow = {
  id: string;
  code: string | null;
  nameEn: string | null;
  nameAr: string | null;
  listName: string | null;
  organization: string | null;
  photoUrl: string | null;
  sponsorName: string | null;
  sponsorPhone: string | null;
  paidPkr: number;
  paidUsd: number;
  donations: number;
  donors: string[];
  lastDonationAt: string | null;
  state: MonthState;
};

export type KafalatReport = {
  rules: KafalatRules;
  year: number;
  month: number;
  monthLabel: string;
  totals: {
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
  };
  rows: KafalatReportRow[];
};

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function getKafalatProfile(id: string, year: number): Promise<KafalatProfile> {
  return apiRequest(`/admin/kafalat/orphans/${id}?year=${year}`);
}

export function getKafalatReport(year: number, month: number): Promise<KafalatReport> {
  return apiRequest(`/admin/kafalat/report?year=${year}&month=${month}`);
}

export function addKafalatDonation(
  orphanId: string,
  payload: {
    sponsorName: string;
    sponsorPhone?: string;
    year: number;
    months: number[];
    amountPkr: number;
    submittedAt: string;
    note?: string;
    attachmentUrl?: string;
    status?: 'received' | 'verified';
  },
): Promise<{ id: string; message: string }> {
  return apiRequest(`/admin/kafalat/orphans/${orphanId}/donations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function setKafalatDonationStatus(
  id: string,
  status: 'received' | 'verified' | 'rejected',
): Promise<{ ok: boolean; message: string }> {
  return apiRequest(`/admin/kafalat/donations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}


export type ImportResult = {
  ok: boolean;
  rows: number;
  imported?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  duplicates?: number;
  problems?: string[];
};

export function importKafalatCsv(
  type: 'orphans' | 'sponsors' | 'donations' | 'events',
  csv: string,
): Promise<ImportResult> {
  return apiRequest(`/admin/kafalat/import/${type}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/csv' },
    body: csv,
  });
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
export function pkr(n: number): string {
  return `PKR ${Math.round(n).toLocaleString('en-US')}`;
}

export function usd(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Karachi',
  });
}

export function fmtTime(iso: string | null): string {
  if (!iso) return '';
  return `${new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Karachi',
  })} PKT`;
}

/** Local "yyyy-MM-ddTHH:mm" for <input type="datetime-local">. */
export function nowLocalInput(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]): void {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const blob = new Blob(['﻿' + rows.map((r) => r.map(esc).join(',')).join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
