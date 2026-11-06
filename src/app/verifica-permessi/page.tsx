import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { primaryButton, textButton } from "@/components/ui";
import { loginPath, safeNextPath } from "@/lib/auth/routes";
import { signOut } from "@/server/auth/actions";
import { getSession } from "@/server/auth/current-user";

export const metadata: Metadata = { title: "Permessi non verificati · Gestionale MGS Group" };

type Props = { searchParams: Promise<{ da?: string }> };

// Se la lettura dei permessi fallisce o non risponde in tempo, l'utente non ha nessun permesso:
// qui lo si dice chiaramente, con «Riprova» verso la pagina che stava aprendo.
export default async function PermissionsUnavailablePage({ searchParams }: Props) {
  const session = await getSession();
  if (session.status === "anonymous") redirect(loginPath);
  const { da } = await searchParams;
  const back = safeNextPath(da);
  return (
    <AuthCard title="Permessi non verificati">
      <p className="rounded-lg bg-warning-bg px-3 py-2 text-warning" role="alert">
        Impossibile verificare i permessi, riprova.
      </p>
      <p className="mt-3 text-sm text-ink-muted">
        Finché i permessi non sono verificati non puoi aprire nessuna sezione del gestionale.
      </p>
      <Link href={back} className={`${primaryButton} mt-4`} data-testid="retry">
        Riprova
      </Link>
      <form action={signOut} className="mt-4">
        <button type="submit" className={textButton}>
          Esci
        </button>
      </form>
    </AuthCard>
  );
}
