"use server";

import { revalidatePath } from "next/cache";
import { parseFullName } from "@/domain/profile/name";
import { field, succeeded, type Result } from "@/server/action-helpers";
import { getCurrentUser } from "@/server/auth/current-user";
import { createSupabaseServerClient } from "@/server/supabase";

export type ProfileFormState = Result & { fieldError?: string | null; value?: string };

// Ognuno cambia solo il proprio nome: il database permette solo la colonna del nome e solo
// sulla propria riga.
export async function updateOwnName(
  state: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Accedi di nuovo per cambiare il nome." };
  const raw = field(formData, "fullName");
  const parsed = parseFullName(raw);
  if (!parsed.ok) return { error: null, fieldError: parsed.error, value: raw };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.value })
    .eq("user_id", user.id)
    .select("user_id");
  if (error || data.length !== 1) {
    return { error: "Non è stato possibile salvare il nome. Riprova.", value: raw };
  }
  // Nome e iniziali compaiono nel menu di tutte le pagine.
  revalidatePath("/", "layout");
  return succeeded(state, "Nome salvato.");
}
