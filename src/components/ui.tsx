import Link from "next/link";

// Elementi comuni dell'interfaccia (docs/05_STILE_INTERFACCIA.md).

export const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-action";

// Colori, effetto «premuto» e bordo di selezione dei pulsanti stanno in globals.css.
export const primaryButton =
  "button button-primary inline-flex items-center rounded-full px-4 py-1.5 font-medium disabled:opacity-60";
export const secondaryButton =
  "button button-secondary inline-flex items-center rounded-full px-4 py-1.5 font-medium disabled:opacity-60";
export const textButton = "button button-text rounded text-[13px] font-medium";
export const fieldClass = `mt-1 w-full rounded-[10px] border border-line bg-card px-3 py-1.5 text-ink ${focusRing}`;

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-1 text-ink-muted">{subtitle}</p> : null}
    </>
  );
}

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,.06)]">
      {title ? <h2 className="mb-3 text-[17px] font-semibold">{title}</h2> : null}
      {children}
    </section>
  );
}

type Tone = "info" | "success" | "warning";

const toneClass: Record<Tone, string> = {
  info: "bg-info-bg text-info",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
};

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[12px] font-medium ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}

export function Notice({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <p
      role={tone === "warning" ? "alert" : "status"}
      className={`rounded-lg px-3 py-2 ${toneClass[tone]}`}
    >
      {children}
    </p>
  );
}

export function FieldError({ id, message }: { id: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-[13px] text-error">
      {message}
    </p>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`mb-4 inline-block rounded text-[13px] text-ink-muted hover:text-ink ${focusRing}`}
    >
      ← {children}
    </Link>
  );
}
