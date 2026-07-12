import { NextRequest, NextResponse } from "next/server";
import { getMetaConfig, getRedirectUri, getRequestOrigin, verifyState, graphGet, MetaApiError } from "@/lib/server/meta";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

// Callback do OAuth da Meta. Chega via redirect do Facebook (sem sessão),
// por isso a identidade vem do `state` assinado. Fluxo:
// code → token curto → token de usuário de longa duração → páginas do
// usuário → Página com conta Instagram Business vinculada → salva o PAGE
// token (longa duração, sem expiração) em sm_instagram_accounts.

function redirectTo(origin: string, scheduleId: string | null, params: Record<string, string>) {
  const path = scheduleId ? `/dashboard/social-media/${scheduleId}` : "/dashboard/social-media";
  const url = new URL(path, origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url.toString());
}

interface IgAccountRef {
  id: string;
  username?: string;
}

interface PageEntry {
  id: string;
  name?: string;
  access_token?: string;
  // Vínculo clássico (Business Manager) — nem sempre preenchido
  instagram_business_account?: IgAccountRef;
  // Vínculo feito nas configurações da Página ("Contas vinculadas")
  connected_instagram_account?: IgAccountRef;
}

export async function GET(request: NextRequest) {
  // Origem pública (atrás do proxy do Render a URL interna é localhost:10000)
  const origin = getRequestOrigin(request);
  const searchParams = request.nextUrl.searchParams;
  const config = getMetaConfig();

  // state primeiro — sem ele não sabemos para onde voltar
  const rawState = searchParams.get("state") ?? "";
  const state = config ? verifyState(rawState, config.appSecret) : null;
  const scheduleId = state?.scheduleId ?? null;

  try {
    if (!config) {
      return redirectTo(origin, scheduleId, { ig: "error", reason: "config" });
    }
    if (!state) {
      return redirectTo(origin, null, { ig: "error", reason: "state" });
    }
    if (searchParams.get("error")) {
      // usuário cancelou o diálogo de autorização
      return redirectTo(origin, scheduleId, { ig: "error", reason: "denied" });
    }
    const code = searchParams.get("code");
    if (!code) {
      return redirectTo(origin, scheduleId, { ig: "error", reason: "code" });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return redirectTo(origin, scheduleId, { ig: "error", reason: "service_role" });
    }

    const redirectUri = getRedirectUri(request);

    // 1. code → token curto
    const shortToken = await graphGet<{ access_token: string }>("/oauth/access_token", {
      client_id: config.appId,
      client_secret: config.appSecret,
      redirect_uri: redirectUri,
      code,
    });

    // 2. token curto → token de usuário de longa duração (~60 dias)
    const longToken = await graphGet<{ access_token: string }>("/oauth/access_token", {
      grant_type: "fb_exchange_token",
      client_id: config.appId,
      client_secret: config.appSecret,
      fb_exchange_token: shortToken.access_token,
    });

    // Diagnóstico: permissões realmente concedidas ao token (aparece no
    // detalhe do erro se a busca de Páginas voltar vazia)
    let grantedPerms: string[] = [];
    try {
      const perms = await graphGet<{ data: { permission: string; status: string }[] }>(
        "/me/permissions",
        { access_token: longToken.access_token }
      );
      grantedPerms = (perms.data || []).filter((p) => p.status === "granted").map((p) => p.permission);
      console.log("instagram/callback: permissões do token:", grantedPerms.join(", ") || "(nenhuma)");
    } catch {
      // diagnóstico é opcional — não bloqueia o fluxo
    }

    // 3. Páginas administradas + conta IG Business vinculada.
    //    O access_token de cada Página (derivado do user token de longa
    //    duração) não expira — é ele que armazenamos.
    const pages = await graphGet<{ data: PageEntry[] }>("/me/accounts", {
      fields: "id,name,access_token,instagram_business_account{id,username},connected_instagram_account{id,username}",
      limit: "100",
      access_token: longToken.access_token,
    });

    const pageList: PageEntry[] = [...(pages.data || [])];
    let granularSummary = "";

    // Fallback: em apps Business o /me/accounts às vezes volta vazio mesmo com
    // o ativo concedido. O debug_token expõe os IDs das Páginas realmente
    // concedidos (granular_scopes) — buscamos cada uma diretamente por ID.
    if (pageList.length === 0) {
      try {
        const dbg = await graphGet<{ data?: { granular_scopes?: { scope: string; target_ids?: string[] }[] } }>(
          "/debug_token",
          {
            input_token: longToken.access_token,
            access_token: `${config.appId}|${config.appSecret}`,
          }
        );
        const scopes = dbg.data?.granular_scopes ?? [];
        granularSummary = scopes.map((g) => `${g.scope}→${g.target_ids?.length ?? 0}`).join(", ");
        console.log("instagram/callback: granular_scopes:", granularSummary || "(vazio)");

        const targetIds = new Set<string>();
        for (const g of scopes) {
          if (g.scope === "pages_show_list" || g.scope === "pages_read_engagement") {
            (g.target_ids ?? []).forEach((t) => targetIds.add(t));
          }
        }
        for (const id of targetIds) {
          try {
            const p = await graphGet<PageEntry>(`/${id}`, {
              fields: "id,name,access_token,instagram_business_account{id,username},connected_instagram_account{id,username}",
              access_token: longToken.access_token,
            });
            if (p?.id) pageList.push(p);
          } catch (e) {
            console.error("instagram/callback: fallback página", id, e);
          }
        }
        console.log(`instagram/callback: fallback recuperou ${pageList.length} página(s) por ID`);
      } catch (e) {
        console.error("instagram/callback: debug_token fallback falhou:", e);
      }
    }

    // Aceita qualquer um dos dois tipos de vínculo Página ↔ Instagram
    const igOf = (p: PageEntry) => p.instagram_business_account ?? p.connected_instagram_account;
    const withIg = pageList.filter((p) => igOf(p)?.id && p.access_token);
    console.log(
      `instagram/callback: ${pageList.length} página(s) no total, ` +
      `${withIg.length} com Instagram vinculado` +
      (pageList.length ? ` — [${pageList.map((p) => p.name ?? p.id).join(", ")}]` : "")
    );
    if (withIg.length === 0) {
      const permsInfo = ` Permissões do token: [${grantedPerms.join(", ") || "só public_profile"}].` +
        (granularSummary ? ` Ativos concedidos: [${granularSummary}].` : "");
      const detail = (pageList.length
        ? `A Meta retornou ${pageList.length} página(s) [${pageList.map((p) => p.name ?? p.id).join(", ")}], mas nenhuma com conta do Instagram vinculada visível ao app.`
        : "A Meta não retornou nenhuma Página para este login.") + permsInfo;
      return redirectTo(origin, scheduleId, { ig: "error", reason: "no_ig_account", detail });
    }

    // Com múltiplas páginas, usa a primeira com IG vinculado
    // (limitação documentada — seleção de página pode ser adicionada depois)
    const page = withIg[0];
    const ig = igOf(page)!;

    const { error: upsertErr } = await admin
      .from("sm_instagram_accounts")
      .upsert(
        {
          schedule_id: state.scheduleId,
          ig_user_id: ig.id,
          ig_username: ig.username ?? null,
          page_id: page.id,
          page_name: page.name ?? null,
          access_token: page.access_token!,
          token_expires_at: null, // page token de longa duração não expira
          connected_by: state.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "schedule_id" }
      );

    if (upsertErr) {
      console.error("instagram/callback upsert error:", upsertErr);
      const reason = upsertErr.code === "42P01" ? "migration" : "save";
      return redirectTo(origin, scheduleId, { ig: "error", reason, detail: (upsertErr.message ?? "").slice(0, 180) });
    }

    return redirectTo(origin, scheduleId, { ig: "connected", u: ig.username ?? "" });
  } catch (error) {
    console.error("Error in instagram/callback route:", error);
    const reason = error instanceof MetaApiError ? "meta_api" : "internal";
    const detail = error instanceof Error ? error.message.slice(0, 180) : "";
    return redirectTo(origin, scheduleId, { ig: "error", reason, detail });
  }
}
