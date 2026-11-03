import { cache } from "react";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/server/supabase";
import type { AppUser } from "./permissions";

export type CurrentUser = AppUser & {
  email: string;
  fullName: string | null;
};

export type Session =
  | { status: "anonymous" }
  | { status: "without-profile"; email: string }
  | { status: "active"; user: CurrentUser };

export const getSession = cache(async (): Promise<Session> => {
  if (!readSupabaseEnv()) return { status: "anonymous" };

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { status: "anonymous" };

  const email = typeof claims.email === "string" ? claims.email : "";
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, is_active, profile_companies(company_id)")
    .eq("user_id", claims.sub)
    .maybeSingle();

  if (!profile || !profile.is_active) return { status: "without-profile", email };

  return {
    status: "active",
    user: {
      id: claims.sub,
      email,
      fullName: profile.full_name,
      role: profile.role,
      isActive: profile.is_active,
      companyIds: profile.profile_companies.map((link) => link.company_id),
    },
  };
});

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  return session.status === "active" ? session.user : null;
}
