import { formatDateTime } from "@/lib/format";
import type { AuditRow } from "@/server/audit/queries";

// Righe del registro: quando, chi, cosa e i campi cambiati. Solo testo già tradotto.
export function AuditList({ rows }: { rows: AuditRow[] }) {
  return (
    <ol className="divide-y divide-line/70" data-testid="audit-list">
      {rows.map((row) => (
        <li key={row.id} className="py-2.5" data-testid="audit-row">
          <p>
            <span className="text-[13px] text-ink-muted">
              <time dateTime={row.occurredAt}>{formatDateTime(row.occurredAt)}</time>
            </span>{" "}
            <strong className="font-semibold">{row.actor}</strong> {row.sentence}
          </p>
          {row.changes.length > 0 ? (
            <ul className="mt-1 space-y-0.5 text-[13px] text-ink-muted">
              {row.changes.map((change) => (
                <li key={change.label}>
                  {change.before === undefined ? (
                    <>{change.label}: modificato</>
                  ) : (
                    <>
                      {change.label}: {change.before} →{" "}
                      <span className="text-ink">{change.after}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
