/**
 * Client-side notification feed (no push backend yet).
 * Copy patterns from Mobbin PayPal notifications list + batch reminders.
 */

export function buildInAppNotifications(impact) {
  const items = [];
  const now = Date.now();

  if (impact?.batch) {
    items.push({
      id: `batch-${impact.batch.id || impact.currentList || 'open'}`,
      kind: 'payment',
      title: impact.batch.headline || 'Your batch is open',
      body: impact.batch.subline || 'Submit payment before the batch closes.',
      route: '/payments/multi-pay',
      createdAt: new Date(now - 1000 * 60 * 45).toISOString(),
    });
  }

  if (impact) {
    items.push({
      id: 'impact-summary',
      kind: 'impact',
      title: 'Impact updated',
      body: `You sponsor ${impact.sponsored} ${impact.sponsored === 1 ? 'child' : 'children'} on list #${impact.currentList}.`,
      route: '/',
      createdAt: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
    });
  }

  items.push({
    id: 'gift-reminder',
    kind: 'gift',
    title: 'One-time gift',
    body: 'Send an extra gift anytime from the home screen — it goes directly to your sponsored children.',
    route: '/',
    createdAt: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
  });

  return items;
}

export function countUnread(notifications, readIds) {
  const read = readIds instanceof Set ? readIds : new Set(readIds);
  return notifications.filter((n) => !read.has(n.id)).length;
}

export function formatNotificationTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
