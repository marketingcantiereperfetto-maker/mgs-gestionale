import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";
import { requirePage } from "@/server/auth/page-access";
import { getDatabaseStatus, type DatabaseStatus } from "@/server/database-status";

export const metadata: Metadata = { title: "Dashboard · Gestionale MGS Group" };

const statusLabels: Record<DatabaseStatus, string> = {
  collegato: "attivo",
  "non-configurato": "non configurato",
  "non-raggiungibile": "non raggiungibile",
};

type Props = { searchParams: Promise<{ accesso?: string }> };

export default async function DashboardPage({ searchParams }: Props) {
  const { page } = await requirePage("/");
  const { accesso } = await searchParams;
  const databaseStatus = await getDatabaseStatus();

  return (
    <>
      <PlaceholderPage
        page={page}
        notice={
          accesso === "negato" ? (
            <p role="alert" className="mb-6 rounded-lg bg-warning-bg px-3 py-2 text-warning">
              Non hai accesso a quella sezione: sei tornato alla dashboard.
            </p>
          ) : null
        }
      />
      <p
        className="mx-auto max-w-6xl px-4 text-[13px] text-ink-muted"
        data-testid="database-status"
      >
        Collegamento al database: {statusLabels[databaseStatus]}
      </p>
    </>
  );
}
