// TEMPORÁRIO — diagnóstico de memória. Remover após o teste.
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const url = new URL(req.url);
  const g = (globalThis as unknown as { gc?: () => void }).gc;
  if (url.searchParams.get("gc") && g) g();
  const m = process.memoryUsage();
  const mb = (n: number) => Math.round(n / 1048576);
  return NextResponse.json({ rss: mb(m.rss), heapUsed: mb(m.heapUsed), heapTotal: mb(m.heapTotal), external: mb(m.external), arrayBuffers: mb(m.arrayBuffers) });
}
