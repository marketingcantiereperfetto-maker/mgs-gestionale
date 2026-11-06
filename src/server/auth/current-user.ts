import { cache } from "react";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/server/supabase";
import { isAction, type AppUser } from "./permissions";

export type CurrentUser = AppUser & {
  email: string;
  fullName: string | null;
};

export type Session =
  | { status: "anonymous" }
  | { status: "without-profile"; email: string }
  | { status: "password-required" }
  // La lettura di profilo e permessi è fallita o è andata oltre il tempo massimo: l'utente non
  // ha nessun permesso (nessun ripiego sul ruolo) finché la lettura non riesce.
  | { status: "permissions-unavailable" }
  | { status: "active"; user: CurrentUser };

// Tempo massimo per leggere profilo e permessi.
export const sessionReadTimeoutMs = 5000;

type SessionRow = {
  role: AppUser["role"];
  full_name: string | null;
  is_active: boolean;
  password_set_at: string | null;
  company_ids: string[];
  permissions: string[];
};

// Dalla risposta del database alla sessione. Un errore (anche un tempo scaduto) chiude tutto.
export function sessionFromRow(
  claims: { sub: string; email: string },
  result: { data: SessionRow | null; error: unknown },
): Session {
  if (result.error) return { status: "permissions-unavailable" };
  const profile = result.data;
  if (!profile || !profile.is_active) return { status: "without-profile", email: claims.email };
  if (!profile.password_set_at) return { status: "password-required" };
  return {
    status: "active",
    user: {
      id: claims.sub,
      email: claims.email,
      fullName: profile.full_name,
      role: profile.role,
      isActive: profile.is_active,
      companyIds: profile.company_ids,
      permissions: profile.permissions.filter(isAction),
    },
  };
}

export const getSession = cache(async (): Promise<Session> => {
  if (!readSupabaseEnv()) return { status: "anonymous" };

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { status: "anonymous" };

  const email = typeof claims.email === "string" ? claims.email : "";
  // Profilo e facoltà effettive (preset del ruolo ed eccezioni) in una sola chiamata, con un
  // tempo massimo: se non risponde, nessun permesso.
  try {
    const result = await supabase
      .rpc("my_session")
      .abortSignal(AbortSignal.timeout(sessionReadTimeoutMs))
      .maybeSingle();
    return sessionFromRow({ sub: claims.sub, email }, result);
  } catch (error) {
    return sessionFromRow({ sub: claims.sub, email }, { data: null, error });
  }
});

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  return session.status === "active" ? session.user : null;
}
