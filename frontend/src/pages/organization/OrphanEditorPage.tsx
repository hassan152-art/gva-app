import { FileText, Phone, User, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  EntityEditorShell,
  FormGrid,
  FormSection,
  FieldLabel,
} from '@/components/organization/EntityEditorShell';
import { EntityEditorPageSkeleton } from '@/components/skeletons/EntityEditorPageSkeleton';
import { PhotoDropzone } from '@/components/organization/PhotoDropzone';
import { OrphanDocumentsPanel } from '@/components/organization/OrphanDocumentsPanel';
import { SponsorSelectField } from '@/components/organization/SponsorSelectField';
import { Input } from '@/components/ui/input';
import {
  createAdminOrphan,
  deleteAdminOrphanPhoto,
  getAdminOrphan,
  updateAdminOrphan,
  uploadAdminOrphanDocument,
  uploadAdminOrphanPhoto,
  type AdminSponsor,
} from '@/lib/adminApi';

type OrphanEditorPageProps = {
  kind: 'orphan' | 'student';
};

const TABS = [
  { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
  { id: 'contact', label: 'Contact', icon: <Phone className="h-4 w-4" /> },
  { id: 'family', label: 'Family', icon: <Users className="h-4 w-4" /> },
  { id: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
];

export function OrphanEditorPage({ kind }: OrphanEditorPageProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const listPath = kind === 'student' ? '/organization/students' : '/organization/orphans';
  const entityLabel = kind === 'student' ? 'Student' : 'Orphan';

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [fullPhotoUrl, setFullPhotoUrl] = useState<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [sponsor, setSponsor] = useState<AdminSponsor | null>(null);
  const [sponsorNotice, setSponsorNotice] = useState<string | null>(null);
  const [pendingDocuments, setPendingDocuments] = useState<File[]>([]);

  const [form, setForm] = useState({
    code: '',
    nameEn: '',
    nameAr: '',
    guardianNameEn: '',
    sex: 'Male',
    status: 'waiting' as 'waiting' | 'sponsored',
    dateOfBirth: '',
    orphanIdNumber: '',
    whatsapp: '',
    location: '',
    guardianNameAr: '',
    guardianIdNumber: '',
    monthlyAmountPkr: '0',
    discountPkr: '0',
  });

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const res = await getAdminOrphan(id!);
      const o = res.orphan;
      setFullPhotoUrl(o.photoUrl ?? o.photoThumbnailUrl);
      setPhotoUrl(o.photoThumbnailUrl ?? o.photoUrl);
      setSponsor(
        o.sponsor
          ? {
              id: o.sponsor.id,
              fullName: o.sponsor.fullName,
              email: o.sponsor.email,
              role: 'sponsor',
            }
          : null,
      );
      setForm({
        code: o.code ?? '',
        nameEn: o.nameEn ?? '',
        nameAr: o.nameAr ?? '',
        guardianNameEn: o.guardianNameEn ?? '',
        sex: o.sex === 'Female' ? 'Female' : 'Male',
        status:
          o.status === 'sponsored' || o.sponsor
            ? 'sponsored'
            : o.status === 'waiting'
              ? 'waiting'
              : 'waiting',
        dateOfBirth: o.dateOfBirth ?? '',
        orphanIdNumber: o.orphanIdNumber ?? '',
        whatsapp: o.whatsapp ?? '',
        location: o.location ?? '',
        guardianNameAr: o.guardianNameAr ?? '',
        guardianIdNumber: o.guardianIdNumber ?? '',
        monthlyAmountPkr: String(o.monthlyAmount?.amount ?? 0),
        discountPkr: '0',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load record');
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    load();
  }, [load]);

  const title = isNew ? `Add ${entityLabel}` : `Edit ${entityLabel}`;
  const breadcrumbs = useMemo(
    () => [
      { label: 'Home', to: '/' },
      { label: kind === 'student' ? 'Students' : 'Orphans', to: listPath },
      { label: isNew ? `Add ${entityLabel}` : form.code || entityLabel },
    ],
    [entityLabel, form.code, isNew, kind, listPath],
  );

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        recordKind: kind,
        code: form.code.trim(),
        nameEn: form.nameEn.trim(),
        nameAr: form.nameAr.trim(),
        guardianNameEn: form.guardianNameEn.trim(),
        guardianNameAr: form.guardianNameAr.trim(),
        guardianIdNumber: form.guardianIdNumber.trim(),
        orphanIdNumber: form.orphanIdNumber.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        whatsapp: form.whatsapp.trim(),
        location: form.location.trim(),
        status: form.status,
        sex: form.sex,
        monthlyAmountPkr: Number.parseInt(form.monthlyAmountPkr, 10) || 0,
      };

      const sponsorPatch =
        kind === 'student' ? { sponsorUserId: sponsor?.id ?? null } : {};

      let recordId = id;
      if (isNew) {
        const res = await createAdminOrphan(payload);
        recordId = res.orphan.id;
        if (kind === 'student' && recordId && sponsorPatch.sponsorUserId !== undefined) {
          await updateAdminOrphan(recordId, sponsorPatch);
        }
      } else {
        await updateAdminOrphan(id!, { ...payload, ...sponsorPatch });
      }

      if (pendingPhoto && recordId) {
        await uploadAdminOrphanPhoto(recordId, pendingPhoto);
      }

      if (recordId && pendingDocuments.length > 0) {
        for (const file of pendingDocuments) {
          await uploadAdminOrphanDocument(recordId, file);
        }
      }

      navigate(listPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function onPhoto(file: File) {
    setPendingPhoto(file);
    setPhotoPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setFullPhotoUrl(null);
  }

  async function onDeletePhoto() {
    const hasPhoto = Boolean(photoPreview ?? photoUrl);
    if (!hasPhoto) return;
    if (!window.confirm('Remove this photo?')) return;

    setError(null);
    if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setPendingPhoto(null);
    setPhotoUrl(null);
    setFullPhotoUrl(null);

    if (isNew || !id) return;

    setPhotoBusy(true);
    try {
      await deleteAdminOrphanPhoto(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove photo');
    } finally {
      setPhotoBusy(false);
    }
  }

  const thumb = photoPreview ?? photoUrl;
  const fullPhoto = photoPreview ?? fullPhotoUrl ?? photoUrl;

  if (loading) {
    return (
      <EntityEditorPageSkeleton
        label={`Loading ${entityLabel.toLowerCase()} editor`}
        tabCount={4}
        withPhoto
        fieldCount={9}
      />
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
      saveDisabled={!form.code.trim() || !form.nameEn.trim()}
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
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex justify-center lg:justify-start">
              <PhotoDropzone
                imageUrl={thumb}
                fullImageUrl={fullPhoto}
                uploading={photoBusy}
                onFile={onPhoto}
                onDelete={() => void onDeletePhoto()}
              />
            </div>
            <div className="min-w-0 flex-1">
              <FormGrid cols={3}>
                <div>
                  <FieldLabel htmlFor="nameEn" required>
                    {entityLabel} name
                  </FieldLabel>
                  <Input
                    id="nameEn"
                    value={form.nameEn}
                    onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
                    placeholder="Ahmad Salah Iddin Nimr Zaghra"
                    className="bg-gva-canvas/80"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="guardianNameEn">Guardian name</FieldLabel>
                  <Input
                    id="guardianNameEn"
                    value={form.guardianNameEn}
                    onChange={(e) => setForm((f) => ({ ...f, guardianNameEn: e.target.value }))}
                    placeholder="Reham Tawfeq Ibrahem Zaghra"
                    className="bg-gva-canvas/80"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="nameAr">Name (Arabic)</FieldLabel>
                  <Input
                    id="nameAr"
                    dir="auto"
                    value={form.nameAr}
                    onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
                    className="bg-gva-canvas/80"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="sex">Gender</FieldLabel>
                  <select
                    id="sex"
                    value={form.sex}
                    onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}
                    className="h-12 w-full rounded-lg border border-gva-hairline bg-gva-canvas/80 px-3 text-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor="status">Status</FieldLabel>
                  <select
                    id="status"
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value as 'waiting' | 'sponsored' }))
                    }
                    className="h-12 w-full rounded-lg border border-gva-hairline bg-gva-canvas/80 px-3 text-sm"
                  >
                    <option value="waiting">Waiting</option>
                    <option value="sponsored">Sponsored</option>
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor="dob">Date of birth</FieldLabel>
                  <Input
                    id="dob"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                    className="bg-gva-canvas/80"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="orphanId">ID number</FieldLabel>
                  <Input
                    id="orphanId"
                    value={form.orphanIdNumber}
                    onChange={(e) => setForm((f) => ({ ...f, orphanIdNumber: e.target.value }))}
                    placeholder="435790779"
                    className="bg-gva-canvas/80"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="code" required>
                    Code
                  </FieldLabel>
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="OR711"
                    className="bg-gva-canvas/80"
                  />
                </div>
              </FormGrid>
            </div>
          </div>

          <FormSection title="Class & fees">
            {kind === 'student' ? (
              <div className="mb-4 max-w-xl">
                <SponsorSelectField
                  value={sponsor}
                  onChange={(next) => {
                    setSponsor(next);
                    if (next) {
                      setForm((f) => ({ ...f, status: 'sponsored' }));
                    }
                  }}
                  disabled={saving}
                  onNotice={setSponsorNotice}
                />
              </div>
            ) : null}
            <FormGrid cols={3}>
              <div>
                <FieldLabel htmlFor="monthly" required>
                  Monthly fees
                </FieldLabel>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gva-muted">
                    PKR
                  </span>
                  <Input
                    id="monthly"
                    type="number"
                    min={0}
                    value={form.monthlyAmountPkr}
                    onChange={(e) => setForm((f) => ({ ...f, monthlyAmountPkr: e.target.value }))}
                    className="bg-gva-canvas/80 pl-12"
                  />
                </div>
              </div>
              <div>
                <FieldLabel htmlFor="discount">Discount</FieldLabel>
                <Input
                  id="discount"
                  type="number"
                  min={0}
                  value={form.discountPkr}
                  onChange={(e) => setForm((f) => ({ ...f, discountPkr: e.target.value }))}
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
            <FieldLabel htmlFor="whatsapp">WhatsApp</FieldLabel>
            <Input
              id="whatsapp"
              value={form.whatsapp}
              onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
              placeholder="970 599 262 303"
              className="bg-gva-canvas/80"
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="location">Location</FieldLabel>
            <Input
              id="location"
              dir="auto"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="bg-gva-canvas/80"
            />
          </div>
        </FormGrid>
      ) : null}

      {activeTab === 'family' ? (
        <FormGrid cols={2}>
          <div>
            <FieldLabel htmlFor="g-ar">Guardian name (Arabic)</FieldLabel>
            <Input
              id="g-ar"
              dir="auto"
              value={form.guardianNameAr}
              onChange={(e) => setForm((f) => ({ ...f, guardianNameAr: e.target.value }))}
              className="bg-gva-canvas/80"
            />
          </div>
          <div>
            <FieldLabel htmlFor="g-en">Guardian name (English)</FieldLabel>
            <Input
              id="g-en"
              value={form.guardianNameEn}
              onChange={(e) => setForm((f) => ({ ...f, guardianNameEn: e.target.value }))}
              className="bg-gva-canvas/80"
            />
          </div>
          <div>
            <FieldLabel htmlFor="g-id">Guardian ID number</FieldLabel>
            <Input
              id="g-id"
              value={form.guardianIdNumber}
              onChange={(e) => setForm((f) => ({ ...f, guardianIdNumber: e.target.value }))}
              className="bg-gva-canvas/80"
            />
          </div>
        </FormGrid>
      ) : null}

      {activeTab === 'documents' ? (
        <OrphanDocumentsPanel
          orphanId={id}
          isNew={isNew}
          pendingFiles={pendingDocuments}
          onPendingFilesChange={setPendingDocuments}
          onError={(message) => setError(message)}
        />
      ) : null}
    </EntityEditorShell>
  );
}
