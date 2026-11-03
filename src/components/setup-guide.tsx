import Link from "next/link";
import { Badge, Card, Notice, primaryButton } from "@/components/ui";
import {
  completeMessage,
  statusLabels,
  type SetupGuide,
  type StepStatus,
} from "@/domain/setup/steps";

const statusTone: Record<StepStatus, "success" | "info" | "neutral"> = {
  done: "success",
  todo: "info",
  later: "neutral",
};

// Percorso guidato (cap. 5.1): elenco numerato, stato scritto a parole (non solo a colori),
// un pulsante solo dove c'è davvero qualcosa da fare.
export function SetupGuideCard({ guide }: { guide: SetupGuide }) {
  return (
    <Card title="Percorso di configurazione">
      <p className="mb-4 text-ink-muted">
        I passi del primo avvio. Lo stato si aggiorna da solo con i dati inseriti.
      </p>
      {guide.complete ? (
        <div className="mb-4">
          <Notice tone="success">{completeMessage}</Notice>
        </div>
      ) : null}
      <ol className="list-decimal space-y-4 pl-6 marker:text-ink-muted" data-testid="setup-steps">
        {guide.steps.map((step) => (
          <li key={step.title} data-testid="setup-step" data-status={step.status}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={step.status === "later" ? "text-ink-muted" : "font-medium"}>
                {step.title}
              </span>
              <Badge tone={statusTone[step.status]}>{statusLabels[step.status]}</Badge>
            </div>
            {step.details.map((detail) => (
              <p key={detail} className="mt-1 text-[13px] text-ink-muted">
                {detail}
              </p>
            ))}
            {step.action ? (
              <Link href={step.action.href} className={`${primaryButton} mt-2`}>
                {step.action.label}
              </Link>
            ) : null}
          </li>
        ))}
      </ol>
    </Card>
  );
}
