// Guarda das rotas /app/api/admin/* (server-side). Mesma regra do AdminGuard
// do backend: JWT válido + e-mail igual ao ADMIN_EMAIL (fallback: o e-mail
// do fundador em lib/admin-config).

import { NextRequest, NextResponse } from "next/server";
import { requireUser, type AuthenticatedRequest } from "@/lib/server/api-auth";
import { PLATFORM_ADMIN_EMAIL } from "@/lib/admin-config";

export async function requirePlatformAdmin(
  request: NextRequest
): Promise<{ auth: AuthenticatedRequest; denied: null } | { auth: null; denied: NextResponse }> {
  const auth = await requireUser(request);
  if (!auth) {
    return { auth: null, denied: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }
  const adminEmail = (process.env.ADMIN_EMAIL || PLATFORM_ADMIN_EMAIL).toLowerCase().trim();
  if ((auth.user.email ?? "").toLowerCase().trim() !== adminEmail) {
    return { auth: null, denied: NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 }) };
  }
  return { auth, denied: null };
}
