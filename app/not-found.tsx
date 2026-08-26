import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";

// Página 404 global: responde com status 404 de verdade (antes o app devolvia
// 200 com "não encontrado" — soft 404 para o Google).
export const metadata: Metadata = {
  title: "Página não encontrada | IsoScanning",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-xl px-4 py-24 text-center">
        <p className="font-mono text-sm text-muted-foreground">Erro 404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Página não encontrada</h1>
        <p className="mt-3 text-muted-foreground">
          O endereço pode ter mudado ou o conteúdo foi removido.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/">Ir para o início</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/comunidade">Ver a comunidade</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
