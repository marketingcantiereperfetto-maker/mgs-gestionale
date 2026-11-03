import { redirect } from "next/navigation";
import { loginPath } from "@/lib/auth/routes";
import { signOut } from "@/server/auth/actions";
import { getSession } from "@/server/auth/current-user";
import { roleLabels } from "@/server/auth/permissions";
import { getDatabaseStatus, type DatabaseStatus } from "@/server/database-status";

const statusLabels: Record<DatabaseStatus, string> = {
  collegato: "attivo",
  "non-configurato": "non configurato",
  "non-raggiungibile": "non raggiungibile",
};

function companiesLabel(count: number): string {
  if (count === 0) return "nessuna società collegata";
  return count === 1 ? "1 società collegata" : `${count} società collegate`;
}

export default async function HomePage() {
  const session = await getSession();
  if (session.status === "anonymous") redirect(loginPath);
  const databaseStatus = await getDatabaseStatus();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4">
      <section className="w-full rounded-2xl bg-card p-8 shadow-sm">
        <p className="text-sm font-medium text-ink-muted">Ambiente di prova</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Gestionale MGS Group</h1>

        {session.status === "active" ? (
          <p className="mt-4" data-testid="current-user">
            Sei collegato come <strong>{session.user.fullName ?? session.user.email}</strong> ·{" "}
            {roleLabels[session.user.role]} · {companiesLabel(session.user.companyIds.length)}
          </p>
        ) : (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            L&apos;account {session.email} non ha un profilo attivo. Chiedi al titolare di
            abilitarlo.
          </p>
        )}

        <p className="mt-6 text-sm" data-testid="database-status">
          Collegamento al database:{" "}
          <span className={databaseStatus === "collegato" ? "text-action" : "text-ink-muted"}>
            {statusLabels[databaseStatus]}
          </span>
        </p>

        <form action={signOut} className="mt-6">
          <button type="submit" className="text-sm font-medium text-action">
            Esci
          </button>
        </form>
      </section>
    </main>
  );
}
