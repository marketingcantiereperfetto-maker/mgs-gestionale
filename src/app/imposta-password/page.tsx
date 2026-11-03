import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Imposta la password · Gestionale MGS Group" };

export default function SetPasswordPage() {
  return (
    <AuthCard title="Imposta la password">
      <PasswordForm />
    </AuthCard>
  );
}
