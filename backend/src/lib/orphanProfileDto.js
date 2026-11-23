import { money } from './dto.js';
import { resolveMediaPreviewUrl } from '../utils/driveMedia.js';

export function orphanProfileDto(row, sponsor = null) {
  const photoUrl = row.photo_url || row.poster_url || null;
  return {
    id: String(row.id),
    code: row.code || null,
    nameAr: row.name_ar || null,
    nameEn: row.name_en || null,
    orphanIdNumber: row.orphan_id_number || null,
    guardianNameAr: row.guardian_name_ar || null,
    guardianNameEn: row.guardian_name_en || null,
    guardianIdNumber: row.guardian_id_number || null,
    location: row.location || null,
    dateOfBirth: row.date_of_birth
      ? new Date(row.date_of_birth).toISOString().slice(0, 10)
      : null,
    whatsapp: row.whatsapp || null,
    sex: row.sex || null,
    status: row.status || null,
    monthlyAmount: money(row.monthly_amount_pkr),
    photoUrl,
    photoThumbnailUrl: photoUrl ? resolveMediaPreviewUrl(photoUrl, 200) : null,
    sponsor: sponsor
      ? { id: String(sponsor.id), fullName: sponsor.full_name, email: sponsor.email }
      : null,
  };
}
