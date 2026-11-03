export const loginPath = "/accedi";
export const setPasswordPath = "/imposta-password";

const publicPaths = [loginPath, "/auth/conferma"];

export function isPublicPath(pathname: string): boolean {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

// Accetta solo percorsi interni, per non rimandare a siti esterni dopo l'accesso.
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  return next;
}
