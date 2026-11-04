import {
  incompleteScanLimit,
  summarizeIncomplete,
  type IncompleteSummary,
} from "@/domain/customers/incomplete";
import { searchMessages } from "@/domain/customers/search";
import { createSupabaseServerClient } from "@/server/supabase";
import { toCustomer, type Customer } from "./row";

export { toCustomer, toCustomerColumns, type Customer } from "./row";

// L'elenco legge le righe intere per calcolare la completezza, ma mostra solo nome, tipo,
// comune e completezza (decisione del 4 novembre 2026).
export async function listCustomers(): Promise<Customer[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("customers").select("*").order("name");
  if (error) throw new Error("Clienti non letti");
  return data.map(toCustomer);
}

// Clienti da completare per la dashboard: si rileggono al massimo i primi clienti attivi fino al
// limite (uno in più, per sapere se ce ne sono altri). Alla pagina arrivano solo id e nomi.
export async function loadIncompleteSummary(): Promise<IncompleteSummary> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("is_active", true)
    .order("name")
    .order("id")
    .limit(incompleteScanLimit + 1);
  if (error) throw new Error("Clienti da completare non letti");
  return summarizeIncomplete(
    data.slice(0, incompleteScanLimit).map(toCustomer),
    data.length > incompleteScanLimit,
  );
}

export type CustomerSearch = { customers: Customer[]; error: string | null; hasMore: boolean };

// Ricerca dal database, anche per email dei referenti attivi. La funzione restituisce solo id,
// nome, tipo, comune e stato, al massimo 50 risultati (con «has_more» se ce ne sono altri). Le
// righe dei soli clienti trovati si leggono qui sul server per calcolare la completezza, come
// fa l'elenco senza ricerca; alla pagina arrivano solo nome, tipo, comune e completezza.
// Testo già controllato (3–100 caratteri) dal chiamante.
export async function searchCustomers(term: string): Promise<CustomerSearch> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("search_customers", { search_text: term });
  if (error) {
    const message = error.code === "P0001" ? searchMessages.busy : searchMessages.failed;
    return { customers: [], error: message, hasMore: false };
  }
  const found = data ?? [];
  if (found.length === 0) return { customers: [], error: null, hasMore: false };
  const rows = await supabase
    .from("customers")
    .select("*")
    .in(
      "id",
      found.map((row) => row.id),
    )
    .order("name")
    .order("id");
  if (rows.error) return { customers: [], error: searchMessages.failed, hasMore: false };
  return {
    customers: rows.data.map(toCustomer),
    error: null,
    hasMore: found.some((row) => row.has_more),
  };
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("Cliente non letto");
  return data ? toCustomer(data) : null;
}

export type CustomerAuthors = { createdBy: string; updatedBy: string };

const maintenance = "Procedura di manutenzione";

// Nomi di chi ha creato e modificato il cliente, da una funzione protetta che restituisce solo
// il nome del profilo (o l'email se manca) degli autori dei clienti.
export async function getCustomerAuthors(customer: Customer): Promise<CustomerAuthors> {
  const ids = [customer.createdBy, customer.updatedBy].filter((id): id is string => id !== null);
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.rpc("customer_author_names", { author_ids: ids });
    for (const row of data ?? []) names.set(row.user_id, row.label);
  }
  const name = (id: string | null) =>
    id === null ? maintenance : (names.get(id) ?? "un utente non più presente");
  return { createdBy: name(customer.createdBy), updatedBy: name(customer.updatedBy) };
}
