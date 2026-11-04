import type { Metadata } from "next";
import { CustomersList } from "@/components/customers-list";
import { PageHeader } from "@/components/ui";
import { customersPath } from "@/lib/customer-paths";
import { requirePage } from "@/server/auth/page-access";
import { listCustomers } from "@/server/customers/queries";

export const metadata: Metadata = { title: "Clienti · Gestionale MGS Group" };

type Props = { searchParams: Promise<{ disattivati?: string }> };

export default async function CustomersPage({ searchParams }: Props) {
  const { page } = await requirePage(customersPath);
  const showInactive = (await searchParams).disattivati === "1";
  const customers = await listCustomers();
  const inactive = customers.filter((customer) => !customer.isActive).length;
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title={page.title} subtitle={page.subtitle} />
      <CustomersList
        customers={customers.filter((customer) => showInactive || customer.isActive)}
        emptyText="Nessun cliente inserito. Per iniziare basta il nome o la ragione sociale."
        toggle={
          inactive > 0
            ? showInactive
              ? { href: customersPath, label: "Nascondi i disattivati" }
              : {
                  href: `${customersPath}?disattivati=1`,
                  label: `Mostra i disattivati (${inactive})`,
                }
            : null
        }
      />
    </main>
  );
}
