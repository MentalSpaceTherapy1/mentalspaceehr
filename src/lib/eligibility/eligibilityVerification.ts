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
    const { data: requestData, error: requestError } = await supabase
      .from('advancedmd_eligibility_requests')
      .insert({
        request_number: requestNumber,
        patient_id: request.patientId,
        insurance_id: request.insuranceId,
        verification_type: request.verificationType,
        service_type: request.serviceType,
        status: 'processing',
      })
      .select()
      .single();

    if (requestError) throw requestError;

    // In production, this would call AdvancedMD API
    // For now, simulate API call with mock data
    const mockResponse = await simulateEligibilityCheck(request);

    // Update request with response
    const { error: updateError } = await supabase
      .from('advancedmd_eligibility_requests')
      .update({
        status: 'completed',
        is_eligible: mockResponse.isEligible,
        eligibility_status: mockResponse.eligibilityStatus,
        effective_date: mockResponse.effectiveDate,
        termination_date: mockResponse.terminationDate,
        payer_name: mockResponse.payerName,
        subscriber_id: mockResponse.subscriberId,
        group_number: mockResponse.groupNumber,
        coverage_details: mockResponse.coverageDetails,
        plan_details: mockResponse.planDetails,
        service_limitations: mockResponse.serviceLimitations,
        response_received_at: new Date().toISOString(),
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
  const { data, error } = await supabase
    .from('advancedmd_eligibility_requests')
    .select('*')
    .eq('patient_id', patientId)
    .order('requested_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get latest eligibility for a patient
 */
export async function getLatestEligibility(patientId: string): Promise<EligibilityResponse | null> {
  const { data, error } = await supabase
    .rpc('get_latest_eligibility', { p_patient_id: patientId });

  if (error) throw error;
  if (!data || data.length === 0) return null;

  const latest = data[0];
  return {
    requestId: latest.request_id,
    requestNumber: latest.request_number,
    isEligible: latest.is_eligible,
    eligibilityStatus: latest.eligibility_status,
    effectiveDate: latest.effective_date,
    terminationDate: latest.termination_date,
    payerName: latest.payer_name,
    subscriberId: latest.subscriber_id,
    coverageDetails: latest.coverage_details,
    planDetails: latest.plan_details,
  };
}

/**
 * Check if patient needs eligibility refresh
 */
export async function needsEligibilityRefresh(patientId: string, daysThreshold: number = 30): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('needs_eligibility_refresh', {
      p_patient_id: patientId,
      p_days_threshold: daysThreshold
    });

  if (error) throw error;
  return data;
}

/**
 * Create a batch eligibility job
 */
export async function createBatchEligibilityJob(job: BatchEligibilityJob) {
  try {
    const batchNumber = `BATCH-${Date.now()}`;

    // Create batch job
    const { data: batchData, error: batchError } = await supabase
      .from('advancedmd_eligibility_batches')
      .insert({
        batch_number: batchNumber,
        batch_name: job.batchName,
        scheduled_date: job.scheduledDate,
        total_patients: job.patientIds.length,
        status: 'pending',
      })
      .select()
      .single();

    if (batchError) throw batchError;

    // Create individual requests for each patient
    const requests = await Promise.all(
      job.patientIds.map(async (patientId, index) => {
        const requestNumber = `EV-${Date.now()}-${patientId.slice(0, 8)}-${index}`;

        const { data: requestData, error: requestError } = await supabase
          .from('advancedmd_eligibility_requests')
          .insert({
            request_number: requestNumber,
            patient_id: patientId,
            verification_type: 'batch',
            service_type: 'Mental Health',
            status: 'pending',
          })
          .select()
          .single();

        if (requestError) throw requestError;

        // Link request to batch
        await supabase
          .from('advancedmd_eligibility_batch_items')
          .insert({
            batch_id: batchData.id,
            request_id: requestData.id,
            sequence_number: index + 1,
          });

        return requestData;
      })
    );

    return {
      batchId: batchData.id,
      batchNumber,
      totalRequests: requests.length,
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
    await supabase
      .from('advancedmd_eligibility_batches')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', batchId);

    // Get all batch items
    const { data: items, error: itemsError } = await supabase
      .from('advancedmd_eligibility_batch_items')
      .select('request_id, advancedmd_eligibility_requests(*)')
      .eq('batch_id', batchId);

    if (itemsError) throw itemsError;

    let successCount = 0;
    let failedCount = 0;

    // Process each request
    for (const item of items) {
      try {
        const request = item.advancedmd_eligibility_requests as any;
        const mockResponse = await simulateEligibilityCheck({
          patientId: request.patient_id,
          insuranceId: request.insurance_id,
          serviceType: request.service_type,
          verificationType: 'batch',
        });

        await supabase
          .from('advancedmd_eligibility_requests')
          .update({
            status: 'completed',
            is_eligible: mockResponse.isEligible,
            eligibility_status: mockResponse.eligibilityStatus,
            effective_date: mockResponse.effectiveDate,
            termination_date: mockResponse.terminationDate,
            payer_name: mockResponse.payerName,
            subscriber_id: mockResponse.subscriberId,
            coverage_details: mockResponse.coverageDetails,
            plan_details: mockResponse.planDetails,
            response_received_at: new Date().toISOString(),
          })
          .eq('id', request.id);

        successCount++;
      } catch (error) {
        failedCount++;
        console.error(`Failed to process request ${item.request_id}:`, error);
      }
    }

    // Update batch with results
    await supabase
      .from('advancedmd_eligibility_batches')
      .update({
        status: successCount + failedCount === items.length ? 'completed' : 'partial',
        processed_count: successCount + failedCount,
        successful_count: successCount,
        failed_count: failedCount,
        completed_at: new Date().toISOString(),
        result_summary: {
          total: items.length,
          successful: successCount,
          failed: failedCount,
        },
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
  const { data, error } = await supabase
    .from('advancedmd_eligibility_alerts')
    .select('*, patients(first_name, last_name)')
    .eq('is_acknowledged', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as EligibilityAlert[];
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string) {
  const { error } = await supabase
    .from('advancedmd_eligibility_alerts')
    .update({
      is_acknowledged: true,
      acknowledged_by: (await supabase.auth.getUser()).data.user?.id,
      acknowledged_at: new Date().toISOString(),
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
    await supabase.rpc('create_eligibility_alert', {
      p_patient_id: patientId,
      p_insurance_id: null,
      p_alert_type: alert.type,
      p_severity: alert.severity,
      p_message: alert.message,
      p_related_request_id: requestId,
    });
  }
}
