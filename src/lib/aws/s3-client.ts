/**
 * AWS S3 Client for File Uploads
 *
 * This utility handles file uploads to AWS S3 buckets using Cognito Identity Pool
 * for temporary credentials. Supabase Auth tokens are NOT used here.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { Upload } from '@aws-sdk/lib-storage';

const REGION = import.meta.env.VITE_AWS_REGION;
const IDENTITY_POOL_ID = import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID;
const FILES_BUCKET = import.meta.env.VITE_FILES_BUCKET;
const VIDEOS_BUCKET = import.meta.env.VITE_VIDEOS_BUCKET;
const VIDEO_CDN = import.meta.env.VITE_VIDEO_CDN;

/**
 * Create S3 client with Cognito Identity Pool credentials
 * This allows unauthenticated uploads with temporary AWS credentials
 */
const s3Client = new S3Client({
  region: REGION,
  credentials: fromCognitoIdentityPool({
    client: new CognitoIdentityClient({ region: REGION }),
    identityPoolId: IDENTITY_POOL_ID,
  }),
});

export interface UploadFileOptions {
  file: File;
  key: string; // S3 object key (path/filename)
  bucket?: 'files' | 'videos';
  onProgress?: (progress: number) => void;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  bucket: string;
  url: string;
  cdnUrl?: string; // For videos
  size: number;
  type: string;
}

/**
 * Upload a file to S3
 *
 * @example
 * const result = await uploadFile({
 *   file: fileBlob,
 *   key: `documents/${clientId}/consent-form.pdf`,
 *   bucket: 'files',
 *   onProgress: (progress) => console.log(`${progress}% uploaded`)
 * });
 */
export async function uploadFile(options: UploadFileOptions): Promise<UploadResult> {
  const { file, key, bucket = 'files', onProgress, metadata } = options;

  const bucketName = bucket === 'videos' ? VIDEOS_BUCKET : FILES_BUCKET;

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: file.type,
      Metadata: metadata,
    },
  });

  if (onProgress) {
    upload.on('httpUploadProgress', (progress) => {
      if (progress.loaded && progress.total) {
        const percentage = Math.round((progress.loaded / progress.total) * 100);
        onProgress(percentage);
      }
    });
  }

  await upload.done();

  const url = `https://${bucketName}.s3.${REGION}.amazonaws.com/${key}`;
  const cdnUrl = bucket === 'videos' ? `${VIDEO_CDN}/${key}` : undefined;

  return {
    key,
    bucket: bucketName,
    url,
    cdnUrl,
    size: file.size,
    type: file.type,
  };
}

/**
 * Upload multiple files in parallel
 */
export async function uploadFiles(
  files: Array<Omit<UploadFileOptions, 'onProgress'>>,
  onOverallProgress?: (completed: number, total: number) => void
): Promise<UploadResult[]> {
  let completed = 0;

  const uploads = files.map(async (fileOptions) => {
    const result = await uploadFile(fileOptions);
    completed++;
    if (onOverallProgress) {
      onOverallProgress(completed, files.length);
    }
    return result;
  });

  return Promise.all(uploads);
}

/**
 * Delete a file from S3
 */
export async function deleteFile(key: string, bucket: 'files' | 'videos' = 'files'): Promise<void> {
  const bucketName = bucket === 'videos' ? VIDEOS_BUCKET : FILES_BUCKET;

  await s3Client.send(new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  }));
}

/**
 * Generate a presigned URL for direct download (expires in 1 hour)
 * Note: For videos, prefer using CloudFront CDN URL instead
 */
export function getFileUrl(key: string, bucket: 'files' | 'videos' = 'files'): string {
  const bucketName = bucket === 'videos' ? VIDEOS_BUCKET : FILES_BUCKET;

  // For videos, return CloudFront URL
  if (bucket === 'videos') {
    return `${VIDEO_CDN}/${key}`;
  }

  // For files, return direct S3 URL
  return `https://${bucketName}.s3.${REGION}.amazonaws.com/${key}`;
}

/**
 * Helper to generate a unique S3 key with timestamp
 *
 * @example
 * generateKey('documents/client-123', 'consent-form.pdf')
 * // Returns: 'documents/client-123/1234567890-consent-form.pdf'
 */
export function generateKey(prefix: string, filename: string): string {
  const timestamp = Date.now();
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${prefix}/${timestamp}-${sanitized}`;
}

/**
 * Validate file before upload
 */
export function validateFile(file: File, options?: {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}): { valid: boolean; error?: string } {
  const { maxSize = 100 * 1024 * 1024, allowedTypes } = options || {}; // Default 100MB

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`,
    };
  }

  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not allowed`,
    };
  }

  return { valid: true };
}

export default s3Client;
