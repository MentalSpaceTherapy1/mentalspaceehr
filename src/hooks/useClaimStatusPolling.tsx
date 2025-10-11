/**
 * Claim Status Polling Hook
 *
 * Automatically polls for claim status updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAdvancedMDClient } from '@/lib/advancedmd';
import { useToast } from '@/hooks/use-toast';

const sb = supabase as any;

interface ClaimStatusUpdate {
  claimId: string;
  previousStatus: string;
  newStatus: string;
  timestamp: Date;
}

interface UseClaimStatusPollingOptions {
  claimIds?: string[];
  pollingInterval?: number; // milliseconds
  enabled?: boolean;
  onStatusChange?: (update: ClaimStatusUpdate) => void;
}

interface ClaimStatus {
  claimId: string;
  status: string;
  lastChecked: Date;
}

export function useClaimStatusPolling({
  claimIds = [],
  pollingInterval = 300000, // 5 minutes default
  enabled = true,
  onStatusChange,
}: UseClaimStatusPollingOptions = {}) {
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<Map<string, ClaimStatus>>(new Map());
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousStatusesRef = useRef<Map<string, string>>(new Map());

  /**
   * Check status for a single claim
   */
  const checkClaimStatus = useCallback(async (claimId: string): Promise<void> => {
    try {
      const client = getAdvancedMDClient();
      const response = await client.getClaimStatus(claimId);

      if (response.success && response.data) {
        const newStatus = response.data.status;
        const previousStatus = previousStatusesRef.current.get(claimId);

        // Update status map
        setStatuses((prev) => {
          const updated = new Map(prev);
          updated.set(claimId, {
            claimId,
            status: newStatus,
            lastChecked: new Date(),
          });
          return updated;
        });

        // Check if status changed
        if (previousStatus && previousStatus !== newStatus) {
          const update: ClaimStatusUpdate = {
            claimId,
            previousStatus,
            newStatus,
            timestamp: new Date(),
          };

          console.log('[ClaimStatusPolling] Status changed:', update);

          // Notify callback
          onStatusChange?.(update);

          // Show toast notification
          toast({
            title: 'Claim Status Updated',
            description: `Claim ${claimId}: ${previousStatus} → ${newStatus}`,
            variant: newStatus === 'Paid' || newStatus === 'Accepted' ? 'default' : 'destructive',
          });

          // Update database
          await sb
            .from('advancedmd_claims')
            .update({
              claim_status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('claim_id', claimId);
        }

        // Update previous status
        previousStatusesRef.current.set(claimId, newStatus);
      }
    } catch (error: any) {
      console.error(`[ClaimStatusPolling] Error checking claim ${claimId}:`, error);
    }
  }, [onStatusChange, toast]);

  /**
   * Check all claim statuses
   */
  const checkAllStatuses = useCallback(async (): Promise<void> => {
    if (!enabled || claimIds.length === 0) {
      return;
    }

    setIsPolling(true);

    try {
      console.log(`[ClaimStatusPolling] Checking ${claimIds.length} claims...`);

      // Check claims in parallel (but throttled to avoid rate limits)
      const BATCH_SIZE = 5;
      for (let i = 0; i < claimIds.length; i += BATCH_SIZE) {
        const batch = claimIds.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(checkClaimStatus));

        // Small delay between batches to respect rate limits
        if (i + BATCH_SIZE < claimIds.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      setLastUpdate(new Date());
    } catch (error: any) {
      console.error('[ClaimStatusPolling] Error checking statuses:', error);
      toast({
        title: 'Status Check Failed',
        description: error.message || 'Failed to check claim statuses',
        variant: 'destructive',
      });
    } finally {
      setIsPolling(false);
    }
  }, [enabled, claimIds, checkClaimStatus, toast]);

  /**
   * Start polling
   */
  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Initial check
    checkAllStatuses();

    // Set up interval
    intervalRef.current = setInterval(() => {
      checkAllStatuses();
    }, pollingInterval);

    console.log(`[ClaimStatusPolling] Started polling every ${pollingInterval / 1000}s`);
  }, [checkAllStatuses, pollingInterval]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('[ClaimStatusPolling] Stopped polling');
    }
  }, []);

  /**
   * Manual refresh
   */
  const refresh = useCallback(() => {
    return checkAllStatuses();
  }, [checkAllStatuses]);

  /**
   * Effect: Start/stop polling based on enabled flag and claimIds
   */
  useEffect(() => {
    if (enabled && claimIds.length > 0) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, claimIds, startPolling, stopPolling]);

  /**
   * Effect: Load initial statuses from database
   */
  useEffect(() => {
    if (claimIds.length === 0) return;

    const loadInitialStatuses = async () => {
      try {
        const { data, error } = await sb
          .from('advancedmd_claims')
          .select('claim_id, claim_status')
          .in('claim_id', claimIds);

        if (error) throw error;

        if (data) {
          const records = data as any[];
          records.forEach((claim: any) => {
            previousStatusesRef.current.set(claim.claim_id, claim.claim_status);
          });
        }
      } catch (error) {
        console.error('[ClaimStatusPolling] Error loading initial statuses:', error);
      }
    };

    loadInitialStatuses();
  }, [claimIds]);

  return {
    statuses: Array.from(statuses.values()),
    isPolling,
    lastUpdate,
    refresh,
    startPolling,
    stopPolling,
  };
}

/**
 * Hook for monitoring claims that need status updates
 */
export function useAutoClaimStatusMonitoring(options: {
  statuses?: string[];
  maxAge?: number; // days
} = {}) {
  const {
    statuses = ['Submitted', 'Accepted', 'In Process'],
    maxAge = 30,
  } = options;

  const [claimIds, setClaimIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClaimsToMonitor = async () => {
      setIsLoading(true);

      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxAge);

        const { data, error } = await sb
          .from('advancedmd_claims')
          .select('claim_id')
          .in('claim_status', statuses)
          .gte('submission_date', cutoffDate.toISOString())
          .order('submission_date', { ascending: false });

        if (error) throw error;

        setClaimIds((data as any[])?.map((c: any) => c.claim_id) || []);
        console.log(`[AutoClaimMonitoring] Monitoring ${(data as any[])?.length || 0} claims`);
      } catch (error) {
        console.error('[AutoClaimMonitoring] Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClaimsToMonitor();

    // Refresh list every hour
    const interval = setInterval(fetchClaimsToMonitor, 3600000);

    return () => clearInterval(interval);
  }, [statuses, maxAge]);

  const polling = useClaimStatusPolling({
    claimIds,
    enabled: !isLoading && claimIds.length > 0,
  });

  return {
    ...polling,
    claimCount: claimIds.length,
    isLoading,
  };
}
