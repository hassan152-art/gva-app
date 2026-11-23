import { AdminListPageSkeleton } from '@/components/skeletons/AdminListPageSkeleton';
import { ChangePasswordPageSkeleton } from '@/components/skeletons/ChangePasswordPageSkeleton';
import { EntityEditorPageSkeleton } from '@/components/skeletons/EntityEditorPageSkeleton';
import { HomePageSkeleton } from '@/components/skeletons/HomePageSkeleton';
import { ProfilePageSkeleton } from '@/components/skeletons/ProfilePageSkeleton';
import { ShellPageSkeleton } from '@/components/skeletons/ShellPageSkeleton';

export function PageSkeletonForPath({ pathname }: { pathname: string }) {
  if (pathname === '/' || pathname === '') return <HomePageSkeleton />;
  if (pathname.startsWith('/profile/change-password')) return <ChangePasswordPageSkeleton />;
  if (pathname.startsWith('/profile')) return <ProfilePageSkeleton />;
  if (pathname.startsWith('/organization/')) {
    if (pathname.includes('/new') || pathname.includes('/edit')) {
      return <EntityEditorPageSkeleton label="Loading editor" tabCount={3} fieldCount={6} />;
    }
    if (pathname.includes('/orphans') || pathname.includes('/students')) {
      return <AdminListPageSkeleton label="Loading records" columns={5} filterCount={2} />;
    }
    return <AdminListPageSkeleton label="Loading records" columns={5} filterCount={1} />;
  }
  if (pathname.startsWith('/hub/')) return <ShellPageSkeleton />;
  return <ShellPageSkeleton />;
}
