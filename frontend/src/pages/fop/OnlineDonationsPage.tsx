import { Banknote, Building2, CreditCard, Download, Landmark, Paperclip, Search, Wallet, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { slipViewUrl } from '@/lib/whatsapp';
import { Link } from 'react-router-dom';
import { Panel } from '@/components/kafalat/KafalatBits';
import { Skeleton } from '@/components/ui/skeleton';
import { useMobilePageChrome } from '@/hooks/useMobilePageChrome';
import { fopApi, isoDay, type OnlineBankCard, type OnlineDonationRow } from '@/lib/fopApi';
import { downloadCsv, fmtDate, fmtTime, pkr } from '@/lib/kafalatApi';
import { cn } from '@/lib/utils';
import { WhatsAppPhone } from '@/components/WhatsAppPhone';

const ICONS = [CreditCard, Wallet, Landmark, Banknote, Building2];
const ACCENTS = ['border-l-emerald-600', 'border-l-green-400', 'border-l-cyan-500', 'border-l-orange-400', 'border-l-rose-400', 'border-l-teal-600', 'border-l-lime-500'];

export function OnlineDonationsPage() {
  useMobilePageChrome({ title: 'Online donation', backTo: '/' });
  const now = new Date();
  const [from, setFrom] = useState(`${now.getFullYear()}-01-01`);
  const [to, setTo] = useState(isoDay(now));
  const [bank, setBank] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [cards, setCards] = useState<OnlineBankCard[] | null>(null);
  const [rows, setRows] = useState<OnlineDonationRow[] | null>(null);
  const [total, setTotal] = useState({ n: 0, pkr: 0 });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pageSize = 50;

  useEffect(() => {
    fopApi.onlineSummary(from, to).then((r) => setCards(r.banks)).catch((e: Error) => setError(e.message));
  }, [from, to]);

  const load = useCallback(async () => {
    setRows(null);
    try {
      const r = await fopApi.onlineDonations({ from, to, bank, q, page, pageSize });
      setRows(r.donations);
      setTotal({ n: r.total, pkr: r.totalPkr });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load');
    }
  }, [from, to, bank, q, page]);

  useEffect(() => {
    const t = window.setTimeout(load, 250);
    return () => window.clearTimeout(t);
  }, [load]);

  useEffect(() => setPage(1), [from, to, bank, q]);

  async function exportAll() {
    setBusy(true);
    try {
      const all: OnlineDonationRow[] = [];
      for (let p = 1; p <= 20; p += 1) {
        const r = await fopApi.onlineDonations({ from, to, bank, q, page: p, pageSize: 500 });
        all.push(...r.donations);
        if (all.length >= r.total) break;
      }
      downloadCsv(`online-donations-${from}-to-${to}${bank ? `-${bank}` : ''}.csv`, [
        ['Date', 'Time', 'Orphan code', 'Code typed', 'Orphan name', 'Sponsor', 'Sponsor phone', 'Kafalat month', 'Bank', 'Account no.', 'Payment PKR', 'Shared by', 'Status', 'Slip', 'Note'],
        ...all.map((d) => [
          fmtDate(d.submittedAt), fmtTime(d.submittedAt), d.orphanCode, d.rawCode, d.orphanName, d.sponsorName, d.sponsorPhone,
          d.monthLabels.join(', '), d.bank, d.accountNo, d.amountPkr, d.splitCount > 1 ? `${d.splitCount} children` : '', d.status, d.attachments.join(' '), d.note,
        ]),
      ]);
    } finally {
      setBusy(false);
    }
  }

  const pages = Math.max(1, Math.ceil(total.n / pageSize));

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-8">
      <div>
        <h1 className="font-display text-xl font-bold text-gva-ink md:text-2xl">Online donation summary</h1>
        <p className="mt-1 text-sm text-gva-muted">Kafalat payments submitted online, by bank account. Tap a bank to filter.</p>
      </div>
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {!cards
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
          : cards.map((c, i) => {
              const Icon = ICONS[i % ICONS.length];
              const active = bank === c.bank;
              return (
                <button
                  key={c.bank}
                  type="button"
                  onClick={() => setBank(active ? '' : c.bank)}
                  className={cn(
                    'flex flex-col items-center rounded-2xl border border-l-4 border-gva-hairline bg-gva-surface p-4 text-center shadow-sm transition hover:-translate-y-0.5',
                    ACCENTS[i % ACCENTS.length],
                    active && 'ring-2 ring-gva-green ring-offset-2',
                  )}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gva-tint text-gva-green-deep"><Icon className="h-5 w-5" aria-hidden /></span>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-gva-ink">{c.bank}</p>
                  <p className="text-[11px] text-gva-muted">{c.accountNo || '—'}</p>
                  <p className="mt-1.5 font-display text-xl font-bold tabular-nums text-gva-ink">{pkr(c.pkr)}</p>
                  <p className="text-[11px] text-gva-muted">{c.submissions.toLocaleString('en-US')} submissions</p>
                </button>
              );
            })}
      </div>

      <Panel title={`OnlineTransfer details${bank ? ` · ${bank}` : ''}`}>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-gva-muted">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block h-10 rounded-lg border border-gva-hairline px-2 text-sm text-gva-ink" /></label>
          <label className="text-xs font-semibold text-gva-muted">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block h-10 rounded-lg border border-gva-hairline px-2 text-sm text-gva-ink" /></label>
          <label className="text-xs font-semibold text-gva-muted">
            Bank
            <select value={bank} onChange={(e) => setBank(e.target.value)} className="mt-1 block h-10 rounded-lg border border-gva-hairline px-2 text-sm text-gva-ink">
              <option value="">All banks</option>
              {cards?.map((c) => <option key={c.bank} value={c.bank}>{c.bank}</option>)}
            </select>
          </label>
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gva-muted" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code, orphan, sponsor, phone, note…" className="h-10 w-full rounded-lg border border-gva-hairline pl-8 pr-3 text-sm" />
          </div>
          {bank ? (
            <button type="button" onClick={() => setBank('')} className="inline-flex h-10 items-center gap-1 rounded-lg px-2 text-sm text-gva-muted hover:bg-gva-canvas"><X className="h-4 w-4" /> Clear bank</button>
          ) : null}
          <button type="button" onClick={exportAll} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-600 px-3.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
            <Download className="h-4 w-4" aria-hidden /> {busy ? 'Preparing…' : 'Export'}
          </button>
        </div>
        <p className="mb-2 text-sm text-gva-ink-2">
          <b>{total.n.toLocaleString('en-US')}</b> records · <b>{pkr(total.pkr)}</b>
        </p>
        <div className="overflow-x-auto rounded-xl border border-gva-hairline">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-gva-canvas text-xs font-bold uppercase tracking-wide text-gva-muted">
              <tr>
                <th className="px-3 py-2.5">Date &amp; time</th>
                <th className="px-3 py-2.5">Orphan</th>
                <th className="px-3 py-2.5">Sponsor</th>
                <th className="px-3 py-2.5">Kafalat month</th>
                <th className="px-3 py-2.5">Bank</th>
                <th className="px-3 py-2.5 text-right">Payment</th>
                <th className="px-3 py-2.5">Slip / note</th>
              </tr>
            </thead>
            <tbody>
              {!rows ? (
                <tr><td colSpan={7} className="p-4"><Skeleton className="h-32 w-full" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gva-muted">No records</td></tr>
              ) : (
                rows.map((d) => (
                  <tr key={d.id} className={cn('border-t border-gva-hairline align-top', d.status === 'rejected' && 'bg-rose-50/40 opacity-70', !d.childId && 'bg-amber-50/40')}>
                    <td className="px-3 py-2.5"><p className="font-semibold">{fmtDate(d.submittedAt)}</p><p className="text-xs text-gva-muted">{fmtTime(d.submittedAt)}</p></td>
                    <td className="px-3 py-2.5">
                      {d.childId ? (
                        <Link to={`/organization/orphans/${d.childId}`} className="font-mono text-xs font-bold text-gva-green-deep hover:underline">{d.orphanCode}</Link>
                      ) : (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs font-bold text-amber-800" title="Not matched to a child">{d.rawCode || '—'}</span>
                      )}
                      <p className="max-w-[180px] truncate text-xs text-gva-ink-2" title={d.orphanName ?? ''}>{d.orphanName}</p>
                      {d.splitCount > 1 ? <p className="text-[10px] font-bold text-violet-700">Shared · {d.splitCount} children</p> : null}
                    </td>
                    <td className="px-3 py-2.5"><p className="max-w-[160px] truncate font-medium">{d.sponsorName}</p><WhatsAppPhone phone={d.sponsorPhone} empty="" className="text-xs text-gva-muted" /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex max-w-[180px] flex-wrap gap-1">
                        {d.monthLabels.map((m) => <span key={m} className="rounded bg-sky-50 px-1.5 py-0.5 text-[11px] font-semibold text-sky-700">{m}</span>)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><p>{d.bank || '—'}</p><p className="text-[11px] text-gva-muted">{d.accountNo}</p></td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums text-emerald-700">{pkr(d.amountPkr)}</td>
                    <td className="px-3 py-2.5">
                      {d.attachments.map((a, i) => (
                        <a key={a} href={slipViewUrl(a)} target="_blank" rel="noreferrer" className="mr-2 inline-flex items-center gap-0.5 text-xs font-semibold text-gva-green-deep hover:underline"><Paperclip className="h-3 w-3" /> {i + 1}</a>
                      ))}
                      {d.note ? <p className="mt-0.5 max-w-[220px] truncate text-xs text-gva-muted" title={d.note}>{d.note}</p> : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-9 rounded-lg border border-gva-hairline px-3 font-semibold disabled:opacity-40">Previous</button>
          <span className="text-gva-muted">Page {page} of {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="h-9 rounded-lg border border-gva-hairline px-3 font-semibold disabled:opacity-40">Next</button>
        </div>
      </Panel>
    </div>
  );
}
