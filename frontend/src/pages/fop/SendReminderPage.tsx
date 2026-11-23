import { CheckCheck, Copy, Download, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MiniStat, Panel, StateBadge } from '@/components/kafalat/KafalatBits';
import { Skeleton } from '@/components/ui/skeleton';
import { useMobilePageChrome } from '@/hooks/useMobilePageChrome';
import { fillTemplate, fopApi, waLink, type ReminderGroup, type ReminderList } from '@/lib/fopApi';
import { MONTHS, downloadCsv, fmtDate, pkr } from '@/lib/kafalatApi';
import { cn } from '@/lib/utils';
import { WhatsAppIcon, WhatsAppPhone } from '@/components/WhatsAppPhone';

const DEFAULT_TEMPLATE = `Assalam o Alaikum {name},

This is a gentle reminder from Gaza Virtual Adoption. The kafalat for {month} is still pending for: {children}.

Amount due: {amount}. You can submit your payment at https://gazavirtualadoption.org/submit-kafalat

JazakAllah khair for standing with the children of Gaza.`;

const TEMPLATE_KEY = 'gva_reminder_template';

export function SendReminderPage() {
  useMobilePageChrome({ title: 'Send reminder', backTo: '/' });
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<ReminderList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState(() => localStorage.getItem(TEMPLATE_KEY) || DEFAULT_TEMPLATE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [hideReminded, setHideReminded] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fopApi.reminders(year, month);
      setData(r);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load');
    }
  }, [year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    localStorage.setItem(TEMPLATE_KEY, template);
  }, [template]);

  const keyOf = (g: ReminderGroup) => g.sponsorCode || `${g.sponsorName}|${g.phone}`;

  const rows = useMemo(() => {
    if (!data) return [];
    const n = q.trim().toLowerCase();
    return data.sponsors.filter((g) => {
      if (hideReminded && g.remindedAt) return false;
      if (!n) return true;
      return [g.sponsorName, g.sponsorCode, g.phone, ...g.children.map((c) => c.code)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(n));
    });
  }, [data, q, hideReminded]);

  async function record(groups: ReminderGroup[]) {
    if (!data || groups.length === 0) return;
    await fopApi.logReminders({
      year,
      month,
      message: template,
      items: groups.map((g) => ({ sponsorCode: g.sponsorCode, sponsorName: g.sponsorName, phone: g.phone })),
    });
  }

  async function sendOne(g: ReminderGroup) {
    if (!data || !g.whatsapp) return;
    window.open(waLink(g.whatsapp, fillTemplate(template, g, data.monthLabel, year)), '_blank', 'noopener');
    await record([g]);
    setMsg(`Opened WhatsApp for ${g.sponsorName} and marked as reminded.`);
    await load();
  }

  async function markSelected() {
    const groups = rows.filter((g) => selected.has(keyOf(g)));
    await record(groups);
    setMsg(`${groups.length} sponsor(s) marked as reminded for ${data?.monthLabel} ${year}.`);
    await load();
  }

  function copyNumbers() {
    const nums = rows.filter((g) => selected.size === 0 || selected.has(keyOf(g))).map((g) => g.whatsapp).filter(Boolean);
    void navigator.clipboard.writeText(nums.join('\n'));
    setMsg(`${nums.length} WhatsApp numbers copied.`);
  }

  function exportCsv() {
    if (!data) return;
    downloadCsv(`reminders-${year}-${String(month).padStart(2, '0')}.csv`, [
      ['number', 'name', 'sponsor code', 'children', 'amount due PKR', 'message'],
      ...rows
        .filter((g) => selected.size === 0 || selected.has(keyOf(g)))
        .map((g) => [g.whatsapp, g.sponsorName, g.sponsorCode, g.children.map((c) => c.code).join(' '), g.duePkr, fillTemplate(template, g, data.monthLabel, year)]),
    ]);
  }

  const allSelected = rows.length > 0 && rows.every((g) => selected.has(keyOf(g)));
  const t = data?.totals;

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-gva-ink md:text-2xl">Send reminder</h1>
          <p className="mt-1 text-sm text-gva-muted">Sponsors whose children are still pending — remind them on WhatsApp.</p>
        </div>
        <div className="flex gap-2">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="h-10 rounded-lg border border-gva-hairline bg-gva-surface px-3 text-sm font-semibold" aria-label="Month">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-10 rounded-lg border border-gva-hairline bg-gva-surface px-3 text-sm font-semibold" aria-label="Year">
            {[now.getFullYear() + 1, now.getFullYear(), now.getFullYear() - 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}

      {!t ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MiniStat label="Sponsors to remind" value={t.sponsors} sub={`${t.withWhatsapp} with WhatsApp number`} tone="rose" />
          <MiniStat label="Children pending" value={t.children} />
          <MiniStat label="Amount due" value={pkr(t.duePkr)} tone="amber" />
          <MiniStat label="Already reminded" value={t.reminded} sub={`for ${data!.monthLabel} ${year}`} tone="green" />
        </div>
      )}

      <Panel title="Message">
        <textarea value={template} onChange={(e) => setTemplate(e.target.value.slice(0, 1000))} rows={7} className="w-full rounded-lg border border-gva-hairline p-3 text-sm outline-none focus:border-gva-green focus:ring-2 focus:ring-gva-green/15" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gva-muted">
          <span>
            Placeholders: <code>{'{name}'}</code> <code>{'{children}'}</code> <code>{'{codes}'}</code> <code>{'{count}'}</code> <code>{'{month}'}</code> <code>{'{amount}'}</code>
          </span>
          <span>
            {template.length}/1000 ·{' '}
            <button type="button" className="font-semibold text-gva-green-deep hover:underline" onClick={() => setTemplate(DEFAULT_TEMPLATE)}>Reset</button>
          </span>
        </div>
      </Panel>

      <Panel
        title={`Pending sponsors (${rows.length})`}
        action={
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gva-muted" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sponsor, phone, child code…" className="h-9 w-44 rounded-lg border border-gva-hairline pl-8 pr-3 text-sm sm:w-60" />
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="mr-2 inline-flex items-center gap-2 text-sm font-semibold text-gva-ink-2">
            <input type="checkbox" className="h-4 w-4 accent-[var(--color-gva-green)]" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map(keyOf)))} />
            Select all
          </label>
          <label className="mr-auto inline-flex items-center gap-2 text-sm text-gva-ink-2">
            <input type="checkbox" className="h-4 w-4 accent-[var(--color-gva-green)]" checked={hideReminded} onChange={(e) => setHideReminded(e.target.checked)} />
            Hide already reminded
          </label>
          <ToolBtn icon={Copy} onClick={copyNumbers}>Copy numbers</ToolBtn>
          <ToolBtn icon={Download} onClick={exportCsv}>Numbers + messages CSV</ToolBtn>
          <button type="button" disabled={selected.size === 0} onClick={markSelected} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gva-green px-3 text-sm font-semibold text-white hover:bg-gva-green-deep disabled:opacity-50">
            <CheckCheck className="h-4 w-4" aria-hidden /> Mark {selected.size || ''} reminded
          </button>
        </div>
        {msg ? <p className="mb-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p> : null}
        {!data ? (
          <Skeleton className="h-40 w-full" />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-gva-muted">Nobody pending for this month 🎉</p>
        ) : (
          <ul className="divide-y divide-gva-hairline">
            {rows.map((g) => {
              const k = keyOf(g);
              return (
                <li key={k} className="flex items-start gap-3 py-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-[var(--color-gva-green)]"
                    checked={selected.has(k)}
                    onChange={() => setSelected((cur) => { const n = new Set(cur); if (n.has(k)) n.delete(k); else n.add(k); return n; })}
                    aria-label={`Select ${g.sponsorName}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gva-ink">
                      {g.sponsorCode ? (
                        <Link to={`/fop/sponsors/${encodeURIComponent(g.sponsorCode)}`} className="hover:underline">
                          <span className="mr-2 font-mono text-xs text-gva-muted">{g.sponsorCode}</span>{g.sponsorName}
                        </Link>
                      ) : g.sponsorName}
                      {g.remindedAt ? (
                        <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          Reminded {fmtDate(g.remindedAt)}{g.reminders > 1 ? ` ×${g.reminders}` : ''}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-gva-muted"><WhatsAppPhone phone={g.phone} empty="No phone" /> · due {pkr(g.duePkr)}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {g.children.map((c) => (
                        <Link key={c.id} to={`/organization/orphans/${c.id}`} className="inline-flex items-center gap-1 rounded-md border border-gva-hairline px-1.5 py-0.5 text-[11px] hover:bg-gva-canvas" title={c.name ?? ''}>
                          <span className="font-mono font-bold">{c.code}</span>
                          <StateBadge state={c.state === 'upcoming' ? 'pending' : c.state} className="scale-90" />
                        </Link>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!g.whatsapp}
                    onClick={() => sendOne(g)}
                    className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold', g.whatsapp ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-100 text-slate-400')}
                    title={g.whatsapp ? 'Opens WhatsApp with the message ready' : 'No valid phone number'}
                  >
                    <WhatsAppIcon className="h-4 w-4" /> WhatsApp
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function ToolBtn({ icon: Icon, onClick, children }: { icon: typeof Copy; onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gva-hairline px-3 text-sm font-semibold hover:bg-gva-canvas">
      <Icon className="h-4 w-4" aria-hidden /> {children}
    </button>
  );
}
