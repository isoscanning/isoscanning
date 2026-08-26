import type { Metadata } from "next";

// Edição de comunidade: não indexar (a página em si é client-only).
export const metadata: Metadata = {
  title: "Editar comunidade | IsoScanning",
  robots: { index: false, follow: false },
};

export default function EditCommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
