// LEGACY SUPABASE CLIENT - NOW USING AWS COGNITO + LAMBDA + AURORA
// This is a comprehensive mock to prevent crashes. Returns empty data for all operations.
// Migrate all data operations to AWS API client: @/lib/aws-api-client
import type { Database } from './types';

console.warn('⚠️  Supabase client is deprecated. Use AWS API from @/lib/aws-api-client');

// Create chainable mock that returns empty data (no errors to prevent crashes)
const createChainableMock = (): any => {
  const mock: any = new Proxy({}, {
    get: (target, prop) => {
      // Terminal methods that return promises
      if (prop === 'then' || prop === 'catch') {
        return (fn: any) => Promise.resolve({ data: [], error: null }).then(fn);
      }
      if (prop === 'single' || prop === 'maybeSingle') {
        return () => Promise.resolve({ data: null, error: null });
      }
      // All other methods return the mock for chaining
      return (...args: any[]) => mock;
    }
  });
  return mock;
};

// Comprehensive mock Supabase client
export const supabase = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    signIn: () => Promise.resolve({ data: null, error: null }),
    signUp: () => Promise.resolve({ data: null, error: null }),
    resetPasswordForEmail: () => Promise.resolve({ data: null, error: null }),
    updateUser: () => Promise.resolve({ data: null, error: null }),
    setSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: (callback?: any) => {
      if (callback) setTimeout(() => callback('SIGNED_OUT', null), 0);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  },
  from: (table: string) => createChainableMock(),
  rpc: (fn: string, params?: any) => Promise.resolve({ data: null, error: null }),
  storage: {
    from: (bucket: string) => ({
      upload: () => Promise.resolve({ data: null, error: null }),
      download: () => Promise.resolve({ data: null, error: null }),
      remove: () => Promise.resolve({ data: null, error: null }),
      list: () => Promise.resolve({ data: [], error: null }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: '' } }),
      createSignedUrl: () => Promise.resolve({ data: null, error: null }),
      createSignedUrls: () => Promise.resolve({ data: [], error: null }),
    }),
  },
  channel: (name: string) => ({
    on: (event: string, filter: any, callback?: any) => {
      const self = { subscribe: () => Promise.resolve('SUBSCRIBED') };
      return self;
    },
    subscribe: () => Promise.resolve('SUBSCRIBED'),
    unsubscribe: () => Promise.resolve('UNSUBSCRIBED'),
  }),
  removeChannel: () => Promise.resolve('OK'),
  removeAllChannels: () => Promise.resolve('OK'),
  getChannels: () => [],
} as any;
