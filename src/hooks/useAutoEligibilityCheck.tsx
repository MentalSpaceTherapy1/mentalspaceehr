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
      const { data, error } = await supabase
        .from('advancedmd_eligibility_checks')
        .select('*')
        .eq('client_id', clientId)
        .eq('insurance_id', insuranceId)
        .gte('service_date', serviceDate)
        .order('check_date', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;

      // Check if cache is still valid
      if (!isCacheValid(data.check_date)) return null;

      console.log('[AutoEligibility] Using cached result from', data.check_date);

      // Map database fields to EligibilityResponse
      return {
        coverageStatus: data.coverage_status as any,
        payerName: data.payer_name,
        payerId: data.payer_id,
        memberId: data.member_id,
        groupNumber: data.group_number,
        planName: data.plan_name,
        copay: data.copay ? parseFloat(data.copay) : undefined,
        coinsurance: data.coinsurance ? parseFloat(data.coinsurance) : undefined,
        deductibleTotal: data.deductible_total ? parseFloat(data.deductible_total) : undefined,
        deductibleMet: data.deductible_met ? parseFloat(data.deductible_met) : undefined,
        deductibleRemaining: data.deductible_remaining ? parseFloat(data.deductible_remaining) : undefined,
        oopMaxTotal: data.oop_max_total ? parseFloat(data.oop_max_total) : undefined,
        oopMaxMet: data.oop_max_met ? parseFloat(data.oop_max_met) : undefined,
        oopMaxRemaining: data.oop_max_remaining ? parseFloat(data.oop_max_remaining) : undefined,
        priorAuthRequired: data.prior_auth_required,
        priorAuthNumber: data.prior_auth_number,
        benefits: data.benefits as any,
        limitations: data.limitations as any,
        checkDate: data.check_date,
        responseCode: data.response_code,
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
