import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { companyReadiness } from "@/domain/company/company";
import Link from "next/link";
import { AuditHistory } from "@/components/audit-history";
import { LogoUploader } from "@/components/logo-uploader";
import { brandPath, companiesPath, newBrandPath } from "@/lib/company-paths";
import { listBrands } from "@/server/brands/queries";
import { signedLogoUrl } from "@/server/logos";
import { Badge, BackLink, Card, Notice, PageHeader, focusRing } from "@/components/ui";
import { requirePage } from "@/server/auth/page-access";
import { getCompany } from "@/server/companies/queries";
import { BankAccounts } from "./bank-accounts";
import { CompanyActiveForm } from "./company-active-form";
import { CompanyForm } from "./company-form";

export const metadata: Metadata = { title: "Società · Gestionale MGS Group" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ esito?: string; conti?: string }>;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CompanyPage({ params, searchParams }: Props) {
  await requirePage(companiesPath);
  const { id } = await params;
  const { esito, conti } = await searchParams;
  if (!uuidPattern.test(id)) notFound();
  const company = await getCompany(id);
  if (!company) notFound();

  const brands = (await listBrands()).filter((brand) => brand.companyIds.includes(company.id));
  const fallbackLogoUrl = await signedLogoUrl(company.fallbackLogoPath);
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
        {esito === "creata" ? <Notice tone="success">Società creata.</Notice> : null}
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

      <Card title="Brand">
        {brands.length === 0 ? (
          <p>Nessun brand collegato. Il collegamento si fa dalla scheda del brand.</p>
        ) : (
          <ul className="flex flex-wrap gap-3">
            {brands.map((brand) => (
              <li key={brand.id} className="flex items-center gap-2">
                <Link
                  href={brandPath(brand.id)}
                  className={`rounded font-medium hover:underline ${focusRing}`}
                >
                  {brand.name}
                </Link>
                {!brand.isActive ? <Badge tone="warning">Disattivato</Badge> : null}
              </li>
            ))}
          </ul>
        )}
        <Link
          href={newBrandPath}
          className={`mt-3 inline-block rounded text-[13px] text-action ${focusRing}`}
        >
          Aggiungi un brand
        </Link>
      </Card>

      <Card title="Logo di riserva">
        <p className="mb-3 text-ink-muted">Si usa quando il brand del documento non ha un logo.</p>
        <LogoUploader
          target="societa"
          id={company.id}
          logoUrl={fallbackLogoUrl}
          alt={`Logo di riserva di ${company.legalName}`}
        />
      </Card>

      <Card title={company.isActive ? "Disattiva la società" : "Riattiva la società"}>
        <p className="mb-3 text-ink-muted">
          {company.isActive
            ? "Una società disattivata non compare negli elenchi; i suoi dati e lo storico restano."
            : "La società tornerà negli elenchi."}
        </p>
        <CompanyActiveForm id={company.id} isActive={company.isActive} />
      </Card>
      <AuditHistory filter={{ companyId: company.id }} />
    </main>
  );
}
