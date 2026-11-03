"use client";

import { useActionState } from "react";
import { ActionFeedback, ActionForm, SubmitButton } from "@/components/action-form";
import { secondaryButton } from "@/components/ui";
import { setCompanyActive, type ActionState } from "@/server/companies/actions";

export function CompanyActiveForm({ id, isActive }: { id: string; isActive: boolean }) {
  const [state, formAction] = useActionState<ActionState, FormData>(setCompanyActive, {
    error: null,
  });
  return (
    <ActionForm action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={String(!isActive)} />
      <SubmitButton
        pendingLabel={isActive ? "Disattivazione…" : "Riattivazione…"}
        className={secondaryButton}
      >
        {isActive ? "Disattiva" : "Riattiva"}
      </SubmitButton>
      <ActionFeedback state={state} />
    </ActionForm>
  );
}
