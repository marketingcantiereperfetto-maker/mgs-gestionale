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

// Riferimento del progetto da un indirizzo diretto del database, controllato senza rete:
// «db.<rif>.supabase.co» oppure il pooler, con utente «postgres.<rif>».
export function projectRefFromDbUrl(address: string | undefined): string | null {
  if (!address) return null;
  try {
    const url = new URL(address);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") return null;
    const direct = /^db\.([a-z0-9]+)\.supabase\.co$/.exec(url.hostname);
    if (direct) return direct[1]!;
    const pooled = /^postgres\.([a-z0-9]+)$/.exec(decodeURIComponent(url.username));
    if (pooled && url.hostname.endsWith(".pooler.supabase.com")) return pooled[1]!;
    return null;
  } catch {
    return null;
  }
}

// Supabase locale in Docker (T0): le prove automatiche girano solo qui, mai sul cloud.
// Le porte sono quelle di supabase/config.toml.
export const localApiPort = "58321";
export const localDbPort = "58322";
const localHosts = new Set(["127.0.0.1", "localhost"]);

export function isLocalSupabase(address: string | undefined): boolean {
  if (!address) return false;
  try {
    const url = new URL(address);
    return url.protocol === "http:" && localHosts.has(url.hostname) && url.port === localApiPort;
  } catch {
    return false;
  }
}

export function isLocalDatabase(address: string | undefined): boolean {
  if (!address) return false;
  try {
    const url = new URL(address);
    const isPostgres = url.protocol === "postgres:" || url.protocol === "postgresql:";
    return isPostgres && localHosts.has(url.hostname) && url.port === localDbPort;
  } catch {
    return false;
  }
}
