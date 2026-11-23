import { Link } from 'react-router-dom';

/** Shell placeholder until dashboard routes are ported (see DESIGN-PRINCIPLES.md). */
export function HomePlaceholder() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gva-canvas px-6 text-center">
      <h1 className="text-xl font-semibold text-gva-ink">Signed in</h1>
      <p className="max-w-md text-gva-muted">
        Dashboard shell (sidebar + header) will wrap in-app routes next — see{' '}
        <code className="text-sm">frontend/DESIGN-PRINCIPLES.md</code>.
      </p>
      <Link to="/login" className="font-semibold text-gva-green hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
