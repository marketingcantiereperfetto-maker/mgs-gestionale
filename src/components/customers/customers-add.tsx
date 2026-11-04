"use client";

import { useRouter } from "next/navigation";
import { AddCustomerDialog, CustomerQuickForm } from "@/components/customers/add-customer";
import { customerPath } from "@/lib/customer-paths";

// In Clienti, il cliente creato o scelto si apre nella sua scheda.

export function CustomersAddButton({ canReactivate }: { canReactivate: boolean }) {
  const router = useRouter();
  const open = (customer: { id: string }) => router.push(customerPath(customer.id));
  return <AddCustomerDialog canReactivate={canReactivate} onCreated={open} onUse={open} />;
}

export function CustomersNewForm({ canReactivate }: { canReactivate: boolean }) {
  const router = useRouter();
  const open = (customer: { id: string }) => router.push(customerPath(customer.id));
  return <CustomerQuickForm canReactivate={canReactivate} onCreated={open} onUse={open} />;
}
