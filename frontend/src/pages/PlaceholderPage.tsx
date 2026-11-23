import { MobilePageShell } from '@/components/MobilePageShell';

type PlaceholderPageProps = {
  heading: string;
  body: string;
};

export function PlaceholderPage({ heading, body }: PlaceholderPageProps) {
  return (
    <MobilePageShell title={heading} subtitle={body} className="max-w-3xl">
      <div className="rounded-2xl border border-black/[0.06] bg-gva-surface p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] md:p-8">
        <p className="text-[15px] text-gva-muted">{body}</p>
      </div>
    </MobilePageShell>
  );
}
