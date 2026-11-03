import type { Metadata } from "next";
import Link from "next/link";
import { companyReadiness } from "@/domain/company/company";
import { companiesPath, companyPath, newCompanyPath } from "@/lib/company-paths";
import { Badge, Card, PageHeader, focusRing, primaryButton } from "@/components/ui";
import { requirePage } from "@/server/auth/page-access";
import { listCompanies } from "@/server/companies/queries";

export const metadata: Metadata = { title: "Società e brand · Gestionale MGS Group" };

type Props = { searchParams: Promise<{ disattivate?: string }> };

export default async function CompaniesPage({ searchParams }: Props) {
  const { page } = await requirePage(companiesPath);
  const showInactive = (await searchParams).disattivate === "1";
  const companies = await listCompanies();
  const visible = companies.filter((company) => showInactive || company.isActive);
  const inactiveCount = companies.length - companies.filter((company) => company.isActive).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title={page.title} subtitle={page.subtitle} />
      <Card title="Società">
        {visible.length === 0 ? (
          <div data-testid="empty-state">
            <p>Nessuna società inserita.</p>
            <p className="mt-1 text-ink-muted">
              Per iniziare basta la ragione sociale: gli altri dati si completano dopo.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line/70">
            {visible.map((company) => {
              const readiness = companyReadiness(
                company,
                company.bankAccounts.some((account) => account.isActive),
              );
              return (
                <li key={company.id} className="flex flex-wrap items-center gap-2 py-2.5">
                  <Link
                    href={companyPath(company.id)}
                    className={`rounded font-medium text-ink hover:underline ${focusRing}`}
                  >
                    {company.legalName}
                  </Link>
                  {!company.isActive ? <Badge tone="warning">Disattivata</Badge> : null}
                  {readiness.ready ? (
                    <Badge tone="success">Pronta per emettere</Badge>
                  ) : (
                    <Badge tone="info">Da completare</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Link href={newCompanyPath} className={primaryButton}>
            Aggiungi società
          </Link>
          {inactiveCount > 0 ? (
            <Link
              href={showInactive ? companiesPath : `${companiesPath}?disattivate=1`}
              className={`rounded text-[13px] text-action ${focusRing}`}
            >
              {showInactive
                ? "Nascondi le disattivate"
                : `Mostra le disattivate (${inactiveCount})`}
            </Link>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
