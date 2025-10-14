/**
 * AWS S3 Storage Client
 * Replaces Supabase Storage with direct S3 operations
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { cognitoAuth } from './aws-cognito';

const REGION = 'us-east-1';
const FILES_BUCKET = `mentalspace-ehr-files-${import.meta.env.VITE_AWS_ACCOUNT_ID || '706704660887'}`;
const VIDEOS_BUCKET = `mentalspace-ehr-videos-${import.meta.env.VITE_AWS_ACCOUNT_ID || '706704660887'}`;

export class StorageError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

class BucketClient {
  private bucketName: string;
  private s3Client: S3Client | null = null;

  constructor(bucketName: string) {
    this.bucketName = bucketName;
  }

  private async getS3Client(): Promise<S3Client> {
    if (this.s3Client) return this.s3Client;

    const credentials = await cognitoAuth.getAWSCredentials();

    this.s3Client = new S3Client({
      region: REGION,
      credentials
    });

    return this.s3Client;
  }

  /**
   * Upload file to S3
   * Mimics: supabase.storage.from(bucket).upload(path, file)
   */
  async upload(
    path: string,
    file: File | Blob,
    options?: {
      cacheControl?: string;
      contentType?: string;
      upsert?: boolean;
    }
  ): Promise<{ data: { path: string } | null; error: StorageError | null }> {
    try {
      const s3 = await this.getS3Client();

      const contentType = options?.contentType || (file instanceof File ? file.type : 'application/octet-stream');

      // Convert File/Blob to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      await s3.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: path,
        Body: buffer,
        ContentType: contentType,
        CacheControl: options?.cacheControl || 'max-age=3600',
        ServerSideEncryption: 'AES256',
        Metadata: {
          uploadedAt: new Date().toISOString()
        }
      }));

      return {
        data: { path },
        error: null
      };
    } catch (error) {
      console.error('[aws-storage] Upload error:', error);
      return {
        data: null,
        error: new StorageError(
          error instanceof Error ? error.message : 'Upload failed',
          'UPLOAD_ERROR'
        )
      };
    }
  }

  /**
   * Download file from S3
   * Mimics: supabase.storage.from(bucket).download(path)
   */
  async download(path: string): Promise<{ data: Blob | null; error: StorageError | null }> {
    try {
      const s3 = await this.getS3Client();

      const response = await s3.send(new GetObjectCommand({
        Bucket: this.bucketName,
        Key: path
      }));

      if (!response.Body) {
        throw new Error('No file data received');
      }

      // Convert stream to blob
      const chunks: Uint8Array[] = [];
      const reader = response.Body.transformToWebStream().getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const blob = new Blob(chunks, { type: response.ContentType });

      return {
        data: blob,
        error: null
      };
    } catch (error) {
      console.error('[aws-storage] Download error:', error);
      return {
        data: null,
        error: new StorageError(
          error instanceof Error ? error.message : 'Download failed',
          'DOWNLOAD_ERROR'
        )
      };
    }
  }

  /**
   * Delete file from S3
   * Mimics: supabase.storage.from(bucket).remove([path])
   */
  async remove(paths: string[]): Promise<{ data: any | null; error: StorageError | null }> {
    try {
      const s3 = await this.getS3Client();

      for (const path of paths) {
        await s3.send(new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: path
        }));
      }

      return {
        data: { paths },
        error: null
      };
    } catch (error) {
      console.error('[aws-storage] Delete error:', error);
      return {
        data: null,
        error: new StorageError(
          error instanceof Error ? error.message : 'Delete failed',
          'DELETE_ERROR'
        )
      };
    }
  }

  /**
   * List files in S3
   * Mimics: supabase.storage.from(bucket).list(path)
   */
  async list(
    path?: string,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: { column: string; order: 'asc' | 'desc' };
    }
  ): Promise<{ data: any[] | null; error: StorageError | null }> {
    try {
      const s3 = await this.getS3Client();

      const response = await s3.send(new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: path || '',
        MaxKeys: options?.limit || 100
      }));

      const files = (response.Contents || []).map(item => ({
        name: item.Key,
        id: item.Key,
        updated_at: item.LastModified?.toISOString(),
        created_at: item.LastModified?.toISOString(),
        last_accessed_at: item.LastModified?.toISOString(),
        metadata: {
          size: item.Size,
          mimetype: 'application/octet-stream'
        }
      }));

      return {
        data: files,
        error: null
      };
    } catch (error) {
      console.error('[aws-storage] List error:', error);
      return {
        data: null,
        error: new StorageError(
          error instanceof Error ? error.message : 'List failed',
          'LIST_ERROR'
        )
      };
    }
  }

  /**
   * Get public URL for file
   * Mimics: supabase.storage.from(bucket).getPublicUrl(path)
   */
  getPublicUrl(path: string): { data: { publicUrl: string } } {
    // CloudFront URL for videos bucket, direct S3 URL for files
    const isVideoBucket = this.bucketName.includes('videos');

    if (isVideoBucket) {
      const cloudFrontDomain = import.meta.env.VITE_CLOUDFRONT_DOMAIN || 'd123example.cloudfront.net';
      return {
        data: {
          publicUrl: `https://${cloudFrontDomain}/${path}`
        }
      };
    }

    // For files bucket, use S3 URL (requires signed URL for access)
    return {
      data: {
        publicUrl: `https://${this.bucketName}.s3.${REGION}.amazonaws.com/${path}`
      }
    };
  }

  /**
   * Create signed URL for private file access
   * Mimics: supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
   */
  async createSignedUrl(
    path: string,
    expiresIn: number
  ): Promise<{ data: { signedUrl: string } | null; error: StorageError | null }> {
    try {
      const s3 = await this.getS3Client();

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: path
      });

      const signedUrl = await getSignedUrl(s3, command, { expiresIn });

      return {
        data: { signedUrl },
        error: null
      };
    } catch (error) {
      console.error('[aws-storage] Signed URL error:', error);
      return {
        data: null,
        error: new StorageError(
          error instanceof Error ? error.message : 'Signed URL creation failed',
          'SIGNED_URL_ERROR'
        )
      };
    }
  }
}

class StorageClient {
  /**
   * Get bucket client
   * Mimics: supabase.storage.from(bucketName)
   */
  from(bucketName: string): BucketClient {
    // Map common bucket names
    const bucketMap: Record<string, string> = {
      'documents': FILES_BUCKET,
      'files': FILES_BUCKET,
      'videos': VIDEOS_BUCKET,
      'recordings': VIDEOS_BUCKET,
      'images': FILES_BUCKET,
      'avatars': FILES_BUCKET
    };

    const actualBucket = bucketMap[bucketName] || FILES_BUCKET;
    return new BucketClient(actualBucket);
  }
}

// Export singleton
export const awsStorage = new StorageClient();
