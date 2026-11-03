import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard, FormError } from "@/components/auth-card";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { getSession } from "@/server/auth/current-user";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Accedi · Gestionale MGS Group" };

const errorMessages: Record<string, string> = {
  "link-non-valido": "Il link non è valido o è scaduto. Chiedi al titolare un nuovo invito.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ errore?: string }>;
}) {
  const session = await getSession();
  if (session.status !== "anonymous") redirect("/");
  const { errore } = await searchParams;

  return (
    <AuthCard title="Accedi">
      <div className="mb-4">
        <FormError message={(errore && errorMessages[errore]) || null} />
      </div>
      {readSupabaseEnv() ? (
        <LoginForm />
      ) : (
        <p className="text-ink-muted">L&apos;accesso non è ancora configurato.</p>
      )}
      <p className="mt-6 text-sm text-ink-muted">
        L&apos;accesso è solo su invito. Se non hai un account, chiedilo al titolare.
      </p>
    </AuthCard>
  );
}
