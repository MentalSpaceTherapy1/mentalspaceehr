/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { ERAUploadProcessor } from '../ERAUploadProcessor';
import { supabase } from '@/integrations/supabase/client';
import * as era835Parser from '@/lib/advancedmd/era-835-parser';
import * as paymentPosting from '@/lib/advancedmd/payment-posting';

// Mock modules
vi.mock('@/integrations/supabase/client');
vi.mock('@/lib/advancedmd/era-835-parser');
vi.mock('@/lib/advancedmd/payment-posting');

const mockSupabase = supabase as any;

describe('ERAUploadProcessor', () => {
  const mockUser = { id: 'user-123' };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock successful ERA file creation
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'era-file-123',
          file_name: 'test-era.835',
          processing_status: 'Uploaded',
        },
        error: null,
      }),
    });
  });

  describe('Initial Rendering', () => {
    it('should render the upload processor component', () => {
      render(<ERAUploadProcessor />);
      
      expect(screen.getByText('ERA File Upload & Processing')).toBeInTheDocument();
      expect(screen.getByText('Upload and automatically process 835 Electronic Remittance Advice files')).toBeInTheDocument();
    });

    it('should display file upload area', () => {
      render(<ERAUploadProcessor />);
      
      expect(screen.getByText(/Click to upload or drag and drop/i)).toBeInTheDocument();
      expect(screen.getByText(/835 EDI files/i)).toBeInTheDocument();
    });

    it('should show information about ERA processing', () => {
      render(<ERAUploadProcessor />);
      
      expect(screen.getByText('About ERA Processing')).toBeInTheDocument();
      expect(screen.getByText(/Automatically matches payments to claims/i)).toBeInTheDocument();
      expect(screen.getByText(/Supports HIPAA-compliant 835 EDI format/i)).toBeInTheDocument();
    });
  });

  describe('File Selection', () => {
    it('should accept valid 835 file formats', () => {
      render(<ERAUploadProcessor />);
      
      const input = screen.getByLabelText(/Click to upload/i).closest('label')?.previousElementSibling as HTMLInputElement;
      const file = new File(['test content'], 'test.835', { type: 'text/plain' });
      
      fireEvent.change(input, { target: { files: [file] } });
      
      expect(screen.getByText('test.835')).toBeInTheDocument();
    });

    it('should reject invalid file types', async () => {
      render(<ERAUploadProcessor />);
      
      const input = screen.getByLabelText(/Click to upload/i).closest('label')?.previousElementSibling as HTMLInputElement;
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
      });
    });

    it('should display file size', () => {
      render(<ERAUploadProcessor />);
      
      const input = screen.getByLabelText(/Click to upload/i).closest('label')?.previousElementSibling as HTMLInputElement;
      const file = new File(['test content'], 'test.edi', { type: 'text/plain' });
      
      fireEvent.change(input, { target: { files: [file] } });
      
      expect(screen.getByText(/KB/i)).toBeInTheDocument();
    });

    it('should show process button when file is selected', () => {
      render(<ERAUploadProcessor />);
      
      const input = screen.getByLabelText(/Click to upload/i).closest('label')?.previousElementSibling as HTMLInputElement;
      const file = new File(['test content'], 'test.x12', { type: 'text/plain' });
      
      fireEvent.change(input, { target: { files: [file] } });
      
      expect(screen.getByRole('button', { name: /Process ERA File/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });
  });

  describe('ERA Processing Workflow', () => {
    beforeEach(() => {
      // Mock successful parsing
      vi.mocked(era835Parser.parse835EDI).mockReturnValue({
        success: true,
        data: {
          interchangeControlNumber: 'ICN123',
          transactionControlNumber: 'TCN456',
          payer: {
            entityIdentifierCode: 'PR',
            identificationCode: 'PAYER123',
            name: 'Test Insurance',
            address: {
              street1: '123 Main St',
              city: 'Test City',
              state: 'CA',
              zip: '12345',
            },
          },
          paymentMethod: 'ACH',
          paymentAmount: 1500.00,
          paymentDate: new Date('2024-01-15'),
          checkEFTNumber: 'CHK789',
          claims: [] as any[],
        } as any,
        errors: [],
        warnings: [],
      });

      // Mock successful posting
      vi.mocked(paymentPosting.postERAPayments).mockResolvedValue({
        totalClaims: 1,
        successfulPosts: 1,
        failedPosts: 0,
        results: [],
        eraFileId: 'era-123',
      });
    });

    it('should show uploading status', async () => {
      render(<ERAUploadProcessor />);
      
      const input = screen.getByLabelText(/Click to upload/i).closest('label')?.previousElementSibling as HTMLInputElement;
      const file = new File(['test era content'], 'test.835', { type: 'text/plain' });
      
      fireEvent.change(input, { target: { files: [file] } });
      
      const processButton = screen.getByRole('button', { name: /Process ERA File/i });
      fireEvent.click(processButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Uploading ERA file/i)).toBeInTheDocument();
      });
    });

    it('should create ERA file record in database', async () => {
      render(<ERAUploadProcessor />);
      
      const input = screen.getByLabelText(/Click to upload/i).closest('label')?.previousElementSibling as HTMLInputElement;
      const file = new File(['test era content'], 'test.835', { type: 'text/plain' });
      
      fireEvent.change(input, { target: { files: [file] } });
      
      const processButton = screen.getByRole('button', { name: /Process ERA File/i });
      fireEvent.click(processButton);
      
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('advancedmd_era_files');
      });
    });

    it('should parse ERA file content', async () => {
      render(<ERAUploadProcessor />);
      
      const input = screen.getByLabelText(/Click to upload/i).closest('label')?.previousElementSibling as HTMLInputElement;
      const file = new File(['test era content'], 'test.835', { type: 'text/plain' });
      
      fireEvent.change(input, { target: { files: [file] } });
      
      const processButton = screen.getByRole('button', { name: /Process ERA File/i });
      fireEvent.click(processButton);
      
      await waitFor(() => {
        expect(era835Parser.parse835EDI).toHaveBeenCalledWith('test era content');
      });
    });

    it('should post payments after successful parse', async () => {
      render(<ERAUploadProcessor />);
      
      const input = screen.getByLabelText(/Click to upload/i).closest('label')?.previousElementSibling as HTMLInputElement;
      const file = new File(['test era content'], 'test.835', { type: 'text/plain' });
      
      fireEvent.change(input, { target: { files: [file] } });
      
      const processButton = screen.getByRole('button', { name: /Process ERA File/i });
      fireEvent.click(processButton);
      
      await waitFor(() => {
        expect(paymentPosting.postERAPayments).toHaveBeenCalled();
      });
    });

    it('should display completion status with statistics', async () => {
      render(<ERAUploadProcessor />);
      
      const input = screen.getByLabelText(/Click to upload/i).closest('label')?.previousElementSibling as HTMLInputElement;
      const file = new File(['test era content'], 'test.835', { type: 'text/plain' });
      
      fireEvent.change(input, { target: { files: [file] } });
      
      const processButton = screen.getByRole('button', { name: /Process ERA File/i });
      fireEvent.click(processButton);
      
      await waitFor(() => {
        expect(screen.getByText('ERA processing complete')).toBeInTheDocument();
        expect(screen.getByText('Total Claims')).toBeInTheDocument();
        expect(screen.getByText('Posted Successfully')).toBeInTheDocument();
        expect(screen.getByText('Failed to Post')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle parse errors', async () => {
      vi.mocked(era835Parser.parse835EDI).mockReturnValue({
        success: false,
        data: null,
        errors: ['Invalid EDI format', 'Missing required segments'],
        warnings: [],
      } as any);

      render(<ERAUploadProcessor />);
      
      const input = screen.getByLabelText(/Click to upload/i).closest('label')?.previousElementSibling as HTMLInputElement;
      const file = new File(['invalid era content'], 'test.835', { type: 'text/plain' });
      
      fireEvent.change(input, { target: { files: [file] } });
      
      const processButton = screen.getByRole('button', { name: /Process ERA File/i });
      fireEvent.click(processButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to parse ERA file')).toBeInTheDocument();
        expect(screen.getByText(/Invalid EDI format/i)).toBeInTheDocument();
      });
    });

    it('should handle database errors', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      });

      render(<ERAUploadProcessor />);
      
      const input = screen.getByLabelText(/Click to upload/i).closest('label')?.previousElementSibling as HTMLInputElement;
      const file = new File(['test content'], 'test.835', { type: 'text/plain' });
      
      fireEvent.change(input, { target: { files: [file] } });
      
      const processButton = screen.getByRole('button', { name: /Process ERA File/i });
      fireEvent.click(processButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to process ERA file')).toBeInTheDocument();
      });
    });

    it('should handle unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      render(<ERAUploadProcessor />);
      
      const input = screen.getByLabelText(/Click to upload/i).closest('label')?.previousElementSibling as HTMLInputElement;
      const file = new File(['test content'], 'test.835', { type: 'text/plain' });
      
      fireEvent.change(input, { target: { files: [file] } });
      
      const processButton = screen.getByRole('button', { name: /Process ERA File/i });
      fireEvent.click(processButton);
      
      await waitFor(() => {
        expect(screen.getByText(/User not authenticated/i)).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      vi.mocked(era835Parser.parse835EDI).mockReturnValue({
        success: false,
        data: null,
        errors: ['Parse error'],
        warnings: [],
      });

      render(<ERAUploadProcessor />);
      
      const input = screen.getByLabelText(/Click to upload/i).closest('label')?.previousElementSibling as HTMLInputElement;
      const file = new File(['test content'], 'test.835', { type: 'text/plain' });
      
      fireEvent.change(input, { target: { files: [file] } });
      fireEvent.click(screen.getByRole('button', { name: /Process ERA File/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
      });
    });
  });

  describe('Progress Tracking', () => {
    beforeEach(() => {
      vi.mocked(era835Parser.parse835EDI).mockReturnValue({
        success: true,
        data: {
          claims: [] as any[],
        } as any,
        errors: [],
        warnings: [],
      });

      vi.mocked(paymentPosting.postERAPayments).mockResolvedValue({
        totalClaims: 1,
        successfulPosts: 1,
        failedPosts: 0,
        results: [],
        eraFileId: 'era-123',
      });
    });

    it('should show progress bar during processing', async () => {
      render(<ERAUploadProcessor />);
      
      const input = screen.getByLabelText(/Click to upload/i).closest('label')?.previousElementSibling as HTMLInputElement;
      const file = new File(['test content'], 'test.835', { type: 'text/plain' });
      
      fireEvent.change(input, { target: { files: [file] } });
      fireEvent.click(screen.getByRole('button', { name: /Process ERA File/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('should display different processing stages', async () => {
      render(<ERAUploadProcessor />);
      
      const input = screen.getByLabelText(/Click to upload/i).closest('label')?.previousElementSibling as HTMLInputElement;
      const file = new File(['test content'], 'test.835', { type: 'text/plain' });
      
      fireEvent.change(input, { target: { files: [file] } });
      fireEvent.click(screen.getByRole('button', { name: /Process ERA File/i }));
      
      // Should eventually show parsing stage
      await waitFor(() => {
        const processingText = screen.queryByText(/Parsing 835 EDI file/i) || screen.queryByText(/Uploading ERA file/i);
        expect(processingText).toBeInTheDocument();
      });
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to initial state', () => {
      render(<ERAUploadProcessor />);
      
      const input = screen.getByLabelText(/Click to upload/i).closest('label')?.previousElementSibling as HTMLInputElement;
      const file = new File(['test content'], 'test.835', { type: 'text/plain' });
      
      fireEvent.change(input, { target: { files: [file] } });
      expect(screen.getByText('test.835')).toBeInTheDocument();
      
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);
      
      expect(screen.queryByText('test.835')).not.toBeInTheDocument();
      expect(screen.getByText(/Click to upload or drag and drop/i)).toBeInTheDocument();
    });

    it('should allow processing another file after completion', async () => {
      vi.mocked(era835Parser.parse835EDI).mockReturnValue({
        success: true,
        data: { claims: [] } as any,
        errors: [],
        warnings: [],
      });

      vi.mocked(paymentPosting.postERAPayments).mockResolvedValue({
        totalClaims: 0,
        successfulPosts: 0,
        failedPosts: 0,
        results: [],
        eraFileId: 'era-123',
      });

      render(<ERAUploadProcessor />);
      
      const input = screen.getByLabelText(/Click to upload/i).closest('label')?.previousElementSibling as HTMLInputElement;
      const file = new File(['test content'], 'test.835', { type: 'text/plain' });
      
      fireEvent.change(input, { target: { files: [file] } });
      fireEvent.click(screen.getByRole('button', { name: /Process ERA File/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Process Another File/i })).toBeInTheDocument();
      });
    });
  });

  describe('Warnings Display', () => {
    it('should display warnings when present', async () => {
      vi.mocked(era835Parser.parse835EDI).mockReturnValue({
        success: true,
        data: { claims: [] } as any,
        errors: [],
        warnings: ['Some claims may require manual review', 'Missing optional fields'],
      });

      vi.mocked(paymentPosting.postERAPayments).mockResolvedValue({
        totalClaims: 1,
        successfulPosts: 1,
        failedPosts: 0,
        results: [],
        eraFileId: 'era-123',
      });

      render(<ERAUploadProcessor />);
      
      const input = screen.getByLabelText(/Click to upload/i).closest('label')?.previousElementSibling as HTMLInputElement;
      const file = new File(['test content'], 'test.835', { type: 'text/plain' });
      
      fireEvent.change(input, { target: { files: [file] } });
      fireEvent.click(screen.getByRole('button', { name: /Process ERA File/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Warnings:')).toBeInTheDocument();
        expect(screen.getByText(/Some claims may require manual review/i)).toBeInTheDocument();
      });
    });
  });
});
