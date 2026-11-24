import { Loader2, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SponsorStatement } from '@/components/fee/SponsorStatement';
import { fetchPublicStatement, type PublicStatement } from '@/lib/feeApi';
import { fmtDate, pkr } from '@/lib/kafalatApi';

/**
 * Public sponsor invoice — the link sent on WhatsApp. No login; read-only.
 */
export function InvoiceStatementPage() {
  const { token = '' } = useParams();
  const [data, setData] = useState<PublicStatement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Kafalat invoice · Gaza Virtual Adoption';
    fetchPublicStatement(token).then(setData).catch((e: Error) => setError(e.message));
  }, [token]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow">
          <img src="/logo.png" alt="" className="mx-auto h-14 w-14" />
          <p className="mt-3 font-semibold text-slate-900">Invoice not found</p>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const paidUp = data.totals.balancePkr === 0;
  return (
    <div className="min-h-screen bg-slate-100 py-4 print:bg-white print:py-0">
      <div className="mx-auto mb-3 flex max-w-[960px] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <div className={`rounded-xl px-4 py-3 ${paidUp ? 'bg-emerald-600' : 'bg-slate-900'} text-white`}>
          <p className="text-xs opacity-80">{paidUp ? 'All paid — JazakAllah khair' : 'Balance due'}</p>
          <p className="text-xl font-bold tabular-nums">{pkr(data.totals.balancePkr)}</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          <Printer className="h-4 w-4" /> Print / Save PDF
        </button>
      </div>
      <div className="mx-auto max-w-[960px] overflow-hidden rounded-xl shadow-sm print:rounded-none print:shadow-none">
        <SponsorStatement
          data={{
            sponsor: data.sponsor,
            children: data.children,
            totals: data.totals,
            invoices: data.invoices,
            ledger: data.ledger,
            monthlyPkr: data.rules.monthlyPkr,
          }}
        />
      </div>
      {data.history.length ? (
        <div className="mx-auto mt-4 max-w-[960px] rounded-xl bg-white p-5 text-sm shadow-sm print:hidden">
          <h2 className="mb-2 font-bold text-slate-900">Payments received</h2>
          <ul className="divide-y divide-slate-100">
            {data.history.slice(0, 24).map((h) => (
              <li key={h.receiptNo} className="flex justify-between gap-3 py-2">
                <span>
                  <span className="font-medium text-slate-800">{fmtDate(h.receivedAt)}</span>
                  <span className="ml-2 text-xs text-slate-500">{h.allocations.map((a) => `${a.childCode} ${a.period}`).join(', ')}</span>
                </span>
                <span className="font-semibold tabular-nums text-emerald-700">{pkr(h.amountPkr)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
