import { Building2, Trash2, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EntityEditorPageSkeleton } from '@/components/skeletons/EntityEditorPageSkeleton';
import {
  EntityEditorShell,
  FieldLabel,
  FormGrid,
  FormSection,
} from '@/components/organization/EntityEditorShell';
import { SponsorSelectField } from '@/components/organization/SponsorSelectField';
import { Input } from '@/components/ui/input';
import {
  createAdminOrganization,
  getAdminOrganization,
  updateAdminOrganization,
  type AdminSponsor,
} from '@/lib/adminApi';

const TABS = [
  { id: 'profile', label: 'Profile', icon: <Building2 className="h-4 w-4" /> },
  { id: 'sponsors', label: 'Sponsors', icon: <Users className="h-4 w-4" /> },
];

export function OrganizationEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const listPath = '/organization/organizations';

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sponsorNotice, setSponsorNotice] = useState<string | null>(null);
  const [linkedSponsors, setLinkedSponsors] = useState<AdminSponsor[]>([]);
  const [pickSponsor, setPickSponsor] = useState<AdminSponsor | null>(null);

  const [form, setForm] = useState({
    name: '',
    type: 'organization' as 'organization' | 'individual',
    code: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    notes: '',
  });

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const res = await getAdminOrganization(id!);
      const o = res.organization;
      setForm({
        name: o.name ?? '',
        type: o.type === 'individual' ? 'individual' : 'organization',
        code: o.code ?? '',
        email: o.email ?? '',
        phone: o.phone ?? '',
        address: o.address ?? '',
        website: o.website ?? '',
        notes: o.notes ?? '',
      });
      setLinkedSponsors(res.sponsors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load organization');
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    load();
  }, [load]);

  const title = isNew ? 'Add Organization' : 'Edit Organization';
  const breadcrumbs = useMemo(
    () => [
      { label: 'Home', to: '/' },
      { label: 'Organizations', to: listPath },
      { label: isNew ? 'Add Organization' : form.name || 'Edit' },
    ],
    [form.name, isNew],
  );

  function addLinkedSponsor() {
    if (!pickSponsor) return;
    if (linkedSponsors.some((s) => s.id === pickSponsor.id)) {
      setPickSponsor(null);
      return;
    }
    setLinkedSponsors((list) => [...list, pickSponsor]);
    setPickSponsor(null);
  }

  function removeLinkedSponsor(sponsorId: string) {
    setLinkedSponsors((list) => list.filter((s) => s.id !== sponsorId));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        code: form.code.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        website: form.website.trim() || undefined,
        notes: form.notes.trim() || undefined,
        sponsorUserIds: linkedSponsors.map((s) => s.id),
      };

      if (isNew) {
        await createAdminOrganization(payload);
      } else {
        await updateAdminOrganization(id!, payload);
      }
      navigate(listPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <EntityEditorPageSkeleton label="Loading organization editor" tabCount={2} fieldCount={8} />
    );
  }

  return (
    <EntityEditorShell
      breadcrumbs={breadcrumbs}
      title={title}
      backTo={listPath}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onSave={save}
      saving={saving}
      saveDisabled={!form.name.trim()}
    >
      {error ? (
        <p className="mb-4 text-sm text-gva-heart" role="alert">
          {error}
        </p>
      ) : null}
      {sponsorNotice ? (
        <p className="mb-4 text-sm text-gva-green-deep" role="status">
          {sponsorNotice}
        </p>
      ) : null}

      {activeTab === 'profile' ? (
        <>
          <FormGrid cols={3}>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="org-name" required>
                Organization name
              </FieldLabel>
              <Input
                id="org-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="NGO 1"
                className="bg-gva-canvas/80"
              />
            </div>
            <div>
              <FieldLabel htmlFor="org-type">Type</FieldLabel>
              <select
                id="org-type"
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as 'organization' | 'individual' }))
                }
                className="h-12 w-full rounded-lg border border-gva-hairline bg-gva-canvas/80 px-3 text-sm text-gva-ink"
              >
                <option value="organization">Organization</option>
                <option value="individual">Individual</option>
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="org-code">Code</FieldLabel>
              <Input
                id="org-code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="NGO-001"
                className="bg-gva-canvas/80"
              />
            </div>
          </FormGrid>

          <FormSection title="Contact">
            <FormGrid cols={2}>
              <div>
                <FieldLabel htmlFor="org-email">Email</FieldLabel>
                <Input
                  id="org-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="bg-gva-canvas/80"
                />
              </div>
              <div>
                <FieldLabel htmlFor="org-phone">Phone</FieldLabel>
                <Input
                  id="org-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="bg-gva-canvas/80"
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="org-address">Address</FieldLabel>
                <Input
                  id="org-address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="bg-gva-canvas/80"
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="org-web">Website</FieldLabel>
                <Input
                  id="org-web"
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="https://"
                  className="bg-gva-canvas/80"
                />
              </div>
            </FormGrid>
          </FormSection>

          <FormSection title="Notes">
            <textarea
              id="org-notes"
              rows={4}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-lg border border-gva-hairline bg-gva-canvas/80 px-3 py-2 text-sm"
              placeholder="Internal notes about this organization…"
            />
          </FormSection>
        </>
      ) : null}

      {activeTab === 'sponsors' ? (
        <div className="space-y-6">
          <div className="max-w-xl">
            <p className="mb-3 text-sm text-gva-muted">
              Link sponsor accounts that belong to this organization. You can create new sponsors with
              the + button.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[240px] flex-1">
                <SponsorSelectField
                  value={pickSponsor}
                  onChange={setPickSponsor}
                  disabled={saving}
                  onNotice={setSponsorNotice}
                />
              </div>
              <button
                type="button"
                disabled={!pickSponsor || saving}
                onClick={addLinkedSponsor}
                className="h-12 rounded-lg bg-[#151b3d] px-5 text-sm font-semibold text-white hover:bg-[#151b3d]/90 disabled:opacity-50"
              >
                Link sponsor
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gva-hairline bg-gva-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gva-hairline bg-gva-canvas/80 text-xs font-bold uppercase tracking-wide text-gva-muted">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {linkedSponsors.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gva-muted">
                      No sponsors linked yet
                    </td>
                  </tr>
                ) : (
                  linkedSponsors.map((s) => (
                    <tr key={s.id} className="border-b border-gva-hairline/70 last:border-0">
                      <td className="px-4 py-3 font-semibold text-gva-ink">{s.fullName}</td>
                      <td className="px-4 py-3 text-gva-ink-2">{s.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Link
                            to={`/organization/sponsors/${s.id}/edit`}
                            className="rounded-lg px-2 py-1 text-xs font-semibold text-gva-green-deep hover:bg-gva-tint"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="rounded-lg p-2 text-gva-heart hover:bg-red-50"
                            aria-label={`Remove ${s.fullName}`}
                            onClick={() => removeLinkedSponsor(s.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </EntityEditorShell>
  );
}
