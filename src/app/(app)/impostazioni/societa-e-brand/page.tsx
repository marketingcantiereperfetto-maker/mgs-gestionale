import type { Metadata } from "next";
import Link from "next/link";
import { companyReadiness } from "@/domain/company/company";
import {
  brandPath,
  companiesPath,
  companyPath,
  newBrandPath,
  newCompanyPath,
} from "@/lib/company-paths";
import { Badge, Card, PageHeader, focusRing, primaryButton } from "@/components/ui";
import { requirePage } from "@/server/auth/page-access";
import { listBrands } from "@/server/brands/queries";
import { listCompanies } from "@/server/companies/queries";

export const metadata: Metadata = { title: "Società e brand · Gestionale MGS Group" };

type Props = { searchParams: Promise<{ disattivate?: string; brand?: string }> };

function toggleHref(
  params: { disattivate?: string; brand?: string },
  key: "disattivate" | "brand",
) {
  const next = new URLSearchParams();
  if (params.disattivate === "1" && key !== "disattivate") next.set("disattivate", "1");
  if (params.brand === "tutti" && key !== "brand") next.set("brand", "tutti");
  if (key === "disattivate" && params.disattivate !== "1") next.set("disattivate", "1");
  if (key === "brand" && params.brand !== "tutti") next.set("brand", "tutti");
  const query = next.toString();
  return query ? `${companiesPath}?${query}` : companiesPath;
}

export default async function CompaniesPage({ searchParams }: Props) {
  const { page } = await requirePage(companiesPath);
  const params = await searchParams;
  const showInactive = params.disattivate === "1";
  const showInactiveBrands = params.brand === "tutti";
  const [companies, brands] = await Promise.all([listCompanies(), listBrands()]);
  const visibleBrands = brands.filter((brand) => showInactiveBrands || brand.isActive);
  const inactiveBrands = brands.length - brands.filter((brand) => brand.isActive).length;
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
              href={toggleHref(params, "disattivate")}
              className={`rounded text-[13px] text-action ${focusRing}`}
            >
              {showInactive
                ? "Nascondi le disattivate"
                : `Mostra le disattivate (${inactiveCount})`}
            </Link>
          ) : null}
        </div>
      </Card>

      <Card title="Brand">
        {visibleBrands.length === 0 ? (
          <div>
            <p>Nessun brand inserito.</p>
            <p className="mt-1 text-ink-muted">
              Basta il nome; poi aggiungi il logo e collega il brand alle società che lo usano.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line/70">
            {visibleBrands.map((brand) => (
              <li key={brand.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <Link
                  href={brandPath(brand.id)}
                  className={`rounded font-medium text-ink hover:underline ${focusRing}`}
                >
                  {brand.name}
                </Link>
                {!brand.isActive ? <Badge tone="warning">Disattivato</Badge> : null}
                {brand.companyIds.length === 0 ? (
                  <Badge tone="info">Nessuna società</Badge>
                ) : (
                  <span className="text-[13px] text-ink-muted">
                    {brand.companyIds.length === 1
                      ? "1 società"
                      : `${brand.companyIds.length} società`}
                  </span>
                )}
                {!brand.logoPath ? <Badge tone="info">Senza logo</Badge> : null}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Link href={newBrandPath} className={primaryButton}>
            Aggiungi brand
          </Link>
          {inactiveBrands > 0 ? (
            <Link
              href={toggleHref(params, "brand")}
              className={`rounded text-[13px] text-action ${focusRing}`}
            >
              {showInactiveBrands
                ? "Nascondi i disattivati"
                : `Mostra i disattivati (${inactiveBrands})`}
            </Link>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
