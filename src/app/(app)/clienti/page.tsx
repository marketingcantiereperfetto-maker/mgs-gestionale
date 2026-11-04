import type { Metadata } from "next";
import Link from "next/link";
import { CustomersList } from "@/components/customers-list";
import { Card, PageHeader, fieldClass, focusRing, primaryButton } from "@/components/ui";
import { maxSearchLength } from "@/domain/customers/search";
import { customersPath } from "@/lib/customer-paths";
import { requirePage } from "@/server/auth/page-access";
import { listCustomers } from "@/server/customers/queries";

export const metadata: Metadata = { title: "Clienti · Gestionale MGS Group" };

type Props = { searchParams: Promise<{ disattivati?: string; cerca?: string }> };

function listHref(search: string, showInactive: boolean): string {
  const query = new URLSearchParams();
  if (search) query.set("cerca", search);
  if (showInactive) query.set("disattivati", "1");
  const text = query.toString();
  return text ? `${customersPath}?${text}` : customersPath;
}

export default async function CustomersPage({ searchParams }: Props) {
  const { page } = await requirePage(customersPath);
  const params = await searchParams;
  const showInactive = params.disattivati === "1";
  const search = (params.cerca ?? "").trim().slice(0, maxSearchLength);
  const customers = await listCustomers(search);
  const inactive = customers.filter((customer) => !customer.isActive).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title={page.title} subtitle={page.subtitle} />
      <Card>
        <form
          method="get"
          action={customersPath}
          role="search"
          className="flex flex-wrap items-end gap-3"
        >
          {showInactive ? <input type="hidden" name="disattivati" value="1" /> : null}
          <label className="block min-w-64 flex-1 text-[13px] text-ink-muted">
            Cerca per nome, partita IVA, codice fiscale o PEC
            <input
              type="search"
              name="cerca"
              defaultValue={search}
              maxLength={maxSearchLength}
              className={`${fieldClass} text-[14px]`}
            />
          </label>
          <button type="submit" className={primaryButton}>
            Cerca
          </button>
          {search ? (
            <Link
              href={listHref("", showInactive)}
              className={`rounded pb-1.5 text-[13px] text-action ${focusRing}`}
            >
              Azzera
            </Link>
          ) : null}
        </form>
      </Card>
      <CustomersList
        customers={customers.filter((customer) => showInactive || customer.isActive)}
        emptyText={
          search
            ? "Nessun cliente trovato con questa ricerca."
            : "Nessun cliente inserito. Per iniziare basta il nome o la ragione sociale."
        }
        toggle={
          inactive > 0
            ? showInactive
              ? { href: listHref(search, false), label: "Nascondi i disattivati" }
              : { href: listHref(search, true), label: `Mostra i disattivati (${inactive})` }
            : null
        }
      />
    </main>
  );
}
