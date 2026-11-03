import { notFound, redirect } from "next/navigation";
import { loginPath, setPasswordPath } from "@/lib/auth/routes";
import { findPage, type NavPage } from "@/lib/navigation";
import { getSession, type CurrentUser, type Session } from "./current-user";
import { can } from "./permissions";

export const accessDeniedPath = "/?accesso=negato";

export type PageDecision =
  | { kind: "show"; user: CurrentUser; page: NavPage }
  | { kind: "redirect"; to: string }
  | { kind: "not-found" };

// Controllo sul server di ogni pagina: il menu nasconde le voci non consentite, ma chi apre
// l'indirizzo a mano viene comunque rimandato alla dashboard.
export function decidePageAccess(session: Session, href: string): PageDecision {
  if (session.status === "anonymous") return { kind: "redirect", to: loginPath };
  if (session.status === "password-required") return { kind: "redirect", to: setPasswordPath };
  if (session.status !== "active") return { kind: "redirect", to: "/" };

  const access = findPage(href);
  if (!access) return { kind: "not-found" };
  if (!access.requires.every((action) => can(session.user, action))) {
    return { kind: "redirect", to: accessDeniedPath };
  }
  return { kind: "show", user: session.user, page: access.page };
}

export async function requirePage(href: string): Promise<{ user: CurrentUser; page: NavPage }> {
  const decision = decidePageAccess(await getSession(), href);
  if (decision.kind === "redirect") redirect(decision.to);
  if (decision.kind === "not-found") notFound();
  return decision;
}
