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

export type Access = "anonymous" | "password-required" | "ready";

// Dove mandare l'utente prima di mostrare la pagina richiesta (null = nessun cambio).
// Chi non ha ancora scelto la password vede solo /imposta-password.
export function accessRedirect(pathname: string, access: Access): string | null {
  if (access === "anonymous") return isPublicPath(pathname) ? null : loginPath;
  if (access === "password-required" && pathname !== setPasswordPath) return setPasswordPath;
  return null;
}
