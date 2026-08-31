import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/api-auth";
import { getSupabaseAdmin, ADMIN_MISSING_MSG } from "@/lib/server/supabase-admin";
import { ENCRYPTION_KEY_MISSING_MSG } from "@/lib/server/crypto";
import {
  encryptionReady,
  fetchIcsText,
  icsAccountId,
  loadConnection,
  normalizeIcsUrl,
  sealSecret,
  syncConnection,
} from "@/lib/server/calendar-sync";
import { parseIcsBusy } from "@/lib/server/ics-parse";

// POST — conecta um calendário por link .ics (iCloud/Apple, Outlook, Google
// "endereço secreto", qualquer CalDAV que publique ICS). Valida o link na
// hora (baixa e interpreta) e já faz a primeira sincronização.
//
// Limite por profissional: evita que alguém aponte dezenas de links e
// transforme o cron numa varredura de URLs arbitrárias.
const MAX_CONNECTIONS = 5;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const admin = getSupabaseAdmin();
    if (!admin) return NextResponse.json({ error: ADMIN_MISSING_MSG }, { status: 500 });
    if (!encryptionReady()) return NextResponse.json({ error: ENCRYPTION_KEY_MISSING_MSG }, { status: 500 });

    const body = (await request.json().catch(() => ({}))) as { url?: string; label?: string };
    if (!body.url || typeof body.url !== "string") {
      return NextResponse.json({ error: "Informe o link do calendário (.ics)." }, { status: 400 });
    }

    let url: string;
    try {
      url = normalizeIcsUrl(body.url);
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }

    const { count } = await admin
      .from("calendar_connections")
      .select("id", { count: "exact", head: true })
      .eq("professional_id", auth.user.id);
    if ((count ?? 0) >= MAX_CONNECTIONS) {
      return NextResponse.json(
        { error: `Você pode conectar até ${MAX_CONNECTIONS} calendários.` },
        { status: 400 }
      );
    }

    // Valida antes de gravar: link quebrado dá erro claro agora, não no cron.
    let eventsFound = 0;
    try {
      const text = await fetchIcsText(url);
      const now = Date.now();
      eventsFound = parseIcsBusy(text, {
        from: new Date(now - 86_400_000),
        to: new Date(now + 180 * 86_400_000),
      }).length;
    } catch (err) {
      return NextResponse.json(
        { error: `Não consegui ler esse calendário: ${(err as Error).message}` },
        { status: 400 }
      );
    }

    const label = (body.label ?? "").trim().slice(0, 80) || labelFromUrl(url);
    const now = new Date().toISOString();

    const { data: saved, error } = await admin
      .from("calendar_connections")
      .upsert(
        {
          professional_id: auth.user.id,
          provider: "ics",
          label,
          external_account_id: icsAccountId(url),
          calendar_ids: [],
          ics_url: sealSecret(url),
          sync_enabled: true,
          status: "active",
          last_error: null,
          updated_at: now,
        },
        { onConflict: "professional_id,provider,external_account_id" }
      )
      .select("id")
      .single();

    if (error || !saved) {
      console.error("agenda/connections POST error:", error);
      const message = error?.code === "42P01"
        ? "Tabela calendar_connections não existe — aplique a migration 68."
        : "Erro ao salvar a conexão.";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const { connection } = await loadConnection(admin, saved.id as string);
    const result = connection ? await syncConnection(admin, connection) : null;

    return NextResponse.json({
      id: saved.id,
      label,
      eventsFound,
      sync: result,
    });
  } catch (error) {
    console.error("Error in agenda/connections POST:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

function labelFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname;
    if (/icloud\.com$/i.test(host)) return "iCloud / Apple Calendar";
    if (/google\.com$/i.test(host)) return "Google Agenda (link .ics)";
    if (/(outlook|office|live)\.com$/i.test(host)) return "Outlook";
    return host;
  } catch {
    return "Calendário .ics";
  }
}
