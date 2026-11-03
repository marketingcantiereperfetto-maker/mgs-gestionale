import { createSupabaseServerClient } from "@/server/supabase";

export const logosBucket = "logos";

// Indirizzo firmato per vedere un logo dell'archivio privato. Scade dopo 5 minuti e non va
// mai scritto nel registro, nei messaggi di errore o nei log.
export const signedLogoSeconds = 5 * 60;

export async function signedLogoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage
    .from(logosBucket)
    .createSignedUrl(path, signedLogoSeconds);
  return data?.signedUrl ?? null;
}
