import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length !== 64) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  const client = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await client.rpc("sm_get_shared_calendar", {
    p_token: token,
  });

  if (error) {
    return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 404 });
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
