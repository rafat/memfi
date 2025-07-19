// src/lib/supabase/supabase-server.ts

import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types'; // Import the generated types

// --- Environment Variable Validation ---
// It's crucial to ensure these variables are set, otherwise the app cannot function.
// This will cause the server to fail on startup if a variable is missing,
// which is much better than failing silently at runtime.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
}

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseServiceKey) {
  throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY");
}


// --- Server-Side Supabase Client ---

/**
 * This is the SERVER-SIDE Supabase client.
 * 
 * It is initialized with the `service_role` key, which has super-admin privileges
 * and bypasses all Row-Level Security (RLS) policies.
 * 
 * IMPORTANT: This client must ONLY be used in server-side code (e.g., API routes, server actions).
 * NEVER expose the `SUPABASE_SERVICE_ROLE_KEY` to the client-side/browser.
 */
export const supabaseServer = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey
);