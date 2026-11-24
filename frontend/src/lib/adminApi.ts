import { apiRequest } from '@/lib/api';
import type { OrphanProfile, SponsorOption } from '@/lib/api';

export type AdminSponsor = SponsorOption & {
  phone?: string | null;
  role: string;
};

export function listAdminSponsors(q = ''): Promise<{ sponsors: AdminSponsor[] }> {
  const qs = q ? `?q=${encodeURIComponent(q)}` : '';
  return apiRequest(`/admin/sponsors${qs}`);
}

export function createAdminSponsor(payload: {
  fullName: string;
  email: string;
  phone?: string;
}): Promise<{ sponsor: AdminSponsor; tempPassword: string; message: string }> {
  return apiRequest('/admin/sponsors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function updateAdminSponsor(
  id: string,
  payload: { fullName?: string; email?: string; phone?: string },
): Promise<{ sponsor: AdminSponsor; message: string }> {
  return apiRequest(`/admin/sponsors/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function deleteAdminSponsor(id: string): Promise<{ ok: boolean; message: string }> {
  return apiRequest(`/admin/sponsors/${id}`, { method: 'DELETE' });
}

export function getAdminSponsor(id: string): Promise<{ sponsor: AdminSponsor }> {
  return apiRequest(`/admin/sponsors/${id}`);
}

export function listAdminOrphans(params: {
  kind: 'orphan' | 'student';
  status?: 'waiting' | 'sponsored' | '';
  q?: string;
}): Promise<{ orphans: OrphanProfile[] }> {
  const qs = new URLSearchParams({ kind: params.kind });
  if (params.status) qs.set('status', params.status);
  if (params.q?.trim()) qs.set('q', params.q.trim());
  return apiRequest(`/admin/orphans?${qs.toString()}`);
}

export function createAdminOrphan(
  payload: Record<string, unknown> & { recordKind: 'orphan' | 'student'; code: string },
): Promise<{ orphan: OrphanProfile; message: string }> {
  return apiRequest('/admin/orphans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function updateAdminOrphan(
  id: string,
  payload: Record<string, unknown>,
): Promise<{ orphan: OrphanProfile; message: string }> {
  return apiRequest(`/admin/orphans/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function deleteAdminOrphan(id: string): Promise<{ ok: boolean; message: string }> {
  return apiRequest(`/admin/orphans/${id}`, { method: 'DELETE' });
}

export function getAdminOrphan(id: string): Promise<{ orphan: OrphanProfile }> {
  return apiRequest(`/admin/orphans/${id}`);
}

export function uploadAdminOrphanPhoto(
  id: string,
  file: File,
): Promise<{ orphan: OrphanProfile; message: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest(`/admin/orphans/${id}/photo`, { method: 'POST', formData });
}

export function deleteAdminOrphanPhoto(
  id: string,
): Promise<{ orphan: OrphanProfile; message: string }> {
  return apiRequest(`/admin/orphans/${id}/photo`, { method: 'DELETE' });
}

export type OrphanDocument = {
  id: string;
  fileUrl: string;
  originalName: string | null;
  mimetype: string | null;
  size: number | null;
  createdAt: string | null;
};

export function listAdminOrphanDocuments(
  orphanId: string,
): Promise<{ documents: OrphanDocument[] }> {
  return apiRequest(`/admin/orphans/${orphanId}/documents`);
}

export function uploadAdminOrphanDocument(
  orphanId: string,
  file: File,
): Promise<{ document: OrphanDocument; message: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest(`/admin/orphans/${orphanId}/documents`, { method: 'POST', formData });
}

export function deleteAdminOrphanDocument(
  orphanId: string,
  documentId: string,
): Promise<{ ok: boolean; message: string }> {
  return apiRequest(`/admin/orphans/${orphanId}/documents/${documentId}`, { method: 'DELETE' });
}

export type OrganizationRecord = {
  id: string;
  name: string;
  type?: 'organization' | 'individual';
  orphanCount?: number;
  code: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
  sponsorCount?: number;
};

export function listAdminOrganizations(q = ''): Promise<{ organizations: OrganizationRecord[] }> {
  const qs = q ? `?q=${encodeURIComponent(q)}` : '';
  return apiRequest(`/admin/organizations${qs}`);
}

export function getAdminOrganization(
  id: string,
): Promise<{ organization: OrganizationRecord; sponsors: AdminSponsor[] }> {
  return apiRequest(`/admin/organizations/${id}`);
}

export function createAdminOrganization(payload: {
  name: string;
  type?: 'organization' | 'individual';
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
  sponsorUserIds?: string[];
}): Promise<{ organization: OrganizationRecord; sponsors: AdminSponsor[]; message: string }> {
  return apiRequest('/admin/organizations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function updateAdminOrganization(
  id: string,
  payload: {
    name?: string;
    type?: 'organization' | 'individual';
    code?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    notes?: string;
    sponsorUserIds?: string[];
  },
): Promise<{ organization: OrganizationRecord; sponsors: AdminSponsor[]; message: string }> {
  return apiRequest(`/admin/organizations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function deleteAdminOrganization(id: string): Promise<{ ok: boolean; message: string }> {
  return apiRequest(`/admin/organizations/${id}`, { method: 'DELETE' });
}

export function listOrphanCodes(): Promise<{ codes: { id: string; code: string; kind: string }[] }> {
  return apiRequest('/admin/orphan-codes');
}
