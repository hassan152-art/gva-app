import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  HandHeart,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  Trash2,
  UserRound,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChildAvatar,
  MiniStat,
  Panel,
  STATE_STYLE,
  StateBadge,
} from '@/components/kafalat/KafalatBits';
import { Skeleton } from '@/components/ui/skeleton';
import { useMobilePageChrome } from '@/hooks/useMobilePageChrome';
import {
  MONTHS,
  addKafalatDonation,
  deleteKafalatDonation,
  downloadCsv,
  fmtDate,
  fmtTime,
  getKafalatProfile,
  nowLocalInput,
  pkr,
  setKafalatDonationStatus,
  usd,
  type KafalatDonation,
  type KafalatProfile,
} from '@/lib/kafalatApi';
import { cn } from '@/lib/utils';
import { WhatsAppButton, WhatsAppPhone } from '@/components/WhatsAppPhone';

type Props = { kind: 'orphan' | 'student' };

const SOURCE_LABEL: Record<KafalatDonation['source'], string> = {
  manual: 'Manual',
  import: 'Imported',
  online_form: 'Online form',
  app: 'App',
};

export function OrphanProfilePage({ kind }: Props) {
  const { id = '' } = useParams();
  const basePath = kind === 'student' ? '/organization/students' : '/organization/orphans';
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<KafalatProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useMobilePageChrome({ title: 'Child profile', backTo: basePath });

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await getKafalatProfile(id, year));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load profile');
    }
  }, [id, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const currentMonthState = useMemo(() => {
    if (!data || data.year !== now.getFullYear()) return null;
    return data.months[now.getMonth()]?.state ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` is per render
  }, [data]);

  async function changeStatus(d: KafalatDonation, status: 'verified' | 'rejected' | 'received') {
    if (!d.donationId) return;
    try {
      const res = await setKafalatDonationStatus(d.donationId, status);
      setMessage(res.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function remove(d: KafalatDonation) {
    if (!d.donationId) return;
    if (!window.confirm(`Remove donation of ${pkr(d.amountPkr)} from ${d.sponsorName}?`)) return;
    try {
      const res = await deleteKafalatDonation(d.donationId);
      setMessage(res.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  function exportCsv() {
    if (!data) return;
    const o = data.orphan;
    downloadCsv(`${o.code || 'child'}-donations-${data.year}.csv`, [
      ['Child', o.nameEn || o.nameAr || '', 'Code', o.code || ''],
      ['Sponsor', data.sponsor?.name || '', 'Phone', data.sponsor?.phone || ''],
      [],
      ['Month', 'Status', 'Received PKR', 'Received USD'],
      ...data.months.map((m) => [`${m.label} ${data.year}`, STATE_STYLE[m.state].label, m.paidPkr, m.paidUsd]),
      [],
      ['Date', 'Time', 'Donor', 'Phone', 'Months', 'Year', 'Amount PKR', 'Approx USD', 'Status', 'Source', 'Bank', 'Shared with', 'Note'],
      ...data.donations.map((d) => [
        fmtDate(d.submittedAt),
        fmtTime(d.submittedAt),
        d.sponsorName,
        d.sponsorPhone,
        d.monthLabels.join(' / '),
        d.year,
        d.amountPkr,
        d.amountUsd,
        d.status,
        SOURCE_LABEL[d.source],
        d.bank,
        d.splitCount > 1 ? `${d.splitCount} children (${d.rawCode ?? ''})` : '',
        d.note,
      ]),
    ]);
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        {error}{' '}
        <Link to={basePath} className="font-semibold underline">
          Back to list
        </Link>
      </div>
    );
  }

  if (!data) return <ProfileSkeleton />;

  const { orphan: o, sponsor, stats, months, donors, donations, rules } = data;
  const displayName = o.nameEn || o.nameAr || o.code || 'Unnamed child';
  const yearOptions = [...new Set([now.getFullYear(), now.getFullYear() - 1, ...data.years])].sort(
    (a, b) => b - a,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-8 print:max-w-none print:space-y-3">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          to={basePath}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gva-ink-2 hover:text-gva-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> All {kind === 'student' ? 'students' : 'orphans'}
        </Link>
        <div className="flex flex-wrap gap-2">
          <ToolbarButton icon={Printer} onClick={() => window.print()}>
            Print report
          </ToolbarButton>
          <ToolbarButton icon={Download} onClick={exportCsv}>
            Download CSV
          </ToolbarButton>
          <Link
            to={`${basePath}/${o.id}/edit`}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-gva-hairline bg-gva-surface px-3.5 text-sm font-semibold text-gva-ink hover:bg-gva-canvas"
          >
            <Pencil className="h-4 w-4" aria-hidden /> Edit details
          </Link>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-gva-green px-4 text-sm font-semibold text-white hover:bg-gva-green-deep"
          >
            <Plus className="h-4 w-4" aria-hidden /> Add donation
          </button>
        </div>
      </div>

      {message ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 print:hidden" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 print:hidden" role="alert">
          {error}
        </p>
      ) : null}

      {/* Hero */}
      <section className="overflow-hidden rounded-[var(--radius-card)] border border-gva-hairline bg-gva-surface shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="relative h-24 bg-gradient-to-r from-gva-green-deep via-gva-green to-gva-green-light md:h-28">
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:18px_18px]" />
        </div>
        <div className="relative px-4 pb-5 md:px-6">
          <div className="-mt-12 flex flex-col gap-4 md:-mt-14 md:flex-row md:items-end">
            <div className="rounded-[28px] bg-gva-surface p-1.5 shadow-md w-fit">
              <ChildAvatar name={displayName} photoUrl={o.photoUrl} size="xl" />
            </div>
            <div className="min-w-0 flex-1 md:pb-1">
              <div className="flex flex-wrap items-center gap-2">
                {o.code ? (
                  <span className="rounded-md bg-gva-tint px-2 py-0.5 font-mono text-xs font-bold text-gva-green-deep">
                    {o.code}
                  </span>
                ) : null}
                {o.listName ? (
                  <span className="rounded-md bg-gva-canvas px-2 py-0.5 text-xs font-semibold text-gva-ink-2">
                    {o.listName}
                  </span>
                ) : null}
                {o.organization ? (
                  <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                    {o.organization}
                  </span>
                ) : null}
                {currentMonthState ? (
                  <StateBadge state={currentMonthState} className="ml-0.5" />
                ) : null}
              </div>
              <h1 className="mt-1.5 font-display text-2xl font-bold leading-tight text-gva-ink md:text-[28px]">
                {displayName}
              </h1>
              {o.nameAr && o.nameEn ? (
                <p dir="rtl" className="mt-0.5 text-right text-base text-gva-ink-2 md:text-left">
                  {o.nameAr}
                </p>
              ) : null}
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-gva-hairline pt-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <Fact label="Age" value={o.age != null ? `${o.age} yrs` : '—'} sub={o.dateOfBirth ? fmtDate(o.dateOfBirth) : undefined} />
            <Fact label="Guardian" value={o.guardianNameEn || o.guardianNameAr || '—'} rtl={!o.guardianNameEn && !!o.guardianNameAr} />
            <Fact label="Guardian ID" value={o.guardianIdNumber || '—'} mono />
            <Fact label="Child ID" value={o.orphanIdNumber || '—'} mono />
            <div className="min-w-0">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-gva-muted">WhatsApp</dt>
              <dd className="mt-0.5 font-mono text-[13px] font-semibold text-gva-ink">
                <WhatsAppPhone phone={o.whatsapp} />
              </dd>
            </div>
            <Fact label="Location" value={o.location || '—'} rtl={/[؀-ۿ]/.test(o.location || '')} />
          </dl>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat
          label="Total received"
          value={pkr(stats.totalPkr)}
          sub={`≈ ${usd(stats.totalUsd)} · all time`}
          tone="green"
        />
        <MiniStat
          label="Donations"
          value={stats.donations}
          sub={`${stats.donors} donor${stats.donors === 1 ? '' : 's'} · last ${fmtDate(stats.lastDonationAt)}`}
        />
        <MiniStat
          label={`Months paid ${year}`}
          value={
            <>
              {stats.monthsPaid}
              {stats.monthsPartial ? (
                <span className="ml-1.5 text-base text-amber-600">+{stats.monthsPartial} partial</span>
              ) : null}
            </>
          }
          sub={`Kafalat ${pkr(rules.monthlyPkr)} (≈ ${usd(rules.monthlyPkr / rules.pkrPerUsd)}) / month`}
          tone="green"
        />
        <MiniStat
          label="Pending months"
          value={stats.monthsPending}
          sub={stats.outstandingPkr ? `${pkr(stats.outstandingPkr)} outstanding` : 'Nothing outstanding'}
          tone={stats.monthsPending ? 'rose' : 'green'}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Month tracker */}
        <Panel
          title={`Kafalat tracker ${year}`}
          icon={CalendarDays}
          className="lg:col-span-2"
          action={
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 rounded-lg border border-gva-hairline bg-gva-surface px-2.5 text-sm font-semibold text-gva-ink print:hidden"
              aria-label="Year"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          }
        >
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {months.map((m) => {
              const s = STATE_STYLE[m.state];
              return (
                <div
                  key={m.month}
                  className={cn('rounded-xl border px-2.5 py-2.5 text-center', s.cell)}
                  title={`${m.label}: ${s.label}${m.paidPkr ? ` · ${pkr(m.paidPkr)}` : ''}`}
                >
                  <p className="text-xs font-bold uppercase tracking-wide">{m.label.slice(0, 3)}</p>
                  <p className="mt-1 text-[11px] font-semibold">
                    {m.paidPkr ? usd(m.paidUsd) : s.label}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gva-muted">
            {(['paid', 'partial', 'pending', 'upcoming', 'not_due'] as const).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', STATE_STYLE[k].dot)} />
                {STATE_STYLE[k].label}
              </span>
            ))}
            <span className="w-full pt-1 text-[11px]">
              Paid = {pkr(rules.paidMinPkr)}+ for the month (≈ {usd(rules.paidMinPkr / rules.pkrPerUsd)};
              slightly under {usd(rules.monthlyPkr / rules.pkrPerUsd)} still counts). Not due = before the
              sponsor joined.
            </span>
          </div>
        </Panel>

        {/* Sponsor */}
        <Panel title="Sponsor" icon={UserRound}>
          {sponsor ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <ChildAvatar name={sponsor.name} size="md" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gva-ink">{sponsor.name}</p>
                  {sponsor.code ? (
                    <p className="font-mono text-xs font-bold text-gva-muted">{sponsor.code}</p>
                  ) : null}
                </div>
              </div>
              <dl className="space-y-2">
                {sponsor.phone ? (
                  <Row label="Phone">
                    <WhatsAppPhone phone={sponsor.phone} className="justify-end font-medium" />
                  </Row>
                ) : null}
                {sponsor.email ? <Row label="Email">{sponsor.email}</Row> : null}
                {sponsor.area ? <Row label="Area">{sponsor.area}</Row> : null}
                {sponsor.addedOn ? <Row label="Sponsor since">{fmtDate(sponsor.addedOn)}</Row> : null}
              </dl>
            </div>
          ) : (
            <p className="text-sm text-gva-muted">No sponsor assigned yet.</p>
          )}
        </Panel>
      </div>

      {/* Donors */}
      <Panel title={`Who has donated (${donors.length})`} icon={Users}>
        {donors.length === 0 ? (
          <EmptyHint text="No donations recorded yet for this child." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {donors.map((d) => (
              <li
                key={`${d.name}-${d.phone}`}
                className="flex items-center gap-3 rounded-xl border border-gva-hairline p-3"
              >
                <ChildAvatar name={d.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gva-ink">{d.name}</p>
                  <p className="truncate text-xs text-gva-muted">
                    {d.phone || 'No phone'} · {d.donations} donation{d.donations === 1 ? '' : 's'}
                  </p>
                  <WhatsAppButton phone={d.phone} label="WhatsApp" className="mt-1" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums text-emerald-700">{pkr(d.totalPkr)}</p>
                  <p className="text-[11px] text-gva-muted">last {fmtDate(d.lastAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Donations */}
      <Panel title={`Donation history (${donations.length})`} icon={ReceiptText}>
        {donations.length === 0 ? (
          <EmptyHint text="When a kafalat payment is submitted or imported it will appear here with date, time and amount." />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-gva-hairline text-xs font-bold uppercase tracking-wide text-gva-muted">
                  <tr>
                    <th className="py-2.5 pr-3">Date &amp; time</th>
                    <th className="py-2.5 pr-3">Donor</th>
                    <th className="py-2.5 pr-3">For month(s)</th>
                    <th className="py-2.5 pr-3 text-right">Amount</th>
                    <th className="py-2.5 pr-3">Status</th>
                    <th className="py-2.5 text-right print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((d) => (
                    <tr key={d.id} className="border-b border-gva-hairline/70 align-top last:border-0">
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-gva-ink">{fmtDate(d.submittedAt)}</p>
                        <p className="text-xs text-gva-muted">{fmtTime(d.submittedAt)}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-gva-ink">{d.sponsorName}</p>
                        <WhatsAppPhone phone={d.sponsorPhone} className="text-xs text-gva-muted" />
                      </td>
                      <td className="py-3 pr-3">
                        <p className="text-gva-ink-2">{d.monthLabels.join(', ')}</p>
                        <p className="text-xs text-gva-muted">
                          {d.year} · {SOURCE_LABEL[d.source]}
                          {d.bank ? ` · ${d.bank}` : ''}
                        </p>
                        {d.splitCount > 1 ? (
                          <p
                            className="mt-1 inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700"
                            title={d.rawCode ? `Submitted for: ${d.rawCode}` : undefined}
                          >
                            Shared payment · {d.splitCount} children
                          </p>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <p className="font-bold tabular-nums text-gva-ink">{pkr(d.amountPkr)}</p>
                        <p className="text-xs text-gva-muted">≈ {usd(d.amountUsd)}</p>
                        <AmountFlag d={d} />
                      </td>
                      <td className="py-3 pr-3">
                        <DonationStatus status={d.status} />
                        {d.attachments.length ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {d.attachments.map((a, i) => (
                              <a key={a} href={a} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-xs font-semibold text-gva-green-deep hover:underline">
                                <Paperclip className="h-3 w-3" aria-hidden /> Slip {i + 1}
                              </a>
                            ))}
                          </div>
                        ) : null}
                        {d.note ? <p className="mt-1 max-w-[220px] text-xs text-gva-muted">{d.note}</p> : null}
                      </td>
                      <td className="py-3 text-right print:hidden">
                        <DonationActions d={d} onStatus={changeStatus} onDelete={remove} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="space-y-3 md:hidden">
              {donations.map((d) => (
                <li key={d.id} className="rounded-xl border border-gva-hairline p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 truncate font-semibold text-gva-ink">{d.sponsorName}<WhatsAppButton phone={d.sponsorPhone} /></p>
                      <p className="text-xs text-gva-muted">
                        {fmtDate(d.submittedAt)} · {fmtTime(d.submittedAt)}
                      </p>
                      <p className="mt-1 text-xs text-gva-ink-2">
                        {d.monthLabels.join(', ')} {d.year}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold tabular-nums">{pkr(d.amountPkr)}</p>
                      <p className="text-xs text-gva-muted">≈ {usd(d.amountUsd)}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DonationStatus status={d.status} />
                      <AmountFlag d={d} />
                    </div>
                    <DonationActions d={d} onStatus={changeStatus} onDelete={remove} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      {showAdd ? (
        <AddDonationDialog
          profile={data}
          onClose={() => setShowAdd(false)}
          onSaved={async (msg) => {
            setShowAdd(false);
            setMessage(msg);
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ToolbarButton({
  icon: Icon,
  onClick,
  children,
}: {
  icon: typeof Printer;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-gva-hairline bg-gva-surface px-3.5 text-sm font-semibold text-gva-ink hover:bg-gva-canvas"
    >
      <Icon className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">{children}</span>
    </button>
  );
}

function Fact({
  label,
  value,
  sub,
  mono,
  rtl,
}: {
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
  rtl?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-gva-muted">{label}</dt>
      <dd
        dir={rtl ? 'rtl' : undefined}
        className={cn('mt-0.5 truncate font-semibold text-gva-ink', mono && 'font-mono text-[13px]', rtl && 'text-left')}
        title={value}
      >
        {value}
      </dd>
      {sub ? <dd className="text-xs text-gva-muted">{sub}</dd> : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-gva-muted">{label}</dt>
      <dd className="min-w-0 text-right text-gva-ink [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gva-tint text-gva-green">
        <HandHeart className="h-6 w-6" aria-hidden />
      </span>
      <p className="max-w-sm text-sm text-gva-muted">{text}</p>
    </div>
  );
}

function AmountFlag({ d }: { d: KafalatDonation }) {
  if (d.fullAmount) {
    return (
      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
        <BadgeCheck className="h-3 w-3" aria-hidden /> $100+ / month
      </span>
    );
  }
  if (d.meetsMinimum) {
    return (
      <span className="mt-1 inline-flex rounded-full bg-lime-50 px-2 py-0.5 text-[10px] font-bold text-lime-700">
        Slightly under · OK
      </span>
    );
  }
  return (
    <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
      Below kafalat
    </span>
  );
}

function DonationStatus({ status }: { status: KafalatDonation['status'] }) {
  const map = {
    verified: { cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2, label: 'Verified' },
    received: { cls: 'bg-sky-50 text-sky-700', icon: Clock3, label: 'Received' },
    rejected: { cls: 'bg-rose-50 text-rose-700', icon: XCircle, label: 'Rejected' },
  }[status];
  const Icon = map.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold', map.cls)}>
      <Icon className="h-3 w-3" aria-hidden /> {map.label}
    </span>
  );
}

function DonationActions({
  d,
  onStatus,
  onDelete,
}: {
  d: KafalatDonation;
  onStatus: (d: KafalatDonation, s: 'verified' | 'rejected' | 'received') => void;
  onDelete: (d: KafalatDonation) => void;
}) {
  if (!d.donationId) return <span className="text-xs text-gva-muted">From app</span>;
  return (
    <div className="inline-flex gap-1">
      {d.status !== 'verified' ? (
        <IconBtn label="Mark verified" onClick={() => onStatus(d, 'verified')} className="text-emerald-700 hover:bg-emerald-50">
          <CheckCircle2 className="h-4 w-4" />
        </IconBtn>
      ) : null}
      {d.status !== 'rejected' ? (
        <IconBtn label="Mark rejected" onClick={() => onStatus(d, 'rejected')} className="text-amber-700 hover:bg-amber-50">
          <XCircle className="h-4 w-4" />
        </IconBtn>
      ) : (
        <IconBtn label="Restore" onClick={() => onStatus(d, 'received')} className="text-sky-700 hover:bg-sky-50">
          <Clock3 className="h-4 w-4" />
        </IconBtn>
      )}
      <IconBtn label="Delete" onClick={() => onDelete(d)} className="text-gva-heart hover:bg-red-50">
        <Trash2 className="h-4 w-4" />
      </IconBtn>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={cn('rounded-lg p-1.5', className)}>
      {children}
    </button>
  );
}

function AddDonationDialog({
  profile,
  onClose,
  onSaved,
}: {
  profile: KafalatProfile;
  onClose: () => void;
  onSaved: (message: string) => void | Promise<void>;
}) {
  const now = new Date();
  const [sponsorName, setSponsorName] = useState(profile.sponsor?.name ?? '');
  const [sponsorPhone, setSponsorPhone] = useState(profile.sponsor?.phone ?? '');
  const [year, setYear] = useState(now.getFullYear());
  const [months, setMonths] = useState<number[]>([now.getMonth() + 1]);
  const [amount, setAmount] = useState(String(profile.rules.monthlyPkr));
  const [when, setWhen] = useState(nowLocalInput());
  const [note, setNote] = useState('');
  const [slip, setSlip] = useState('');
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const amountNum = Number(amount) || 0;
  const perMonth = months.length ? amountNum / months.length : amountNum;
  const r = profile.rules;

  function toggle(m: number) {
    setMonths((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m].sort((a, b) => a - b)));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await addKafalatDonation(profile.orphan.id, {
        sponsorName,
        sponsorPhone,
        year,
        months,
        amountPkr: amountNum,
        submittedAt: new Date(when).toISOString(),
        note,
        attachmentUrl: slip,
        status: verified ? 'verified' : 'received',
      });
      await onSaved(res.message);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  const input =
    'h-11 w-full rounded-lg border border-gva-hairline bg-gva-surface px-3 text-sm text-gva-ink outline-none focus:border-gva-green focus:ring-2 focus:ring-gva-green/15';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Add donation">
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-gva-surface shadow-2xl sm:max-w-lg sm:rounded-2xl"
      >
        <header className="sticky top-0 flex items-center justify-between border-b border-gva-hairline bg-gva-surface px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-gva-ink">Add donation</h2>
            <p className="text-xs text-gva-muted">
              {profile.orphan.code} · {profile.orphan.nameEn || profile.orphan.nameAr}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-gva-canvas" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-semibold text-gva-ink-2">
              Donor name
              <input className={input} value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} required />
            </label>
            <label className="space-y-1 text-sm font-semibold text-gva-ink-2">
              Donor phone
              <input className={input} value={sponsorPhone} onChange={(e) => setSponsorPhone(e.target.value)} />
            </label>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-gva-ink-2">Kafalat month(s)</span>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-8 rounded-md border border-gva-hairline px-2 text-sm">
                {[now.getFullYear() + 1, now.getFullYear(), now.getFullYear() - 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
              {MONTHS.map((label, i) => {
                const m = i + 1;
                const on = months.includes(m);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggle(m)}
                    className={cn(
                      'h-9 rounded-lg border text-xs font-bold',
                      on ? 'border-gva-green bg-gva-green text-white' : 'border-gva-hairline bg-gva-surface text-gva-ink-2 hover:bg-gva-canvas',
                    )}
                    aria-pressed={on}
                  >
                    {label.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-semibold text-gva-ink-2">
              Total amount (PKR)
              <input className={input} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} required />
            </label>
            <label className="space-y-1 text-sm font-semibold text-gva-ink-2">
              Date &amp; time
              <input type="datetime-local" className={input} value={when} onChange={(e) => setWhen(e.target.value)} required />
            </label>
          </div>
          <p
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium',
              perMonth >= r.monthlyPkr
                ? 'bg-emerald-50 text-emerald-800'
                : perMonth >= r.paidMinPkr
                  ? 'bg-lime-50 text-lime-800'
                  : 'bg-amber-50 text-amber-800',
            )}
          >
            <Wallet className="h-4 w-4 shrink-0" aria-hidden />
            {pkr(perMonth)} per month ≈ {usd(perMonth / r.pkrPerUsd)} —{' '}
            {perMonth >= r.monthlyPkr
              ? 'full kafalat ($100+)'
              : perMonth >= r.paidMinPkr
                ? 'slightly under $100, counts as paid'
                : 'below kafalat, month will show as partial'}
          </p>
          <label className="block space-y-1 text-sm font-semibold text-gva-ink-2">
            Payment slip link (optional)
            <input className={input} value={slip} onChange={(e) => setSlip(e.target.value)} placeholder="https://…" />
          </label>
          <label className="block space-y-1 text-sm font-semibold text-gva-ink-2">
            Note (optional)
            <textarea className={cn(input, 'h-20 py-2')} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm text-gva-ink-2">
            <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="h-4 w-4 accent-[var(--color-gva-green)]" />
            Payment already verified
          </label>
          {err ? <p className="text-sm text-gva-heart">{err}</p> : null}
        </div>
        <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-gva-hairline bg-gva-surface px-5 py-3">
          <button type="button" onClick={onClose} className="h-10 rounded-lg px-4 text-sm font-semibold text-gva-ink-2 hover:bg-gva-canvas">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="h-10 rounded-lg bg-gva-green px-5 text-sm font-semibold text-white hover:bg-gva-green-deep disabled:opacity-60">
            {busy ? 'Saving…' : 'Save donation'}
          </button>
        </footer>
      </form>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-5" aria-busy="true" aria-label="Loading profile">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-56 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}
