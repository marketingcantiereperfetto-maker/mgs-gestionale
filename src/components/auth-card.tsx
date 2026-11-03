export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <section className="w-full rounded-2xl bg-card p-8 shadow-sm">
        <p className="text-sm font-medium text-ink-muted">Gestionale MGS Group</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}

export const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-action focus:ring-2 focus:ring-action/20";

export const buttonClass =
  "w-full rounded-lg bg-action px-4 py-2 font-medium text-white disabled:opacity-60";
