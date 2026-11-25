import { Building2, Info, Loader2, Pencil, Plus, Smartphone, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useMobilePageChrome } from '@/hooks/useMobilePageChrome';
import { donorAppApi, type PaymentAccount, type PaymentAccountInput } from '@/lib/donorAppApi';
import { fmtDate } from '@/lib/kafalatApi';
import { cn } from '@/lib/utils';
import { EmptyState, Label, LoadingBlock, Modal, Notice, btn, btnDark, btnRose, btnSm, field, textarea } from './appUi';

export function PaymentAccountsPage() {
  useMobilePageChrome({ title: 'Payment Accounts' });
  const [accounts, setAccounts] = useState<PaymentAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<PaymentAccount | 'new' | null>(null);
  const [deleting, setDeleting] = useState<PaymentAccount | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await donorAppApi.listAccounts();
      setAccounts(res.accounts);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load accounts.');
      setAccounts((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleActive(acc: PaymentAccount) {
    setBusyId(acc.id);
    setError(null);
    try {
      const res = acc.isActive ? await donorAppApi.deactivateAccount(acc.id) : await donorAppApi.activateAccount(acc.id);
      setMessage(res.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the account.');
    } finally {
      setBusyId(null);
    }
  }

  const active = accounts?.find((a) => a.isActive) ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-gva-ink">Payment Accounts</h1>
          <p className="text-sm text-gva-muted">Bank accounts donors send their monthly donation to.</p>
        </div>
        <button type="button" className={btnDark} onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> Add account
        </button>
      </div>

      <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-gva-hairline bg-gva-tint px-4 py-3 text-sm text-gva-ink-2">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-gva-green-deep" />
        <div className="min-w-0">
          <p>
            The <span className="font-bold text-gva-green-deep">Active</span> account is the one donors see on the payment page of
            the mobile app. Only one account can be active at a time — activating an account turns the others off.
          </p>
          {accounts && accounts.length > 0 && !active ? (
            <p className="mt-1 font-semibold text-amber-700">No account is active right now, so donors see no bank details in the app.</p>
          ) : null}
        </div>
      </div>

      {message ? <Notice tone="success" onClose={() => setMessage(null)}>{message}</Notice> : null}
      {error ? <Notice tone="error" onClose={() => setError(null)}>{error}</Notice> : null}

      {accounts === null ? (
        <LoadingBlock />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No payment accounts yet"
          text="Add the bank account donors should send their donation to. The first account you add is shown in the app."
          action={
            <button type="button" className={btnDark} onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> Add account
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {accounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              busy={busyId === acc.id}
              onToggle={() => void toggleActive(acc)}
              onEdit={() => setEditing(acc)}
              onDelete={() => setDeleting(acc)}
            />
          ))}
        </div>
      )}

      {editing ? (
        <AccountDialog
          account={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onDone={async (m) => {
            setEditing(null);
            setMessage(m);
            await load();
          }}
        />
      ) : null}

      {deleting ? (
        <DeleteDialog
          account={deleting}
          onClose={() => setDeleting(null)}
          onDone={async (m) => {
            setDeleting(null);
            setMessage(m);
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gva-muted">{label}</dt>
      <dd className={cn('break-words text-sm text-gva-ink', mono && 'font-mono tabular-nums')}>{value}</dd>
    </div>
  );
}

function AccountCard({
  account,
  busy,
  onToggle,
  onEdit,
  onDelete,
}: {
  account: PaymentAccount;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col rounded-[var(--radius-card)] border bg-gva-surface p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        account.isActive ? 'border-gva-green ring-1 ring-gva-green/30' : 'border-gva-hairline',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              account.isActive ? 'bg-gva-tint text-gva-green-deep' : 'bg-slate-100 text-slate-700',
            )}
          >
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="break-words text-base font-bold text-gva-ink">{account.label}</p>
            {account.bankName ? <p className="break-words text-sm text-gva-muted">{account.bankName}</p> : null}
          </div>
        </div>
        {account.isActive ? (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">Active</span>
        ) : (
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">Hidden</span>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Detail label="Account title" value={account.accountTitle} />
        <Detail label="Account number" value={account.accountNumber} mono />
        <Detail label="IBAN" value={account.iban} mono />
        <Detail label="Branch" value={account.branch} />
      </dl>
      {account.instructions ? (
        <div className="mt-3 rounded-lg bg-gva-canvas px-3 py-2 text-sm text-gva-ink-2">
          <p className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gva-muted">
            <Info className="h-3 w-3" /> Instructions for donors
          </p>
          <p className="whitespace-pre-wrap break-words">{account.instructions}</p>
        </div>
      ) : null}

      <div className="flex-1" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gva-hairline pt-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gva-ink-2">
          <button
            type="button"
            role="switch"
            aria-checked={account.isActive}
            onClick={onToggle}
            disabled={busy}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60',
              account.isActive ? 'bg-gva-green' : 'bg-slate-300',
            )}
          >
            <span
              className={cn(
                'inline-block h-5 w-5 rounded-full bg-gva-surface shadow transition-transform',
                account.isActive ? 'translate-x-[22px]' : 'translate-x-0.5',
              )}
            />
          </button>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Show in app
        </label>
        <div className="flex gap-2">
          <button type="button" className={btnSm} onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button type="button" className={cn(btnSm, 'text-rose-700')} onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>
      {account.updatedAt ? <p className="mt-2 text-[11px] text-gva-muted">Updated {fmtDate(account.updatedAt)}</p> : null}
    </div>
  );
}

function AccountDialog({
  account,
  onClose,
  onDone,
}: {
  account: PaymentAccount | null;
  onClose: () => void;
  onDone: (message: string) => void | Promise<void>;
}) {
  const [form, setForm] = useState<Required<PaymentAccountInput>>({
    label: account?.label ?? '',
    bankName: account?.bankName ?? '',
    accountTitle: account?.accountTitle ?? '',
    accountNumber: account?.accountNumber ?? '',
    iban: account?.iban ?? '',
    branch: account?.branch ?? '',
    instructions: account?.instructions ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof PaymentAccountInput) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const payload: PaymentAccountInput = {
      label: form.label.trim(),
      bankName: form.bankName.trim(),
      accountTitle: form.accountTitle.trim(),
      accountNumber: form.accountNumber.trim(),
      iban: form.iban.trim(),
      branch: form.branch.trim(),
      instructions: form.instructions.trim(),
    };
    if (!payload.label || !payload.accountTitle || !payload.accountNumber) {
      setError('Label, account title and account number are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = account ? await donorAppApi.updateAccount(account.id, payload) : await donorAppApi.createAccount(payload);
      await onDone(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the account.');
      setBusy(false);
    }
  }

  return (
    <Modal
      title={account ? 'Edit payment account' : 'Add payment account'}
      subtitle="Donors see these details in the mobile app when this account is active."
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Label>
            <span>Label *</span>
            <input className={field} value={form.label} onChange={set('label')} placeholder="e.g. Main HBL account" required />
          </Label>
          <Label>
            <span>Bank name</span>
            <input className={field} value={form.bankName} onChange={set('bankName')} placeholder="e.g. HBL" />
          </Label>
          <Label>
            <span>Account title *</span>
            <input className={field} value={form.accountTitle} onChange={set('accountTitle')} required />
          </Label>
          <Label>
            <span>Account number *</span>
            <input className={field} value={form.accountNumber} onChange={set('accountNumber')} required />
          </Label>
          <Label>
            <span>IBAN</span>
            <input className={field} value={form.iban} onChange={set('iban')} placeholder="PK00XXXX..." />
          </Label>
          <Label>
            <span>Branch</span>
            <input className={field} value={form.branch} onChange={set('branch')} />
          </Label>
        </div>
        <Label>
          <span>Instructions for donors</span>
          <textarea
            className={textarea}
            rows={3}
            value={form.instructions}
            onChange={set('instructions')}
            placeholder="e.g. Please write the child code in the transfer reference."
          />
        </Label>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button type="button" className={btn} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={btnDark} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {account ? 'Save changes' : 'Add account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteDialog({
  account,
  onClose,
  onDone,
}: {
  account: PaymentAccount;
  onClose: () => void;
  onDone: (message: string) => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await donorAppApi.deleteAccount(account.id);
      await onDone(res.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the account.');
      setBusy(false);
    }
  }

  return (
    <Modal title="Delete payment account?" onClose={onClose}>
      <p className="text-sm text-gva-ink-2">
        <span className="font-semibold text-gva-ink">{account.label}</span> ({account.accountNumber}) will be removed.
        {account.isActive ? ' It is the active account, so donors will see no bank details in the app until you activate another one.' : ''}
      </p>
      {error ? <div className="mt-3"><Notice tone="error">{error}</Notice></div> : null}
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className={btn} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className={btnRose} onClick={() => void confirm()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
        </button>
      </div>
    </Modal>
  );
}
