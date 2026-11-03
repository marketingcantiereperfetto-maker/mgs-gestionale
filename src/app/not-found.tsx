import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-24">
      <h1 className="text-[28px] font-semibold tracking-tight">Pagina non trovata</h1>
      <p className="mt-1 text-ink-muted">L&apos;indirizzo non corrisponde a nessuna sezione.</p>
      <Link
        href="/"
        className="button button-primary mt-6 inline-block rounded-full px-4 py-2 font-medium"
      >
        Torna alla dashboard
      </Link>
    </main>
  );
}
