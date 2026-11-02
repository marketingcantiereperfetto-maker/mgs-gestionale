export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4">
      <section className="w-full rounded-2xl bg-card p-8 shadow-sm">
        <p className="text-sm font-medium text-ink-muted">Ambiente di prova</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Gestionale MGS Group</h1>
        <p className="mt-4 text-ink-muted">
          Il gestionale è in costruzione. Le prossime tappe sono l&apos;accesso con i ruoli, il menu
          in alto e l&apos;archivio di società e brand.
        </p>
      </section>
    </main>
  );
}
