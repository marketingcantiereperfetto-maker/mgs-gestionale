import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";
import { requirePage } from "@/server/auth/page-access";

export const metadata: Metadata = { title: "Consulenti · Gestionale MGS Group" };

// Pagina propria: senza, l'indirizzo finirebbe nella scheda del cliente (/clienti/[id]).
export default async function ConsultantsPage() {
  const { page } = await requirePage("/clienti/consulenti");
  return <PlaceholderPage page={page} />;
}
