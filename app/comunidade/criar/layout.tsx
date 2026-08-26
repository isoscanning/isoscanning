import type { Metadata } from "next";

// Criação de comunidade: não indexar (a página em si é client-only).
export const metadata: Metadata = {
  title: "Criar comunidade | IsoScanning",
  robots: { index: false, follow: false },
};

export default function CreateCommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
