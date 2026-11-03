import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { textButton } from "@/components/ui";
import { signOut } from "@/server/auth/actions";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Imposta la password · Gestionale MGS Group" };

export default function SetPasswordPage() {
  return (
    <AuthCard title="Imposta la password">
      <p className="mb-4 text-sm text-ink-muted">
        Scegli la tua password personale: serve per entrare nel gestionale.
      </p>
      <PasswordForm />
      <form action={signOut} className="mt-4">
        <button type="submit" className={textButton}>
          Esci
        </button>
      </form>
    </AuthCard>
  );
}
