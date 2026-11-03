import type { Metadata } from "next";
import { BackLink, Card, PageHeader } from "@/components/ui";
import { companiesPath } from "@/lib/company-paths";
import { requirePage } from "@/server/auth/page-access";
import { NewCompanyForm } from "./new-company-form";

export const metadata: Metadata = { title: "Nuova società · Gestionale MGS Group" };

export default async function NewCompanyPage() {
  await requirePage(companiesPath);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <BackLink href={companiesPath}>Società e brand</BackLink>
      <PageHeader
        title="Nuova società"
        subtitle="Basta la ragione sociale: partita IVA, sede, email e IBAN si aggiungono dopo."
      />
      <Card>
        <NewCompanyForm />
      </Card>
    </main>
  );
}
