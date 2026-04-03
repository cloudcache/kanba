// Re-export client for backward compatibility
export { supabase } from './client';

// Export server utilities
export {
  createServerSupabaseClient,
  createServerSupabaseClientWithAuth,
  getServerUser,
  requireAuth,
} from './server';
