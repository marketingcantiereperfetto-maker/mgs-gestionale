import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { textButton } from "@/components/ui";
import { TopBar } from "@/components/top-bar";
import { loginPath, setPasswordPath } from "@/lib/auth/routes";
import { initials } from "@/lib/initials";
import { visibleNavigation } from "@/lib/navigation";
import { signOut } from "@/server/auth/actions";
import { getSession } from "@/server/auth/current-user";
import { can, roleLabels } from "@/server/auth/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session.status === "anonymous") redirect(loginPath);
  if (session.status === "password-required") redirect(setPasswordPath);

  if (session.status === "without-profile") {
    return (
      <AuthCard title="Account non abilitato">
        <p className="rounded-lg bg-warning-bg px-3 py-2 text-warning" role="alert">
          L&apos;account {session.email} non ha un profilo attivo. Chiedi al titolare di abilitarlo.
        </p>
        <form action={signOut} className="mt-4">
          <button type="submit" className={textButton}>
            Esci
          </button>
        </form>
      </AuthCard>
    );
  }

  const { user } = session;
  const name = user.fullName ?? user.email;
  const sections = visibleNavigation((action) => can(user, action));

  return (
    <>
      <TopBar
        sections={sections}
        user={{
          name,
          initials: initials(user.fullName, user.email),
          roleLabel: roleLabels[user.role],
        }}
      />
      <div className="pt-[46px]">{children}</div>
    </>
  );
}
