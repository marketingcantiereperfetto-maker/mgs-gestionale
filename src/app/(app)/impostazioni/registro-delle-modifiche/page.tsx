import type { Metadata } from "next";
import Link from "next/link";
import { auditPath } from "@/components/audit-history";
import { AuditList } from "@/components/audit-list";
import { Card, Notice, PageHeader, fieldClass, focusRing, primaryButton } from "@/components/ui";
import { auditKinds, maintenanceActor } from "@/domain/audit/describe";
import { requirePage } from "@/server/auth/page-access";
import {
  cursorParam,
  listAudit,
  listAuditPeople,
  maintenanceFilter,
  parseAuditFilters,
  type AuditFilters,
} from "@/server/audit/queries";
import { createSupabaseServerClient } from "@/server/supabase";

export const metadata: Metadata = { title: "Registro delle modifiche · Gestionale MGS Group" };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

function hrefWith(filters: AuditFilters, extra: Record<string, string>): string {
  const query = new URLSearchParams();
  if (filters.from) query.set("dal", filters.from);
  if (filters.to) query.set("al", filters.to);
  if (filters.actor) query.set("persona", filters.actor);
  if (filters.kind) query.set("tipo", filters.kind);
  if (filters.companyId) query.set("societa", filters.companyId);
  if (filters.brandId) query.set("brand", filters.brandId);
  for (const [key, value] of Object.entries(extra)) query.set(key, value);
  const text = query.toString();
  return text ? `${auditPath}?${text}` : auditPath;
}

async function subjectName(filters: AuditFilters): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  if (filters.companyId) {
    const { data } = await supabase
      .from("companies")
      .select("legal_name")
      .eq("id", filters.companyId)
      .maybeSingle();
    return `la società «${data?.legal_name ?? "non più presente"}»`;
  }
  if (filters.brandId) {
    const { data } = await supabase
      .from("brands")
      .select("name")
      .eq("id", filters.brandId)
      .maybeSingle();
    return `il brand «${data?.name ?? "non più presente"}»`;
  }
  return null;
}

export default async function AuditPage({ searchParams }: Props) {
  const { page } = await requirePage(auditPath);
  const params = await searchParams;
  const filters = parseAuditFilters(params);
  const wrongOrder = filters.from && filters.to && filters.from > filters.to;
  const [{ rows, next }, people, subject] = await Promise.all([
    wrongOrder ? { rows: [], next: null } : listAudit(filters),
    listAuditPeople(),
    subjectName(filters),
  ]);
  const withoutCursor: AuditFilters = { ...filters, after: undefined };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title={page.title} subtitle={page.subtitle} />

      <Card title="Filtri">
        <form method="get" action={auditPath} className="flex flex-wrap items-end gap-4">
          {filters.companyId ? (
            <input type="hidden" name="societa" value={filters.companyId} />
          ) : null}
          {filters.brandId ? <input type="hidden" name="brand" value={filters.brandId} /> : null}
          <label className="block text-[13px] text-ink-muted">
            Dal
            <input
              type="date"
              name="dal"
              defaultValue={filters.from}
              className={`${fieldClass} w-auto text-[14px]`}
            />
          </label>
          <label className="block text-[13px] text-ink-muted">
            Al
            <input
              type="date"
              name="al"
              defaultValue={filters.to}
              className={`${fieldClass} w-auto text-[14px]`}
            />
          </label>
          <div className="text-[13px] text-ink-muted">
            <label htmlFor="filtro-persona">Persona</label>
            <select
              id="filtro-persona"
              name="persona"
              defaultValue={filters.actor ?? ""}
              className={`${fieldClass} w-auto text-[14px]`}
            >
              <option value="">Tutte</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.label}
                </option>
              ))}
              <option value={maintenanceFilter}>{maintenanceActor}</option>
            </select>
          </div>
          <div className="text-[13px] text-ink-muted">
            <label htmlFor="filtro-tipo">Tipo di dato</label>
            <select
              id="filtro-tipo"
              name="tipo"
              defaultValue={filters.kind ?? ""}
              className={`${fieldClass} w-auto text-[14px]`}
            >
              <option value="">Tutti</option>
              {Object.entries(auditKinds).map(([value, kind]) => (
                <option key={value} value={value}>
                  {kind.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={primaryButton}>
            Filtra
          </button>
          <Link href={auditPath} className={`rounded pb-1.5 text-[13px] text-action ${focusRing}`}>
            Azzera
          </Link>
        </form>
        <p className="mt-3 text-[13px] text-ink-muted">
          Le date sono giornate intere in ora italiana.
        </p>
      </Card>

      <Card title={subject ? `Modifiche riguardanti ${subject}` : "Modifiche"}>
        {wrongOrder ? (
          <Notice tone="warning">La data «dal» è successiva alla data «al».</Notice>
        ) : rows.length === 0 ? (
          <p data-testid="empty-state">Nessuna modifica con questi filtri.</p>
        ) : (
          <AuditList rows={rows} />
        )}
        <div className="mt-4 flex flex-wrap gap-4">
          {filters.after ? (
            <Link
              href={hrefWith(withoutCursor, {})}
              className={`rounded text-[13px] text-action ${focusRing}`}
            >
              Torna alle più recenti
            </Link>
          ) : null}
          {next ? (
            <Link
              href={hrefWith(withoutCursor, { dopo: cursorParam(next) })}
              className={`rounded text-[13px] text-action ${focusRing}`}
            >
              Modifiche precedenti →
            </Link>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
