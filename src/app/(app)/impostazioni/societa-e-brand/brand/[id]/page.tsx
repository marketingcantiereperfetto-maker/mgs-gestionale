import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LogoUploader } from "@/components/logo-uploader";
import { Badge, BackLink, Card, Notice, PageHeader } from "@/components/ui";
import { companiesPath } from "@/lib/company-paths";
import { uuidPattern } from "@/server/action-helpers";
import { requirePage } from "@/server/auth/page-access";
import { getBrand } from "@/server/brands/queries";
import { listCompanies } from "@/server/companies/queries";
import { signedLogoUrl } from "@/server/logos";
import { BrandActiveForm, BrandCompaniesForm, BrandNameForm } from "./brand-forms";

export const metadata: Metadata = { title: "Brand · Gestionale MGS Group" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ esito?: string }> };

export default async function BrandPage({ params, searchParams }: Props) {
  await requirePage(companiesPath);
  const { id } = await params;
  const { esito } = await searchParams;
  if (!uuidPattern.test(id)) notFound();
  const brand = await getBrand(id);
  if (!brand) notFound();

  // Si possono collegare le società attive; quelle disattivate restano visibili se già collegate.
  const companies = (await listCompanies())
    .filter((company) => company.isActive || brand.companyIds.includes(company.id))
    .map((company) => ({ id: company.id, name: company.legalName, isActive: company.isActive }));
  const logoUrl = await signedLogoUrl(brand.logoPath);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <BackLink href={companiesPath}>Società e brand</BackLink>
      <div className="flex flex-wrap items-center gap-2">
        <PageHeader title={brand.name} />
        {!brand.isActive ? <Badge tone="warning">Disattivato</Badge> : null}
      </div>
      <div className="mt-6 space-y-2">
        {esito === "creato" ? <Notice tone="success">Brand creato.</Notice> : null}
        {brand.companyIds.length === 0 ? (
          <Notice tone="info">Questo brand non è collegato a nessuna società.</Notice>
        ) : null}
      </div>

      <Card title="Nome">
        <BrandNameForm id={brand.id} name={brand.name} />
      </Card>
      <Card title="Logo">
        <LogoUploader
          target="brand"
          id={brand.id}
          logoUrl={logoUrl}
          alt={`Logo di ${brand.name}`}
        />
      </Card>
      <Card title="Società collegate">
        <BrandCompaniesForm brandId={brand.id} companies={companies} linkedIds={brand.companyIds} />
      </Card>
      <Card title={brand.isActive ? "Disattiva il brand" : "Riattiva il brand"}>
        <p className="mb-3 text-ink-muted">
          {brand.isActive
            ? "Un brand disattivato non compare negli elenchi; logo, collegamenti e storico restano."
            : "Il brand tornerà negli elenchi."}
        </p>
        <BrandActiveForm id={brand.id} isActive={brand.isActive} />
      </Card>
    </main>
  );
}
