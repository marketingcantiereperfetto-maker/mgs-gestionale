import type { Metadata } from "next";
import { BackLink, Card, PageHeader } from "@/components/ui";
import { companiesPath } from "@/lib/company-paths";
import { requirePage } from "@/server/auth/page-access";
import { NewBrandForm } from "./new-brand-form";

export const metadata: Metadata = { title: "Nuovo brand · Gestionale MGS Group" };

export default async function NewBrandPage() {
  await requirePage(companiesPath);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <BackLink href={companiesPath}>Società e brand</BackLink>
      <PageHeader
        title="Nuovo brand"
        subtitle="Basta il nome: logo e società collegate si aggiungono dopo."
      />
      <Card>
        <NewBrandForm />
      </Card>
    </main>
  );
}
