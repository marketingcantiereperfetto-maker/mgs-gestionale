// Riferimento del progetto Supabase di prova. Tutto ciò che cancella dati con la chiave di
// amministrazione (test e procedure di pulizia) controlla prima di essere qui, mai altrove.
export const testProjectRef = "rozukexrurbadsiznmby";

export function isTestProject(address: string | undefined): boolean {
  if (!address) return false;
  try {
    return new URL(address).hostname === `${testProjectRef}.supabase.co`;
  } catch {
    return false;
  }
}
