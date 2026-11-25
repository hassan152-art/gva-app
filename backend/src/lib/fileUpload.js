import multer from 'multer';
import env from '../config.js';
import { uploadToCloudious } from '../services/cloudiousUploadService.js';

/** One image / PDF in memory (slips, complaint screenshots). */
export const singleFile = (field) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ok = /^image\/(png|jpe?g|webp|heic|heif)$/i.test(file.mimetype) || file.mimetype === 'application/pdf';
      cb(ok ? null : Object.assign(new Error('Attach a photo (JPG/PNG) or a PDF'), { status: 422 }), ok);
    },
  }).single(field);

/** Upload the request's file (if any) to Drive and return its URL. */
export async function storeUpload(req) {
  if (!req.file?.buffer?.length) return null;
  const up = await uploadToCloudious({
    buffer: req.file.buffer,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
  });
  return up.path;
}
