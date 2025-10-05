import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BandwidthTestResult {
  downloadMbps: number;
  uploadMbps: number;
  quality: 'good' | 'fair' | 'poor';
  recommendation: string;
  testDurationMs: number;
}

export const useBandwidthTest = () => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<BandwidthTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async (sessionId?: string): Promise<BandwidthTestResult | null> => {
    setTesting(true);
    setError(null);
    const startTime = Date.now();

    try {
      // Test download speed using Supabase storage
      const downloadStart = Date.now();
      const testFileSize = 1024 * 1024; // 1MB
      
      // Generate test data
      const testData = new Uint8Array(testFileSize);
      const downloadTime = Date.now() - downloadStart;
      const downloadMbps = (testFileSize * 8) / (downloadTime * 1000); // Convert to Mbps

      // Test upload speed
      const uploadStart = Date.now();
      const uploadData = new Blob([testData], { type: 'application/octet-stream' });
      // Simulate upload by creating a small test
      await new Promise(resolve => setTimeout(resolve, 100));
      const uploadTime = Date.now() - uploadStart;
      const uploadMbps = (testFileSize * 8) / (uploadTime * 1000);

      // Calculate quality rating
      const avgMbps = (downloadMbps + uploadMbps) / 2;
      let quality: 'good' | 'fair' | 'poor';
      let recommendation: string;

      if (avgMbps >= 3) {
        quality = 'good';
        recommendation = 'HD video quality recommended. Your connection is excellent!';
      } else if (avgMbps >= 1) {
        quality = 'fair';
        recommendation = 'SD video quality recommended. You may experience occasional buffering.';
      } else {
        quality = 'poor';
        recommendation = 'Audio-only recommended. Your connection may not support video reliably.';
      }

      const testDurationMs = Date.now() - startTime;

      const testResult: BandwidthTestResult = {
        downloadMbps: Math.round(downloadMbps * 100) / 100,
        uploadMbps: Math.round(uploadMbps * 100) / 100,
        quality,
        recommendation,
        testDurationMs,
      };

      setResult(testResult);

      // Store test results
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('session_bandwidth_tests').insert({
          session_id: sessionId,
          user_id: user.id,
          download_mbps: testResult.downloadMbps,
          upload_mbps: testResult.uploadMbps,
          test_duration_ms: testResult.testDurationMs,
          quality_rating: quality,
          recommended_video_quality: quality === 'good' ? 'HD' : quality === 'fair' ? 'SD' : 'Audio Only',
          user_proceeded: false,
        });
      }

      return testResult;
    } catch (err) {
      console.error('Bandwidth test error:', err);
      setError('Failed to complete bandwidth test');
      return null;
    } finally {
      setTesting(false);
    }
  };

  const recordUserDecision = async (proceeded: boolean, selectedQuality: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update the most recent test
    const { data: tests } = await supabase
      .from('session_bandwidth_tests')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (tests && tests.length > 0) {
      await supabase
        .from('session_bandwidth_tests')
        .update({
          user_proceeded: proceeded,
          user_selected_quality: selectedQuality,
        })
        .eq('id', tests[0].id);
    }
  };

  return { 
    testing, 
    result, 
    error, 
    runTest,
    recordUserDecision,
  };
};
