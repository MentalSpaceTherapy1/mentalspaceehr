import { faker } from '@faker-js/faker';

export const createMockClaim = (overrides: Record<string, any> = {}) => ({
  id: faker.string.uuid(),
  claim_id: `CLM-${faker.number.int({ min: 1000, max: 9999 })}`,
  claim_control_number: faker.string.alphanumeric(20),
  payer_claim_control_number: null,
  claim_type: 'Professional',
  claim_status: faker.helpers.arrayElement(['draft', 'submitted', 'accepted', 'rejected', 'paid', 'denied']),
  client_id: faker.string.uuid(),
  billed_amount: faker.number.float({ min: 100, max: 500, fractionDigits: 2 }),
  allowed_amount: faker.number.float({ min: 80, max: 450, fractionDigits: 2 }),
  paid_amount: faker.number.float({ min: 70, max: 400, fractionDigits: 2 }),
  patient_responsibility: faker.number.float({ min: 10, max: 50, fractionDigits: 2 }),
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
