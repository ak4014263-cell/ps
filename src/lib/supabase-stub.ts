/**
 * Supabase Stub
 * Provides stub implementations for Supabase calls to prevent errors
 * while the backend API is being migrated
 */

export const supabase = {
  from: () => ({
    select: async () => ({ data: [], error: null }),
    insert: async () => ({ data: null, error: null }),
    update: async () => ({ data: null, error: null }),
    delete: async () => ({ data: null, error: null }),
    eq: () => ({
      select: async () => ({ data: [], error: null }),
      single: async () => ({ data: null, error: null }),
    }),
    in: () => ({
      select: async () => ({ data: [], error: null }),
    }),
  }),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      download: async () => ({ data: null, error: null }),
      remove: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
  auth: {
    getUser: async () => ({ data: null, error: null }),
    signOut: async () => ({ error: null }),
  },
};

export default supabase;
