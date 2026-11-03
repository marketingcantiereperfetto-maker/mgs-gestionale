import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";
import { findPage } from "@/lib/navigation";
import { requirePage } from "@/server/auth/page-access";

type Props = { params: Promise<{ path: string[] }> };

const hrefOf = (path: string[]) => `/${path.join("/")}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = findPage(hrefOf((await params).path))?.page;
  return { title: `${page?.title ?? "Pagina non trovata"} · Gestionale MGS Group` };
}

export default async function SectionPage({ params }: Props) {
  const { page } = await requirePage(hrefOf((await params).path));
  return <PlaceholderPage page={page} />;
}
