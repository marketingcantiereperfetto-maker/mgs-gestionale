import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPublicPath, loginPath } from "@/lib/auth/routes";
import type { Database } from "@/lib/supabase/database.types";
import { readSupabaseEnv } from "@/lib/supabase/env";

// Rinnova la sessione a ogni richiesta e manda alla pagina di accesso chi non è collegato.
export async function proxy(request: NextRequest) {
  const env = readSupabaseEnv();
  let response = NextResponse.next({ request });
  let isSignedIn = false;

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
    isSignedIn = Boolean(data?.claims?.sub);
  }

  if (!isSignedIn && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
