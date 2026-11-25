import type { FeeTotals, Invoice, LedgerRow } from '@/lib/donationApi';
import { fmtDate } from '@/lib/kafalatApi';
import { slipViewUrl } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

export type StatementData = {
  sponsor: { code: string; name: string; area: string | null; phone?: string | null; email?: string | null; addedOn?: string | null };
  children: { code: string; name: string; listName?: string | null; status?: string | null }[];
  totals: FeeTotals;
  invoices: Invoice[];
  ledger?: LedgerRow[];
  monthlyPkr: number;
  /** Child Ledger: one orphan's invoices instead of the whole sponsor. */
  child?: { code: string; name: string; nameAr?: string | null } | null;
  /** How many children the sponsor has in total (child ledger shows only one). */
  sponsorChildCount?: number;
};

const num = (n: number) => Math.round(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function StatusPill({ status }: { status: Invoice['status'] }) {
  return (
    <span
      className={cn(
        'inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
        status === 'paid' && 'bg-emerald-50 text-emerald-700',
        status === 'partial' && 'bg-amber-50 text-amber-700',
        status === 'unpaid' && 'bg-rose-50 text-rose-700',
      )}
    >
      {status}
    </span>
  );
}

/** Build the ledger from invoices when the server did not send one (public page). */
function ledgerFrom(invoices: Invoice[]): LedgerRow[] {
  const map = new Map<string, LedgerRow>();
  for (const i of invoices) {
    const key = `${i.year}-${String(i.month).padStart(2, '0')}`;
    const cur = map.get(key) || { key, year: i.year, month: i.month, label: i.period.replace(' ', '-'), invoicedPkr: 0, paidPkr: 0, children: 0, carriedForwardPkr: 0 };
    cur.invoicedPkr += i.netPkr;
    cur.paidPkr += i.paidPkr;
    cur.children += 1;
    map.set(key, cur);
  }
  let carry = 0;
  return [...map.values()]
    .sort((a, b) => (a.key < b.key ? -1 : 1))
    .map((r) => {
      carry += r.invoicedPkr - r.paidPkr;
      return { ...r, carriedForwardPkr: carry };
    });
}

/**
 * Printable sponsor ledger — same layout as a school's student / family
 * ledger: header, sponsor info, children, invoice lines with grand total and
 * a month-by-month payment ledger with carried-forward balance.
 */
export function SponsorStatement({ data }: { data: StatementData }) {
  const { sponsor, children, totals, invoices } = data;
  const ledger = data.ledger ?? ledgerFrom(invoices);
  const printedOn = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Karachi' });
  const sorted = [...invoices].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month) || a.childCode.localeCompare(b.childCode));
  const childSum = (code: string) =>
    invoices
      .filter((i) => i.childCode === code)
      .reduce((t, i) => ({ paid: t.paid + i.paidPkr, dues: t.dues + i.balancePkr }), { paid: 0, dues: 0 });
  const grand = sorted.reduce(
    (t, i) => ({ amount: t.amount + i.amountPkr, discount: t.discount + i.discountPkr, paid: t.paid + i.paidPkr, dues: t.dues + i.balancePkr }),
    { amount: 0, discount: 0, paid: 0, dues: 0 },
  );

  return (
    <div className="keep-light mx-auto w-full max-w-[960px] bg-white px-6 py-6 text-[12px] text-slate-800 print:max-w-none print:px-0 print:py-0">
      {/* Letterhead */}
      <div className="flex items-start justify-between gap-4 border-b-[3px] border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-14 w-14 object-contain" />
          <div>
            <p className="font-display text-xl font-bold text-slate-900">Gaza Virtual Adoption</p>
            <p className="text-[11px] text-slate-500">Friends of Palestine · Kafalat (monthly child sponsorship)</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold text-slate-500">Report Title:</p>
          <p className="text-sm font-semibold">{data.child ? 'Child Ledger' : 'Sponsor Ledger'}</p>
        </div>
      </div>

      {/* Sponsor info */}
      <section className="mt-4 rounded-md border border-slate-200">
        <h3 className="bg-slate-100 px-3 py-1.5 text-[12px] font-bold">Sponsor Information</h3>
        <div className="grid gap-x-8 gap-y-1 px-3 py-2.5 sm:grid-cols-2">
          <Line label="Sponsor ID" value={sponsor.code} />
          <Line label="Total Dues" value={`PKR ${num(totals.balancePkr)}`} tone="rose" />
          <Line label="Sponsor Name" value={sponsor.name} />
          <Line label="Monthly Kafalat" value={`PKR ${num(data.monthlyPkr * Math.max(data.sponsorChildCount ?? children.length, 1))}`} />
          {sponsor.phone !== undefined ? <Line label="Phone" value={sponsor.phone || '—'} /> : null}
          <Line label="Total Paid" value={`PKR ${num(totals.paidPkr)}`} tone="green" />
          <Line label="Area" value={sponsor.area || '—'} />
          <Line label="Sponsor since" value={sponsor.addedOn ? fmtDate(sponsor.addedOn) : '—'} />
        </div>
      </section>

      {data.child ? (
        <section className="mt-4 rounded-md border border-slate-200">
          <h3 className="bg-slate-100 px-3 py-1.5 text-[12px] font-bold">Child Information</h3>
          <div className="grid gap-x-8 gap-y-1 px-3 py-2.5 sm:grid-cols-2">
            <Line label="Child code" value={data.child.code} />
            <Line label="Monthly Kafalat" value={`PKR ${num(data.monthlyPkr)}`} />
            <Line label="Name" value={data.child.name} />
            <Line label="Child dues" value={`PKR ${num(invoices.reduce((t, i) => t + i.balancePkr, 0))}`} tone="rose" />
            {data.child.nameAr ? <Line label="Name (Arabic)" value={data.child.nameAr} /> : null}
          </div>
        </section>
      ) : null}

      {/* Children */}
      <section className={cn('mt-4 rounded-md border border-slate-200', data.child && 'hidden')}>
        <h3 className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 text-[12px] font-bold">
          Sponsored Children <span className="rounded bg-emerald-600 px-1.5 text-[10px] text-white">{children.length}</span>
        </h3>
        <table className="w-full text-left">
          <thead className="text-[11px] text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="px-3 py-1.5">Code</th>
              <th className="px-3 py-1.5">Name</th>
              <th className="px-3 py-1.5 text-right">Monthly Kafalat</th>
              <th className="px-3 py-1.5 text-right">Paid</th>
              <th className="px-3 py-1.5 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {children.map((c) => (
              <tr key={c.code} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-1.5 font-mono font-semibold">{c.code}</td>
                <td className="px-3 py-1.5">{c.name}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">PKR {num(data.monthlyPkr)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-emerald-700">{num(childSum(c.code).paid)}</td>
                <td className={cn('px-3 py-1.5 text-right tabular-nums', childSum(c.code).dues > 0 && 'font-semibold text-rose-600')}>
                  {num(childSum(c.code).dues)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Invoice lines */}
      <section className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead className="border-y border-slate-300 bg-slate-50 text-[11px] text-slate-600">
            <tr>
              <th className="px-2 py-1.5">Inv. No</th>
              <th className="px-2 py-1.5">Child</th>
              <th className="px-2 py-1.5">Kafalat Month</th>
              <th className="px-2 py-1.5 text-right">Amount</th>
              <th className="px-2 py-1.5 text-right">Paid</th>
              <th className="px-2 py-1.5">Paid Date</th>
              <th className="px-2 py-1.5 text-right">Dues</th>
              <th className="px-2 py-1.5">Status</th>
              <th className="px-2 py-1.5 print:hidden">Slip</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-2 py-4 text-center text-slate-400">No invoices yet.</td>
              </tr>
            ) : (
              sorted.map((i) => (
                <tr key={i.id} className="border-b border-slate-100">
                  <td className="px-2 py-1.5 font-mono text-[11px]">{i.invoiceNo}</td>
                  <td className="px-2 py-1.5">{i.childCode}</td>
                  <td className="px-2 py-1.5">{i.period}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{num(i.amountPkr)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-emerald-700">{num(i.paidPkr)}</td>
                  <td className="px-2 py-1.5">{i.lastPaidAt && i.status !== 'unpaid' ? fmtDate(i.lastPaidAt) : '—'}</td>
                  <td className={cn('px-2 py-1.5 text-right tabular-nums', i.balancePkr ? 'text-rose-600' : '')}>{num(i.balancePkr)}</td>
                  <td className="px-2 py-1.5"><StatusPill status={i.status} /></td>
                  <td className="px-2 py-1.5 print:hidden">
                    {i.slips?.length
                      ? i.slips.map((u, n) => (
                          <a key={u} href={slipViewUrl(u)} target="_blank" rel="noreferrer" className="mr-1.5 font-semibold text-emerald-700 hover:underline">
                            Slip{i.slips.length > 1 ? ` ${n + 1}` : ''}
                          </a>
                        ))
                      : '—'}
                  </td>
                </tr>
              ))
            )}
            <tr className="border-t-2 border-slate-300 font-bold">
              <td className="px-2 py-1.5" colSpan={3}>GRAND TOTAL</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{num(grand.amount)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums text-emerald-700">{num(grand.paid)}</td>
              <td />
              <td className="px-2 py-1.5 text-right tabular-nums text-rose-600">{num(grand.dues)}</td>
              <td />
              <td className="print:hidden" />
            </tr>
          </tbody>
        </table>
      </section>

      {/* Monthly ledger */}
      {ledger.length ? (
        <section className="mt-4 rounded-md border border-slate-200">
          <h3 className="bg-slate-100 px-3 py-1.5 text-[12px] font-bold">Sponsor Payment Ledger</h3>
          <table className="w-full text-left">
            <thead className="text-[11px] text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-1.5">Month</th>
                <th className="px-3 py-1.5">Description</th>
                <th className="px-3 py-1.5 text-right">Total Invoice</th>
                <th className="px-3 py-1.5 text-right">Total Paid</th>
                <th className="px-3 py-1.5 text-right">Carried Forward</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 italic text-slate-400">
                <td className="px-3 py-1.5" />
                <td className="px-3 py-1.5">Previous balance brought forward</td>
                <td className="px-3 py-1.5 text-right">0.00</td>
                <td className="px-3 py-1.5 text-right">0.00</td>
                <td className="px-3 py-1.5 text-right">0.00</td>
              </tr>
              {ledger.map((r) => (
                <tr key={r.key} className="border-b border-slate-100">
                  <td className="px-3 py-1.5 font-semibold">{r.label}</td>
                  <td className="px-3 py-1.5 text-slate-500">
                    Total invoice amount ({r.children} child{r.children === 1 ? '' : 'ren'}) and payment in {r.label}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{num(r.invoicedPkr)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-emerald-700">{num(r.paidPkr)}</td>
                  <td className={cn('px-3 py-1.5 text-right tabular-nums', r.carriedForwardPkr > 0 ? 'text-rose-600' : r.carriedForwardPkr < 0 && 'text-emerald-700')}>
                    {r.carriedForwardPkr < 0 ? `Advance ${num(-r.carriedForwardPkr)}` : num(r.carriedForwardPkr)}
                  </td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="px-3 py-1.5" colSpan={2}>GRAND TOTALS</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{num(ledger.reduce((s, r) => s + r.invoicedPkr, 0))}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-emerald-700">{num(ledger.reduce((s, r) => s + r.paidPkr, 0))}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}

      <div className="mt-6 flex justify-between border-t border-slate-200 pt-2 text-[10px] text-slate-400">
        <span>Gaza Virtual Adoption · gazavirtualadoption.org</span>
        <span>Printed on: {printedOn}</span>
      </div>
    </div>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone?: 'rose' | 'green' }) {
  return (
    <div className="flex gap-3">
      <span className="w-32 shrink-0 text-slate-500">{label}</span>
      <span className={cn('font-semibold', tone === 'rose' && 'text-rose-600', tone === 'green' && 'text-emerald-700')}>{value}</span>
    </div>
  );
}

export function statementCsv(data: StatementData): string {
  const rows = [
    ['Inv. No', 'Child', 'Kafalat Month', 'Amount', 'Paid', 'Paid Date', 'Dues', 'Status', 'Slip'],
    ...data.invoices.map((i) => [i.invoiceNo, i.childCode, i.period, i.netPkr, i.paidPkr, i.lastPaidAt && i.status !== 'unpaid' ? fmtDate(i.lastPaidAt) : '', i.balancePkr, i.status, (i.slips || []).join(' ')]),
    ['', '', 'GRAND TOTAL', data.invoices.reduce((t, i) => t + i.netPkr, 0), data.invoices.reduce((t, i) => t + i.paidPkr, 0), '', data.invoices.reduce((t, i) => t + i.balancePkr, 0), '', ''],
  ];
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
}

/** Excel-readable workbook (HTML table saved as .xls). */
export function statementXls(data: StatementData): string {
  const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const head = ['Inv. No', 'Child', 'Kafalat Month', 'Amount', 'Paid', 'Paid Date', 'Dues', 'Status', 'Slip'];
  const rows = data.invoices.map((i) => [i.invoiceNo, i.childCode, i.period, i.netPkr, i.paidPkr, i.lastPaidAt && i.status !== 'unpaid' ? fmtDate(i.lastPaidAt) : '', i.balancePkr, i.status, (i.slips || []).join(' ')]);
  const tr = (cells: unknown[], tag = 'td') => `<tr>${cells.map((c) => `<${tag}>${esc(c)}</${tag}>`).join('')}</tr>`;
  return `<html><head><meta charset="utf-8"></head><body><table border="1">
${tr([`${data.child ? 'Child' : 'Sponsor'} Ledger`, data.sponsor.code, data.sponsor.name], 'th')}
${tr(head, 'th')}
${rows.map((r) => tr(r)).join('')}
${tr(['', '', 'GRAND TOTAL', data.invoices.reduce((t, i) => t + i.netPkr, 0), data.invoices.reduce((t, i) => t + i.paidPkr, 0), '', data.invoices.reduce((t, i) => t + i.balancePkr, 0), '', ''], 'th')}
</table></body></html>`;
}

export function downloadText(name: string, text: string, type = 'text/csv') {
  const blob = new Blob(['﻿', text], { type: `${type};charset=utf-8` });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

