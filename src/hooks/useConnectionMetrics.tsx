import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ConnectionMetrics {
  packetLoss: number;
  latency: number;
  jitter: number;
  bandwidth: number;
}

export const useConnectionMetrics = (
  sessionId: string,
  userId: string,
  peerConnection: RTCPeerConnection | null
) => {
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!peerConnection || !sessionId || !userId) return;

    // Log metrics every 30 seconds
    metricsIntervalRef.current = setInterval(async () => {
      try {
        const stats = await peerConnection.getStats();
        let packetLoss = 0;
        let latency = 0;
        let jitter = 0;
        let bandwidth = 0;

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            packetLoss = (report.packetsLost / report.packetsReceived) * 100 || 0;
            bandwidth = report.bytesReceived || 0;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            latency = report.currentRoundTripTime * 1000 || 0;
          }
          if (report.type === 'inbound-rtp' && report.jitter) {
            jitter = report.jitter * 1000 || 0;
          }
        });

        // Store metrics in database
        const { error } = await supabase
          .from('session_connection_metrics')
          .insert({
            session_id: sessionId,
            participant_id: userId,
            packet_loss_percent: Math.min(packetLoss, 100),
            latency_ms: Math.min(Math.round(latency), 1000),
            jitter_ms: Math.min(jitter, 100),
            bandwidth_kbps: Math.round(bandwidth / 1024),
            connection_state: peerConnection.connectionState
          });

        if (error) {
          console.error('Error logging metrics:', error);
        }
      } catch (err) {
        console.error('Error collecting connection metrics:', err);
      }
    }, 30000); // Every 30 seconds

    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, [sessionId, userId, peerConnection]);
};
