import { ArrowLeft, BellRing, HeartHandshake, Mail, MapPin, Paperclip, Phone, ReceiptText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChildAvatar, MiniStat, Panel, STATE_STYLE } from '@/components/kafalat/KafalatBits';
import { Skeleton } from '@/components/ui/skeleton';
import { useMobilePageChrome } from '@/hooks/useMobilePageChrome';
import { fopApi, type FopSponsorProfile } from '@/lib/fopApi';
import { MONTHS, fmtDate, fmtTime, pkr, usd } from '@/lib/kafalatApi';
import { cn } from '@/lib/utils';
import { WhatsAppIcon, WhatsAppPhone } from '@/components/WhatsAppPhone';

export function FopSponsorProfilePage() {
  const { code = '' } = useParams();
  useMobilePageChrome({ title: 'Sponsor', backTo: '/fop/sponsors' });
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<FopSponsorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    fopApi.sponsor(code, year).then(setData).catch((e: Error) => setError(e.message));
  }, [code, year]);

  if (error && !data) return <p className="mx-auto max-w-3xl rounded-xl bg-rose-50 p-6 text-sm text-rose-800">{error}</p>;
  if (!data) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }
  const { sponsor: s, stats, children, donations, reminders } = data;

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-8">
      <Link to="/fop/sponsors" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gva-ink-2 hover:text-gva-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All sponsors
      </Link>

      <section className="overflow-hidden rounded-[var(--radius-card)] border border-gva-hairline bg-gva-surface shadow-sm">
        <div className="flex flex-col gap-4 bg-gradient-to-r from-gva-green-deep to-gva-green p-5 text-white md:flex-row md:items-center">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 font-display text-2xl font-bold">
            {s.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs font-bold text-white/75">{s.code}{s.status ? ` · ${s.status}` : ''}</p>
            <h1 className="font-display text-2xl font-bold">{s.name}</h1>
            <p className="mt-1 text-sm text-white/80">Sponsor since {fmtDate(s.addedOn)}</p>
          </div>
          {s.whatsapp ? (
            <a href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-gva-green-deep hover:bg-white/90">
              <WhatsAppIcon className="h-4 w-4 text-[#25D366]" /> WhatsApp
            </a>
          ) : null}
        </div>
        <dl className="grid gap-4 p-5 text-sm sm:grid-cols-3">
          <div className="flex items-start gap-2.5">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gva-green" aria-hidden />
            <div className="min-w-0">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-gva-muted">Phone</dt>
              <dd className="font-medium text-gva-ink"><WhatsAppPhone phone={s.phone} /></dd>
            </div>
          </div>
          <Info icon={Mail} label="Email" value={s.email} />
          <Info icon={MapPin} label="Area" value={s.area} />
        </dl>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Children" value={stats.children} />
        <MiniStat label="Total given" value={pkr(stats.totalPkr)} sub={`≈ ${usd(stats.totalUsd)}`} tone="green" />
        <MiniStat label="Donations" value={stats.donations} sub={`last ${fmtDate(stats.lastDonationAt)}`} />
        <MiniStat label="Reminders sent" value={reminders.length} sub={reminders[0] ? `last ${fmtDate(reminders[0].sentAt)}` : 'none yet'} tone={reminders.length ? 'amber' : 'default'} />
      </div>

      <Panel
        title={`Children & months ${year}`}
        icon={HeartHandshake}
        action={
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-9 rounded-lg border border-gva-hairline px-2 text-sm font-semibold" aria-label="Year">
            {[now.getFullYear(), now.getFullYear() - 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        }
      >
        {children.length === 0 ? (
          <p className="text-sm text-gva-muted">No child is linked to this sponsor in the orphans roster.</p>
        ) : (
          <ul className="space-y-4">
            {children.map((c) => (
              <li key={c.id} className="rounded-xl border border-gva-hairline p-3">
                <Link to={`/organization/orphans/${c.id}`} className="flex items-center gap-3 hover:opacity-80">
                  <ChildAvatar name={c.nameEn || c.nameAr || c.code} photoUrl={c.photoUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gva-ink">
                      <span className="mr-2 font-mono text-xs text-gva-muted">{c.code}</span>
                      {c.nameEn || c.nameAr}
                    </p>
                    <p className="text-xs text-gva-muted">{c.listName || '—'} · total {pkr(c.totalPkr)}</p>
                  </div>
                </Link>
                <div className="mt-3 grid grid-cols-6 gap-1 sm:grid-cols-12">
                  {c.months.map((m) => (
                    <div key={m.month} title={`${MONTHS[m.month - 1]}: ${STATE_STYLE[m.state].label}${m.paidPkr ? ` · ${pkr(m.paidPkr)}` : ''}`} className={cn('rounded-md border px-1 py-1 text-center text-[10px] font-bold uppercase', STATE_STYLE[m.state].cell)}>
                      {m.label.slice(0, 3)}
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={`Donations (${donations.length})`} icon={ReceiptText}>
        {donations.length === 0 ? (
          <p className="text-sm text-gva-muted">No donations recorded for this sponsor's children.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-gva-hairline text-xs font-bold uppercase tracking-wide text-gva-muted">
                <tr>
                  <th className="py-2 pr-3">Date &amp; time</th>
                  <th className="py-2 pr-3">Child</th>
                  <th className="py-2 pr-3">Paid by</th>
                  <th className="py-2 pr-3">Month(s)</th>
                  <th className="py-2 pr-3">Bank</th>
                  <th className="py-2 pr-3 text-right">Amount</th>
                  <th className="py-2">Slip</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((d) => (
                  <tr key={d.id} className={cn('border-b border-gva-hairline/70 last:border-0', d.status === 'rejected' && 'opacity-50')}>
                    <td className="py-2.5 pr-3"><p className="font-semibold">{fmtDate(d.submittedAt)}</p><p className="text-xs text-gva-muted">{fmtTime(d.submittedAt)}</p></td>
                    <td className="py-2.5 pr-3 font-mono text-xs font-bold">{d.childCode}</td>
                    <td className="py-2.5 pr-3"><p>{d.sponsorName}</p><WhatsAppPhone phone={d.sponsorPhone} className="text-xs text-gva-muted" /></td>
                    <td className="py-2.5 pr-3 text-gva-ink-2">{d.monthLabels.join(', ')} {d.year}</td>
                    <td className="py-2.5 pr-3 text-gva-ink-2">{d.bank || '—'}</td>
                    <td className="py-2.5 pr-3 text-right font-bold tabular-nums">{pkr(d.amountPkr)}</td>
                    <td className="py-2.5">
                      {d.attachments.map((a, i) => (
                        <a key={a} href={a} target="_blank" rel="noreferrer" className="mr-2 inline-flex items-center gap-0.5 text-xs font-semibold text-gva-green-deep hover:underline">
                          <Paperclip className="h-3 w-3" aria-hidden /> {i + 1}
                        </a>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {reminders.length ? (
        <Panel title="Reminder history" icon={BellRing}>
          <ul className="flex flex-wrap gap-2 text-xs">
            {reminders.map((r) => (
              <li key={r.sentAt} className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-800">
                {MONTHS[r.month - 1]} {r.year} · sent {fmtDate(r.sentAt)} {fmtTime(r.sentAt)}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gva-green" aria-hidden />
      <div className="min-w-0">
        <dt className="text-[11px] font-bold uppercase tracking-wide text-gva-muted">{label}</dt>
        <dd className="font-medium text-gva-ink [overflow-wrap:anywhere]">{value || '—'}</dd>
      </div>
    </div>
  );
}
