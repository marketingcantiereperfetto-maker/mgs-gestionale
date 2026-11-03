import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, buttonClass, FormError } from "@/components/auth-card";
import { loginPath, setPasswordPath } from "@/lib/auth/routes";
import { confirmInvite } from "@/server/auth/actions";

export const metadata: Metadata = {
  title: "Attiva l'account · Gestionale MGS Group",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

type SearchParams = { token_hash?: string; type?: string; next?: string };

export default async function ConfirmInvitePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { token_hash: tokenHash, type, next } = await searchParams;

  if (!tokenHash || type !== "invite") {
    return (
      <AuthCard title="Attiva l'account">
        <FormError message="Il link non è valido. Chiedi al titolare un nuovo invito." />
        <Link href={loginPath} className="mt-6 inline-block text-sm font-medium text-action">
          Vai alla pagina di accesso
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Attiva l'account">
      <p className="text-ink-muted">
        Sei stato invitato nel Gestionale MGS Group. Premi il pulsante per attivare l&apos;account:
        subito dopo sceglierai la tua password.
      </p>
      <form action={confirmInvite} className="mt-6">
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="next" value={next ?? setPasswordPath} />
        <button type="submit" className={buttonClass}>
          Attiva l&apos;account
        </button>
      </form>
    </AuthCard>
  );
}
