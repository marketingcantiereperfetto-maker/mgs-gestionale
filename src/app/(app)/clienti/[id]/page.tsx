import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuditHistory } from "@/components/audit-history";
import { Badge, BackLink, Card, Notice, PageHeader } from "@/components/ui";
import { customerCompleteness } from "@/domain/customers/customer";
import { customersPath } from "@/lib/customer-paths";
import { uuidPattern } from "@/server/action-helpers";
import { can } from "@/server/auth/permissions";
import { requirePage } from "@/server/auth/page-access";
import { listCompanies } from "@/server/companies/queries";
import { getCustomer, getCustomerAuthors } from "@/server/customers/queries";
import { formatDateTime } from "@/lib/format";
import { CustomerActiveForm } from "./customer-active-form";
import { CustomerForm } from "./customer-form";

export const metadata: Metadata = { title: "Cliente · Gestionale MGS Group" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ esito?: string }> };

// Parti del §16.2 che dipendono da funzioni non ancora disponibili: nessun campo finto.
const later = [
  "Codice cliente: arriverà con la numerazione di preventivi e ordini.",
  "Condizione di pagamento predefinita, banca e IBAN del cliente: arriveranno con i pagamenti.",
  "Consulente assegnata e rapporto con ciascuna società: arriveranno più avanti.",
  "Referenti e indirizzi di consegna: arriveranno nel prossimo passo.",
];

export default async function CustomerPage({ params, searchParams }: Props) {
  const { user } = await requirePage(customersPath);
  const { id } = await params;
  const { esito } = await searchParams;
  if (!uuidPattern.test(id)) notFound();
  const customer = await getCustomer(id);
  if (!customer) notFound();

  const completeness = customerCompleteness(customer);
  const authors = await getCustomerAuthors(customer);
  const canEditGroup = can(user, "customers.group_company");
  // Le società servono solo a chi può indicare la società del gruppo, o per mostrarne il nome.
  const companies =
    canEditGroup || customer.groupCompanyId
      ? (await listCompanies()).map((company) => ({
          id: company.id,
          name: company.legalName,
          isActive: company.isActive,
        }))
      : [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <BackLink href={customersPath}>Clienti</BackLink>
      <div className="flex flex-wrap items-center gap-2">
        <PageHeader title={customer.name} />
        {!customer.isActive ? <Badge tone="warning">Disattivato</Badge> : null}
      </div>

      <p className="mt-2 text-[13px] text-ink-muted" data-testid="customer-authors">
        Creato da {authors.createdBy} il {formatDateTime(customer.createdAt)} · Ultima modifica di{" "}
        {authors.updatedBy} il {formatDateTime(customer.updatedAt)}
      </p>
      <div className="mt-6 space-y-2" data-testid="completeness">
        {esito === "creato" ? <Notice tone="success">Cliente creato.</Notice> : null}
        {completeness.complete ? (
          <Notice tone="success">Completa per fatturazione.</Notice>
        ) : (
          <Notice tone="info">
            Incompleta. Per la fatturazione mancano: {completeness.missing.join(", ")}.
          </Notice>
        )}
      </div>

      <Card title="Dati del cliente">
        <CustomerForm customer={customer} companies={companies} canEditGroup={canEditGroup} />
      </Card>

      <Card title="Arriverà">
        <ul className="list-disc space-y-1 pl-5 text-ink-muted">
          {later.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>

      {can(user, "customers.deactivate") ? (
        <Card title={customer.isActive ? "Disattiva il cliente" : "Riattiva il cliente"}>
          <p className="mb-3 text-ink-muted">
            {customer.isActive
              ? "Un cliente disattivato non compare negli elenchi; i suoi dati e lo storico restano."
              : "Il cliente tornerà negli elenchi."}
          </p>
          <CustomerActiveForm id={customer.id} isActive={customer.isActive} />
        </Card>
      ) : null}

      {/* Lo storico, come il registro, è del titolare: i nomi degli autori li legge solo lui. */}
      {can(user, "audit_log.view") && can(user, "settings.manage") ? (
        <AuditHistory filter={{ customerId: customer.id }} />
      ) : null}
    </main>
  );
}
