import type { Metadata } from "next";
import { BackLink, Card, PageHeader } from "@/components/ui";
import { customersPath, newCustomerPath } from "@/lib/customer-paths";
import { requirePage } from "@/server/auth/page-access";
import { CustomersNewForm } from "@/components/customers/customers-add";
import { can } from "@/server/auth/permissions";

export const metadata: Metadata = { title: "Nuovo cliente · Gestionale MGS Group" };

export default async function NewCustomerPage() {
  const { page, user } = await requirePage(newCustomerPath);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <BackLink href={customersPath}>Clienti</BackLink>
      <PageHeader title={page.title} subtitle={page.subtitle} />
      <Card>
        <CustomersNewForm canReactivate={can(user, "customers.deactivate")} />
      </Card>
    </main>
  );
}
