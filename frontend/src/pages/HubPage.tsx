import { useParams } from 'react-router-dom';
import { MobilePageShell } from '@/components/MobilePageShell';
import { titleForPath } from '@/lib/navConfig';

export function HubPage() {
  const { slug = '' } = useParams();
  const pathname = `/hub/${slug}`;
  const heading = titleForPath(pathname);

  return (
    <MobilePageShell
      title={heading}
      subtitle={`Placeholder for the “${heading}” section.`}
    >
      <div className="rounded-[var(--radius-card)] border border-gva-hairline bg-gva-surface p-5 md:p-8">
        <p className="text-[15px] text-gva-muted">
          Content for this hub will be added here. On mobile, the app header stays logo-only;
          the page title appears here under a compact brand lockup.
        </p>
      </div>
    </MobilePageShell>
  );
}
