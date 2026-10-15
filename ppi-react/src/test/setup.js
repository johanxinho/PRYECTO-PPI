// @ts-nocheck
import '@testing-library/jest-dom';

// Mock de supabase para pruebas
const mockSupabase = {
  from: () => mockSupabase,
  select: () => mockSupabase,
  eq: () => mockSupabase,
  insert: () => mockSupabase,
  update: () => mockSupabase,
  delete: () => mockSupabase,
  single: () => mockSupabase,
  order: () => mockSupabase,
  limit: () => mockSupabase,
  auth: {
    getUser: () => Promise.resolve({ data: { user: { id: 'test-user', email: 'test@test.com' } } }),
    signUp: () => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: { session: {} }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    updateUser: () => Promise.resolve({ data: { user: {} }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  storage: {
    from: () => mockSupabase,
    upload: () => Promise.resolve({ data: {}, error: null }),
    getPublicUrl: () => Promise.resolve({ publicUrl: 'http://test.com' }),
    createSignedUrl: () => Promise.resolve({ data: { signedUrl: 'http://test.com' } }),
    remove: () => Promise.resolve({ error: null }),
  },
  rpc: () => Promise.resolve({ data: [], error: null }),
  channel: () => ({
    on: () => mockSupabase,
    subscribe: () => mockSupabase,
  }),
  removeChannel: () => {},
  functions: {
    invoke: () => Promise.resolve({ data: {}, error: null }),
  },
};

// Mock de localStorage para demoStore
const mockLocalStorage = {
  data: {},
  getItem: (key) => mockLocalStorage.data[key] || null,
  setItem: (key, value) => { mockLocalStorage.data[key] = value; },
  removeItem: (key) => { delete mockLocalStorage.data[key]; },
  clear: () => { mockLocalStorage.data = {}; },
};

// Mock de crypto
const mockCrypto = {
  randomUUID: () => 'test-uuid-1234',
};

// Mock de import.meta.env
const mockImportMeta = {
  env: {
    VITE_SUPABASE_URL: 'http://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-key',
    VITE_VAPID_PUBLIC_KEY: 'test-vapid',
    BASE_URL: '/',
  },
};

// Export mock para usar en pruebas
export { mockSupabase, mockLocalStorage, mockCrypto, mockImportMeta };
