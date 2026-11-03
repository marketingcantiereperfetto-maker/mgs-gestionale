"use server";

import { redirect } from "next/navigation";
import { minPasswordLength } from "@/lib/auth/password";
import { loginPath, safeNextPath, setPasswordPath } from "@/lib/auth/routes";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/server/supabase";

export type FormState = { error: string | null };

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function signIn(_state: FormState, formData: FormData): Promise<FormState> {
  if (!readSupabaseEnv()) return { error: "L'accesso non è ancora configurato." };

  const email = field(formData, "email");
  const password = formData.get("password");
  if (!email || typeof password !== "string" || !password) {
    return { error: "Inserisci email e password." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      error:
        error.code === "invalid_credentials"
          ? "Email o password non corretti."
          : "Accesso non riuscito. Riprova tra qualche minuto.",
    };
  }
  redirect("/");
}

export async function setPassword(_state: FormState, formData: FormData): Promise<FormState> {
  const password = formData.get("password");
  const confirmation = formData.get("confirmation");
  if (typeof password !== "string" || password.length < minPasswordLength) {
    return { error: `La password deve avere almeno ${minPasswordLength} caratteri.` };
  }
  if (password !== confirmation) return { error: "Le due password non coincidono." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error:
        error.code === "weak_password"
          ? "Password troppo debole: usa lettere, numeri e simboli."
          : "Non è stato possibile salvare la password. Riprova.",
    };
  }
  redirect("/");
}

export async function signOut(): Promise<void> {
  if (readSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect(loginPath);
}

// Il codice si verifica solo qui, dopo il clic sul pulsante: aprire il link non lo consuma
// (alcuni programmi di posta e di anteprima aprono i link da soli).
export async function confirmInvite(formData: FormData): Promise<void> {
  const tokenHash = field(formData, "token_hash");
  const next = safeNextPath(field(formData, "next"), setPasswordPath);

  if (readSupabaseEnv() && tokenHash) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type: "invite", token_hash: tokenHash });
    if (!error) redirect(next);
  }
  redirect(`${loginPath}?errore=link-non-valido`);
}
