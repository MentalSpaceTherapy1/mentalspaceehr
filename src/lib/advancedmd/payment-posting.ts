/**
 * Automatic Payment Posting Logic
 * Posts payments from ERA files to claims automatically
 */

import { createClient } from '@/lib/supabase/client';
import type { ERAClaim, ERAFile, ERAServiceLine } from './era-835-parser';

const supabase = createClient();

export interface PaymentPostingResult {
  success: boolean;
  claimId?: string;
  paymentPostingId?: string;
  eraClaimDetailId?: string;
  errors?: string[];
  warnings?: string[];
}

export interface BatchPostingResult {
  totalClaims: number;
  successfulPosts: number;
  failedPosts: number;
  results: PaymentPostingResult[];
  eraFileId: string;
}

/**
 * Post all payments from an ERA file
 */
export async function postERAPayments(
  eraFileId: string,
  eraData: ERAFile,
  userId: string
): Promise<BatchPostingResult> {
  const results: PaymentPostingResult[] = [];
  let successfulPosts = 0;
  let failedPosts = 0;

  // Update ERA file status
  await supabase
    .from('advancedmd_era_files')
    .update({
      processing_status: 'Posting',
      processing_started_at: new Date().toISOString(),
    })
    .eq('id', eraFileId);

  // Process each claim
  for (const eraClaim of eraData.claims) {
    const result = await postClaimPayment(eraFileId, eraClaim, userId);
    results.push(result);

    if (result.success) {
      successfulPosts++;
    } else {
      failedPosts++;
    }
  }

  // Update ERA file final status
  const finalStatus = failedPosts === 0 ? 'Posted' : failedPosts === eraData.claims.length ? 'Error' : 'Partially Posted';

  await supabase
    .from('advancedmd_era_files')
    .update({
      processing_status: finalStatus,
      processing_completed_at: new Date().toISOString(),
      claims_posted: successfulPosts,
      claims_failed: failedPosts,
    })
    .eq('id', eraFileId);

  return {
    totalClaims: eraData.claims.length,
    successfulPosts,
    failedPosts,
    results,
    eraFileId,
  };
}

/**
 * Post payment for a single claim
 */
async function postClaimPayment(
  eraFileId: string,
  eraClaim: ERAClaim,
  userId: string
): Promise<PaymentPostingResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Step 1: Find matching claim in our system
    const claim = await findMatchingClaim(eraClaim);

    if (!claim) {
      errors.push(`No matching claim found for patient control number: ${eraClaim.patientControlNumber}`);

      // Save ERA claim detail with error
      const { data: eraClaimDetail } = await supabase
        .from('advancedmd_era_claim_details')
        .insert({
          era_file_id: eraFileId,
          claim_id: null,
          payer_claim_control_number: eraClaim.payerClaimControlNumber,
          patient_control_number: eraClaim.patientControlNumber,
          patient_first_name: eraClaim.patient.firstName,
          patient_last_name: eraClaim.patient.lastName,
          claim_billed_amount: eraClaim.billedAmount,
          claim_allowed_amount: eraClaim.serviceLines.reduce((sum, sl) => sum + (sl.allowedAmount || 0), 0),
          claim_paid_amount: eraClaim.paidAmount,
          claim_patient_responsibility: eraClaim.patientResponsibility,
          claim_status_code: eraClaim.claimStatusCode,
          claim_status_description: eraClaim.claimStatusDescription,
          posting_status: 'Error',
          posting_error: errors[0],
        })
        .select()
        .single();

      return { success: false, errors, eraClaimDetailId: eraClaimDetail?.id };
    }

    // Step 2: Save ERA claim detail
    const { data: eraClaimDetail, error: eraClaimError } = await supabase
      .from('advancedmd_era_claim_details')
      .insert({
        era_file_id: eraFileId,
        claim_id: claim.id,
        payer_claim_control_number: eraClaim.payerClaimControlNumber,
        patient_control_number: eraClaim.patientControlNumber,
        patient_first_name: eraClaim.patient.firstName,
        patient_last_name: eraClaim.patient.lastName,
        claim_billed_amount: eraClaim.billedAmount,
        claim_allowed_amount: eraClaim.serviceLines.reduce((sum, sl) => sum + (sl.allowedAmount || 0), 0),
        claim_paid_amount: eraClaim.paidAmount,
        claim_patient_responsibility: eraClaim.patientResponsibility,
        claim_status_code: eraClaim.claimStatusCode,
        claim_status_description: eraClaim.claimStatusDescription,
        posting_status: 'Pending',
      })
      .select()
      .single();

    if (eraClaimError || !eraClaimDetail) {
      errors.push(`Failed to save ERA claim detail: ${eraClaimError?.message}`);
      return { success: false, errors, claimId: claim.id };
    }

    // Step 3: Save service lines
    for (const serviceLine of eraClaim.serviceLines) {
      await supabase.from('advancedmd_era_service_lines').insert({
        era_claim_detail_id: eraClaimDetail.id,
        service_date: serviceLine.serviceDate.toISOString().split('T')[0],
        procedure_code: serviceLine.procedureCode,
        procedure_modifier: serviceLine.procedureModifiers,
        billed_amount: serviceLine.billedAmount,
        allowed_amount: serviceLine.allowedAmount,
        paid_amount: serviceLine.paidAmount,
        patient_responsibility: serviceLine.patientResponsibility,
        billed_units: serviceLine.billedUnits,
        paid_units: serviceLine.paidUnits,
        contractual_adjustment: serviceLine.contractualAdjustment,
        deductible: serviceLine.deductible,
        copay: serviceLine.copay,
        coinsurance: serviceLine.coinsurance,
        adjustment_codes: serviceLine.adjustments,
      });
    }

    // Step 4: Calculate totals
    const totalContractualAdj = eraClaim.serviceLines.reduce((sum, sl) => sum + sl.contractualAdjustment, 0);
    const totalDeductible = eraClaim.serviceLines.reduce((sum, sl) => sum + sl.deductible, 0);
    const totalCopay = eraClaim.serviceLines.reduce((sum, sl) => sum + sl.copay, 0);
    const totalCoinsurance = eraClaim.serviceLines.reduce((sum, sl) => sum + sl.coinsurance, 0);

    // Step 5: Create payment posting
    const { data: paymentPosting, error: postingError } = await supabase
      .from('advancedmd_payment_postings')
      .insert({
        era_file_id: eraFileId,
        era_claim_detail_id: eraClaimDetail.id,
        claim_id: claim.id,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'ERA Auto-Post',
        payment_amount: eraClaim.paidAmount,
        allowed_amount: eraClaim.serviceLines.reduce((sum, sl) => sum + (sl.allowedAmount || 0), 0),
        billed_amount: eraClaim.billedAmount,
        contractual_adjustment: totalContractualAdj,
        deductible: totalDeductible,
        copay: totalCopay,
        coinsurance: totalCoinsurance,
        patient_responsibility: eraClaim.patientResponsibility,
        posting_type: 'Insurance Payment',
        posting_status: 'Posted',
        posted_by: userId,
      })
      .select()
      .single();

    if (postingError || !paymentPosting) {
      errors.push(`Failed to create payment posting: ${postingError?.message}`);

      await supabase
        .from('advancedmd_era_claim_details')
        .update({
          posting_status: 'Error',
          posting_error: errors[0],
        })
        .eq('id', eraClaimDetail.id);

      return { success: false, errors, claimId: claim.id, eraClaimDetailId: eraClaimDetail.id };
    }

    // Step 6: Create adjustment records
    for (const serviceLine of eraClaim.serviceLines) {
      for (const adjustment of serviceLine.adjustments) {
        await supabase.from('advancedmd_payment_adjustments').insert({
          payment_posting_id: paymentPosting.id,
          adjustment_group: adjustment.adjustmentGroup,
          adjustment_code: adjustment.adjustmentReasonCode,
          adjustment_amount: adjustment.adjustmentAmount,
          service_date: serviceLine.serviceDate.toISOString().split('T')[0],
          procedure_code: serviceLine.procedureCode,
        });
      }
    }

    // Step 7: Update claim status
    const newClaimStatus = determineClaimStatus(eraClaim, claim);

    await supabase
      .from('advancedmd_claims')
      .update({
        claim_status: newClaimStatus,
        paid_amount: (claim.paid_amount || 0) + eraClaim.paidAmount,
        paid_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', claim.id);

    // Step 8: Update ERA claim detail as posted
    await supabase
      .from('advancedmd_era_claim_details')
      .update({
        posting_status: 'Posted',
        posted_at: new Date().toISOString(),
      })
      .eq('id', eraClaimDetail.id);

    // Check for warnings
    if (eraClaim.patientResponsibility > 0) {
      warnings.push(`Patient responsibility: $${eraClaim.patientResponsibility.toFixed(2)}`);
    }

    if (eraClaim.claimStatusCode === '4') {
      warnings.push('Claim was denied by payer');
    }

    return {
      success: true,
      claimId: claim.id,
      paymentPostingId: paymentPosting.id,
      eraClaimDetailId: eraClaimDetail.id,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, errors };
  }
}

/**
 * Find matching claim in our system
 */
async function findMatchingClaim(eraClaim: ERAClaim): Promise<any> {
  // Try multiple matching strategies

  // Strategy 1: Match by payer claim control number
  if (eraClaim.payerClaimControlNumber) {
    const { data: claimByPayer } = await supabase
      .from('advancedmd_claims')
      .select('*')
      .eq('claim_id', eraClaim.payerClaimControlNumber)
      .maybeSingle();

    if (claimByPayer) return claimByPayer;
  }

  // Strategy 2: Match by patient control number (our internal claim ID)
  if (eraClaim.patientControlNumber) {
    const { data: claimByPatient } = await supabase
      .from('advancedmd_claims')
      .select('*')
      .eq('claim_id', eraClaim.patientControlNumber)
      .maybeSingle();

    if (claimByPatient) return claimByPatient;
  }

  // Strategy 3: Match by patient name and service dates
  if (eraClaim.patient.lastName && eraClaim.statementFromDate) {
    const { data: claims } = await supabase
      .from('advancedmd_claims')
      .select(`
        *,
        clients!inner (
          first_name,
          last_name
        )
      `)
      .ilike('clients.last_name', eraClaim.patient.lastName)
      .gte('statement_from_date', eraClaim.statementFromDate.toISOString().split('T')[0])
      .lte('statement_from_date', eraClaim.statementToDate?.toISOString().split('T')[0] || eraClaim.statementFromDate.toISOString().split('T')[0])
      .limit(1);

    if (claims && claims.length > 0) {
      return claims[0];
    }
  }

  return null;
}

/**
 * Determine new claim status based on ERA payment
 */
function determineClaimStatus(eraClaim: ERAClaim, currentClaim: any): string {
  // If claim was denied
  if (eraClaim.claimStatusCode === '4') {
    return 'Denied';
  }

  // If fully paid
  if (eraClaim.paidAmount >= eraClaim.billedAmount * 0.95) {
    // Within 5% tolerance
    return 'Paid';
  }

  // If partial payment
  if (eraClaim.paidAmount > 0) {
    return 'In Process';
  }

  // If no payment
  if (eraClaim.paidAmount === 0) {
    return 'Rejected';
  }

  return currentClaim.claim_status || 'In Process';
}

/**
 * Manual payment posting (for non-ERA payments)
 */
export interface ManualPaymentPostingRequest {
  claimId: string;
  paymentDate: string;
  paymentAmount: number;
  paymentMethod: string;
  checkNumber?: string;
  postingType: 'Insurance Payment' | 'Patient Payment' | 'Adjustment' | 'Refund' | 'Write-off';
  adjustments?: {
    adjustmentGroup: 'CO' | 'PR' | 'OA' | 'PI';
    adjustmentCode: string;
    adjustmentAmount: number;
    adjustmentReason?: string;
  }[];
  notes?: string;
}

export async function postManualPayment(
  request: ManualPaymentPostingRequest,
  userId: string
): Promise<PaymentPostingResult> {
  const errors: string[] = [];

  try {
    // Validate claim exists
    const { data: claim, error: claimError } = await supabase
      .from('advancedmd_claims')
      .select('*')
      .eq('id', request.claimId)
      .single();

    if (claimError || !claim) {
      errors.push('Claim not found');
      return { success: false, errors };
    }

    // Calculate adjustment totals
    const totalAdjustments = request.adjustments?.reduce((sum, adj) => sum + adj.adjustmentAmount, 0) || 0;
    const contractualAdj = request.adjustments?.filter((a) => a.adjustmentGroup === 'CO').reduce((sum, a) => sum + a.adjustmentAmount, 0) || 0;
    const patientRespAdj = request.adjustments?.filter((a) => a.adjustmentGroup === 'PR').reduce((sum, a) => sum + a.adjustmentAmount, 0) || 0;

    // Create payment posting
    const { data: paymentPosting, error: postingError } = await supabase
      .from('advancedmd_payment_postings')
      .insert({
        claim_id: request.claimId,
        payment_date: request.paymentDate,
        payment_method: request.paymentMethod,
        check_eft_number: request.checkNumber,
        payment_amount: request.paymentAmount,
        billed_amount: claim.billed_amount,
        contractual_adjustment: contractualAdj,
        other_adjustments: totalAdjustments - contractualAdj - patientRespAdj,
        patient_responsibility: patientRespAdj,
        posting_type: request.postingType,
        posting_status: 'Posted',
        notes: request.notes,
        posted_by: userId,
      })
      .select()
      .single();

    if (postingError || !paymentPosting) {
      errors.push(`Failed to create payment posting: ${postingError?.message}`);
      return { success: false, errors, claimId: request.claimId };
    }

    // Create adjustment records
    if (request.adjustments) {
      for (const adjustment of request.adjustments) {
        await supabase.from('advancedmd_payment_adjustments').insert({
          payment_posting_id: paymentPosting.id,
          adjustment_group: adjustment.adjustmentGroup,
          adjustment_code: adjustment.adjustmentCode,
          adjustment_amount: adjustment.adjustmentAmount,
          adjustment_reason: adjustment.adjustmentReason,
        });
      }
    }

    // Update claim
    const newPaidAmount = (claim.paid_amount || 0) + request.paymentAmount;
    const newStatus = newPaidAmount >= claim.billed_amount ? 'Paid' : 'In Process';

    await supabase
      .from('advancedmd_claims')
      .update({
        claim_status: newStatus,
        paid_amount: newPaidAmount,
        paid_date: request.paymentDate,
      })
      .eq('id', request.claimId);

    return {
      success: true,
      claimId: request.claimId,
      paymentPostingId: paymentPosting.id,
    };
  } catch (error) {
    errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, errors };
  }
}

/**
 * Reverse a payment posting
 */
export async function reversePaymentPosting(
  paymentPostingId: string,
  reversalReason: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get payment posting
    const { data: posting, error: postingError } = await supabase
      .from('advancedmd_payment_postings')
      .select('*')
      .eq('id', paymentPostingId)
      .single();

    if (postingError || !posting) {
      return { success: false, error: 'Payment posting not found' };
    }

    // Update posting status
    await supabase
      .from('advancedmd_payment_postings')
      .update({
        posting_status: 'Reversed',
        reversal_reason: reversalReason,
        reversed_at: new Date().toISOString(),
        reversed_by: userId,
      })
      .eq('id', paymentPostingId);

    // Update claim paid amount
    const { data: claim } = await supabase
      .from('advancedmd_claims')
      .select('*')
      .eq('id', posting.claim_id)
      .single();

    if (claim) {
      const newPaidAmount = Math.max(0, (claim.paid_amount || 0) - posting.payment_amount);
      await supabase
        .from('advancedmd_claims')
        .update({
          paid_amount: newPaidAmount,
          claim_status: newPaidAmount === 0 ? 'Submitted' : 'In Process',
        })
        .eq('id', posting.claim_id);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
