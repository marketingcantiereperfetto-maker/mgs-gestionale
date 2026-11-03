// Cancella dal database DI PROVA una società di dati inventati e i suoi conti bancari.
// Il registro delle modifiche non si tocca. Si rifiuta di girare su qualunque altro progetto.
// Uso: npm run prova:cancella-societa -- --ragione-sociale "NOME ESATTO" [--conferma]
// Senza --conferma mostra solo cosa cancellerebbe.
import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";
import type { Database } from "../src/lib/supabase/database.types.ts";
import { isTestProject, testProjectRef } from "../src/lib/supabase/test-project.ts";

function fail(message: string): never {
  console.error(`Errore: ${message}`);
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    "ragione-sociale": { type: "string" },
    conferma: { type: "boolean", default: false },
  },
});

const legalName = values["ragione-sociale"]?.trim();
if (!legalName) fail('indica la ragione sociale esatta con --ragione-sociale "…".');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey)
  fail("mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY in .env.local.");
if (!isTestProject(url)) {
  fail(`rifiutato: il progetto non è quello di prova (${testProjectRef}). Nessun dato toccato.`);
}

const supabase = createClient<Database>(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: companies, error } = await supabase
  .from("companies")
  .select(
    "id, legal_name, is_active, created_at, company_bank_accounts(id, iban, label, is_default, is_active), profile_companies(user_id)",
  )
  .eq("legal_name", legalName);
if (error) fail(`società non lette (${error.message}).`);
if (companies.length === 0) fail(`nessuna società con ragione sociale esattamente «${legalName}».`);

for (const company of companies) {
  console.log(
    `Società ${company.id} «${company.legal_name}» (creata ${company.created_at}, attiva: ${company.is_active ? "sì" : "no"})`,
  );
  for (const account of company.company_bank_accounts) {
    console.log(
      `  conto ${account.id} ${account.iban}${account.label ? ` (${account.label})` : ""}` +
        `${account.is_default ? ", predefinito" : ""}${account.is_active ? "" : ", disattivato"}`,
    );
  }
  if (company.profile_companies.length > 0) {
    fail(`la società ${company.id} ha utenti collegati: non la cancello.`);
  }
}

if (!values.conferma) {
  console.log("Prova senza effetti: aggiungi --conferma per cancellare quanto elencato.");
  process.exit(0);
}

const ids = companies.map((company) => company.id);
const accounts = await supabase
  .from("company_bank_accounts")
  .delete()
  .in("company_id", ids)
  .select("id");
if (accounts.error) fail(`conti non cancellati (${accounts.error.message}).`);
const deleted = await supabase.from("companies").delete().in("id", ids).select("id");
if (deleted.error) fail(`società non cancellate (${deleted.error.message}).`);
console.log(
  `Cancellati: ${deleted.data.length} società e ${accounts.data.length} conti. Registro delle modifiche intatto.`,
);
