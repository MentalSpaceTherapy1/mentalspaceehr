# CRITICAL ISSUES ACTION PLAN
## MentalSpace EHR - Priority Remediation Roadmap
### Created: October 11, 2025
### Owner: Development Team + Lovable

---

## EXECUTIVE SUMMARY

This action plan addresses the **three critical issues** identified in the Code Quality Assessment that prevent the application from achieving an A+ enterprise rating.

**Critical Issues:**
1. 🚨 **Testing Coverage** (Score: 60/100) - Most Critical
2. ⚠️ **Type Safety Violations** - High Priority
3. ⚠️ **Error Handling Inconsistency** - High Priority

**Timeline:** 4 weeks to resolve all critical issues
**Expected Outcome:** Improve overall code quality score from A- (90) to A+ (95+)

---

## ISSUE #1: TESTING COVERAGE 🚨
### Severity: CRITICAL | Priority: P0 | Timeline: 2 weeks

### Current State
- **Test Coverage:** ~10% (smoke tests only)
- **Unit Tests:** 0
- **Integration Tests:** 0
- **E2E Tests:** Minimal smoke tests
- **Risk:** High probability of regressions, bugs in production

### Target State
- **Test Coverage:** 80%+ by end of Week 4
- **Unit Tests:** All critical components covered
- **Integration Tests:** All API flows covered
- **E2E Tests:** Critical user journeys covered

---

## TESTING FRAMEWORK IMPLEMENTATION PLAN

### Week 1: Foundation (Days 1-7)

#### Day 1-2: Setup Testing Infrastructure

**Task 1.1: Install Testing Dependencies**
```bash
# Install Vitest (fast, Vite-native test runner)
npm install --save-dev vitest @vitest/ui

# Install React Testing Library
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Install MSW for API mocking
npm install --save-dev msw

# Install test utilities
npm install --save-dev @faker-js/faker
```

**Task 1.2: Configure Vitest**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/*',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Task 1.3: Create Test Setup File**

Create `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

**Task 1.4: Add Test Scripts to package.json**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:run": "vitest run"
  }
}
```

**Deliverables:**
- ✅ Testing framework installed
- ✅ Vitest configured
- ✅ Test setup file created
- ✅ NPM scripts added

---

#### Day 3-4: Create Test Utilities and Mocks

**Task 1.5: Create Testing Utilities**

Create `src/test/utils.tsx`:
```typescript
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Create a custom render function that includes providers
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

**Task 1.6: Create Mock Data Factory**

Create `src/test/factories/claimFactory.ts`:
```typescript
import { faker } from '@faker-js/faker';

export const createMockClaim = (overrides = {}) => ({
  id: faker.string.uuid(),
  claim_id: `CLM-${faker.number.int({ min: 1000, max: 9999 })}`,
  claim_control_number: faker.string.alphanumeric(20),
  payer_claim_control_number: null,
  claim_type: 'Professional',
  claim_status: 'submitted',
  client_id: faker.string.uuid(),
  billed_amount: faker.number.float({ min: 100, max: 500, precision: 0.01 }),
  allowed_amount: null,
  paid_amount: null,
  patient_responsibility: null,
  statement_from_date: faker.date.past().toISOString(),
  statement_to_date: faker.date.recent().toISOString(),
  submission_date: faker.date.recent().toISOString(),
  accepted_date: null,
  paid_date: null,
  denial_code: null,
  denial_reason: null,
  created_at: faker.date.past().toISOString(),
  ...overrides,
});

export const createMockClaimList = (count: number = 5) =>
  Array.from({ length: count }, () => createMockClaim());
```

**Task 1.7: Create Supabase Mock Helpers**

Create `src/test/mocks/supabaseMock.ts`:
```typescript
import { vi } from 'vitest';

export const createSupabaseMock = () => {
  const selectMock = vi.fn().mockReturnThis();
  const insertMock = vi.fn().mockReturnThis();
  const updateMock = vi.fn().mockReturnThis();
  const deleteMock = vi.fn().mockReturnThis();
  const eqMock = vi.fn().mockReturnThis();
  const singleMock = vi.fn();
  const fromMock = vi.fn(() => ({
    select: selectMock,
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
    eq: eqMock,
    single: singleMock,
  }));

  return {
    from: fromMock,
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    mocks: {
      select: selectMock,
      insert: insertMock,
      update: updateMock,
      delete: deleteMock,
      eq: eqMock,
      single: singleMock,
      from: fromMock,
    },
  };
};
```

**Deliverables:**
- ✅ Test utilities created
- ✅ Mock data factories created
- ✅ Supabase mock helpers created

---

#### Day 5-7: Write Priority Unit Tests

**Task 1.8: Test Billing Components (Priority #1)**

Create `src/components/billing/__tests__/ClaimsDashboard.test.tsx`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClaimsDashboard } from '../ClaimsDashboard';
import { render } from '@/test/utils';
import { createMockClaimList } from '@/test/factories/claimFactory';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

describe('ClaimsDashboard', () => {
  const mockClaims = createMockClaimList(10);

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful data fetch
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockClaims,
        error: null,
      }),
    });
  });

  it('renders loading state initially', () => {
    render(<ClaimsDashboard />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('fetches and displays claims', async () => {
    render(<ClaimsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(mockClaims[0].claim_id)).toBeInTheDocument();
    });

    expect(supabase.from).toHaveBeenCalledWith('advancedmd_claims');
  });

  it('displays claim statistics', async () => {
    render(<ClaimsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/total claims/i)).toBeInTheDocument();
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
      expect(screen.getByText(mockClaims[0].claim_id)).toBeInTheDocument();
      expect(screen.queryByText(mockClaims[1].claim_id)).not.toBeInTheDocument();
    });
  });

  it('filters claims by status', async () => {
    const user = userEvent.setup();
    render(<ClaimsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(mockClaims[0].claim_id)).toBeInTheDocument();
    });

    const statusFilter = screen.getByRole('combobox', { name: /filter by status/i });
    await user.click(statusFilter);
    await user.click(screen.getByRole('option', { name: /submitted/i }));

    // Verify filtered results
    await waitFor(() => {
      const submittedClaims = mockClaims.filter(c => c.claim_status === 'submitted');
      expect(screen.getAllByRole('row')).toHaveLength(submittedClaims.length + 1); // +1 for header
    });
  });

  it('handles error state', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    });

    render(<ClaimsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/error loading claims/i)).toBeInTheDocument();
    });
  });

  it('refreshes data when refresh button is clicked', async () => {
    const user = userEvent.setup();
    render(<ClaimsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(mockClaims[0].claim_id)).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    expect(supabase.from).toHaveBeenCalledTimes(2);
  });
});
```

**Task 1.9: Test Eligibility Components**

Create `src/components/billing/__tests__/RealTimeEligibilityCheck.test.tsx`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RealTimeEligibilityCheck } from '../RealTimeEligibilityCheck';
import { render } from '@/test/utils';
import * as eligibilityApi from '@/lib/eligibility/eligibilityVerification';

vi.mock('@/lib/eligibility/eligibilityVerification');
vi.mock('@/integrations/supabase/client');

describe('RealTimeEligibilityCheck', () => {
  const mockPatients = [
    { id: '1', first_name: 'John', last_name: 'Doe' },
    { id: '2', first_name: 'Jane', last_name: 'Smith' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form correctly', () => {
    render(<RealTimeEligibilityCheck />);

    expect(screen.getByLabelText(/patient/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/service type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check eligibility/i })).toBeInTheDocument();
  });

  it('submits eligibility check successfully', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      requestId: '123',
      requestNumber: 'EV-123',
      isEligible: true,
      eligibilityStatus: 'Active',
      payerName: 'Blue Cross',
      subscriberId: 'SUB123',
    };

    vi.mocked(eligibilityApi.submitEligibilityRequest).mockResolvedValue(mockResponse);

    render(<RealTimeEligibilityCheck />);

    // Select patient
    const patientSelect = screen.getByRole('combobox', { name: /patient/i });
    await user.click(patientSelect);
    await user.click(screen.getByText('Doe, John'));

    // Submit form
    const submitButton = screen.getByRole('button', { name: /check eligibility/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/eligibility results/i)).toBeInTheDocument();
      expect(screen.getByText(/active/i)).toBeInTheDocument();
    });
  });

  it('displays error when eligibility check fails', async () => {
    const user = userEvent.setup();

    vi.mocked(eligibilityApi.submitEligibilityRequest).mockRejectedValue(
      new Error('API Error')
    );

    render(<RealTimeEligibilityCheck />);

    const patientSelect = screen.getByRole('combobox', { name: /patient/i });
    await user.click(patientSelect);
    await user.click(screen.getByText('Doe, John'));

    const submitButton = screen.getByRole('button', { name: /check eligibility/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/api error/i)).toBeInTheDocument();
    });
  });
});
```

**Task 1.10: Test Utility Functions**

Create `src/lib/eligibility/__tests__/eligibilityVerification.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  submitEligibilityRequest,
  getLatestEligibility,
  needsEligibilityRefresh,
} from '../eligibilityVerification';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

describe('eligibilityVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitEligibilityRequest', () => {
    it('creates a new eligibility request', async () => {
      const mockRequest = {
        patientId: '123',
        serviceType: 'Mental Health',
        verificationType: 'real_time' as const,
      };

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'req-123', request_number: 'EV-123' },
          error: null,
        }),
      });

      const result = await submitEligibilityRequest(mockRequest);

      expect(result.requestNumber).toContain('EV-');
      expect(supabase.from).toHaveBeenCalledWith('advancedmd_eligibility_requests');
    });

    it('handles database errors', async () => {
      const mockRequest = {
        patientId: '123',
        serviceType: 'Mental Health',
        verificationType: 'real_time' as const,
      };

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      await expect(submitEligibilityRequest(mockRequest)).rejects.toThrow();
    });
  });

  describe('needsEligibilityRefresh', () => {
    it('returns true when no verification exists', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await needsEligibilityRefresh('patient-123');

      expect(result).toBe(true);
    });

    it('returns false when recent verification exists', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: false,
        error: null,
      });

      const result = await needsEligibilityRefresh('patient-123');

      expect(result).toBe(false);
    });
  });
});
```

**Target Coverage by Day 7:**
- Billing components: 60%
- Eligibility utilities: 80%
- Overall: 30%

**Deliverables:**
- ✅ 10+ unit tests written
- ✅ Critical billing paths tested
- ✅ 30% code coverage achieved

---

### Week 2: Expansion (Days 8-14)

#### Day 8-10: Integration Tests

**Task 1.11: Create Integration Test Suite**

Create `src/test/integration/billingWorkflow.test.tsx`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { ClaimCreationForm } from '@/components/billing/ClaimCreationForm';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.post('/api/claims', (req, res, ctx) => {
    return res(ctx.json({ id: 'claim-123', status: 'submitted' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Billing Workflow Integration', () => {
  it('completes full claim submission workflow', async () => {
    const user = userEvent.setup();

    render(<ClaimCreationForm />);

    // Fill out form
    await user.type(screen.getByLabelText(/patient/i), 'John Doe');
    await user.type(screen.getByLabelText(/service date/i), '2025-01-15');
    await user.type(screen.getByLabelText(/cpt code/i), '90834');

    // Submit
    await user.click(screen.getByRole('button', { name: /submit claim/i }));

    // Verify success
    await waitFor(() => {
      expect(screen.getByText(/claim submitted successfully/i)).toBeInTheDocument();
    });
  });
});
```

**Task 1.12: Test Authentication Flow**

Create `src/test/integration/authFlow.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import App from '@/App';

describe('Authentication Flow', () => {
  it('redirects unauthenticated users to login', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  it('allows authenticated users to access dashboard', async () => {
    const user = userEvent.setup();

    // Mock authenticated state
    // ... implementation

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });
});
```

**Target Coverage by Day 10:**
- Integration tests: 50% of critical flows
- Overall: 45%

---

#### Day 11-14: E2E Tests and Coverage Goals

**Task 1.13: Install Playwright for E2E**
```bash
npm install --save-dev @playwright/test
npx playwright install
```

**Task 1.14: Create E2E Test Suite**

Create `tests/e2e/billing.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Billing Module E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create a new claim', async ({ page }) => {
    await page.goto('/billing/claims/new');

    // Fill out claim form
    await page.selectOption('[name="patient"]', { label: 'John Doe' });
    await page.fill('[name="serviceDate"]', '2025-01-15');
    await page.fill('[name="cptCode"]', '90834');
    await page.fill('[name="billedAmount"]', '150.00');

    await page.click('button[type="submit"]');

    // Verify success
    await expect(page.locator('.toast')).toContainText('Claim created successfully');
  });

  test('should verify eligibility in real-time', async ({ page }) => {
    await page.goto('/billing/eligibility');

    await page.selectOption('[name="patient"]', { label: 'Jane Smith' });
    await page.click('button:has-text("Check Eligibility")');

    // Wait for results
    await expect(page.locator('.eligibility-results')).toBeVisible();
    await expect(page.locator('.eligibility-status')).toContainText(/active|eligible/i);
  });
});
```

**Task 1.15: Reach Coverage Goals**
- Write additional unit tests for uncovered components
- Add tests for error scenarios
- Test edge cases

**Target Coverage by Day 14:**
- Unit tests: 80%
- Integration tests: 70%
- E2E tests: Critical flows covered
- Overall: 80%

**Deliverables:**
- ✅ E2E test suite created
- ✅ 80% code coverage achieved
- ✅ All critical paths tested

---

### Week 1-2 Summary Metrics

| Metric | Day 0 | Day 7 | Day 14 | Target |
|--------|-------|-------|--------|--------|
| Overall Coverage | 10% | 30% | 80% | 80% |
| Unit Tests | 0 | 50+ | 200+ | 200+ |
| Integration Tests | 0 | 0 | 20+ | 20+ |
| E2E Tests | 2 | 2 | 10+ | 10+ |
| Test Files | 2 | 15+ | 40+ | 40+ |

---

## ISSUE #2: TYPE SAFETY VIOLATIONS ⚠️
### Severity: HIGH | Priority: P1 | Timeline: 1 week

### Current State
- Multiple `as any` type assertions found
- Type assertions bypass TypeScript's type checking
- Reduces code safety and IntelliSense support
- Risk of runtime errors

### Type Safety Remediation Plan

#### Week 3: Type Safety Sprint (Days 15-21)

**Task 2.1: Audit Type Assertions (Day 15)**
```bash
# Find all type assertions
grep -r "as any" src/ --include="*.tsx" --include="*.ts"
grep -r "as unknown" src/ --include="*.tsx" --include="*.ts"
grep -r "@ts-ignore" src/ --include="*.tsx" --include="*.ts"
grep -r "@ts-expect-error" src/ --include="*.tsx" --include="*.ts"
```

Create audit document: `docs/TYPE_ASSERTION_AUDIT.md`

**Task 2.2: Fix Supabase Type Assertions (Days 16-17)**

**Current Code:**
```typescript
const sb = supabase as any;  // ❌ BAD
```

**Fixed Code:**
```typescript
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// Use generated types
const { data, error } = await supabase
  .from('advancedmd_claims')
  .select('*')
  .eq('id', claimId)
  .single();

// Type is automatically inferred as Database['public']['Tables']['advancedmd_claims']['Row']
```

**Files to Fix (Priority Order):**
1. `src/components/billing/ClaimsDashboard.tsx`
2. `src/components/billing/PaymentDashboard.tsx`
3. `src/components/billing/ERAUploadProcessor.tsx`
4. All other billing components
5. Client management components
6. Admin components

**Task 2.3: Generate Missing Types (Day 18)**

For custom API responses and complex data structures:

Create `src/types/billing.ts`:
```typescript
// Instead of using 'any', define proper types
export interface ClaimSubmissionResponse {
  id: string;
  claimNumber: string;
  status: 'success' | 'error';
  message?: string;
  validationErrors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Use these types instead of 'any'
export type ClaimStatus =
  | 'draft'
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'paid'
  | 'denied';
```

**Task 2.4: Fix React Hook Form Types (Day 19)**

**Current Code:**
```typescript
const form = useForm<any>({ ... });  // ❌ BAD
```

**Fixed Code:**
```typescript
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const formSchema = z.object({
  patientId: z.string().min(1),
  serviceDate: z.string(),
  cptCode: z.string().regex(/^\d{5}$/),
  billedAmount: z.coerce.number().positive(),
});

type FormValues = z.infer<typeof formSchema>;

const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    patientId: '',
    serviceDate: '',
    cptCode: '',
    billedAmount: 0,
  },
});
```

**Task 2.5: Add Strict TypeScript Config (Day 20)**

Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Task 2.6: Type Safety Verification (Day 21)**
```bash
# Run type check
npm run type-check

# Should pass with zero errors
# Fix any remaining type errors
```

**Deliverables:**
- ✅ All `as any` assertions removed
- ✅ Proper types defined for all data structures
- ✅ Strict TypeScript config enabled
- ✅ Zero type errors in codebase

---

## ISSUE #3: ERROR HANDLING STANDARDIZATION ⚠️
### Severity: HIGH | Priority: P1 | Timeline: 1 week

### Current State
- Inconsistent error handling patterns
- Some components use alert(), others use toast
- No centralized error logging
- Difficult to debug production issues

### Error Handling Standardization Plan

#### Week 4: Error Handling Sprint (Days 22-28)

**Task 3.1: Create Error Handling Utilities (Day 22)**

Create `src/lib/errors/errorHandler.ts`:
```typescript
import { toast } from 'sonner';

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, context);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'DATABASE_ERROR', 500, context);
    this.name = 'DatabaseError';
  }
}

// Error handler function
export function handleError(error: unknown, fallbackMessage: string = 'An error occurred') {
  console.error('Error:', error);

  if (error instanceof AppError) {
    // Log to error tracking service (e.g., Sentry)
    logErrorToService(error);

    // Show user-friendly message
    toast.error(error.message);

    return error;
  }

  if (error instanceof Error) {
    logErrorToService(new AppError(error.message, 'UNKNOWN_ERROR', 500));
    toast.error(error.message || fallbackMessage);
    return error;
  }

  // Unknown error type
  const appError = new AppError(fallbackMessage, 'UNKNOWN_ERROR', 500);
  logErrorToService(appError);
  toast.error(fallbackMessage);

  return appError;
}

// Error logging service integration
function logErrorToService(error: AppError) {
  // TODO: Integrate with Sentry or similar
  console.error('[Error Service]', {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    context: error.context,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  });
}

// API error handler
export function handleApiError(error: unknown): never {
  if (error && typeof error === 'object' && 'message' in error) {
    throw new DatabaseError(error.message as string, { originalError: error });
  }

  throw new DatabaseError('An unexpected error occurred');
}
```

**Task 3.2: Create Error Boundary Enhancement (Day 23)**

Update `src/components/common/ErrorBoundary.tsx`:
```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { handleError, AppError } from '@/lib/errors/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to service
    handleError(error, 'Application error');

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                We encountered an unexpected error. Our team has been notified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {import.meta.env.DEV && this.state.error && (
                <div className="p-3 bg-muted rounded-md">
                  <code className="text-sm">{this.state.error.message}</code>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={this.handleReset}>
                  Return to Dashboard
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Task 3.3: Create Custom Hooks for Error Handling (Day 24)**

Create `src/hooks/useErrorHandler.ts`:
```typescript
import { useCallback } from 'react';
import { handleError } from '@/lib/errors/errorHandler';

export function useErrorHandler() {
  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    fallbackMessage?: string
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, fallbackMessage);
      return null;
    }
  }, []);

  const wrapAsync = useCallback(<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    fallbackMessage?: string
  ) => {
    return async (...args: Parameters<T>): Promise<ReturnType<T> | null> => {
      try {
        return await fn(...args);
      } catch (error) {
        handleError(error, fallbackMessage);
        return null;
      }
    };
  }, []);

  return {
    handleAsyncError,
    wrapAsync,
  };
}
```

**Task 3.4: Update Components with Standardized Error Handling (Days 25-27)**

**Before:**
```typescript
try {
  await submitClaim(data);
  alert('Claim submitted successfully');
} catch (err) {
  alert('Failed to submit claim');
}
```

**After:**
```typescript
import { handleError } from '@/lib/errors/errorHandler';
import { toast } from 'sonner';

try {
  await submitClaim(data);
  toast.success('Claim submitted successfully');
} catch (error) {
  handleError(error, 'Failed to submit claim');
}
```

**Components to Update (Priority Order):**
1. All billing components (28 files)
2. Client management components (20 files)
3. Admin components (30+ files)
4. Auth components
5. All remaining components

**Task 3.5: Install Error Tracking Service (Day 28)**

```bash
npm install @sentry/react @sentry/tracing
```

Create `src/lib/errors/sentry.ts`:
```typescript
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export function initializeSentry() {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [new BrowserTracing()],
      tracesSampleRate: 0.1,
      environment: import.meta.env.MODE,
      beforeSend(event) {
        // Filter sensitive data
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers;
        }
        return event;
      },
    });
  }
}

export function captureException(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: context,
  });
}
```

Update `src/main.tsx`:
```typescript
import { initializeSentry } from '@/lib/errors/sentry';

initializeSentry();

// ... rest of app initialization
```

**Deliverables:**
- ✅ Error handling utilities created
- ✅ Error boundary enhanced
- ✅ All components updated with consistent error handling
- ✅ Error tracking service integrated
- ✅ Zero instances of `alert()` for error messages

---

## IMPLEMENTATION TIMELINE

```
Week 1: Testing Foundation
├─ Day 1-2: Setup testing infrastructure
├─ Day 3-4: Create test utilities and mocks
└─ Day 5-7: Write priority unit tests (30% coverage)

Week 2: Testing Expansion
├─ Day 8-10: Integration tests
├─ Day 11-12: E2E tests
└─ Day 13-14: Reach 80% coverage goal

Week 3: Type Safety
├─ Day 15: Audit type assertions
├─ Day 16-17: Fix Supabase type assertions
├─ Day 18: Generate missing types
├─ Day 19: Fix React Hook Form types
├─ Day 20: Enable strict TypeScript
└─ Day 21: Type safety verification

Week 4: Error Handling
├─ Day 22: Create error handling utilities
├─ Day 23: Enhance error boundary
├─ Day 24: Create error handling hooks
├─ Day 25-27: Update all components
└─ Day 28: Install error tracking service
```

---

## SUCCESS METRICS

### Week 2 Goals
- [x] Testing framework installed and configured
- [x] Test utilities and mocks created
- [x] 80% code coverage achieved
- [x] 200+ unit tests written
- [x] 20+ integration tests written
- [x] 10+ E2E tests written
- [x] All critical paths tested

### Week 3 Goals
- [x] All `as any` assertions removed
- [x] Proper types defined for all structures
- [x] Strict TypeScript enabled
- [x] Zero type errors
- [x] IntelliSense working for all code

### Week 4 Goals
- [x] Error handling utilities created
- [x] All components use consistent error handling
- [x] Error tracking service integrated
- [x] Zero `alert()` calls for errors
- [x] Comprehensive error logging

### Final Outcome
- **Code Quality Score:** A+ (95+/100)
- **Testing Coverage:** 80%+
- **Type Safety:** 100%
- **Error Handling:** Standardized across application
- **Production Readiness:** High

---

## RESPONSIBILITIES

### Development Team
- Execute daily tasks according to timeline
- Write tests for all new features
- Review and approve all PRs
- Maintain code quality standards

### Lovable (Project Manager)
- Ensure tasks are implemented in Supabase and frontend
- Track progress against timeline
- Escalate blockers
- Review deliverables at each checkpoint
- Coordinate with development team

### You (Project Owner)
- Review weekly progress reports
- Approve major changes
- Provide feedback on user-facing changes
- Final approval of completed work

---

## RISK MITIGATION

### Risk 1: Timeline Slippage
**Mitigation:**
- Daily standup to track progress
- Pair programming for complex tasks
- Reduce scope if needed (prioritize P0 tasks)

### Risk 2: Breaking Changes
**Mitigation:**
- Comprehensive testing before deployment
- Feature flags for gradual rollout
- Quick rollback plan

### Risk 3: Resource Constraints
**Mitigation:**
- Focus on highest priority items first
- Extend timeline if needed
- Get additional resources if available

---

## NEXT STEPS

### Immediate Actions (Today)

1. **Tell Lovable to:**
   ```
   Please begin implementing the Critical Issues Action Plan:

   Week 1 Priority: Testing Framework Setup

   Day 1-2 Tasks:
   1. Install testing dependencies:
      - npm install --save-dev vitest @vitest/ui
      - npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
      - npm install --save-dev msw @faker-js/faker

   2. Create vitest.config.ts with the configuration from the action plan

   3. Create src/test/setup.ts with mock setup

   4. Add test scripts to package.json:
      - "test": "vitest"
      - "test:ui": "vitest --ui"
      - "test:coverage": "vitest --coverage"
      - "test:run": "vitest run"

   5. Verify setup by running: npm test

   Once complete, we'll move to Day 3-4 tasks (test utilities and mocks).
   ```

2. **Review the full action plan**
   - Document is at `docs/CRITICAL_ISSUES_ACTION_PLAN.md`
   - Review timeline and adjust if needed

3. **Schedule checkpoints**
   - End of Week 1 review
   - End of Week 2 review
   - End of Week 3 review
   - Final review at end of Week 4

---

**Action Plan Created:** October 11, 2025
**Timeline:** 4 weeks (28 days)
**Expected Completion:** November 8, 2025
**Owner:** Development Team + Lovable
