import type { NavPage } from "@/lib/navigation";

// Pagina segnaposto: titolo, sottotitolo e uno stato vuoto che dice cosa manca.
// Nessun numero e nessuno zero finto.
export function PlaceholderPage({ page, notice }: { page: NavPage; notice?: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {notice}
      <h1 className="text-[28px] font-semibold tracking-tight">{page.title}</h1>
      <p className="mt-1 text-ink-muted">{page.subtitle}</p>
      <section className="mt-6 rounded-2xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,.06)]">
        <p data-testid="empty-state">{page.emptyState}</p>
      </section>
    </main>
  );
}
