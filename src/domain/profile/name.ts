// Nome del profilo (decisioni del 3 novembre 2026): facoltativo, fino a 80 caratteri, spazi in
// eccesso tolti. Vuoto = nessun nome: il registro mostra l'email.
export const maxNameLength = 80;

export function parseFullName(
  raw: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length > maxNameLength) {
    return { ok: false, error: `Il nome può avere al massimo ${maxNameLength} caratteri.` };
  }
  return { ok: true, value: name === "" ? null : name };
}
