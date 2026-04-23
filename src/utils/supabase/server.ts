import { env } from "@/lib/env";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient(isAdmin?: boolean) {
  const cookieStore = await cookies();

  return createServerClient(
    env.SUPABASE_URL!,
    isAdmin ? env.SUPABASE_SECRET_KEY : env.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
