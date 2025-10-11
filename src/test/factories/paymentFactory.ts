import { faker } from '@faker-js/faker';

export const createMockPaymentPosting = (overrides: Record<string, any> = {}) => ({
  id: faker.string.uuid(),
  era_file_id: faker.string.uuid(),
  claim_id: faker.string.uuid(),
  payment_date: faker.date.recent().toISOString().split('T')[0],
  payment_amount: faker.number.float({ min: 50, max: 500, fractionDigits: 2 }),
  payment_method: faker.helpers.arrayElement(['Check', 'ACH', 'Credit Card', 'Wire Transfer']),
  check_eft_number: faker.string.alphanumeric(10),
  posting_type: faker.helpers.arrayElement(['Insurance Payment', 'Patient Payment', 'Adjustment', 'Refund']),
  posting_status: faker.helpers.arrayElement(['Posted', 'Pending', 'Reversed', 'Error']),
  contractual_adjustment: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
  deductible: faker.number.float({ min: 0, max: 50, fractionDigits: 2 }),
  copay: faker.number.float({ min: 0, max: 30, fractionDigits: 2 }),
  patient_responsibility: faker.number.float({ min: 0, max: 80, fractionDigits: 2 }),
  adjustment_reason: faker.lorem.sentence(),
  created_at: faker.date.past().toISOString(),
  posted_by: faker.string.uuid(),
  ...overrides,
});

export const createMockPaymentList = (count: number = 5) =>
  Array.from({ length: count }, () => createMockPaymentPosting());
