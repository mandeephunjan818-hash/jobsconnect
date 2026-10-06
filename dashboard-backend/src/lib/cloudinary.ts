// lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ─── Image upload (existing) ────────────────────────────────────────────── */

export async function uploadImage(file: File, folder: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const originalName = file.name.split('.').slice(0, -1).join('.') || 'image';
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9]/g, '_');

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: sanitizedName,
        overwrite: true,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result?.secure_url || '');
      }
    );
    uploadStream.end(buffer);
  });
}

/* ─── File / Resume upload (new) ─────────────────────────────────────────── */

export interface UploadFileResult {
  /** Public HTTPS URL – use this to let users download / preview the file */
  secureUrl: string;
  /**
   * Cloudinary public_id – store this in MongoDB so you can delete or replace
   * the asset later via cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
   */
  publicId: string;
  /** Original filename reported by the browser */
  originalName: string;
  /** File size in bytes */
  bytes: number;
  /** Cloudinary resource_type ('raw' for PDFs, DOCX, etc.) */
  resourceType: string;
}

/**
 * Upload any non-image file (PDF, DOCX, TXT, ZIP …) to Cloudinary.
 *
 * @param file    The File / Blob coming from FormData
 * @param folder  Cloudinary folder, e.g. 'pipeline/resumes'
 * @param userId  Optional – appended to the public_id to keep assets per-user
 *
 * @example
 *   const resumeFile = formData.get('resume') as File;
 *   const result = await uploadFile(resumeFile, 'pipeline/resumes', userId);
 *   // result.secureUrl  → store in DB, send to user
 *   // result.publicId   → store in DB, needed for future deletion
 */
export async function uploadFile(
  file: File,
  folder: string,
  userId?: string
): Promise<UploadFileResult> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const baseName = file.name.split('.').slice(0, -1).join('.') || 'file';
  const sanitized = baseName.replace(/[^a-zA-Z0-9]/g, '_');
  const publicId = userId
    ? `${sanitized}_${userId}_${Date.now()}`
    : `${sanitized}_${Date.now()}`;

  return new Promise((resolve, reject) => {
    // 1. Assign the stream to a variable named 'uploadStream'
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'raw',
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error('Cloudinary upload failed'));
        }
        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
          originalName: file.name,
          bytes: result.bytes,
          resourceType: result.resource_type,
        });
      }
    );

    // 2. Now 'uploadStream' is defined in this scope and can be closed
    uploadStream.end(buffer);
  });
}


/**
 * Cleaner internal implementation (replaces the closure above).
 * Exported as `uploadFile` – the version above is the public API.
 */
async function _uploadFile(
  file: File,
  folder: string,
  userId?: string
): Promise<UploadFileResult> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const baseName = file.name.replace(/\.[^/.]+$/, '') || 'file'; // strip extension
  const sanitized = baseName.replace(/[^a-zA-Z0-9]/g, '_');
  const publicId = userId
    ? `${sanitized}_${userId}_${Date.now()}`
    : `${sanitized}_${Date.now()}`;

  return new Promise<UploadFileResult>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'raw',
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error('No result from Cloudinary'));
        }
        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
          originalName: file.name,
          bytes: result.bytes,
          resourceType: result.resource_type,
        });
      }
    );
    stream.end(buffer);
  });
}

// Re-export the clean implementation as the default export for uploadFile
// (overrides the draft above at runtime – keep only _uploadFile in production)
export { _uploadFile as uploadFileClean };

/* ─── Delete a previously uploaded raw file ─────────────────────────────── */

/**
 * Delete a file from Cloudinary using its stored public_id.
 * Call this when a user replaces their resume or deletes their profile.
 */
export async function deleteFile(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
}

/** Delete an image asset (resource_type: 'image') */
export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

export default cloudinary;