/**
 * Auto Eligibility Check Hook
 *
 * Automatically checks eligibility when appointments are created or scheduled
 */

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdvancedMDClient } from '@/lib/advancedmd';
import type { EligibilityResponse } from '@/lib/advancedmd';

const sb = supabase as any;

interface AutoEligibilityCheckOptions {
  enabled?: boolean;
  cacheHours?: number; // How long to consider cached results valid (default: 24 hours)
  showToast?: boolean;
}

interface EligibilityCheckResult {
  eligibility: EligibilityResponse | null;
  isChecking: boolean;
  error: Error | null;
  lastChecked: Date | null;
  fromCache: boolean;
}

export function useAutoEligibilityCheck(
  clientId: string | undefined,
  insuranceId: string | undefined,
  serviceDate: string,
  options: AutoEligibilityCheckOptions = {}
) {
  const {
    enabled = true,
    cacheHours = 24,
    showToast = true,
  } = options;

  const { toast } = useToast();
  const [result, setResult] = useState<EligibilityCheckResult>({
    eligibility: null,
    isChecking: false,
    error: null,
    lastChecked: null,
    fromCache: false,
  });

  /**
   * Check if cached eligibility is still valid
   */
  const isCacheValid = useCallback((checkDate: string): boolean => {
    const checked = new Date(checkDate);
    const now = new Date();
    const hoursDiff = (now.getTime() - checked.getTime()) / (1000 * 60 * 60);
    return hoursDiff < cacheHours;
  }, [cacheHours]);

  /**
   * Get cached eligibility from database
   */
  const getCachedEligibility = useCallback(async (): Promise<EligibilityResponse | null> => {
    if (!clientId || !insuranceId) return null;

    try {
      const { data, error } = await sb
        .from('advancedmd_eligibility_checks')
        .select('*')
        .eq('client_id', clientId)
        .eq('insurance_id', insuranceId)
        .gte('service_date', serviceDate)
        .order('check_date', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;

      const record = data as any;
      // Check if cache is still valid
      if (!isCacheValid(record.check_date)) return null;

      console.log('[AutoEligibility] Using cached result from', record.check_date);

      // Map database fields to EligibilityResponse
      return {
        coverageStatus: record.coverage_status as any,
        payerName: record.payer_name,
        payerId: record.payer_id,
        memberId: record.member_id,
        groupNumber: record.group_number,
        planName: record.plan_name,
        copay: record.copay ? parseFloat(record.copay) : undefined,
        coinsurance: record.coinsurance ? parseFloat(record.coinsurance) : undefined,
        deductibleTotal: record.deductible_total ? parseFloat(record.deductible_total) : undefined,
        deductibleMet: record.deductible_met ? parseFloat(record.deductible_met) : undefined,
        deductibleRemaining: record.deductible_remaining ? parseFloat(record.deductible_remaining) : undefined,
        oopMaxTotal: record.oop_max_total ? parseFloat(record.oop_max_total) : undefined,
        oopMaxMet: record.oop_max_met ? parseFloat(record.oop_max_met) : undefined,
        oopMaxRemaining: record.oop_max_remaining ? parseFloat(record.oop_max_remaining) : undefined,
        priorAuthRequired: record.prior_auth_required,
        priorAuthNumber: record.prior_auth_number,
        benefits: record.benefits as any,
        limitations: record.limitations as any,
        checkDate: record.check_date,
        responseCode: record.response_code,
      };
    } catch (error) {
      console.error('[AutoEligibility] Error getting cached eligibility:', error);
      return null;
    }
  }, [clientId, insuranceId, serviceDate, isCacheValid]);

  /**
   * Perform eligibility check
   */
  const checkEligibility = useCallback(async (force: boolean = false): Promise<void> => {
    if (!clientId || !insuranceId) {
      console.log('[AutoEligibility] Missing client or insurance ID, skipping check');
      return;
    }

    if (!enabled) {
      console.log('[AutoEligibility] Auto-check disabled');
      return;
    }

    setResult(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      // Try to get cached result first (unless force refresh)
      if (!force) {
        const cached = await getCachedEligibility();
        if (cached) {
          setResult({
            eligibility: cached,
            isChecking: false,
            error: null,
            lastChecked: new Date(cached.checkDate),
            fromCache: true,
          });

          if (showToast) {
            toast({
              title: 'Eligibility Verified (Cached)',
              description: `Coverage is ${cached.coverageStatus}. Last checked ${new Date(cached.checkDate).toLocaleDateString()}.`,
              variant: cached.coverageStatus === 'Active' ? 'default' : 'destructive',
            });
          }
          return;
        }
      }

      // No valid cache, perform real-time check
      console.log('[AutoEligibility] Performing real-time eligibility check...');

      const client = getAdvancedMDClient();
      const response = await client.checkEligibility({
        clientId,
        insuranceId,
        serviceDate,
        serviceType: '30', // Health Benefit Plan Coverage
      });

      if (response.success && response.data) {
        setResult({
          eligibility: response.data,
          isChecking: false,
          error: null,
          lastChecked: new Date(),
          fromCache: false,
        });

        if (showToast) {
          toast({
            title: 'Eligibility Verified',
            description: `Coverage is ${response.data.coverageStatus}. ${response.data.copay ? `Copay: $${response.data.copay}` : ''}`,
            variant: response.data.coverageStatus === 'Active' ? 'default' : 'destructive',
          });
        }
      } else {
        const error = new Error(response.error?.message || 'Eligibility check failed');
        setResult({
          eligibility: null,
          isChecking: false,
          error,
          lastChecked: new Date(),
          fromCache: false,
        });

        if (showToast) {
          toast({
            title: 'Eligibility Check Failed',
            description: error.message,
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      console.error('[AutoEligibility] Error:', error);
      setResult({
        eligibility: null,
        isChecking: false,
        error,
        lastChecked: new Date(),
        fromCache: false,
      });

      if (showToast) {
        toast({
          title: 'Eligibility Check Error',
          description: error.message || 'Failed to verify insurance eligibility',
          variant: 'destructive',
        });
      }
    }
  }, [clientId, insuranceId, serviceDate, enabled, getCachedEligibility, showToast, toast]);

  /**
   * Auto-check on mount and when dependencies change
   */
  useEffect(() => {
    if (enabled && clientId && insuranceId) {
      checkEligibility();
    }
  }, [enabled, clientId, insuranceId, serviceDate]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Manual refresh
   */
  const refresh = useCallback(() => {
    return checkEligibility(true);
  }, [checkEligibility]);

  return {
    ...result,
    refresh,
    checkEligibility,
  };
}
