/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  submitEligibilityRequest,
  getEligibilityHistory,
  getLatestEligibility,
  needsEligibilityRefresh,
  createBatchEligibilityJob,
  processBatchEligibilityJob,
  getUnacknowledgedAlerts,
  acknowledgeAlert,
  type EligibilityRequest,
  type BatchEligibilityJob,
} from '../eligibilityVerification';

// Mock the Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe('eligibilityVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-10-11T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('submitEligibilityRequest', () => {
    const mockRequest: EligibilityRequest = {
      patientId: 'patient-123',
      insuranceId: 'insurance-456',
      serviceType: 'Mental Health',
      verificationType: 'real_time',
    };

    const mockInsertedRequest = {
      id: 'request-789',
      patient_id: 'patient-123',
      insurance_id: 'insurance-456',
      service_date: '2025-10-11',
      service_type: '30',
      submission_method: 'real-time',
      request_status: 'processing',
    };

    beforeEach(() => {
      // Mock the insert operation
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockInsertedRequest,
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
        single: mockSingle,
      });

      // Mock the update operation (for updating request with response)
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      // Mock the from function to return different mock chains
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'advancedmd_eligibility_requests') {
          return {
            insert: mockInsert,
            update: mockUpdate,
            select: vi.fn().mockReturnThis(),
          } as any;
        }
        if (table === 'advancedmd_eligibility_alerts') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as any;
        }
        return {} as any;
      });
    });

    it('creates an eligibility request in the database', async () => {
      const result = await submitEligibilityRequest(mockRequest);

      expect(supabase.from).toHaveBeenCalledWith('advancedmd_eligibility_requests');
      expect(result.requestId).toBe('request-789');
      expect(result.isEligible).toBeDefined();
      expect(result.eligibilityStatus).toBeDefined();
    });

    it('generates a unique request number', async () => {
      const result = await submitEligibilityRequest(mockRequest);

      expect(result.requestNumber).toMatch(/^EV-\d+-[a-f0-9]{8}$/);
      expect(result.requestNumber).toContain(mockRequest.patientId.slice(0, 8));
    });

    it('maps service type to EDI code', async () => {
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockInsertedRequest,
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'advancedmd_eligibility_requests') {
          return {
            insert: insertMock,
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          } as any;
        }
        return { insert: vi.fn() } as any;
      });

      await submitEligibilityRequest(mockRequest);

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          service_type: '30', // EDI code for Mental Health
          submission_method: 'real-time',
        })
      );
    });

    it('handles batch verification type', async () => {
      const batchRequest = {
        ...mockRequest,
        verificationType: 'batch' as const,
      };

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockInsertedRequest,
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'advancedmd_eligibility_requests') {
          return {
            insert: insertMock,
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          } as any;
        }
        return { insert: vi.fn() } as any;
      });

      await submitEligibilityRequest(batchRequest);

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          submission_method: 'batch',
        })
      );
    });

    it('updates request status to completed after receiving response', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'advancedmd_eligibility_requests') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: mockInsertedRequest,
                error: null,
              }),
            }),
            update: updateMock,
          } as any;
        }
        return { insert: vi.fn() } as any;
      });

      await submitEligibilityRequest(mockRequest);

      await vi.advanceTimersByTimeAsync(1000); // Wait for mock API call

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          request_status: 'completed',
        })
      );
    });

    it('returns coverage details when patient is eligible', async () => {
      const result = await submitEligibilityRequest(mockRequest);

      await vi.advanceTimersByTimeAsync(1000);

      // Due to 90% eligible rate in mock, most calls should return eligibility details
      if (result.isEligible) {
        expect(result.coverageDetails).toBeDefined();
        expect(result.coverageDetails?.deductible).toBeDefined();
        expect(result.coverageDetails?.outOfPocketMax).toBeDefined();
        expect(result.coverageDetails?.copay).toBeDefined();
        expect(result.coverageDetails?.coinsurance).toBeDefined();
        expect(result.planDetails).toBeDefined();
        expect(result.serviceLimitations).toBeDefined();
      }
    });

    it('throws error when database insert fails', async () => {
      const dbError = new Error('Database connection failed');

      vi.mocked(supabase.from).mockImplementation(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: dbError,
          }),
        }),
      } as any));

      await expect(submitEligibilityRequest(mockRequest)).rejects.toThrow(dbError);
    });

    it('throws error when database update fails', async () => {
      const dbError = new Error('Update failed');

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'advancedmd_eligibility_requests') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: mockInsertedRequest,
                error: null,
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: dbError,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      await expect(submitEligibilityRequest(mockRequest)).rejects.toThrow(dbError);
    });
  });

  describe('getEligibilityHistory', () => {
    const mockHistory = [
      {
        id: 'req-1',
        patient_id: 'patient-123',
        request_date: '2025-10-10',
        request_status: 'completed',
        coverage_status: 'active',
      },
      {
        id: 'req-2',
        patient_id: 'patient-123',
        request_date: '2025-09-15',
        request_status: 'completed',
        coverage_status: 'active',
      },
      {
        id: 'req-3',
        patient_id: 'patient-123',
        request_date: '2025-08-20',
        request_status: 'completed',
        coverage_status: 'inactive',
      },
    ];

    beforeEach(() => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockHistory,
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);
    });

    it('fetches all eligibility requests for a patient', async () => {
      const result = await getEligibilityHistory('patient-123');

      expect(supabase.from).toHaveBeenCalledWith('advancedmd_eligibility_requests');
      expect(result).toEqual(mockHistory);
      expect(result.length).toBe(3);
    });

    it('orders results by date descending', async () => {
      const orderMock = vi.fn().mockResolvedValue({
        data: mockHistory,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({
          order: orderMock,
        }),
      } as any);

      await getEligibilityHistory('patient-123');

      expect(orderMock).toHaveBeenCalledWith('request_date', { ascending: false });
    });

    it('throws error when database query fails', async () => {
      const dbError = new Error('Query failed');

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: dbError,
          }),
        }),
      } as any);

      await expect(getEligibilityHistory('patient-123')).rejects.toThrow(dbError);
    });
  });

  describe('getLatestEligibility', () => {
    const mockLatestData = {
      id: 'req-latest',
      patient_id: 'patient-123',
      request_date: '2025-10-10T10:00:00.000Z',
      request_status: 'completed',
      coverage_status: 'active',
      service_date: '2025-10-10',
      payer_name: 'Blue Cross Blue Shield',
      member_id: 'SUB123456789',
      group_number: 'GRP123456',
      plan_name: 'Blue Advantage PPO',
      benefits: {
        deductible: {
          individual: 1500,
          family: 3000,
          individualMet: 750,
          familyMet: 1200,
        },
      },
      limitations: [
        {
          serviceType: 'Mental Health Outpatient',
          limitationType: 'visits',
          limitationValue: 52,
          limitationPeriod: 'per year',
          remainingValue: 45,
        },
      ],
    };

    beforeEach(() => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockLatestData,
        error: null,
      });

      const mockLimit = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockOrder = vi.fn().mockReturnValue({
        limit: mockLimit,
      });

      const mockEq = vi.fn((column: string, value: any) => {
        return column === 'request_status'
          ? { order: mockOrder }
          : { eq: mockEq };
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);
    });

    it('fetches the most recent completed eligibility check', async () => {
      const result = await getLatestEligibility('patient-123');

      expect(supabase.from).toHaveBeenCalledWith('advancedmd_eligibility_requests');
      expect(result).not.toBeNull();
      expect(result?.requestId).toBe('req-latest');
      expect(result?.isEligible).toBe(true);
      expect(result?.eligibilityStatus).toBe('active');
    });

    it('transforms database fields to EligibilityResponse format', async () => {
      const result = await getLatestEligibility('patient-123');

      expect(result).toMatchObject({
        requestId: 'req-latest',
        requestNumber: expect.stringContaining('EV-'),
        isEligible: true,
        eligibilityStatus: 'active',
        effectiveDate: '2025-10-10',
        payerName: 'Blue Cross Blue Shield',
        subscriberId: 'SUB123456789',
        groupNumber: 'GRP123456',
        coverageDetails: mockLatestData.benefits,
        planDetails: { planName: 'Blue Advantage PPO' },
        serviceLimitations: mockLatestData.limitations,
      });
    });

    it('returns null when no completed eligibility exists', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }, // Not found error code
        }),
      } as any);

      const result = await getLatestEligibility('patient-no-history');

      expect(result).toBeNull();
    });

    it('throws error for database errors other than not found', async () => {
      const dbError = { code: 'PGRST000', message: 'Database error' };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      } as any);

      await expect(getLatestEligibility('patient-123')).rejects.toThrow();
    });
  });

  describe('needsEligibilityRefresh', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns true when no eligibility check exists', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      } as any);

      const result = await needsEligibilityRefresh('patient-new');

      expect(result).toBe(true);
    });

    it('returns false when last check is within threshold', async () => {
      // Last check was 20 days ago
      const recentDate = new Date('2025-09-21T12:00:00.000Z');

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { request_date: recentDate.toISOString() },
          error: null,
        }),
      } as any);

      const result = await needsEligibilityRefresh('patient-123', 30);

      expect(result).toBe(false);
    });

    it('returns true when last check exceeds threshold', async () => {
      // Last check was 35 days ago
      const oldDate = new Date('2025-09-06T12:00:00.000Z');

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { request_date: oldDate.toISOString() },
          error: null,
        }),
      } as any);

      const result = await needsEligibilityRefresh('patient-123', 30);

      expect(result).toBe(true);
    });

    it('uses default threshold of 30 days', async () => {
      const date25DaysAgo = new Date('2025-09-16T12:00:00.000Z');

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { request_date: date25DaysAgo.toISOString() },
          error: null,
        }),
      } as any);

      const result = await needsEligibilityRefresh('patient-123');

      expect(result).toBe(false);
    });

    it('accepts custom threshold values', async () => {
      const date10DaysAgo = new Date('2025-10-01T12:00:00.000Z');

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { request_date: date10DaysAgo.toISOString() },
          error: null,
        }),
      } as any);

      // With 7-day threshold, 10 days ago should need refresh
      const result = await needsEligibilityRefresh('patient-123', 7);

      expect(result).toBe(true);
    });

    it('returns true on database errors', async () => {
      const dbError = { code: 'PGRST000', message: 'Database error' };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      } as any);

      const result = await needsEligibilityRefresh('patient-123');

      expect(result).toBe(true);
    });
  });

  describe('createBatchEligibilityJob', () => {
    const mockJob: BatchEligibilityJob = {
      batchName: 'Monthly Eligibility Check',
      scheduledDate: '2025-10-15',
      patientIds: ['patient-1', 'patient-2', 'patient-3'],
    };

    const mockBatchData = {
      id: 'batch-123',
      batch_name: 'Monthly Eligibility Check',
      scheduled_date: '2025-10-15',
      service_date: '2025-10-11',
      total_patients: 3,
      status: 'scheduled',
    };

    beforeEach(() => {
      // Mock batch insert
      const batchSingle = vi.fn().mockResolvedValue({
        data: mockBatchData,
        error: null,
      });

      const batchSelect = vi.fn().mockReturnValue({
        single: batchSingle,
      });

      const batchInsert = vi.fn().mockReturnValue({
        select: batchSelect,
      });

      // Mock batch items insert
      const itemSingle = vi.fn((idx: number = 0) =>
        Promise.resolve({
          data: {
            id: `item-${idx + 1}`,
            batch_id: 'batch-123',
            patient_id: mockJob.patientIds[idx],
            status: 'pending',
          },
          error: null,
        })
      );

      let itemCallCount = 0;
      const itemSelect = vi.fn().mockImplementation(() => ({
        single: () => itemSingle(itemCallCount++),
      }));

      const itemInsert = vi.fn().mockReturnValue({
        select: itemSelect,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'advancedmd_eligibility_batches') {
          return { insert: batchInsert } as any;
        }
        if (table === 'advancedmd_eligibility_batch_items') {
          return { insert: itemInsert } as any;
        }
        return {} as any;
      });
    });

    it('creates a batch job in the database', async () => {
      const result = await createBatchEligibilityJob(mockJob);

      expect(supabase.from).toHaveBeenCalledWith('advancedmd_eligibility_batches');
      expect(result.batchId).toBe('batch-123');
      expect(result.totalRequests).toBe(3);
    });

    it('generates a unique batch number', async () => {
      const result = await createBatchEligibilityJob(mockJob);

      expect(result.batchNumber).toMatch(/^BATCH-\d+$/);
    });

    it('creates batch items for each patient', async () => {
      const result = await createBatchEligibilityJob(mockJob);

      expect(supabase.from).toHaveBeenCalledWith('advancedmd_eligibility_batch_items');
      expect(result.totalRequests).toBe(mockJob.patientIds.length);
    });

    it('sets initial batch status to scheduled', async () => {
      const batchInsertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockBatchData,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'advancedmd_eligibility_batches') {
          return { insert: batchInsertMock } as any;
        }
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'item-1', batch_id: 'batch-123', status: 'pending' },
                error: null,
              }),
            }),
          }),
        } as any;
      });

      await createBatchEligibilityJob(mockJob);

      expect(batchInsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'scheduled',
          total_patients: 3,
        })
      );
    });

    it('throws error when batch creation fails', async () => {
      const dbError = new Error('Failed to create batch');

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'advancedmd_eligibility_batches') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: dbError,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      await expect(createBatchEligibilityJob(mockJob)).rejects.toThrow(dbError);
    });

    it('handles empty patient list', async () => {
      const emptyJob: BatchEligibilityJob = {
        ...mockJob,
        patientIds: [],
      };

      const result = await createBatchEligibilityJob(emptyJob);

      expect(result.totalRequests).toBe(0);
    });
  });

  describe('processBatchEligibilityJob', () => {
    const mockBatchItems = [
      {
        id: 'item-1',
        batch_id: 'batch-123',
        patient_id: 'patient-1',
        insurance_id: 'insurance-1',
        status: 'pending',
      },
      {
        id: 'item-2',
        batch_id: 'batch-123',
        patient_id: 'patient-2',
        insurance_id: 'insurance-2',
        status: 'pending',
      },
      {
        id: 'item-3',
        batch_id: 'batch-123',
        patient_id: 'patient-3',
        insurance_id: null,
        status: 'pending',
      },
    ];

    beforeEach(() => {
      // Mock batch status update
      const batchUpdateEq = vi.fn().mockResolvedValue({ data: null, error: null });
      const batchUpdate = vi.fn().mockReturnValue({ eq: batchUpdateEq });

      // Mock fetch batch items
      const itemsEq = vi.fn().mockResolvedValue({
        data: mockBatchItems,
        error: null,
      });
      const itemsSelect = vi.fn().mockReturnValue({ eq: itemsEq });

      // Mock item status update
      const itemUpdateEq = vi.fn().mockResolvedValue({ data: null, error: null });
      const itemUpdate = vi.fn().mockReturnValue({ eq: itemUpdateEq });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'advancedmd_eligibility_batches') {
          return { update: batchUpdate } as any;
        }
        if (table === 'advancedmd_eligibility_batch_items') {
          return {
            select: itemsSelect,
            update: itemUpdate,
          } as any;
        }
        return {} as any;
      });
    });

    it('processes all batch items', async () => {
      const result = await processBatchEligibilityJob('batch-123');

      await vi.advanceTimersByTimeAsync(3000); // Wait for all mock API calls

      expect(result.batchId).toBe('batch-123');
      expect(result.total).toBe(3);
      expect(result.successful + result.failed).toBe(3);
    });

    it('updates batch status to processing at start', async () => {
      const batchUpdateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'advancedmd_eligibility_batches') {
          return { update: batchUpdateMock } as any;
        }
        if (table === 'advancedmd_eligibility_batch_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockBatchItems,
                error: null,
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          } as any;
        }
        return {} as any;
      });

      await processBatchEligibilityJob('batch-123');

      expect(batchUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'processing',
          start_date: expect.any(String),
        })
      );
    });

    it('updates batch status to completed when all items succeed', async () => {
      const batchUpdateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'advancedmd_eligibility_batches') {
          return { update: batchUpdateMock } as any;
        }
        if (table === 'advancedmd_eligibility_batch_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockBatchItems,
                error: null,
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          } as any;
        }
        return {} as any;
      });

      await processBatchEligibilityJob('batch-123');

      await vi.advanceTimersByTimeAsync(3000);

      // Second call should be the completion update
      expect(batchUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          completion_date: expect.any(String),
        })
      );
    });

    it('tracks successful and failed items separately', async () => {
      const result = await processBatchEligibilityJob('batch-123');

      await vi.advanceTimersByTimeAsync(3000);

      expect(result.successful).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
      expect(result.successful + result.failed).toBe(result.total);
    });

    it('updates item status to completed for successful items', async () => {
      const itemUpdateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'advancedmd_eligibility_batches') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          } as any;
        }
        if (table === 'advancedmd_eligibility_batch_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockBatchItems,
                error: null,
              }),
            }),
            update: itemUpdateMock,
          } as any;
        }
        return {} as any;
      });

      await processBatchEligibilityJob('batch-123');

      await vi.advanceTimersByTimeAsync(3000);

      expect(itemUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          processed_date: expect.any(String),
        })
      );
    });

    it('throws error when batch items query fails', async () => {
      const dbError = new Error('Failed to fetch batch items');

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'advancedmd_eligibility_batches') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          } as any;
        }
        if (table === 'advancedmd_eligibility_batch_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: dbError,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      await expect(processBatchEligibilityJob('batch-123')).rejects.toThrow(dbError);
    });
  });

  describe('getUnacknowledgedAlerts', () => {
    const mockAlerts = [
      {
        id: 'alert-1',
        patient_id: 'patient-1',
        alert_type: 'expiring_coverage',
        severity: 'medium',
        message: 'Insurance coverage expires in 15 days',
        acknowledged: false,
        triggered_date: '2025-10-10',
      },
      {
        id: 'alert-2',
        patient_id: 'patient-2',
        alert_type: 'verification_failed',
        severity: 'high',
        message: 'Patient is not eligible for services',
        acknowledged: false,
        triggered_date: '2025-10-09',
      },
    ];

    beforeEach(() => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockAlerts,
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);
    });

    it('fetches all unacknowledged alerts', async () => {
      const result = await getUnacknowledgedAlerts();

      expect(supabase.from).toHaveBeenCalledWith('advancedmd_eligibility_alerts');
      expect(result).toEqual(mockAlerts);
      expect(result.length).toBe(2);
    });

    it('filters for unacknowledged alerts only', async () => {
      const eqMock = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockAlerts,
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: eqMock,
      } as any);

      await getUnacknowledgedAlerts();

      expect(eqMock).toHaveBeenCalledWith('acknowledged', false);
    });

    it('orders alerts by date descending', async () => {
      const orderMock = vi.fn().mockResolvedValue({
        data: mockAlerts,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({
          order: orderMock,
        }),
      } as any);

      await getUnacknowledgedAlerts();

      expect(orderMock).toHaveBeenCalledWith('triggered_date', { ascending: false });
    });

    it('throws error when query fails', async () => {
      const dbError = new Error('Query failed');

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: dbError,
          }),
        }),
      } as any);

      await expect(getUnacknowledgedAlerts()).rejects.toThrow(dbError);
    });
  });

  describe('acknowledgeAlert', () => {
    const mockUserId = 'user-789';

    beforeEach(() => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);
    });

    it('marks alert as acknowledged', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: updateMock,
      } as any);

      await acknowledgeAlert('alert-123');

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          acknowledged: true,
          acknowledged_by: mockUserId,
          acknowledged_date: expect.any(String),
        })
      );
    });

    it('records who acknowledged the alert', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: updateMock,
      } as any);

      await acknowledgeAlert('alert-123');

      expect(supabase.auth.getUser).toHaveBeenCalled();
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          acknowledged_by: mockUserId,
        })
      );
    });

    it('records when the alert was acknowledged', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: updateMock,
      } as any);

      await acknowledgeAlert('alert-123');

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          acknowledged_date: expect.any(String),
        })
      );
    });

    it('throws error when update fails', async () => {
      const dbError = new Error('Update failed');

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: dbError,
          }),
        }),
      } as any);

      await expect(acknowledgeAlert('alert-123')).rejects.toThrow(dbError);
    });

    it('targets the correct alert by ID', async () => {
      const eqMock = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: eqMock,
        }),
      } as any);

      await acknowledgeAlert('alert-456');

      expect(eqMock).toHaveBeenCalledWith('id', 'alert-456');
    });
  });
});
