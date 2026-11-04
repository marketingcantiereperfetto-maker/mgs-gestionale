import type { Metadata } from "next";
import { SetupGuideCard } from "@/components/setup-guide";
import { Card, Notice, PageHeader } from "@/components/ui";
import { dashboardSetup } from "@/domain/setup/steps";
import { can } from "@/server/auth/permissions";
import { requirePage } from "@/server/auth/page-access";
import { getDatabaseStatus, type DatabaseStatus } from "@/server/database-status";
import { loadSetupFacts } from "@/server/setup/facts";
import { createSupabaseServerClient } from "@/server/supabase";

export const metadata: Metadata = { title: "Dashboard · Gestionale MGS Group" };

const statusLabels: Record<DatabaseStatus, string> = {
  collegato: "attivo",
  "non-configurato": "non configurato",
  "non-raggiungibile": "non raggiungibile",
};

type Props = { searchParams: Promise<{ accesso?: string }> };

export default async function DashboardPage({ searchParams }: Props) {
  const { page, user } = await requirePage("/");
  const { accesso } = await searchParams;
  // Il percorso lo calcola solo chi configura società e brand (il titolare).
  const [setup, databaseStatus] = await Promise.all([
    dashboardSetup(can(user, "companies.manage"), async () =>
      loadSetupFacts(await createSupabaseServerClient()),
    ),
    getDatabaseStatus(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {accesso === "negato" ? (
        <div className="mb-6">
          <Notice tone="warning">
            Non hai accesso a quella sezione: sei tornato alla dashboard.
          </Notice>
        </div>
      ) : null}
      <PageHeader title={page.title} subtitle={page.subtitle} />
      <Card>
        <p data-testid="empty-state">
          Non ci sono ancora dati da mostrare: collegamenti rapidi e indicatori arriveranno con
          preventivi e ordini.
        </p>
      </Card>
      {setup.kind === "guide" ? (
        <SetupGuideCard guide={setup.guide} />
      ) : (
        <Card>
          <p data-testid="setup-message">{setup.text}</p>
        </Card>
      )}
      <p className="mt-6 text-[13px] text-ink-muted" data-testid="database-status">
        Collegamento al database: {statusLabels[databaseStatus]}
      </p>
    </main>
  );
}
