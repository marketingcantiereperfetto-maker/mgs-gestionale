export type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

// I nomi devono restare scritti per esteso: Next.js inserisce nel browser solo
// le variabili NEXT_PUBLIC_ lette in questo modo.
export function readSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function requireSupabaseEnv(): SupabaseEnv {
  const env = readSupabaseEnv();
  if (!env) {
    throw new Error(
      "Mancano NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (vedi .env.example).",
    );
  }
  return env;
}
