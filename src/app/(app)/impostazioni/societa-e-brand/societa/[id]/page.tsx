import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { companyReadiness } from "@/domain/company/company";
import { companiesPath } from "@/lib/company-paths";
import { Badge, BackLink, Card, Notice, PageHeader, secondaryButton } from "@/components/ui";
import { requirePage } from "@/server/auth/page-access";
import { setCompanyActive } from "@/server/companies/actions";
import { getCompany } from "@/server/companies/queries";
import { BankAccounts } from "./bank-accounts";
import { CompanyForm } from "./company-form";

export const metadata: Metadata = { title: "Società · Gestionale MGS Group" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvata?: string; conti?: string }>;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CompanyPage({ params, searchParams }: Props) {
  await requirePage(companiesPath);
  const { id } = await params;
  const { salvata, conti } = await searchParams;
  if (!uuidPattern.test(id)) notFound();
  const company = await getCompany(id);
  if (!company) notFound();

  const activeAccounts = company.bankAccounts.filter((account) => account.isActive);
  const readiness = companyReadiness(company, activeAccounts.length > 0);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <BackLink href={companiesPath}>Società e brand</BackLink>
      <div className="flex flex-wrap items-center gap-2">
        <PageHeader title={company.legalName} />
        {!company.isActive ? <Badge tone="warning">Disattivata</Badge> : null}
      </div>

      <div className="mt-6 space-y-2" data-testid="readiness">
        {salvata ? <Notice tone="success">Dati salvati.</Notice> : null}
        {readiness.ready ? (
          <Notice tone="success">Pronta per emettere preventivi.</Notice>
        ) : (
          <Notice tone="info">
            Per emettere preventivi mancano: {readiness.missing.join(", ")}.
          </Notice>
        )}
        {readiness.bankAccountMissing ? (
          <Notice tone="info">Nessun conto attivo: l&apos;IBAN serve se usi il bonifico.</Notice>
        ) : null}
      </div>

      <Card title="Dati della società">
        <CompanyForm company={company} />
      </Card>

      <Card title="Conti bancari">
        <BankAccounts
          companyId={company.id}
          accounts={company.bankAccounts}
          showInactive={conti === "tutti"}
        />
      </Card>

      <Card title={company.isActive ? "Disattiva la società" : "Riattiva la società"}>
        <p className="mb-3 text-ink-muted">
          {company.isActive
            ? "Una società disattivata non compare negli elenchi; i suoi dati e lo storico restano."
            : "La società tornerà negli elenchi."}
        </p>
        <form action={setCompanyActive}>
          <input type="hidden" name="id" value={company.id} />
          <input type="hidden" name="active" value={String(!company.isActive)} />
          <button type="submit" className={secondaryButton}>
            {company.isActive ? "Disattiva" : "Riattiva"}
          </button>
        </form>
      </Card>
    </main>
  );
}
