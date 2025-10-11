import { vi } from 'vitest';

export const createSupabaseMock = () => {
  const selectMock = vi.fn().mockReturnThis();
  const insertMock = vi.fn().mockReturnThis();
  const updateMock = vi.fn().mockReturnThis();
  const deleteMock = vi.fn().mockReturnThis();
  const upsertMock = vi.fn().mockReturnThis();
  const eqMock = vi.fn().mockReturnThis();
  const neqMock = vi.fn().mockReturnThis();
  const gtMock = vi.fn().mockReturnThis();
  const gteMock = vi.fn().mockReturnThis();
  const ltMock = vi.fn().mockReturnThis();
  const lteMock = vi.fn().mockReturnThis();
  const likeMock = vi.fn().mockReturnThis();
  const ilikeMock = vi.fn().mockReturnThis();
  const isMock = vi.fn().mockReturnThis();
  const inMock = vi.fn().mockReturnThis();
  const orderMock = vi.fn().mockReturnThis();
  const limitMock = vi.fn().mockReturnThis();
  const singleMock = vi.fn();
  const maybeSingleMock = vi.fn();

  const fromMock = vi.fn(() => ({
    select: selectMock,
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
    upsert: upsertMock,
    eq: eqMock,
    neq: neqMock,
    gt: gtMock,
    gte: gteMock,
    lt: ltMock,
    lte: lteMock,
    like: likeMock,
    ilike: ilikeMock,
    is: isMock,
    in: inMock,
    order: orderMock,
    limit: limitMock,
    single: singleMock,
    maybeSingle: maybeSingleMock,
  }));

  return {
    from: fromMock,
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
        remove: vi.fn(),
        list: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
    mocks: {
      select: selectMock,
      insert: insertMock,
      update: updateMock,
      delete: deleteMock,
      upsert: upsertMock,
      eq: eqMock,
      neq: neqMock,
      gt: gtMock,
      gte: gteMock,
      lt: ltMock,
      lte: lteMock,
      like: likeMock,
      ilike: ilikeMock,
      is: isMock,
      in: inMock,
      order: orderMock,
      limit: limitMock,
      single: singleMock,
      maybeSingle: maybeSingleMock,
      from: fromMock,
    },
  };
};

export type MockedSupabase = ReturnType<typeof createSupabaseMock>;
