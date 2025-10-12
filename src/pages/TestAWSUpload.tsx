/**
 * AWS S3 Upload Test Page
 *
 * Temporary page to test AWS S3 file uploads
 * Navigate to /test-aws-upload after logging in
 */

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { S3UploadExample, VideoUploadExample } from '@/components/examples/S3UploadExample';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export default function TestAWSUpload() {
  const { user } = useAuth();

  if (!user) {
    return <div>Please log in to test uploads</div>;
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>AWS S3 Upload Test</CardTitle>
            <CardDescription>
              Test page for AWS S3 file uploads. This page is temporary for testing purposes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* File Upload Test */}
            <S3UploadExample />

            {/* Video Upload Test */}
            <VideoUploadExample />

            {/* Configuration Info */}
            <Card className="bg-blue-50">
              <CardHeader>
                <CardTitle className="text-sm">Current AWS Configuration</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <p><strong>Region:</strong> {import.meta.env.VITE_AWS_REGION}</p>
                <p><strong>Files Bucket:</strong> {import.meta.env.VITE_FILES_BUCKET}</p>
                <p><strong>Videos Bucket:</strong> {import.meta.env.VITE_VIDEOS_BUCKET}</p>
                <p><strong>Video CDN:</strong> {import.meta.env.VITE_VIDEO_CDN}</p>
                <p><strong>Identity Pool:</strong> {import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID}</p>
                <p className="text-green-600 font-medium mt-4">✓ User authenticated: {user.email}</p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
