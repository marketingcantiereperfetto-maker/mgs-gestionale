import Link from "next/link";
import { Badge, Card, focusRing } from "@/components/ui";
import { customerCompleteness, subjectTypeLabels } from "@/domain/customers/customer";
import { customerPath } from "@/lib/customer-paths";
import type { Customer } from "@/server/customers/queries";

// Elenco clienti: solo nome, tipo, comune e completezza (decisione del 4 novembre 2026).
export function CustomersList({
  customers,
  emptyText,
  toggle,
  addButton,
}: {
  customers: Customer[];
  emptyText: string;
  toggle: { href: string; label: string } | null;
  // Il pulsante «Aggiungi cliente» (la maschera riutilizzabile).
  addButton: React.ReactNode;
}) {
  return (
    <Card>
      {customers.length === 0 ? (
        <p data-testid="empty-state">{emptyText}</p>
      ) : (
        <table className="w-full text-left" data-testid="customers-table">
          <caption className="sr-only">Clienti</caption>
          <thead className="text-[13px] text-ink-muted">
            <tr>
              <th scope="col" className="py-2 font-medium">
                Nome
              </th>
              <th scope="col" className="py-2 font-medium">
                Tipo
              </th>
              <th scope="col" className="py-2 font-medium">
                Comune
              </th>
              <th scope="col" className="py-2 font-medium">
                Fatturazione
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {customers.map((customer) => (
              <tr key={customer.id} data-testid="customer-row">
                <td className="py-2.5">
                  <Link
                    href={customerPath(customer.id)}
                    className={`rounded font-medium text-ink hover:underline ${focusRing}`}
                  >
                    {customer.name}
                  </Link>
                  {!customer.isActive ? (
                    <span className="ml-2">
                      <Badge tone="warning">Disattivato</Badge>
                    </span>
                  ) : null}
                </td>
                <td className="py-2.5">
                  {customer.subjectType ? subjectTypeLabels[customer.subjectType] : "—"}
                </td>
                <td className="py-2.5">{customer.addressCity ?? "—"}</td>
                <td className="py-2.5">
                  {customerCompleteness(customer).complete ? (
                    <Badge tone="success">Completa per fatturazione</Badge>
                  ) : (
                    <Badge tone="info">Incompleta</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {addButton}
        {toggle ? (
          <Link href={toggle.href} className={`rounded text-[13px] text-action ${focusRing}`}>
            {toggle.label}
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
