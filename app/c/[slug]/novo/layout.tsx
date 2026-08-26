import type { Metadata } from "next";

// Formulário de criação de post: não indexar (a página em si é client-only).
export const metadata: Metadata = {
  title: "Nova publicação | IsoScanning",
  robots: { index: false, follow: false },
};

export default function NewPostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
