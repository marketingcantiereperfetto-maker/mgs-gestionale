import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";
import { profilePage } from "@/lib/navigation";
import { roleLabels } from "@/server/auth/permissions";
import { requirePage } from "@/server/auth/page-access";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Il mio profilo · Gestionale MGS Group" };

export default async function ProfilePage() {
  const { user, page } = await requirePage(profilePage.href);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title={page.title} subtitle={page.subtitle} />
      <Card>
        <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[14px]">
          <dt className="text-ink-muted">Email</dt>
          <dd>{user.email}</dd>
          <dt className="text-ink-muted">Ruolo</dt>
          <dd>{roleLabels[user.role]}</dd>
        </dl>
        <ProfileForm fullName={user.fullName} />
      </Card>
    </main>
  );
}
