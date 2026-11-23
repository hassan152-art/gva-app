import { CalendarDays, Download, FileUp, Search, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MiniStat, Panel } from '@/components/kafalat/KafalatBits';
import { Skeleton } from '@/components/ui/skeleton';
import { useMobilePageChrome } from '@/hooks/useMobilePageChrome';
import { fopApi, type EventRegistration } from '@/lib/fopApi';
import { downloadCsv, fmtDate, fmtTime, importKafalatCsv } from '@/lib/kafalatApi';
import { WhatsAppPhone } from '@/components/WhatsAppPhone';

type EventsData = Awaited<ReturnType<typeof fopApi.events>>;

export function EventSubmissionsPage() {
  useMobilePageChrome({ title: 'Event submissions', backTo: '/' });
  const [data, setData] = useState<EventsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [event, setEvent] = useState('');
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    fopApi.events().then(setData).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const rows = useMemo(() => {
    if (!data) return [];
    const n = q.trim().toLowerCase();
    return data.registrations.filter(
      (r) =>
        (!event || r.event === event) &&
        (!n || [r.fullName, r.phone, r.email, r.address, r.heardFrom].filter(Boolean).some((v) => String(v).toLowerCase().includes(n))),
    );
  }, [data, q, event]);

  const persons = rows.reduce((s, r) => s + r.persons, 0);

  function exportCsv() {
    downloadCsv('event-registrations.csv', [
      ['ID', 'Event', 'Full name', 'WhatsApp', 'Email', 'Address', 'Heard from', 'Persons', 'Status', 'Added on'],
      ...rows.map((r: EventRegistration) => [r.externalId, r.event, r.fullName, r.phone, r.email, r.address, r.heardFrom, r.persons, r.status, r.addedOn ? `${fmtDate(r.addedOn)} ${fmtTime(r.addedOn)}` : '']),
    ]);
  }

  async function onFile(file: File) {
    setImportMsg('Importing…');
    try {
      if (!/\.(csv|txt)$/i.test(file.name)) throw new Error('Save the Excel export as CSV UTF-8 first.');
      const r = await importKafalatCsv('events', await file.text());
      setImportMsg(`${r.rows} rows read · ${r.imported ?? 0} new · ${r.updated ?? 0} updated`);
      load();
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : 'Import failed');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-gva-ink md:text-2xl">Event submissions</h1>
          <p className="mt-1 text-sm text-gva-muted">Registrations for GVA events.</p>
        </div>
        <button type="button" onClick={exportCsv} className="inline-flex h-10 items-center gap-2 rounded-lg border border-gva-hairline bg-gva-surface px-3.5 text-sm font-semibold hover:bg-gva-canvas">
          <Download className="h-4 w-4" aria-hidden /> CSV
        </button>
      </div>
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}

      {data?.events.map((e) => (
        <section key={e.event} className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-gradient-to-r from-gva-green-deep to-gva-green p-5 text-white md:flex-row md:items-center">
          <CalendarDays className="h-8 w-8 shrink-0 opacity-80" aria-hidden />
          <p className="flex-1 font-semibold leading-snug">{e.event}</p>
          <div className="flex gap-6 text-center">
            <div><p className="font-display text-2xl font-bold">{e.registrations}</p><p className="text-xs text-white/80">registrations</p></div>
            <div><p className="font-display text-2xl font-bold">{e.persons}</p><p className="text-xs text-white/80">persons</p></div>
          </div>
        </section>
      ))}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Shown" value={rows.length} />
        <MiniStat label="Persons" value={persons} tone="green" />
        {data?.sources.slice(0, 2).map((s) => <MiniStat key={s.source} label={`Heard via ${s.source}`} value={s.n} />)}
      </div>

      <Panel
        title={`Registrations (${rows.length})`}
        icon={Users}
        action={
          <div className="flex gap-2">
            {data && data.events.length > 1 ? (
              <select value={event} onChange={(e) => setEvent(e.target.value)} className="h-9 max-w-[180px] rounded-lg border border-gva-hairline px-2 text-sm">
                <option value="">All events</option>
                {data.events.map((e) => <option key={e.event} value={e.event}>{e.event.slice(0, 40)}</option>)}
              </select>
            ) : null}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gva-muted" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, city…" className="h-9 w-44 rounded-lg border border-gva-hairline pl-8 pr-3 text-sm sm:w-60" />
            </div>
          </div>
        }
      >
        {!data ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-gva-hairline text-xs font-bold uppercase tracking-wide text-gva-muted">
                <tr>
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Contact</th>
                  <th className="py-2 pr-3">Address</th>
                  <th className="py-2 pr-3">Heard from</th>
                  <th className="py-2 pr-3 text-center">Persons</th>
                  <th className="py-2">Registered</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gva-hairline/70 last:border-0">
                    <td className="py-2.5 pr-3 font-mono text-xs text-gva-muted">{r.externalId}</td>
                    <td className="py-2.5 pr-3 font-semibold">{r.fullName}</td>
                    <td className="py-2.5 pr-3">
                      <WhatsAppPhone phone={r.phone} />
                      <p className="text-xs text-gva-muted">{r.email}</p>
                    </td>
                    <td className="max-w-[200px] truncate py-2.5 pr-3 text-gva-ink-2" title={r.address ?? ''}>{r.address}</td>
                    <td className="py-2.5 pr-3 text-gva-ink-2">{r.heardFrom || '—'}</td>
                    <td className="py-2.5 pr-3 text-center font-bold">{r.persons}</td>
                    <td className="py-2.5"><p>{fmtDate(r.addedOn)}</p><p className="text-xs text-gva-muted">{fmtTime(r.addedOn)}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Import a new event export" icon={FileUp}>
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }} className="text-sm file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-gva-tint file:px-4 file:font-semibold file:text-gva-green-deep" />
        <p className="mt-2 text-xs text-gva-muted">EventRegistration_Export_*.xls → open in Excel → Save As → CSV UTF-8 → upload. Existing IDs are updated, new ones added.</p>
        {importMsg ? <p className="mt-2 text-sm font-medium">{importMsg}</p> : null}
      </Panel>
    </div>
  );
}
