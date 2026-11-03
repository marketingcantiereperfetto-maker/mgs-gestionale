// Crea il primo titolare: invia l'invito via email e registra il profilo con ruolo «owner».
// Uso: npm run utenti:crea-titolare -- --email nome@dominio.it [--nome "Nome Cognome"] [--conferma]
// Senza --conferma mostra solo cosa farebbe. Usa la chiave segreta da .env.local senza mostrarla.
import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";
import type { Database } from "../src/lib/supabase/database.types.ts";

function fail(message: string): never {
  console.error(`Errore: ${message}`);
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    nome: { type: "string" },
    conferma: { type: "boolean", default: false },
  },
});

const email = values.email?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  fail("indica un'email valida con --email.");

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
console.log(`Titolare da creare: ${email}${values.nome ? ` (${values.nome})` : ""}`);

if (!values.conferma) {
  console.log("Prova senza effetti: aggiungi --conferma per inviare davvero l'invito.");
  process.exit(0);
}

const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);
if (inviteError || !invited.user) {
  fail(`invito non inviato (${inviteError?.code ?? inviteError?.message ?? "nessun utente"}).`);
}

const { error: profileError } = await supabase.from("profiles").insert({
  user_id: invited.user.id,
  role: "owner",
  full_name: values.nome?.trim() || null,
});
if (profileError) {
  fail(
    `invito inviato ma profilo non creato (${profileError.message}). ` +
      `Utente ${invited.user.id}: segnalalo prima di riprovare.`,
  );
}

console.log(`Fatto: invito inviato a ${email} e profilo di titolare creato.`);
