import type { Metadata } from "next";
import { CustomersAddButton } from "@/components/customers/customers-add";
import { CustomersList } from "@/components/customers-list";
import { can } from "@/server/auth/permissions";
import { PageHeader } from "@/components/ui";
import { customerCompleteness } from "@/domain/customers/customer";
import { incompleteCustomersPath } from "@/lib/customer-paths";
import { requirePage } from "@/server/auth/page-access";
import { listCustomers } from "@/server/customers/queries";

export const metadata: Metadata = { title: "Clienti da completare · Gestionale MGS Group" };

export default async function IncompleteCustomersPage() {
  const { page, user } = await requirePage(incompleteCustomersPath);
  const active = (await listCustomers()).filter((customer) => customer.isActive);
  const customers = active.filter((customer) => !customerCompleteness(customer).complete);
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title={page.title} subtitle={page.subtitle} />
      <CustomersList
        addButton={<CustomersAddButton canReactivate={can(user, "customers.deactivate")} />}
        customers={customers}
        emptyText={
          active.length === 0
            ? "Nessun cliente attivo inserito. Per iniziare basta il nome o la ragione sociale."
            : "Tutti i clienti attivi sono completi per la fatturazione."
        }
        toggle={null}
      />
    </main>
  );
}
