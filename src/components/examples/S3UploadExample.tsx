/**
 * Example: AWS S3 File Upload Component
 *
 * This demonstrates how to upload files to AWS S3 from your frontend.
 * You can copy this pattern to your existing upload components.
 */

import { useState } from 'react';
import { uploadFile, validateFile, generateKey } from '@/lib/aws/s3-client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export function S3UploadExample() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    const validation = validateFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/png', 'image/jpeg', 'application/pdf'],
    });

    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

      // Generate a unique key for the file
      const key = generateKey(
        `documents/${user.id}`, // Organize by user
        file.name
      );

      // Upload to S3
      const result = await uploadFile({
        file,
        key,
        bucket: 'files',
        onProgress: setProgress,
        metadata: {
          userId: user.id,
          uploadedAt: new Date().toISOString(),
        },
      });

      setUploadedUrl(result.url);
      toast.success('File uploaded successfully!');

      // Optional: Save file metadata to your database via Supabase Edge Function
      // await supabase.functions.invoke('save-file-metadata', {
      //   body: {
      //     key: result.key,
      //     url: result.url,
      //     size: result.size,
      //     type: result.type,
      //   },
      // });

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">AWS S3 Upload Example</h3>

      <div>
        <input
          type="file"
          onChange={handleFileUpload}
          disabled={uploading}
          accept=".png,.jpg,.jpeg,.pdf"
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>

      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-gray-600">{progress}% uploaded</p>
        </div>
      )}

      {uploadedUrl && (
        <div className="p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-sm font-medium text-green-800">Upload successful!</p>
          <p className="text-xs text-green-600 mt-1 break-all">{uploadedUrl}</p>
        </div>
      )}

      <div className="text-sm text-gray-500">
        <p><strong>Features:</strong></p>
        <ul className="list-disc ml-5 space-y-1">
          <li>File validation (type & size)</li>
          <li>Progress tracking</li>
          <li>Automatic unique naming</li>
          <li>Metadata tagging</li>
          <li>Error handling</li>
        </ul>
      </div>
    </div>
  );
}

// Example: Video Upload for Telehealth
export function VideoUploadExample() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cdnUrl, setCdnUrl] = useState<string | null>(null);

  const handleVideoUpload = async (videoBlob: Blob, sessionId: string) => {
    if (!user) return;

    try {
      setUploading(true);

      const file = new File([videoBlob], `session-${sessionId}.mp4`, {
        type: 'video/mp4',
      });

      const key = `sessions/${sessionId}/recording.mp4`;

      const result = await uploadFile({
        file,
        key,
        bucket: 'videos', // Videos go to separate bucket with lifecycle rules
        onProgress: setProgress,
        metadata: {
          sessionId,
          userId: user.id,
          recordedAt: new Date().toISOString(),
        },
      });

      // Use CloudFront CDN URL for playback
      setCdnUrl(result.cdnUrl!);
      toast.success('Video uploaded successfully!');

      // Save video metadata to database
      // await supabase.functions.invoke('save-session-video', {
      //   body: {
      //     sessionId,
      //     key: result.key,
      //     cdnUrl: result.cdnUrl,
      //     size: result.size,
      //   },
      // });

    } catch (error) {
      console.error('Video upload error:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Video Upload Example</h3>

      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-gray-600">Uploading video: {progress}%</p>
        </div>
      )}

      {cdnUrl && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-green-800">Video available via CDN:</p>
          <video controls className="w-full rounded-lg">
            <source src={cdnUrl} type="video/mp4" />
          </video>
          <p className="text-xs text-gray-500">{cdnUrl}</p>
        </div>
      )}

      <div className="text-sm text-gray-500">
        <p><strong>Video Features:</strong></p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Stored in separate bucket</li>
          <li>Delivered via CloudFront CDN</li>
          <li>Auto-archived to Glacier after 90 days</li>
          <li>Auto-deleted after 365 days (HIPAA retention)</li>
        </ul>
      </div>
    </div>
  );
}
