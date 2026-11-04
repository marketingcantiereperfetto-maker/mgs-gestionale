import Link from "next/link";
import { AuditList } from "@/components/audit-list";
import { Card, focusRing } from "@/components/ui";
import { listAudit, type AuditFilters } from "@/server/audit/queries";

export const auditPath = "/impostazioni/registro-delle-modifiche";

// Storico nella scheda di una società o di un brand: le ultime modifiche e il collegamento
// al registro completo già filtrato.
export async function AuditHistory({
  filter,
  showLink = true,
}: {
  filter:
    | Required<Pick<AuditFilters, "companyId">>
    | Required<Pick<AuditFilters, "brandId">>
    | Required<Pick<AuditFilters, "customerId">>;
  // Il registro completo è una pagina del solo titolare.
  showLink?: boolean;
}) {
  const { rows, next } = await listAudit(filter, 10);
  const query =
    "companyId" in filter
      ? `societa=${filter.companyId}`
      : "brandId" in filter
        ? `brand=${filter.brandId}`
        : `cliente=${filter.customerId}`;
  return (
    <Card title="Storico delle modifiche">
      {rows.length === 0 ? <p>Nessuna modifica registrata.</p> : <AuditList rows={rows} />}
      {showLink && (next || rows.length > 0) ? (
        <Link
          href={`${auditPath}?${query}`}
          className={`mt-3 inline-block rounded text-[13px] text-action ${focusRing}`}
        >
          Vedi tutto nel registro
        </Link>
      ) : null}
    </Card>
  );
}
