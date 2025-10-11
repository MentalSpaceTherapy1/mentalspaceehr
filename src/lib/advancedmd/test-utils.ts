/**
 * AdvancedMD Integration Test Utilities
 *
 * Helper functions for testing the AdvancedMD integration
 */

import { getAdvancedMDClient } from './api-client';
import type {
  EligibilityRequest,
  ClaimSubmissionRequest,
  ClaimServiceLine,
  ClaimDiagnosis,
  PatientSyncRequest,
  ERARequest
} from './types';

/**
 * Test authentication with AdvancedMD sandbox
 */
export async function testAuthentication(): Promise<boolean> {
  try {
    console.log('[Test] Testing authentication...');
    const client = getAdvancedMDClient();
    const token = await client.authenticate();

    console.log('[Test] ✓ Authentication successful');
    console.log('[Test] Token expires at:', token.expiresAt);
    return true;
  } catch (error) {
    console.error('[Test] ✗ Authentication failed:', error);
    return false;
  }
}

/**
 * Test eligibility check with sample data
 */
export async function testEligibilityCheck(): Promise<boolean> {
  try {
    console.log('[Test] Testing eligibility check...');
    const client = getAdvancedMDClient();

    const request: EligibilityRequest = {
      clientId: 'test-client-123',
      insuranceId: 'test-insurance-456',
      serviceDate: new Date().toISOString().split('T')[0],
      serviceType: '30', // Health Benefit Plan Coverage (Medical)
      cptCode: '90834' // Psychotherapy, 45 minutes
    };

    const response = await client.checkEligibility(request);

    if (response.success && response.data) {
      console.log('[Test] ✓ Eligibility check successful');
      console.log('[Test] Coverage status:', response.data.coverageStatus);
      console.log('[Test] Payer:', response.data.payerName);
      console.log('[Test] Copay:', response.data.copay);
      console.log('[Test] Deductible remaining:', response.data.deductibleRemaining);
      return true;
    } else {
      console.error('[Test] ✗ Eligibility check failed:', response.error);
      return false;
    }
  } catch (error) {
    console.error('[Test] ✗ Eligibility check error:', error);
    return false;
  }
}

/**
 * Test claim submission with sample data
 */
export async function testClaimSubmission(): Promise<boolean> {
  try {
    console.log('[Test] Testing claim submission...');
    const client = getAdvancedMDClient();

    const serviceLines: ClaimServiceLine[] = [
      {
        lineNumber: 1,
        serviceDate: new Date().toISOString().split('T')[0],
        placeOfService: '11', // Office
        cptCode: '90834', // Psychotherapy, 45 minutes
        modifiers: [],
        units: 1,
        unitCharge: 150.00,
        diagnosisPointers: [1]
      }
    ];

    const diagnoses: ClaimDiagnosis[] = [
      {
        diagnosisCode: 'F41.1', // Generalized anxiety disorder
        diagnosisPointer: 1,
        diagnosisType: 'primary'
      }
    ];

    const request: ClaimSubmissionRequest = {
      claimId: `TEST-CLAIM-${Date.now()}`,
      claimType: 'Original',
      patientId: 'test-patient-123',
      insuranceId: 'test-insurance-456',
      billingProviderId: 'test-provider-789',
      renderingProviderId: 'test-provider-789',
      statementFromDate: new Date().toISOString().split('T')[0],
      statementToDate: new Date().toISOString().split('T')[0],
      serviceLines,
      diagnoses
    };

    const response = await client.submitClaim(request);

    if (response.success && response.data) {
      console.log('[Test] ✓ Claim submission successful');
      console.log('[Test] Claim ID:', response.data.claimId);
      console.log('[Test] Control number:', response.data.claimControlNumber);
      console.log('[Test] Status:', response.data.status);
      return true;
    } else {
      console.error('[Test] ✗ Claim submission failed:', response.error);
      return false;
    }
  } catch (error) {
    console.error('[Test] ✗ Claim submission error:', error);
    return false;
  }
}

/**
 * Test patient sync with sample data
 */
export async function testPatientSync(): Promise<boolean> {
  try {
    console.log('[Test] Testing patient sync...');
    const client = getAdvancedMDClient();

    const request: PatientSyncRequest = {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1985-06-15',
      gender: 'M',
      address1: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '90210',
      phone: '555-123-4567',
      email: 'john.doe@example.com',
      internalPatientId: 'test-patient-123',
      insurances: [
        {
          rank: 'Primary',
          insuranceCompany: 'Blue Cross Blue Shield',
          payerId: '00123',
          memberId: 'ABC123456789',
          subscriberRelationship: 'Self'
        }
      ]
    };

    const response = await client.syncPatient(request);

    if (response.success && response.data) {
      console.log('[Test] ✓ Patient sync successful');
      console.log('[Test] AdvancedMD Patient ID:', response.data.advancedMDPatientId);
      console.log('[Test] Status:', response.data.status);
      return true;
    } else {
      console.error('[Test] ✗ Patient sync failed:', response.error);
      return false;
    }
  } catch (error) {
    console.error('[Test] ✗ Patient sync error:', error);
    return false;
  }
}

/**
 * Test ERA retrieval
 */
export async function testERARetrieval(): Promise<boolean> {
  try {
    console.log('[Test] Testing ERA retrieval...');
    const client = getAdvancedMDClient();

    const request: ERARequest = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
      endDate: new Date().toISOString().split('T')[0]
    };

    const response = await client.getERAs(request);

    if (response.success && response.data) {
      console.log('[Test] ✓ ERA retrieval successful');
      console.log('[Test] ERAs found:', response.data.length);

      if (response.data.length > 0) {
        const firstERA = response.data[0];
        console.log('[Test] First ERA:');
        console.log('[Test]   - Payer:', firstERA.payerName);
        console.log('[Test]   - Check amount:', firstERA.checkAmount);
        console.log('[Test]   - Check date:', firstERA.checkDate);
        console.log('[Test]   - Claims:', firstERA.claimPayments.length);
      }
      return true;
    } else {
      console.error('[Test] ✗ ERA retrieval failed:', response.error);
      return false;
    }
  } catch (error) {
    console.error('[Test] ✗ ERA retrieval error:', error);
    return false;
  }
}

/**
 * Test rate limit tracking
 */
export async function testRateLimits(): Promise<boolean> {
  try {
    console.log('[Test] Testing rate limits...');
    const client = getAdvancedMDClient();

    const status = client.getRateLimitStatus();

    console.log('[Test] ✓ Rate limit status:');
    console.log('[Test]   - Per second:', status.second.requestsRemaining, 'remaining');
    console.log('[Test]   - Per minute:', status.minute.requestsRemaining, 'remaining');
    console.log('[Test]   - Per hour:', status.hour.requestsRemaining, 'remaining');
    console.log('[Test]   - Per day:', status.day.requestsRemaining, 'remaining');
    return true;
  } catch (error) {
    console.error('[Test] ✗ Rate limit check error:', error);
    return false;
  }
}

/**
 * Run all tests in sequence
 */
export async function runAllTests(): Promise<void> {
  console.log('='.repeat(60));
  console.log('AdvancedMD Integration Test Suite');
  console.log('='.repeat(60));
  console.log();

  const results: Record<string, boolean> = {};

  // Test 1: Authentication
  results['Authentication'] = await testAuthentication();
  console.log();

  // Test 2: Rate Limits
  results['Rate Limits'] = await testRateLimits();
  console.log();

  // Test 3: Eligibility Check
  results['Eligibility Check'] = await testEligibilityCheck();
  console.log();

  // Test 4: Patient Sync
  results['Patient Sync'] = await testPatientSync();
  console.log();

  // Test 5: Claim Submission
  results['Claim Submission'] = await testClaimSubmission();
  console.log();

  // Test 6: ERA Retrieval
  results['ERA Retrieval'] = await testERARetrieval();
  console.log();

  // Summary
  console.log('='.repeat(60));
  console.log('Test Results Summary');
  console.log('='.repeat(60));

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  for (const [test, result] of Object.entries(results)) {
    console.log(`${result ? '✓' : '✗'} ${test}`);
  }

  console.log();
  console.log(`Passed: ${passed}/${total} (${Math.round(passed / total * 100)}%)`);
  console.log('='.repeat(60));
}

/**
 * Generate sample eligibility data for UI testing
 */
export function generateSampleEligibilityResponse() {
  return {
    coverageStatus: 'Active' as const,
    copay: 25.00,
    coinsurance: 20,
    deductibleTotal: 1500.00,
    deductibleMet: 500.00,
    deductibleRemaining: 1000.00,
    oopMaxTotal: 5000.00,
    oopMaxMet: 800.00,
    oopMaxRemaining: 4200.00,
    payerName: 'Blue Cross Blue Shield',
    payerId: '00123',
    memberId: 'ABC123456789',
    groupNumber: 'GRP001',
    planName: 'PPO Gold Plan',
    effectiveDate: '2025-01-01',
    priorAuthRequired: false,
    checkDate: new Date().toISOString(),
    responseCode: '00',
    benefits: [
      {
        serviceType: 'Psychotherapy',
        coverageLevel: 'Individual',
        inNetwork: true,
        copay: 25.00,
        coinsurance: 20,
        limitationType: 'Visit',
        limitationAmount: 52,
        limitationPeriod: 'Year'
      }
    ]
  };
}

/**
 * Generate sample claim data for UI testing
 */
export function generateSampleClaim() {
  return {
    claimId: `CLM-${Date.now()}`,
    claimControlNumber: `CCN${Date.now()}`,
    claimType: 'Original' as const,
    claimStatus: 'Submitted' as const,
    billedAmount: 150.00,
    statementFromDate: new Date().toISOString().split('T')[0],
    statementToDate: new Date().toISOString().split('T')[0],
    submissionDate: new Date().toISOString(),
    serviceLines: [
      {
        lineNumber: 1,
        serviceDate: new Date().toISOString().split('T')[0],
        placeOfService: '11',
        cptCode: '90834',
        modifiers: [],
        units: 1,
        unitCharge: 150.00,
        diagnosisPointers: [1]
      }
    ],
    diagnoses: [
      {
        diagnosisCode: 'F41.1',
        diagnosisPointer: 1,
        diagnosisType: 'primary' as const
      }
    ]
  };
}
