import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { requireSupabaseEnv } from "./env";

export function createSupabaseBrowserClient() {
  const { url, publishableKey } = requireSupabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
