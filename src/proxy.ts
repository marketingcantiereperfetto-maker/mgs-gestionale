import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { accessRedirect, type Access } from "@/lib/auth/routes";
import type { Database } from "@/lib/supabase/database.types";
import { readSupabaseEnv } from "@/lib/supabase/env";

// Rinnova la sessione a ogni richiesta, manda alla pagina di accesso chi non è collegato e su
// /imposta-password chi non ha ancora scelto la propria password.
export async function proxy(request: NextRequest) {
  const env = readSupabaseEnv();
  let response = NextResponse.next({ request });
  let access: Access = "anonymous";

  if (env) {
    const supabase = createServerClient<Database>(env.url, env.publishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("password_set_at")
        .eq("user_id", userId)
        .maybeSingle();
      access = profile && !profile.password_set_at ? "password-required" : "ready";
    }
  }

  const target = accessRedirect(request.nextUrl.pathname, access);
  if (target) {
    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
