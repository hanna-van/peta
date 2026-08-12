import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Create a Supabase client for use in server components and route handlers.
 * Uses the anon key with cookie-based auth for user context.
 * For admin operations, use createServiceClient() instead.
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Record<string, unknown>)
          );
        } catch {
          // setAll can fail in Server Components where cookies are read-only.
          // This is safe to ignore when using middleware to refresh sessions.
        }
      },
    },
  });
}

/**
 * Create a Supabase admin client (server-only, bypasses RLS).
 * NEVER use in browser or client components.
 * Only use for operations that genuinely require admin access.
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing server-only Supabase environment variables. " +
        "Set SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
  }

  // Import directly to avoid SSR cookie complexity for admin client
  const { createClient } = require("@supabase/supabase-js");
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
