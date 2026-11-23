import {
  Activity,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  DollarSign,
  Heart,
  Home as BankIcon,
  Landmark,
  MessageCircle,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
};

export type NavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  children: NavItem[];
};

export type NavEntry = NavItem | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry;
}

/**
 * Sidebar, laid out like the FOP back-office:
 *   FOP MANAGEMENT
 *   Dashboard · Profiles ▸ (Sponsors, User, Organizations, Orphans, Orphans table)
 *   Send Reminder · Donation Summary · Online Donation · Bank Details · Event Submissions
 */
export const NAV_SECTION_TITLE = 'FOP Management';

export const PROFILES_NAV: NavGroup = {
  id: 'profiles',
  label: 'Profiles',
  icon: Users,
  children: [
    { id: 'profiles-sponsors', label: 'Sponsors', to: '/fop/sponsors', icon: UserRound },
    { id: 'profiles-user', label: 'User', to: '/organization/sponsors', icon: Users },
    { id: 'profiles-organizations', label: 'Organizations', to: '/organization/organizations', icon: Landmark },
    { id: 'profiles-orphans', label: 'Orphans', to: '/organization/orphans', icon: Heart },
    { id: 'profiles-orphans-table', label: 'Orphans table', to: '/organization/kafalat', icon: ClipboardCheck },
  ],
};

/** Sidebar nav, top to bottom. */
export function getNavEntries(): NavEntry[] {
  return [
    { id: 'dashboard', label: 'Dashboard', to: '/', icon: Activity },
    PROFILES_NAV,
    { id: 'send-reminder', label: 'Send Reminder', to: '/fop/send-reminder', icon: MessageCircle },
    { id: 'donation-summary', label: 'Donation Summary', to: '/fop/donation-summary', icon: DollarSign },
    { id: 'online-donation', label: 'Online Donation', to: '/fop/online-donations', icon: CreditCard },
    { id: 'bank-details', label: 'Bank Details', to: '/fop/banks', icon: BankIcon },
    { id: 'event-submissions', label: 'Event Submissions', to: '/fop/events', icon: CalendarDays },
  ];
}

/** Flat list for search and legacy callers. */
export function getNavItems(): NavItem[] {
  const flat: NavItem[] = [];
  for (const entry of getNavEntries()) {
    if (isNavGroup(entry)) flat.push(...entry.children);
    else flat.push(entry);
  }
  return flat;
}

export function filterNavEntries(entries: NavEntry[], query: string): NavEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;

  const out: NavEntry[] = [];
  for (const entry of entries) {
    if (isNavGroup(entry)) {
      const groupMatch =
        entry.label.toLowerCase().includes(q) || entry.id.toLowerCase().includes(q);
      const matchedChildren = entry.children.filter((c) => c.label.toLowerCase().includes(q));
      if (groupMatch) out.push(entry);
      else if (matchedChildren.length > 0) out.push({ ...entry, children: matchedChildren });
    } else if (entry.label.toLowerCase().includes(q)) {
      out.push(entry);
    }
  }
  return out;
}

export function titleForPath(pathname: string): string {
  const staticTitles: Record<string, string> = {
    '/payments': 'Payments',
    '/profile': 'My Profile',
    '/profile/change-password': 'Change Password',
    '/chat': 'Chat',
    '/reports': 'Reports',
    '/organization/organizations': 'Organizations',
    '/organization/sponsors': 'App Users',
    '/organization/orphans': 'Orphans',
    '/organization/students': 'Students',
    '/organization/kafalat': 'Orphans table',
    '/fop/sponsors': 'Sponsors',
    '/fop/send-reminder': 'Send Reminder',
    '/fop/donation-summary': 'Donation Summary',
    '/fop/online-donations': 'Online Donation',
    '/fop/banks': 'Bank Details',
    '/fop/events': 'Event Submissions',
  };
  if (staticTitles[pathname]) return staticTitles[pathname];

  if (pathname.startsWith('/organization/organizations/')) {
    return pathname.includes('/new') ? 'New organization' : 'Edit organization';
  }
  if (pathname.startsWith('/organization/sponsors/')) {
    return pathname.includes('/new') ? 'New app user' : 'Edit app user';
  }
  if (pathname.startsWith('/organization/orphans/')) {
    if (pathname.includes('/new')) return 'New orphan';
    return pathname.endsWith('/edit') ? 'Edit orphan' : 'Child profile';
  }
  if (pathname.startsWith('/organization/students/')) {
    if (pathname.includes('/new')) return 'New student';
    return pathname.endsWith('/edit') ? 'Edit student' : 'Student profile';
  }

  if (pathname.startsWith('/fop/sponsors/')) return 'Sponsor profile';

  const item = getNavItems().find((nav) => nav.to === pathname);
  if (item) return item.label;
  if (pathname.startsWith('/hub/')) {
    const slug = pathname.slice('/hub/'.length);
    return slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return 'Home';
}
