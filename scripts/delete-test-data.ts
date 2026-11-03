// Cancella dal database DI PROVA società e brand di dati inventati, con conti, collegamenti e
// loghi. Il registro delle modifiche non si tocca. Si rifiuta di girare su altri progetti.
// Uso: npm run prova:cancella -- --societa "NOME ESATTO" --brand "NOME ESATTO" [--conferma]
// (--societa e --brand si possono ripetere). Senza --conferma mostra solo cosa cancellerebbe.
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
    societa: { type: "string", multiple: true, default: [] },
    brand: { type: "string", multiple: true, default: [] },
    conferma: { type: "boolean", default: false },
  },
});

const companyNames = values.societa.map((name) => name.trim()).filter(Boolean);
const brandNames = values.brand.map((name) => name.trim()).filter(Boolean);
if (companyNames.length + brandNames.length === 0) {
  fail('indica almeno --societa "…" o --brand "…" con il nome esatto.');
}

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
const logos = supabase.storage.from("logos");

async function logoFiles(folder: string): Promise<string[]> {
  const { data, error } = await logos.list(folder);
  if (error) fail(`loghi non letti (${error.message}).`);
  return data.map((file) => `${folder}/${file.name}`);
}

const companies = companyNames.length
  ? await supabase
      .from("companies")
      .select(
        "id, legal_name, is_active, company_bank_accounts(id, iban), profile_companies(user_id)",
      )
      .in("legal_name", companyNames)
  : { data: [], error: null };
if (companies.error) fail(`società non lette (${companies.error.message}).`);
const brands = brandNames.length
  ? await supabase.from("brands").select("id, name, is_active").in("name", brandNames)
  : { data: [], error: null };
if (brands.error) fail(`brand non letti (${brands.error.message}).`);

for (const name of companyNames) {
  if (!companies.data.some((company) => company.legal_name === name))
    fail(`nessuna società «${name}».`);
}
for (const name of brandNames) {
  if (!brands.data.some((brand) => brand.name === name)) fail(`nessun brand «${name}».`);
}

const companyIds = companies.data.map((company) => company.id);
const brandIds = brands.data.map((brand) => brand.id);
const links = await supabase
  .from("company_brands")
  .select("company_id, brand_id")
  .or(
    [
      companyIds.length ? `company_id.in.(${companyIds.join(",")})` : "",
      brandIds.length ? `brand_id.in.(${brandIds.join(",")})` : "",
    ]
      .filter(Boolean)
      .join(","),
  );
if (links.error) fail(`collegamenti non letti (${links.error.message}).`);

const files: string[] = [];
for (const company of companies.data) {
  if (company.profile_companies.length > 0)
    fail(`la società «${company.legal_name}» ha utenti collegati.`);
  console.log(
    `Società ${company.id} «${company.legal_name}» (attiva: ${company.is_active ? "sì" : "no"})`,
  );
  for (const account of company.company_bank_accounts)
    console.log(`  conto ${account.id} ${account.iban}`);
  files.push(...(await logoFiles(`companies/${company.id}`)));
}
for (const brand of brands.data) {
  console.log(`Brand ${brand.id} «${brand.name}» (attivo: ${brand.is_active ? "sì" : "no"})`);
  files.push(...(await logoFiles(`brands/${brand.id}`)));
}
for (const link of links.data)
  console.log(`Collegamento brand ${link.brand_id} ↔ società ${link.company_id}`);
for (const file of files) console.log(`File logo ${file}`);

if (!values.conferma) {
  console.log("Prova senza effetti: aggiungi --conferma per cancellare quanto elencato.");
  process.exit(0);
}

const removedLinks = await supabase
  .from("company_brands")
  .delete()
  .in("brand_id", brandIds.length ? brandIds : ["00000000-0000-0000-0000-000000000000"])
  .select("brand_id");
const removedLinksByCompany = await supabase
  .from("company_brands")
  .delete()
  .in("company_id", companyIds.length ? companyIds : ["00000000-0000-0000-0000-000000000000"])
  .select("brand_id");
if (removedLinks.error || removedLinksByCompany.error) fail("collegamenti non cancellati.");
if (files.length > 0) {
  const removed = await logos.remove(files);
  if (removed.error) fail(`loghi non cancellati (${removed.error.message}).`);
}
const accounts = companyIds.length
  ? await supabase.from("company_bank_accounts").delete().in("company_id", companyIds).select("id")
  : { data: [], error: null };
if (accounts.error) fail(`conti non cancellati (${accounts.error.message}).`);
const deletedBrands = brandIds.length
  ? await supabase.from("brands").delete().in("id", brandIds).select("id")
  : { data: [], error: null };
if (deletedBrands.error) fail(`brand non cancellati (${deletedBrands.error.message}).`);
const deletedCompanies = companyIds.length
  ? await supabase.from("companies").delete().in("id", companyIds).select("id")
  : { data: [], error: null };
if (deletedCompanies.error) fail(`società non cancellate (${deletedCompanies.error.message}).`);

console.log(
  `Cancellati: ${deletedCompanies.data.length} società, ${accounts.data.length} conti, ` +
    `${deletedBrands.data.length} brand, ` +
    `${removedLinks.data.length + removedLinksByCompany.data.length} collegamenti, ` +
    `${files.length} file di logo. Registro delle modifiche intatto.`,
);
