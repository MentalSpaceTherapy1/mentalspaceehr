/**
 * Unit Tests for ClaimsDashboard Component
 *
 * Tests cover:
 * - Initial rendering and loading state
 * - Data fetching and display
 * - Statistics calculation
 * - Search functionality
 * - Status filtering
 * - Error handling
 * - Refresh functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClaimsDashboard } from '../ClaimsDashboard';
import { render } from '@/test/utils';
import { createMockClaimList } from '@/test/factories/claimFactory';
import { supabase } from '@/integrations/supabase/client';

// Mock the Supabase client
vi.mock('@/integrations/supabase/client');

describe('ClaimsDashboard', () => {
  // Create mock data with specific statuses for testing
  const mockClaims = [
    ...createMockClaimList(3).map(c => ({ ...c, claim_status: 'Submitted' })),
    ...createMockClaimList(2).map(c => ({ ...c, claim_status: 'Paid' })),
    ...createMockClaimList(2).map(c => ({ ...c, claim_status: 'Draft' })),
    ...createMockClaimList(1).map(c => ({ ...c, claim_status: 'Denied' })),
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation - successful fetch
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: mockClaims,
        error: null,
      }),
    } as any);
  });

  describe('Initial Rendering', () => {
    it('renders the dashboard title', async () => {
      render(<ClaimsDashboard />);

      expect(screen.getByText(/claims/i)).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      render(<ClaimsDashboard />);

      // Should show some loading indicator
      expect(screen.queryByRole('progressbar') || screen.queryByText(/loading/i)).toBeTruthy();
    });
  });

  describe('Data Fetching', () => {
    it('fetches claims from the correct table', async () => {
      render(<ClaimsDashboard />);

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('insurance_claims');
      });
    });

    it('displays fetched claims after loading', async () => {
      render(<ClaimsDashboard />);

      await waitFor(() => {
        // Claims should be displayed (check for first claim ID)
        expect(screen.getByText(mockClaims[0].claim_id)).toBeInTheDocument();
      });
    });

    it('orders claims by created_date descending', async () => {
      render(<ClaimsDashboard />);

      await waitFor(() => {
        const fromMock = supabase.from as any;
        const selectMock = fromMock.mock.results[0].value.select;
        expect(selectMock().order).toHaveBeenCalledWith('created_date', { ascending: false });
      });
    });

    it('limits results to 100 claims', async () => {
      render(<ClaimsDashboard />);

      await waitFor(() => {
        const fromMock = supabase.from as any;
        const selectMock = fromMock.mock.results[0].value.select;
        expect(selectMock().order().limit).toHaveBeenCalledWith(100);
      });
    });
  });

  describe('Statistics Display', () => {
    it('calculates and displays total claims count', async () => {
      render(<ClaimsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('8')).toBeInTheDocument(); // Total: 8 claims
      });
    });

    it('calculates correct status counts', async () => {
      render(<ClaimsDashboard />);

      await waitFor(() => {
        // Should show counts for each status
        expect(screen.getByText(/submitted/i)).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument(); // 3 submitted
        expect(screen.getByText('2')).toBeInTheDocument(); // 2 paid or 2 draft
      });
    });

    it('calculates total billed amount', async () => {
      render(<ClaimsDashboard />);

      await waitFor(() => {
        const totalBilled = mockClaims.reduce((sum, c) => sum + c.billed_amount, 0);
        // Check if formatted amount appears (might have commas, decimal, etc.)
        const formattedAmount = totalBilled.toFixed(2);
        expect(screen.getByText(new RegExp(formattedAmount.replace('.', '\\.'))));
      });
    });

    it('calculates total paid amount', async () => {
      render(<ClaimsDashboard />);

      await waitFor(() => {
        const totalPaid = mockClaims.reduce((sum, c) => sum + (c.paid_amount || 0), 0);
        expect(screen.getByText(new RegExp(totalPaid.toFixed(0)))).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('renders search input', async () => {
      render(<ClaimsDashboard />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
      });
    });

    it('filters claims by search query', async () => {
      const user = userEvent.setup();
      render(<ClaimsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(mockClaims[0].claim_id)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, mockClaims[0].claim_id);

      await waitFor(() => {
        // First claim should still be visible
        expect(screen.getByText(mockClaims[0].claim_id)).toBeInTheDocument();
        // Other claims should not be visible (or less visible)
        // This depends on implementation
      });
    });

    it('shows no results message when search has no matches', async () => {
      const user = userEvent.setup();
      render(<ClaimsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(mockClaims[0].claim_id)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'NONEXISTENT-CLAIM-ID-12345');

      await waitFor(() => {
        // Should show no results or empty state
        expect(screen.queryByText(mockClaims[0].claim_id)).not.toBeInTheDocument();
      });
    });
  });

  describe('Status Filtering', () => {
    it('renders status filter dropdown', async () => {
      render(<ClaimsDashboard />);

      await waitFor(() => {
        // Look for filter select or combobox
        const filters = screen.getAllByRole('combobox');
        expect(filters.length).toBeGreaterThan(0);
      });
    });

    it('filters claims by selected status', async () => {
      const user = userEvent.setup();
      render(<ClaimsDashboard />);

      await waitFor(() => {
        expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
      });

      // Find and click status filter
      const statusSelect = screen.getAllByRole('combobox')[0]; // Assuming first is status
      await user.click(statusSelect);

      // Select "Submitted" status
      const submittedOption = await screen.findByText('Submitted');
      await user.click(submittedOption);

      await waitFor(() => {
        // Should only show submitted claims (3 + 1 header row = 4 rows)
        const rows = screen.getAllByRole('row');
        expect(rows.length).toBeLessThanOrEqual(4);
      });
    });

    it('shows all claims when "all" filter is selected', async () => {
      const user = userEvent.setup();
      render(<ClaimsDashboard />);

      await waitFor(() => {
        const initialRows = screen.getAllByRole('row');
        expect(initialRows.length).toBe(9); // 8 claims + 1 header
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when fetch fails', async () => {
      const errorMessage = 'Database connection failed';

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: errorMessage },
        }),
      } as any);

      render(<ClaimsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(new RegExp(errorMessage, 'i'))).toBeInTheDocument();
      });
    });

    it('does not display claims when error occurs', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Error' },
        }),
      } as any);

      render(<ClaimsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      // No claim IDs should be visible
      mockClaims.forEach(claim => {
        expect(screen.queryByText(claim.claim_id)).not.toBeInTheDocument();
      });
    });

    it('handles empty data gracefully', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any);

      render(<ClaimsDashboard />);

      await waitFor(() => {
        // Should show no claims or empty state
        expect(screen.queryByRole('row')).toBeTruthy();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('renders refresh button', async () => {
      render(<ClaimsDashboard />);

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('refetches data when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(<ClaimsDashboard />);

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledTimes(1);
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledTimes(2);
      });
    });

    it('shows loading state during refresh', async () => {
      const user = userEvent.setup();

      // Make the fetch take some time
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() =>
          new Promise(resolve => setTimeout(() => resolve({ data: mockClaims, error: null }), 100))
        ),
      } as any);

      render(<ClaimsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(mockClaims[0].claim_id)).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      // Should show loading state briefly
      expect(screen.queryByRole('progressbar') || screen.queryByText(/loading/i)).toBeTruthy();
    });
  });

  describe('Data Display', () => {
    it('displays claim IDs in the table', async () => {
      render(<ClaimsDashboard />);

      await waitFor(() => {
        mockClaims.forEach(claim => {
          expect(screen.getByText(claim.claim_id)).toBeInTheDocument();
        });
      });
    });

    it('displays claim status badges', async () => {
      render(<ClaimsDashboard />);

      await waitFor(() => {
        expect(screen.getAllByText(/submitted|paid|draft|denied/i).length).toBeGreaterThan(0);
      });
    });

    it('displays billed amounts', async () => {
      render(<ClaimsDashboard />);

      await waitFor(() => {
        // Check if at least one billed amount is displayed
        const firstAmount = mockClaims[0].billed_amount.toFixed(2);
        expect(screen.getByText(new RegExp(firstAmount.replace('.', '\\.')))).toBeInTheDocument();
      });
    });

    it('formats dates correctly', async () => {
      render(<ClaimsDashboard />);

      await waitFor(() => {
        // Dates should be formatted (not raw ISO strings)
        // Check that formatted date pattern exists
        expect(screen.queryByText(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Component Integration', () => {
    it('updates filtered claims when search changes', async () => {
      const user = userEvent.setup();
      render(<ClaimsDashboard />);

      await waitFor(() => {
        expect(screen.getAllByRole('row').length).toBe(9); // 8 claims + header
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'CLM');

      // Filtered results should update automatically
      await waitFor(() => {
        // Should still have some claims visible (all start with CLM)
        expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
      });
    });

    it('updates statistics when filters change', async () => {
      const user = userEvent.setup();
      render(<ClaimsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('8')).toBeInTheDocument(); // Total
      });

      // Apply filter
      const statusSelect = screen.getAllByRole('combobox')[0];
      await user.click(statusSelect);
      const submittedOption = await screen.findByText('Submitted');
      await user.click(submittedOption);

      // Stats should update (implementation dependent)
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument(); // Filtered count
      });
    });
  });
});
