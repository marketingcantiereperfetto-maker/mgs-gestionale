import Link from "next/link";
import { Card, focusRing, textButton } from "@/components/ui";
import {
  incompleteHeadline,
  incompleteOthers,
  type IncompleteSummary,
} from "@/domain/customers/incomplete";
import { customerPath, incompleteCustomersPath } from "@/lib/customer-paths";

// Riquadro «Clienti da completare» della dashboard (cap. 16.3): conteggio e primi 5 nomi, ognuno
// con il collegamento alla scheda. Nessun altro dato del cliente.
export function IncompleteCustomersCard({ summary }: { summary: IncompleteSummary }) {
  const others = incompleteOthers(summary);
  return (
    <Card title="Clienti da completare">
      <div data-testid="incomplete-customers">
        <p data-testid="incomplete-headline">{incompleteHeadline(summary)}</p>
        {summary.sample.length > 0 ? (
          <ul className="mt-3 space-y-1.5" data-testid="incomplete-names">
            {summary.sample.map((customer) => (
              <li key={customer.id}>
                <Link
                  href={customerPath(customer.id)}
                  className={`rounded font-medium text-action hover:underline ${focusRing}`}
                >
                  {customer.name}
                </Link>
              </li>
            ))}
            {others ? (
              <li className="text-ink-muted" data-testid="incomplete-others">
                {others}
              </li>
            ) : null}
          </ul>
        ) : null}
        {summary.total > 0 ? (
          <Link href={incompleteCustomersPath} className={`${textButton} mt-3 inline-block`}>
            Vedi tutti i clienti da completare
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
