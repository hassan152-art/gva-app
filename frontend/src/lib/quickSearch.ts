import {
  Building2,
  FileBarChart,
  GraduationCap,
  Heart,
  Home,
  Landmark,
  MessageSquare,
  Receipt,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { getNavItems } from '@/lib/navConfig';

export type QuickSearchItem = {
  id: string;
  label: string;
  to: string;
  group: string;
  icon: LucideIcon;
  keywords: string;
};

const QUICK_SEARCH_CORE: QuickSearchItem[] = [
  {
    id: 'quick-dashboard',
    label: 'Dashboard',
    to: '/',
    group: 'Quick search',
    icon: Home,
    keywords: 'home dashboard main',
  },
  {
    id: 'quick-organization',
    label: 'Organization',
    to: '/organization/organizations',
    group: 'Quick search',
    icon: Building2,
    keywords: 'organization org ngo partner',
  },
  {
    id: 'quick-sponsors',
    label: 'App Users',
    to: '/organization/sponsors',
    group: 'Quick search',
    icon: Users,
    keywords: 'app users accounts login sponsor',
  },
  {
    id: 'quick-orphans',
    label: 'Orphans',
    to: '/organization/orphans',
    group: 'Quick search',
    icon: Heart,
    keywords: 'orphan orphans',
  },
];

const STATIC_PAGES: QuickSearchItem[] = [
  ...QUICK_SEARCH_CORE,
  {
    id: 'page-organizations',
    label: 'Organizations list',
    to: '/organization/organizations',
    group: 'Organization',
    icon: Landmark,
    keywords: 'organizations list ngo',
  },
  {
    id: 'page-students',
    label: 'Students',
    to: '/organization/students',
    group: 'Organization',
    icon: GraduationCap,
    keywords: 'organization student',
  },
  { id: 'page-payments', label: 'Payments', to: '/payments', group: 'Pages', icon: Receipt, keywords: 'donation payment' },
  { id: 'page-profile', label: 'My Profile', to: '/profile', group: 'Pages', icon: User, keywords: 'account' },
  { id: 'page-chat', label: 'Chat', to: '/chat', group: 'Pages', icon: MessageSquare, keywords: 'messages' },
  { id: 'page-reports', label: 'Reports', to: '/reports', group: 'Pages', icon: FileBarChart, keywords: 'analytics' },
];

export function getQuickSearchItems(): QuickSearchItem[] {
  const menu = getNavItems().map((item) => ({
    id: `menu-${item.id}`,
    label: item.label,
    to: item.to,
    group: 'Menu',
    icon: item.icon,
    keywords: item.label.toLowerCase(),
  }));

  const seen = new Set<string>();
  const merged: QuickSearchItem[] = [];
  for (const item of [...STATIC_PAGES, ...menu]) {
    if (seen.has(item.to)) continue;
    seen.add(item.to);
    merged.push(item);
  }
  return merged;
}

export function filterQuickSearchItems(items: QuickSearchItem[], query: string): QuickSearchItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q),
  );
}

const GROUP_ORDER = ['Orphans', 'Sponsors', 'Quick search', 'Organization', 'Pages', 'Menu'];

export function groupQuickSearchItems(items: QuickSearchItem[]): [string, QuickSearchItem[]][] {
  const map = new Map<string, QuickSearchItem[]>();
  for (const item of items) {
    const list = map.get(item.group) ?? [];
    list.push(item);
    map.set(item.group, list);
  }
  return Array.from(map.entries()).sort(([a], [b]) => {
    const ai = GROUP_ORDER.indexOf(a);
    const bi = GROUP_ORDER.indexOf(b);
    const ar = ai === -1 ? GROUP_ORDER.length : ai;
    const br = bi === -1 ? GROUP_ORDER.length : bi;
    return ar - br || a.localeCompare(b);
  });
}
