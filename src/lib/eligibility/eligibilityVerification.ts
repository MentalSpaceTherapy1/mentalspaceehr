// Eligibility Verification API Utilities
// Handles real-time and batch eligibility checks via AdvancedMD integration

import { supabase } from '@/integrations/supabase/client';

export interface EligibilityRequest {
  patientId: string;
  insuranceId?: string;
  serviceType: string;
  verificationType: 'real_time' | 'batch';
}

export interface EligibilityResponse {
  requestId: string;
  requestNumber: string;
  isEligible: boolean;
  eligibilityStatus: string;
  effectiveDate?: string;
  terminationDate?: string;
  payerName?: string;
  subscriberId?: string;
  groupNumber?: string;
  coverageDetails?: CoverageDetails;
  planDetails?: PlanDetails;
  serviceLimitations?: ServiceLimitation[];
  errorMessage?: string;
}

export interface CoverageDetails {
  deductible?: {
    individual: number;
    family: number;
    individualMet: number;
    familyMet: number;
  };
  outOfPocketMax?: {
    individual: number;
    family: number;
    individualMet: number;
    familyMet: number;
  };
  copay?: {
    officeVisit: number;
    specialist: number;
    emergencyRoom: number;
    urgentCare: number;
  };
  coinsurance?: {
    inNetwork: number;
    outOfNetwork: number;
  };
}

export interface PlanDetails {
  planName?: string;
  planType?: string; // HMO, PPO, EPO, POS
  networkStatus?: 'in_network' | 'out_of_network' | 'both';
  planBeginDate?: string;
  planEndDate?: string;
}

export interface ServiceLimitation {
  serviceType: string;
  limitationType: string; // visits, units, dollars
  limitationValue: number;
  limitationPeriod: string; // per visit, per day, per year
  remainingValue?: number;
}

export interface BatchEligibilityJob {
  batchName: string;
  scheduledDate: string;
  patientIds: string[];
}

export interface EligibilityAlert {
  id: string;
  patientId: string;
  alertType: 'expiring_coverage' | 'coverage_terminated' | 'verification_failed' | 'deductible_met' | 'authorization_required';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  isAcknowledged: boolean;
  createdAt: string;
}

/**
 * Submit a real-time eligibility verification request
 */
export async function submitEligibilityRequest(request: EligibilityRequest): Promise<EligibilityResponse> {
  try {
    const requestNumber = `EV-${Date.now()}-${request.patientId.slice(0, 8)}`;

    // Insert request into database
    const { data: requestData, error: requestError } = await (supabase as any)
      .from('advancedmd_eligibility_requests')
      .insert({
        patient_id: request.patientId,
        insurance_id: request.insuranceId,
        service_date: new Date().toISOString().split('T')[0],
        service_type: request.serviceType === 'Mental Health' ? '30' : '30',
        submission_method: request.verificationType === 'real_time' ? 'real-time' : 'batch',
        request_status: 'processing',
      })
      .select()
      .single();

    if (requestError) throw requestError;

    // In production, this would call AdvancedMD API
    // For now, simulate API call with mock data
    const mockResponse = await simulateEligibilityCheck(request);

    // Update request with response
    const { error: updateError } = await (supabase as any)
      .from('advancedmd_eligibility_requests')
      .update({
        request_status: 'completed',
        coverage_status: mockResponse.eligibilityStatus.toLowerCase(),
        payer_name: mockResponse.payerName,
        member_id: mockResponse.subscriberId,
        group_number: mockResponse.groupNumber,
        plan_name: mockResponse.planDetails?.planName,
        copay: mockResponse.coverageDetails?.copay?.officeVisit,
        coinsurance: mockResponse.coverageDetails?.coinsurance?.inNetwork,
        deductible_total: mockResponse.coverageDetails?.deductible?.individual,
        deductible_met: mockResponse.coverageDetails?.deductible?.individualMet,
        deductible_remaining: mockResponse.coverageDetails?.deductible?.individual ? mockResponse.coverageDetails.deductible.individual - mockResponse.coverageDetails.deductible.individualMet : undefined,
        oop_max_total: mockResponse.coverageDetails?.outOfPocketMax?.individual,
        oop_max_met: mockResponse.coverageDetails?.outOfPocketMax?.individualMet,
        oop_max_remaining: mockResponse.coverageDetails?.outOfPocketMax?.individual ? mockResponse.coverageDetails.outOfPocketMax.individual - mockResponse.coverageDetails.outOfPocketMax.individualMet : undefined,
        benefits: mockResponse.coverageDetails,
        limitations: mockResponse.serviceLimitations,
        response_received_date: new Date().toISOString(),
      })
      .eq('id', requestData.id);

    if (updateError) throw updateError;

    // Check if we need to create alerts
    await checkAndCreateAlerts(requestData.id, request.patientId, mockResponse);

    return {
      requestId: requestData.id,
      requestNumber,
      ...mockResponse,
    };
  } catch (error) {
    console.error('Eligibility verification failed:', error);
    throw error;
  }
}

/**
 * Get eligibility history for a patient
 */
export async function getEligibilityHistory(patientId: string) {
  const { data, error } = await (supabase as any)
    .from('advancedmd_eligibility_requests')
    .select('*')
    .eq('patient_id', patientId)
    .order('request_date', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get latest eligibility for a patient
 */
export async function getLatestEligibility(patientId: string): Promise<EligibilityResponse | null> {
  const { data, error } = await (supabase as any)
    .from('advancedmd_eligibility_requests')
    .select('*')
    .eq('patient_id', patientId)
    .eq('request_status', 'completed')
    .order('request_date', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  return {
    requestId: data.id,
    requestNumber: `EV-${data.request_date}`,
    isEligible: data.coverage_status === 'active',
    eligibilityStatus: data.coverage_status || 'unknown',
    effectiveDate: data.service_date,
    terminationDate: undefined,
    payerName: data.payer_name,
    subscriberId: data.member_id,
    groupNumber: data.group_number,
    coverageDetails: data.benefits,
    planDetails: { planName: data.plan_name },
    serviceLimitations: data.limitations,
  };
}

/**
 * Check if patient needs eligibility refresh
 */
export async function needsEligibilityRefresh(patientId: string, daysThreshold: number = 30): Promise<boolean> {
  const { data, error } = await (supabase as any)
    .from('advancedmd_eligibility_requests')
    .select('request_date')
    .eq('patient_id', patientId)
    .eq('request_status', 'completed')
    .order('request_date', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') return true;
  if (!data) return true;
  
  const daysSinceCheck = Math.floor((Date.now() - new Date(data.request_date).getTime()) / (1000 * 60 * 60 * 24));
  return daysSinceCheck > daysThreshold;
}

/**
 * Create a batch eligibility job
 */
export async function createBatchEligibilityJob(job: BatchEligibilityJob) {
  try {
    const batchNumber = `BATCH-${Date.now()}`;

    // Create batch job
    const { data: batchData, error: batchError } = await (supabase as any)
      .from('advancedmd_eligibility_batches')
      .insert({
        batch_name: job.batchName,
        scheduled_date: job.scheduledDate,
        service_date: new Date().toISOString().split('T')[0],
        total_patients: job.patientIds.length,
        status: 'scheduled',
      })
      .select()
      .single();

    if (batchError) throw batchError;

    // Create batch items for each patient
    const items = await Promise.all(
      job.patientIds.map(async (patientId) => {
        const { data, error } = await (supabase as any)
          .from('advancedmd_eligibility_batch_items')
          .insert({
            batch_id: batchData.id,
            patient_id: patientId,
            insurance_id: null, // Will be populated during processing
            status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      })
    );

    return {
      batchId: batchData.id,
      batchNumber,
      totalRequests: items.length,
    };
  } catch (error) {
    console.error('Failed to create batch eligibility job:', error);
    throw error;
  }
}

/**
 * Process a batch eligibility job
 */
export async function processBatchEligibilityJob(batchId: string) {
  try {
    // Update batch status to processing
    await (supabase as any)
      .from('advancedmd_eligibility_batches')
      .update({
        status: 'processing',
        start_date: new Date().toISOString(),
      })
      .eq('id', batchId);

    // Get all batch items
    const { data: items, error: itemsError } = await (supabase as any)
      .from('advancedmd_eligibility_batch_items')
      .select('*')
      .eq('batch_id', batchId);

    if (itemsError) throw itemsError;

    let successCount = 0;
    let failedCount = 0;

    // Process each item (simplified - in production would create actual requests)
    for (const item of items) {
      try {
        const mockResponse = await simulateEligibilityCheck({
          patientId: item.patient_id,
          insuranceId: item.insurance_id,
          serviceType: '30',
          verificationType: 'batch',
        });

        await (supabase as any)
          .from('advancedmd_eligibility_batch_items')
          .update({
            status: 'completed',
            coverage_status: mockResponse.eligibilityStatus.toLowerCase(),
            processed_date: new Date().toISOString(),
          })
          .eq('id', item.id);

        successCount++;
      } catch (error) {
        failedCount++;
        await (supabase as any)
          .from('advancedmd_eligibility_batch_items')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            processed_date: new Date().toISOString(),
          })
          .eq('id', item.id);
      }
    }

    // Update batch with results
    await (supabase as any)
      .from('advancedmd_eligibility_batches')
      .update({
        status: successCount + failedCount === items.length ? 'completed' : 'failed',
        processed_count: successCount + failedCount,
        success_count: successCount,
        failure_count: failedCount,
        completion_date: new Date().toISOString(),
      })
      .eq('id', batchId);

    return {
      batchId,
      total: items.length,
      successful: successCount,
      failed: failedCount,
    };
  } catch (error) {
    console.error('Failed to process batch:', error);
    throw error;
  }
}

/**
 * Get unacknowledged eligibility alerts
 */
export async function getUnacknowledgedAlerts(): Promise<EligibilityAlert[]> {
  const { data, error } = await (supabase as any)
    .from('advancedmd_eligibility_alerts')
    .select('*')
    .eq('acknowledged', false)
    .order('triggered_date', { ascending: false });

  if (error) throw error;
  return data as any;
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string) {
  const { error } = await (supabase as any)
    .from('advancedmd_eligibility_alerts')
    .update({
      acknowledged: true,
      acknowledged_by: (await supabase.auth.getUser()).data.user?.id,
      acknowledged_date: new Date().toISOString(),
    })
    .eq('id', alertId);

  if (error) throw error;
}

/**
 * Simulate eligibility check (mock implementation)
 * In production, this would call AdvancedMD API with EDI 270/271 transactions
 */
async function simulateEligibilityCheck(request: EligibilityRequest): Promise<Omit<EligibilityResponse, 'requestId' | 'requestNumber'>> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Mock response (in production, parse EDI 271 response)
  const isEligible = Math.random() > 0.1; // 90% eligible

  return {
    isEligible,
    eligibilityStatus: isEligible ? 'Active' : 'Inactive',
    effectiveDate: '2025-01-01',
    terminationDate: isEligible ? '2025-12-31' : undefined,
    payerName: 'Blue Cross Blue Shield',
    subscriberId: `SUB${Math.random().toString().slice(2, 11)}`,
    groupNumber: `GRP${Math.random().toString().slice(2, 8)}`,
    coverageDetails: isEligible ? {
      deductible: {
        individual: 1500,
        family: 3000,
        individualMet: 750,
        familyMet: 1200,
      },
      outOfPocketMax: {
        individual: 5000,
        family: 10000,
        individualMet: 2000,
        familyMet: 4000,
      },
      copay: {
        officeVisit: 30,
        specialist: 50,
        emergencyRoom: 250,
        urgentCare: 75,
      },
      coinsurance: {
        inNetwork: 20,
        outOfNetwork: 40,
      },
    } : undefined,
    planDetails: isEligible ? {
      planName: 'Blue Advantage PPO',
      planType: 'PPO',
      networkStatus: 'in_network',
      planBeginDate: '2025-01-01',
      planEndDate: '2025-12-31',
    } : undefined,
    serviceLimitations: isEligible ? [
      {
        serviceType: 'Mental Health Outpatient',
        limitationType: 'visits',
        limitationValue: 52,
        limitationPeriod: 'per year',
        remainingValue: 45,
      },
    ] : undefined,
    errorMessage: isEligible ? undefined : 'Patient not found in payer system',
  };
}

/**
 * Check eligibility response and create alerts if needed
 */
async function checkAndCreateAlerts(requestId: string, patientId: string, response: Omit<EligibilityResponse, 'requestId' | 'requestNumber'>) {
  const alerts: Array<{ type: string; severity: string; message: string }> = [];

  // Check for expiring coverage
  if (response.terminationDate) {
    const daysUntilExpiration = Math.floor(
      (new Date(response.terminationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration <= 30 && daysUntilExpiration > 0) {
      alerts.push({
        type: 'expiring_coverage',
        severity: daysUntilExpiration <= 7 ? 'high' : 'medium',
        message: `Insurance coverage expires in ${daysUntilExpiration} days`,
      });
    } else if (daysUntilExpiration <= 0) {
      alerts.push({
        type: 'coverage_terminated',
        severity: 'critical',
        message: 'Insurance coverage has expired',
      });
    }
  }

  // Check for verification failure
  if (!response.isEligible) {
    alerts.push({
      type: 'verification_failed',
      severity: 'high',
      message: response.errorMessage || 'Patient is not eligible for services',
    });
  }

  // Check for deductible met
  if (response.coverageDetails?.deductible) {
    const deductibleMetPercentage =
      (response.coverageDetails.deductible.individualMet / response.coverageDetails.deductible.individual) * 100;

    if (deductibleMetPercentage >= 90) {
      alerts.push({
        type: 'deductible_met',
        severity: 'low',
        message: 'Patient has met 90% or more of their deductible',
      });
    }
  }

  // Create alerts in database
  for (const alert of alerts) {
    await (supabase as any).from('advancedmd_eligibility_alerts').insert({
      patient_id: patientId,
      insurance_id: null,
      eligibility_request_id: requestId,
      alert_type: alert.type,
      severity: alert.severity,
      message: alert.message,
    });
  }
}
