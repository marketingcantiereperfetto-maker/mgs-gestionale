import {
  auditKinds,
  describeEntry,
  type AuditEntry,
  type AuditKind,
  type AuditLine,
  type AuditNames,
} from "@/domain/audit/describe";
import { isDay, nextDay, romeMidnight } from "@/lib/rome-day";
import { uuidPattern } from "@/server/action-helpers";
import { createSupabaseServerClient } from "@/server/supabase";

export const auditPageSize = 50;
export const maintenanceFilter = "sistema";

export type AuditCursor = { at: string; id: number };

export type AuditFilters = {
  from?: string; // AAAA-MM-GG, giornata intera in ora di Roma
  to?: string;
  actor?: string; // id dell'utente oppure «sistema»
  kind?: AuditKind;
  companyId?: string;
  brandId?: string;
  after?: AuditCursor;
};

export type AuditRow = AuditLine & { id: number; occurredAt: string };
export type AuditPage = { rows: AuditRow[]; next: AuditCursor | null };

const cursorPattern =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:[+-]\d{2}:\d{2}|Z))~(\d{1,18})$/;

// Filtri dall'indirizzo della pagina: valori non validi vengono ignorati, così non entrano mai
// nelle condizioni inviate al database.
export function parseAuditFilters(params: Record<string, string | undefined>): AuditFilters {
  const filters: AuditFilters = {};
  if (params.dal && isDay(params.dal)) filters.from = params.dal;
  if (params.al && isDay(params.al)) filters.to = params.al;
  if (params.persona === maintenanceFilter || uuidPattern.test(params.persona ?? "")) {
    filters.actor = params.persona;
  }
  if (params.tipo && Object.hasOwn(auditKinds, params.tipo))
    filters.kind = params.tipo as AuditKind;
  if (uuidPattern.test(params.societa ?? "")) filters.companyId = params.societa;
  if (uuidPattern.test(params.brand ?? "")) filters.brandId = params.brand;
  const cursor = cursorPattern.exec(params.dopo ?? "");
  if (cursor) filters.after = { at: cursor[1]!, id: Number(cursor[2]) };
  return filters;
}

export function cursorParam(cursor: AuditCursor): string {
  return `${cursor.at}~${cursor.id}`;
}

// Condizioni in un solo filtro «or» di PostgREST: (società o brand) e (dopo questa riga).
function combinedCondition(filters: AuditFilters): string | null {
  const parts: string[] = [];
  if (filters.companyId) {
    const id = filters.companyId;
    parts.push(
      `or(and(table_name.eq.companies,record_id.eq.${id}),new_data->>company_id.eq.${id},old_data->>company_id.eq.${id})`,
    );
  }
  if (filters.brandId) {
    const id = filters.brandId;
    parts.push(`and(table_name.in.(brands,company_brands),record_id.eq.${id})`);
  }
  if (filters.after) {
    const at = `"${filters.after.at}"`;
    parts.push(`or(occurred_at.lt.${at},and(occurred_at.eq.${at},id.lt.${filters.after.id}))`);
  }
  if (parts.length === 0) return null;
  return parts.length === 1 ? parts[0]! : `and(${parts.join(",")})`;
}

async function loadNames(entries: AuditEntry[]): Promise<AuditNames> {
  const supabase = await createSupabaseServerClient();
  const people = new Set<string>();
  const companies = new Set<string>();
  const brands = new Set<string>();
  const snapshotCompanies = new Map<string, string>();
  const snapshotBrands = new Map<string, string>();

  for (const entry of entries) {
    const data = { ...entry.oldData, ...entry.newData };
    if (entry.actorId) people.add(entry.actorId);
    if (typeof data.user_id === "string") people.add(data.user_id);
    if (typeof data.company_id === "string") companies.add(data.company_id);
    if (typeof data.brand_id === "string") brands.add(data.brand_id);
    if (entry.table === "companies" && entry.recordId && typeof data.legal_name === "string") {
      snapshotCompanies.set(entry.recordId, data.legal_name);
    }
    if (entry.table === "brands" && entry.recordId && typeof data.name === "string") {
      snapshotBrands.set(entry.recordId, data.name);
    }
  }

  const [labels, companyRows, brandRows] = await Promise.all([
    people.size
      ? supabase.rpc("audit_actor_labels", { actor_ids: [...people] })
      : { data: [], error: null },
    companies.size
      ? supabase
          .from("companies")
          .select("id, legal_name")
          .in("id", [...companies])
      : { data: [], error: null },
    brands.size
      ? supabase
          .from("brands")
          .select("id, name")
          .in("id", [...brands])
      : { data: [], error: null },
  ]);
  if (labels.error) throw new Error("Nomi del registro non letti");

  return {
    people: new Map((labels.data ?? []).map((row) => [row.user_id, row.full_name ?? row.email])),
    companies: new Map([
      ...snapshotCompanies,
      ...(companyRows.data ?? []).map((row) => [row.id, row.legal_name] as const),
    ]),
    brands: new Map([
      ...snapshotBrands,
      ...(brandRows.data ?? []).map((row) => [row.id, row.name] as const),
    ]),
  };
}

// Righe del registro, dalla più recente, con paginazione «dopo questa riga».
export async function listAudit(filters: AuditFilters, limit = auditPageSize): Promise<AuditPage> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("audit_log")
    .select("id, occurred_at, actor_id, table_name, record_id, action, old_data, new_data")
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (filters.from) query = query.gte("occurred_at", romeMidnight(filters.from).toISOString());
  if (filters.to) query = query.lt("occurred_at", romeMidnight(nextDay(filters.to)).toISOString());
  if (filters.actor === maintenanceFilter) query = query.is("actor_id", null);
  else if (filters.actor) query = query.eq("actor_id", filters.actor);
  if (filters.kind) query = query.in("table_name", [...auditKinds[filters.kind].tables]);
  const condition = combinedCondition(filters);
  if (condition) query = query.or(condition);

  const { data, error } = await query;
  if (error) throw new Error("Registro non letto");

  const entries: AuditEntry[] = data.slice(0, limit).map((row) => ({
    id: row.id,
    occurredAt: row.occurred_at,
    actorId: row.actor_id,
    table: row.table_name,
    recordId: row.record_id,
    action: row.action as AuditEntry["action"],
    oldData: row.old_data as AuditEntry["oldData"],
    newData: row.new_data as AuditEntry["newData"],
  }));
  const names = await loadNames(entries);
  const last = entries.at(-1);
  return {
    rows: entries.map((entry) => ({
      ...describeEntry(entry, names),
      id: entry.id,
      occurredAt: entry.occurredAt,
    })),
    next: data.length > limit && last ? { at: last.occurredAt, id: last.id } : null,
  };
}

// Persone per il filtro: tutti i profili, con nome o email.
export async function listAuditPeople(): Promise<{ id: string; label: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data: profiles } = await supabase.from("profiles").select("user_id");
  const ids = (profiles ?? []).map((profile) => profile.user_id);
  if (ids.length === 0) return [];
  const { data } = await supabase.rpc("audit_actor_labels", { actor_ids: ids });
  return (data ?? [])
    .map((row) => ({ id: row.user_id, label: row.full_name ?? row.email }))
    .sort((a, b) => a.label.localeCompare(b.label, "it"));
}
