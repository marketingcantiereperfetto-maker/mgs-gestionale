import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { loginPath, safeNextPath, setPasswordPath } from "@/lib/auth/routes";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/server/supabase";

const acceptedTypes: readonly EmailOtpType[] = ["invite", "recovery"];

// Link dell'email di invito: verifica il codice e apre la pagina per scegliere la password.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"), setPasswordPath);

  if (readSupabaseEnv() && tokenHash && type && acceptedTypes.includes(type)) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  const url = new URL(loginPath, request.url);
  url.searchParams.set("errore", "link-non-valido");
  return NextResponse.redirect(url);
}
