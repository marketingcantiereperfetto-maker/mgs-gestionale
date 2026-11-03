import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { checkLogo, maxLogoBytes } from "@/domain/files/image-type";
import { brandPath, companiesPath, companyPath } from "@/lib/company-paths";
import { canManageCompanies, notAllowed, uuidPattern } from "@/server/action-helpers";
import { logosBucket } from "@/server/logos";
import { createSupabaseServerClient } from "@/server/supabase";

// Caricamento dei loghi (brand e logo di riserva della società). È un indirizzo a parte perché
// Next.js permette di alzare il limite di invio solo per tutte le azioni insieme: qui il limite
// vale solo per i loghi (1 MB di file più lo spazio del modulo).
const maxRequestBytes = maxLogoBytes + 64 * 1024;

type Target = { table: "brands" | "companies"; folder: string };

const targets: Record<string, Target> = {
  brand: { table: "brands", folder: "brands" },
  societa: { table: "companies", folder: "companies" },
};

function reply(status: number, body: { error: string } | { message: string }) {
  return NextResponse.json(body, { status });
}

// Stessa protezione delle azioni di Next.js: accetta solo richieste dal gestionale stesso.
function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return reply(403, { error: "Richiesta non consentita." });
  if (Number(request.headers.get("content-length") ?? 0) > maxRequestBytes) {
    return reply(413, { error: "Il logo supera 1 MB: riducilo e riprova." });
  }
  if (!(await canManageCompanies())) return reply(403, { error: notAllowed });

  const form = await request.formData().catch(() => null);
  const target = targets[String(form?.get("target"))];
  const id = String(form?.get("id"));
  const file = form?.get("file");
  if (!target || !uuidPattern.test(id) || !(file instanceof File)) {
    return reply(400, { error: "Richiesta non valida." });
  }

  // Il contenuto vero decide; nome e tipo dichiarati dal browser non contano.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkLogo(bytes);
  if (!check.ok) return reply(400, { error: check.error });

  const supabase = await createSupabaseServerClient();
  const { data: owner } = await supabase.from(target.table).select("id").eq("id", id).maybeSingle();
  if (!owner) return reply(404, { error: "Elemento non trovato." });

  // Nome del file sempre generato qui: codice casuale ed estensione del tipo riconosciuto.
  const path = `${target.folder}/${id}/${randomUUID()}.${check.type.extension}`;
  const upload = await supabase.storage
    .from(logosBucket)
    .upload(path, bytes, { contentType: check.type.mime, upsert: false });
  if (upload.error) return reply(500, { error: "Caricamento non riuscito. Riprova." });

  const update =
    target.table === "brands"
      ? await supabase.from("brands").update({ logo_path: path }).eq("id", id)
      : await supabase.from("companies").update({ fallback_logo_path: path }).eq("id", id);
  if (update.error) return reply(500, { error: "Logo caricato ma non collegato. Riprova." });

  revalidatePath(companiesPath);
  revalidatePath(target.table === "brands" ? brandPath(id) : companyPath(id));
  return reply(200, { message: "Logo caricato." });
}
