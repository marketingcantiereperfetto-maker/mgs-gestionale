import { readSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "./supabase";

export type DatabaseStatus = "collegato" | "non-configurato" | "non-raggiungibile";

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  if (!readSupabaseEnv()) return "non-configurato";
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("health_check");
    if (error) return "non-raggiungibile";
    return (data as { ok?: boolean } | null)?.ok === true ? "collegato" : "non-raggiungibile";
  } catch {
    return "non-raggiungibile";
  }
}
