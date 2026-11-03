// Crea il primo titolare senza email: prepara l'invito e stampa nel Terminale il link da aprire.
// Uso: npm run utenti:crea-titolare -- --email nome@dominio.it --sito https://indirizzo.app
//        [--nome "Nome Cognome"] [--conferma]
// Senza --conferma mostra solo cosa farebbe. Il link è personale: non va copiato in chat.
import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";
import type { Database } from "../src/lib/supabase/database.types.ts";

function fail(message: string): never {
  console.error(`Errore: ${message}`);
  process.exit(1);
}

function parseSite(value: string | undefined): URL {
  if (!value)
    fail("indica l'indirizzo del gestionale con --sito (per esempio http://localhost:3000).");
  try {
    const site = new URL(value);
    const isLocal = site.protocol === "http:" && site.hostname === "localhost";
    if (site.protocol !== "https:" && !isLocal) fail("--sito deve iniziare con https://.");
    return site;
  } catch {
    fail("--sito non è un indirizzo valido.");
  }
}

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    sito: { type: "string" },
    nome: { type: "string" },
    conferma: { type: "boolean", default: false },
  },
});

const email = values.email?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  fail("indica un'email valida con --email.");
const site = parseSite(values.sito);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  fail("mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY in .env.local.");
}

const supabase = createClient<Database>(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { count, error: countError } = await supabase
  .from("profiles")
  .select("user_id", { count: "exact", head: true })
  .eq("role", "owner");
if (countError) fail(`impossibile leggere i profili (${countError.message}).`);
if ((count ?? 0) > 0) fail("esiste già un titolare. Questo comando serve solo per il primo.");

console.log(`Database: ${new URL(url).hostname}`);
console.log(`Gestionale: ${site.origin}`);
console.log(`Titolare da creare: ${email}${values.nome ? ` (${values.nome})` : ""}`);

if (!values.conferma) {
  console.log("Prova senza effetti: aggiungi --conferma per creare l'invito.");
  process.exit(0);
}

// generateLink crea l'utente invitato senza inviare email e restituisce il codice dell'invito.
const { data: invite, error: inviteError } = await supabase.auth.admin.generateLink({
  type: "invite",
  email,
});
if (inviteError || !invite.user) {
  fail(`invito non creato (${inviteError?.code ?? inviteError?.message ?? "nessun utente"}).`);
}

const { error: profileError } = await supabase.from("profiles").insert({
  user_id: invite.user.id,
  role: "owner",
  full_name: values.nome?.trim() || null,
});
if (profileError) {
  fail(
    `invito creato ma profilo non creato (${profileError.message}). ` +
      `Utente ${invite.user.id}: segnalalo prima di riprovare.`,
  );
}

const link = new URL("/auth/conferma", site);
link.searchParams.set("token_hash", invite.properties.hashed_token);
link.searchParams.set("type", "invite");
link.searchParams.set("next", "/imposta-password");

console.log("");
console.log("Fatto: profilo di titolare creato. Apri questo link nel browser (vale 1 ora):");
console.log(link.toString());
console.log("");
console.log("Il link è personale: non copiarlo in chat, in email o in documenti.");
