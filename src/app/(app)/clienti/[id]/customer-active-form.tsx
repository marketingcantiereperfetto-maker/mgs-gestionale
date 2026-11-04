"use client";

import { useActionState } from "react";
import { ActionFeedback, ActionForm, SubmitButton } from "@/components/action-form";
import { secondaryButton } from "@/components/ui";
import { setCustomerActive } from "@/server/customers/actions";

export function CustomerActiveForm({ id, isActive }: { id: string; isActive: boolean }) {
  const [state, formAction] = useActionState(setCustomerActive, { error: null });
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
