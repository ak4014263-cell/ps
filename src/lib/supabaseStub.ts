/**
 * Supabase Stub - Placeholder while backend is being built
 * This file provides mock implementations for Supabase operations
 * These will be replaced with actual backend API calls
 */

export const supabase = {
  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        maybeSingle: async () => {
          console.debug(`[STUB] Supabase: SELECT ${columns || '*'} FROM ${table} WHERE ${column} = ${value}`);
          return { data: null, error: null };
        },
        single: async () => {
          console.debug(`[STUB] Supabase: SELECT ${columns || '*'} FROM ${table} WHERE ${column} = ${value} (single)`);
          return { data: null, error: null };
        },
        async () {
          console.debug(`[STUB] Supabase: SELECT ${columns || '*'} FROM ${table} WHERE ${column} = ${value}`);
          return { data: [], error: null };
        },
      }),
      order: (column: string) => ({
        async () {
          console.debug(`[STUB] Supabase: SELECT ${columns || '*'} FROM ${table} ORDER BY ${column}`);
          return { data: [], error: null };
        },
      }),
      async () {
        console.debug(`[STUB] Supabase: SELECT ${columns || '*'} FROM ${table}`);
        return { data: [], error: null };
      },
    }),
    insert: async (records: any) => {
      console.debug(`[STUB] Supabase: INSERT INTO ${table}`, records);
      return { data: records, error: null };
    },
    update: (data: any) => ({
      eq: async (column: string, value: any) => {
        console.debug(`[STUB] Supabase: UPDATE ${table} SET ... WHERE ${column} = ${value}`, data);
        return { data: null, error: null };
      },
    }),
    delete: () => ({
      eq: async (column: string, value: any) => {
        console.debug(`[STUB] Supabase: DELETE FROM ${table} WHERE ${column} = ${value}`);
        return { data: null, error: null };
      },
    }),
  }),

  auth: {
    onAuthStateChange: (callback: any) => {
      console.debug('[STUB] Supabase: Auth state change listener');
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    getSession: async () => {
      console.debug('[STUB] Supabase: Get auth session');
      return { data: { session: null } };
    },
    signInWithPassword: async (credentials: any) => {
      console.debug('[STUB] Supabase: Sign in with password', credentials.email);
      return { data: null, error: null };
    },
    signUp: async (data: any) => {
      console.debug('[STUB] Supabase: Sign up', data.email);
      return { data: null, error: null };
    },
    signOut: async () => {
      console.debug('[STUB] Supabase: Sign out');
      return { error: null };
    },
    getUser: async () => {
      console.debug('[STUB] Supabase: Get user');
      return { data: { user: null } };
    },
  },

  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: any) => {
        console.debug(`[STUB] Supabase Storage: Upload ${path} to ${bucket}`);
        return { data: { path }, error: null };
      },
      download: async (path: string) => {
        console.debug(`[STUB] Supabase Storage: Download ${path} from ${bucket}`);
        return { data: null, error: null };
      },
      remove: async (paths: string[]) => {
        console.debug(`[STUB] Supabase Storage: Remove from ${bucket}`, paths);
        return { data: null, error: null };
      },
      getPublicUrl: (path: string) => {
        console.debug(`[STUB] Supabase Storage: Get public URL for ${path}`);
        return { data: { publicUrl: '' } };
      },
    }),
  },

  functions: {
    invoke: async (functionName: string, options: any) => {
      console.warn(`[STUB] Supabase Function: Invoke ${functionName}`, options);
      return { data: null, error: null };
    },
  },
};
