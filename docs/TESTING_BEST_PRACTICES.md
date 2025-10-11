# Testing Best Practices Guide

## Overview

This guide establishes testing standards for the MentalSpace EHR application. Follow these patterns to maintain consistent, comprehensive test coverage across the codebase.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Test Structure](#test-structure)
- [Testing Patterns](#testing-patterns)
- [Mocking Strategies](#mocking-strategies)
- [Coverage Requirements](#coverage-requirements)
- [Running Tests](#running-tests)

---

## Testing Philosophy

### Core Principles

1. **Test Behavior, Not Implementation** - Focus on what the component does, not how it does it
2. **User-Centric Testing** - Test from the user's perspective using accessible queries
3. **Comprehensive Coverage** - Aim for 80%+ coverage across all code types
4. **Fast and Reliable** - Tests should run quickly and produce consistent results
5. **Isolated Tests** - Each test should be independent and not rely on others

### Testing Pyramid

```
      /\
     /  \      E2E Tests (10%)
    /____\     - Full user workflows
   /      \    - Critical paths only
  /________\
 /          \  Integration Tests (20%)
/____________\ - API interactions
              - Multi-component flows

              Unit Tests (70%)
              - Components
              - Utilities
              - Business logic
```

---

## Test Structure

### File Organization

```
src/
├── components/
│   ├── billing/
│   │   ├── ClaimsDashboard.tsx
│   │   └── __tests__/
│   │       └── ClaimsDashboard.test.tsx
│   └── ...
├── lib/
│   ├── eligibility/
│   │   ├── eligibilityVerification.ts
│   │   └── __tests__/
│   │       └── eligibilityVerification.test.ts
│   └── ...
└── test/
    ├── setup.ts              # Global test configuration
    ├── utils.tsx             # Custom render with providers
    ├── factories/            # Mock data factories
    │   └── claimFactory.ts
    └── mocks/                # Reusable mocks
        └── supabaseMock.ts
```

### Test File Structure

```typescript
/**
 * @vitest-environment jsdom  // For React component tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/utils';
import { ComponentUnderTest } from '../ComponentUnderTest';

// Mock external dependencies
vi.mock('@/integrations/supabase/client');

describe('ComponentName', () => {
  // Setup and teardown
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Group related tests
  describe('Feature Group 1', () => {
    it('describes expected behavior', async () => {
      // Arrange - Set up test data and mocks
      const mockData = { /* ... */ };

      // Act - Render component and interact
      render(<ComponentUnderTest />);

      // Assert - Verify expected outcomes
      expect(screen.getByText('Expected')).toBeInTheDocument();
    });
  });
});
```

### Descriptive Test Naming

```typescript
// ❌ Bad - Vague
it('works correctly', () => {});
it('test function', () => {});

// ✅ Good - Descriptive
it('displays error message when API call fails', () => {});
it('filters claims by search query when user types in search box', () => {});
it('submits form with correct data when all required fields are filled', () => {});
```

---

## Testing Patterns

### Pattern 1: Component with Data Fetching

**Example**: ClaimsDashboard.test.tsx

```typescript
describe('ClaimsDashboard', () => {
  const mockClaims = createMockClaimList(5);

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Supabase query chain
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: mockClaims,
        error: null,
      }),
    } as any);
  });

  describe('Data Fetching', () => {
    it('fetches claims from the correct table', async () => {
      render(<ClaimsDashboard />);

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('insurance_claims');
      });
    });

    it('displays fetched claims in the table', async () => {
      render(<ClaimsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(mockClaims[0].claim_id)).toBeInTheDocument();
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
  });
});
```

### Pattern 2: Form Component with User Interaction

**Example**: RealTimeEligibilityCheck.test.tsx

```typescript
describe('RealTimeEligibilityCheck', () => {
  const mockPatients = [
    { id: 'patient-1', first_name: 'John', last_name: 'Doe' },
    { id: 'patient-2', first_name: 'Jane', last_name: 'Smith' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock patient data fetch
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockPatients,
        error: null,
      }),
    } as any);
  });

  describe('Form Validation', () => {
    it('requires patient selection', async () => {
      const user = userEvent.setup();
      render(<RealTimeEligibilityCheck />);

      const submitButton = screen.getByRole('button', { name: /check eligibility/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/patient is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('calls API with correct data when form is submitted', async () => {
      const user = userEvent.setup();
      const mockApiCall = vi.fn().mockResolvedValue({ /* ... */ });
      vi.mocked(eligibilityApi.submitEligibilityRequest).mockImplementation(mockApiCall);

      render(<RealTimeEligibilityCheck />);

      // Select patient
      const patientSelect = screen.getByRole('combobox', { name: /patient/i });
      await user.click(patientSelect);
      await waitFor(() => screen.findByText('Doe, John'));
      await user.click(screen.getByText('Doe, John'));

      // Submit form
      const submitButton = screen.getByRole('button', { name: /check eligibility/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith(
          expect.objectContaining({
            patientId: 'patient-1',
          })
        );
      });
    });
  });
});
```

### Pattern 3: Utility Functions

**Example**: eligibilityVerification.test.ts

```typescript
describe('eligibilityVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitEligibilityRequest', () => {
    const mockRequest: EligibilityRequest = {
      patientId: 'patient-123',
      insuranceId: 'insurance-456',
      serviceType: 'Mental Health',
      verificationType: 'real_time',
    };

    beforeEach(() => {
      // Mock database operations
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'advancedmd_eligibility_requests') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'req-123', /* ... */ },
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
    });

    it('creates eligibility request in database', async () => {
      const result = await submitEligibilityRequest(mockRequest);

      expect(supabase.from).toHaveBeenCalledWith('advancedmd_eligibility_requests');
      expect(result.requestId).toBe('req-123');
    });

    it('throws error when database insert fails', async () => {
      const dbError = new Error('Database connection failed');

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: dbError,
          }),
        }),
      } as any);

      await expect(submitEligibilityRequest(mockRequest)).rejects.toThrow(dbError);
    });
  });
});
```

---

## Mocking Strategies

### Supabase Client Mocking

**Global Setup** (src/test/setup.ts):
```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        download: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
  },
}));
```

**Per-Test Mocking**:
```typescript
beforeEach(() => {
  vi.clearAllMocks();

  // Mock specific query chain
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: mockData,
      error: null,
    }),
  } as any);
});
```

### API Mocking

```typescript
import * as eligibilityApi from '@/lib/eligibility/eligibilityVerification';

vi.mock('@/lib/eligibility/eligibilityVerification');

beforeEach(() => {
  vi.mocked(eligibilityApi.submitEligibilityRequest).mockResolvedValue({
    requestId: 'req-123',
    isEligible: true,
    // ... mock response
  });
});
```

### Factory Pattern for Mock Data

**Create Factory** (src/test/factories/claimFactory.ts):
```typescript
import { faker } from '@faker-js/faker';

export const createMockClaim = (overrides: Record<string, any> = {}) => ({
  id: faker.string.uuid(),
  claim_id: `CLM-${faker.number.int({ min: 1000, max: 9999 })}`,
  claim_status: faker.helpers.arrayElement(['draft', 'submitted', 'paid', 'denied']),
  billed_amount: faker.number.float({ min: 100, max: 500, fractionDigits: 2 }),
  created_at: faker.date.past().toISOString(),
  ...overrides,
});

export const createMockClaimList = (count: number = 5) =>
  Array.from({ length: count }, () => createMockClaim());
```

**Use in Tests**:
```typescript
const mockClaims = createMockClaimList(10);
const paidClaim = createMockClaim({ claim_status: 'paid', paid_amount: 450 });
```

---

## Coverage Requirements

### Coverage Thresholds

Configured in `vitest.config.ts`:
```typescript
coverage: {
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80,
  },
}
```

### What to Cover

**Priority 1 - Critical Paths** (Must be 90%+):
- Authentication and authorization
- Billing and payment processing
- Claims submission
- Eligibility verification
- Data persistence operations
- Error handling in critical workflows

**Priority 2 - Core Features** (Must be 80%+):
- Dashboard components
- Form components with validation
- API utilities
- Business logic functions
- State management

**Priority 3 - Supporting Features** (Must be 70%+):
- UI components
- Formatting utilities
- Helper functions

**Acceptable Exclusions**:
- Configuration files
- Type definitions
- Mock data
- Third-party library wrappers (if thin)

---

## Running Tests

### Commands

```bash
# Run all tests in watch mode
npm run test

# Run all tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run specific test file
npm run test src/components/billing/__tests__/ClaimsDashboard.test.tsx

# Run tests matching a pattern
npm run test -- --grep="ClaimsDashboard"
```

### Coverage Reports

After running `npm run test:coverage`, view the report:
- **Terminal**: Displayed automatically
- **HTML**: Open `coverage/index.html` in browser
- **JSON**: Available at `coverage/coverage-final.json`

### Pre-Deployment Checklist

Before deploying to production:
```bash
# 1. Run type checking
npm run type-check

# 2. Run linting
npm run lint

# 3. Run all tests
npm run test:run

# 4. Check coverage meets thresholds
npm run test:coverage

# 5. Run security audit
npm audit
```

---

## Common Testing Patterns

### Testing Async Operations

```typescript
it('handles async data loading', async () => {
  render(<Component />);

  // Wait for loading to finish
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  // Assert on loaded data
  expect(screen.getByText('Expected Data')).toBeInTheDocument();
});
```

### Testing User Events

```typescript
it('handles button click', async () => {
  const user = userEvent.setup();
  const handleClick = vi.fn();

  render(<Button onClick={handleClick}>Click me</Button>);

  await user.click(screen.getByRole('button', { name: /click me/i }));

  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### Testing Form Input

```typescript
it('updates input value when user types', async () => {
  const user = userEvent.setup();

  render(<Form />);

  const input = screen.getByLabelText(/name/i);
  await user.type(input, 'John Doe');

  expect(input).toHaveValue('John Doe');
});
```

### Testing Error States

```typescript
it('displays error message when validation fails', async () => {
  const user = userEvent.setup();

  render(<Form />);

  // Submit without filling required fields
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(screen.getByText(/required/i)).toBeInTheDocument();
});
```

### Testing Loading States

```typescript
it('shows loading spinner during data fetch', () => {
  // Mock slow API call
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockReturnValue(
      new Promise(() => {}) // Never resolves
    ),
  } as any);

  render(<Component />);

  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});
```

---

## Accessibility Testing

Always use accessible queries in this priority order:

1. **getByRole** - Preferred for most elements
   ```typescript
   screen.getByRole('button', { name: /submit/i })
   screen.getByRole('textbox', { name: /email/i })
   screen.getByRole('heading', { level: 1 })
   ```

2. **getByLabelText** - For form inputs
   ```typescript
   screen.getByLabelText(/patient name/i)
   ```

3. **getByPlaceholderText** - When label isn't visible
   ```typescript
   screen.getByPlaceholderText(/search/i)
   ```

4. **getByText** - For non-interactive text
   ```typescript
   screen.getByText(/welcome/i)
   ```

5. **getByTestId** - Last resort only
   ```typescript
   screen.getByTestId('custom-component')
   ```

❌ **Avoid**:
- `getByClassName`
- `querySelector`

---

## Debugging Tests

### Useful Debugging Tools

```typescript
import { screen, prettyDOM } from '@testing-library/react';

// Print entire DOM
screen.debug();

// Print specific element
screen.debug(screen.getByRole('button'));

// Get all queries that would match
screen.logTestingPlaygroundURL();

// Get available roles
console.log(prettyDOM(screen.getByRole('button').parentElement));
```

### Common Issues

**Issue**: "Unable to find element"
```typescript
// Solution: Use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText('Expected')).toBeInTheDocument();
});
```

**Issue**: "Not wrapped in act(...)"
```typescript
// Solution: Use waitFor or proper async handling
await waitFor(() => {
  expect(/* assertion */).toBeTrue();
});
```

**Issue**: "Multiple elements found"
```typescript
// Solution: Use getAllByX or add more specific query
const buttons = screen.getAllByRole('button');
expect(buttons[0]).toHaveTextContent('Submit');
```

---

## Continuous Improvement

### Code Review Checklist

When reviewing tests, verify:
- [ ] Tests follow the established patterns
- [ ] Test names are descriptive
- [ ] All critical paths are covered
- [ ] Mocks are properly set up and cleaned up
- [ ] Assertions are meaningful
- [ ] No test interdependencies
- [ ] Async operations use waitFor
- [ ] Accessible queries are used
- [ ] Tests are fast and reliable

### Metrics to Track

- Overall coverage percentage
- Coverage by category (components, utilities, etc.)
- Number of flaky tests
- Test execution time
- Test-to-code ratio

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
- [User Event API](https://testing-library.com/docs/user-event/intro)

---

**Last Updated**: 2025-10-11
**Version**: 1.0
**Owner**: Development Team
