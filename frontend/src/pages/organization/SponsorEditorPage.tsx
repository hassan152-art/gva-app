import { Phone, User } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EntityEditorPageSkeleton } from '@/components/skeletons/EntityEditorPageSkeleton';
import {
  EntityEditorShell,
  FormGrid,
  FormSection,
  FieldLabel,
} from '@/components/organization/EntityEditorShell';
import { Input } from '@/components/ui/input';
import { createAdminSponsor, getAdminSponsor, updateAdminSponsor } from '@/lib/adminApi';

const TABS = [
  { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
  { id: 'contact', label: 'Contact', icon: <Phone className="h-4 w-4" /> },
];

export function SponsorEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const listPath = '/organization/sponsors';

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', status: 'active' });

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const res = await getAdminSponsor(id!);
      setForm({
        fullName: res.sponsor.fullName,
        email: res.sponsor.email,
        phone: res.sponsor.phone ?? '',
        status: 'active',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load sponsor');
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    load();
  }, [load]);

  const title = isNew ? 'Add App User' : 'Edit App User';
  const breadcrumbs = useMemo(
    () => [
      { label: 'Home', to: '/' },
      { label: 'App Users', to: listPath },
      { label: isNew ? 'Add App User' : form.fullName || 'Edit' },
    ],
    [form.fullName, isNew],
  );

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (isNew) {
        const res = await createAdminSponsor({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
        });
        setMessage(`Created. Temp password: ${res.tempPassword}`);
        window.setTimeout(() => navigate(listPath), 1200);
      } else {
        await updateAdminSponsor(id!, {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        });
        navigate(listPath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <EntityEditorPageSkeleton label="Loading sponsor editor" tabCount={2} fieldCount={6} />
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
      saveDisabled={!form.fullName.trim() || !form.email.trim()}
    >
      {error ? (
        <p className="mb-4 text-sm text-gva-heart" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mb-4 text-sm text-gva-green-deep" role="status">
          {message}
        </p>
      ) : null}

      {activeTab === 'profile' ? (
        <>
          <FormGrid cols={3}>
            <div>
              <FieldLabel htmlFor="fullName" required>
                Sponsor name
              </FieldLabel>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Full name"
                className="bg-gva-canvas/80"
              />
            </div>
            <div>
              <FieldLabel htmlFor="status">Status</FieldLabel>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="h-12 w-full rounded-lg border border-gva-hairline bg-gva-canvas/80 px-3 text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </FormGrid>

          <FormSection title="Account">
            <FormGrid cols={2}>
              <div>
                <FieldLabel htmlFor="email" required>
                  Email
                </FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="sponsor@example.com"
                  className="bg-gva-canvas/80"
                />
              </div>
              <div>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="bg-gva-canvas/80"
                />
              </div>
            </FormGrid>
          </FormSection>
        </>
      ) : null}

      {activeTab === 'contact' ? (
        <FormGrid cols={2}>
          <div>
            <FieldLabel htmlFor="phone2">Phone</FieldLabel>
            <Input
              id="phone2"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="bg-gva-canvas/80"
            />
          </div>
          <div>
            <FieldLabel htmlFor="email2">Email</FieldLabel>
            <Input
              id="email2"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="bg-gva-canvas/80"
            />
          </div>
        </FormGrid>
      ) : null}
    </EntityEditorShell>
  );
}
