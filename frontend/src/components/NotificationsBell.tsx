import {
  AlertTriangle,
  Bell,
  BellOff,
  BellRing,
  CalendarCheck,
  CheckCheck,
  HandCoins,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, getActiveUser } from '@/lib/api';
import { cn } from '@/lib/utils';

type NotificationItem = {
  id: string;
  kind: 'donation' | 'warning' | 'alert' | 'sponsor' | 'event';
  title: string;
  body: string;
  at: string | null;
  link: string;
};

const SEEN_KEY = 'gva_notifications_seen_at';
const DESKTOP_KEY = 'gva_notifications_desktop';
const POLL_MS = 60_000;

const KIND: Record<NotificationItem['kind'], { icon: LucideIcon; cls: string }> = {
  donation: { icon: HandCoins, cls: 'bg-emerald-50 text-emerald-700' },
  warning: { icon: AlertTriangle, cls: 'bg-amber-50 text-amber-700' },
  alert: { icon: BellRing, cls: 'bg-rose-50 text-rose-700' },
  sponsor: { icon: UserPlus, cls: 'bg-sky-50 text-sky-700' },
  event: { icon: CalendarCheck, cls: 'bg-violet-50 text-violet-700' },
};

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function readSeen(): string {
  const v = localStorage.getItem(SEEN_KEY);
  if (v) return v;
  // First visit: only the last 24 hours count as new.
  const first = new Date(Date.now() - 86_400_000).toISOString();
  localStorage.setItem(SEEN_KEY, first);
  return first;
}

const desktopSupported = typeof window !== 'undefined' && 'Notification' in window;

export function NotificationsBell({ className }: { className?: string }) {
  const navigate = useNavigate();
  const isAdmin = getActiveUser()?.role === 'admin';
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [seenAt, setSeenAt] = useState(readSeen);
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(
    () => desktopSupported && localStorage.getItem(DESKTOP_KEY) === '1' && Notification.permission === 'granted',
  );
  const [notice, setNotice] = useState<string | null>(null);
  const known = useRef<Set<string> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await apiRequest<{ items: NotificationItem[] }>('/admin/fop/notifications');
      setItems(r.items);
      // Pop a desktop notification for anything that appeared since the last poll.
      if (known.current && desktop && Notification.permission === 'granted') {
        for (const it of r.items.filter((x) => !known.current!.has(x.id)).slice(0, 3)) {
          const n = new Notification(it.title, { body: it.body, tag: it.id, icon: '/favicon.ico' });
          n.onclick = () => {
            window.focus();
            navigate(it.link);
            n.close();
          };
        }
      }
      known.current = new Set(r.items.map((x) => x.id));
    } catch {
      /* bell stays quiet if the API is unreachable */
    }
  }, [desktop, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    void load();
    const t = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(t);
  }, [load, isAdmin]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const unread = items.filter((i) => (i.at ?? '') > seenAt).length;

  function markAllRead() {
    const now = new Date().toISOString();
    localStorage.setItem(SEEN_KEY, now);
    setSeenAt(now);
  }

  async function toggleDesktop() {
    if (!desktopSupported) {
      setNotice('This browser does not support desktop notifications.');
      return;
    }
    if (desktop) {
      localStorage.setItem(DESKTOP_KEY, '0');
      setDesktop(false);
      setNotice('Desktop notifications turned off.');
      return;
    }
    const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (perm === 'granted') {
      localStorage.setItem(DESKTOP_KEY, '1');
      setDesktop(true);
      setNotice('Desktop notifications are on. New payments will pop up on this computer.');
      new Notification('Notifications are on', { body: 'Gaza Virtual Adoption will alert you about new payments.' });
    } else {
      setNotice('Notifications are blocked in this browser. Allow them from the lock icon next to the address bar.');
    }
  }

  if (!isAdmin) {
    return (
      <span className={cn('relative flex h-9 w-9 items-center justify-center rounded-lg text-gva-ink-2', className)} aria-hidden>
        <Bell className="h-5 w-5" strokeWidth={1.75} />
      </span>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? ` (${unread} new)` : ''}`}
        aria-expanded={open}
        className={cn(
          'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gva-ink-2 hover:bg-gva-canvas',
          open && 'bg-gva-canvas',
          className,
        )}
      >
        <Bell className="h-5 w-5" strokeWidth={1.75} />
        {unread ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gva-heart px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-x-2 top-16 z-50 overflow-hidden rounded-2xl border border-gva-hairline bg-gva-surface shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-gva-hairline px-4 py-3">
            <div>
              <p className="font-display text-[15px] font-bold text-gva-ink">Notifications</p>
              <p className="text-xs text-gva-muted">{unread ? `${unread} new` : 'You are all caught up'}</p>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={!unread}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gva-green-deep hover:bg-gva-tint disabled:opacity-40"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden /> Mark all read
            </button>
          </div>

          <button
            type="button"
            onClick={toggleDesktop}
            className="flex w-full items-center gap-3 border-b border-gva-hairline bg-gva-canvas/60 px-4 py-2.5 text-left hover:bg-gva-canvas"
          >
            {desktop ? (
              <BellRing className="h-4 w-4 shrink-0 text-gva-green" aria-hidden />
            ) : (
              <BellOff className="h-4 w-4 shrink-0 text-gva-muted" aria-hidden />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-gva-ink">Desktop notifications</span>
              <span className="block text-[11px] text-gva-muted">Pop-up on this computer when a new payment arrives</span>
            </span>
            <span
              className={cn(
                'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                desktop ? 'bg-gva-green' : 'bg-slate-300',
              )}
              aria-hidden
            >
              <span
                className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
                  desktop ? 'left-[18px]' : 'left-0.5',
                )}
              />
            </span>
          </button>
          {notice ? <p className="border-b border-gva-hairline bg-sky-50 px-4 py-2 text-xs text-sky-800">{notice}</p> : null}

          <ul className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-gva-muted">No notifications yet</li>
            ) : (
              items.map((it) => {
                const k = KIND[it.kind] ?? KIND.alert;
                const isNew = (it.at ?? '') > seenAt;
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        navigate(it.link);
                      }}
                      className={cn(
                        'flex w-full items-start gap-3 border-b border-gva-hairline/70 px-4 py-3 text-left hover:bg-gva-canvas',
                        isNew && 'bg-gva-tint/50',
                      )}
                    >
                      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', k.cls)}>
                        <k.icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-snug text-gva-ink">{it.title}</span>
                        <span className="mt-0.5 block line-clamp-2 text-xs text-gva-muted">{it.body}</span>
                        <span className="mt-1 block text-[11px] text-gva-muted-2">{timeAgo(it.at)}</span>
                      </span>
                      {isNew ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gva-green" aria-label="New" /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
