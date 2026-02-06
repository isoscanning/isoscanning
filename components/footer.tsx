import Link from "next/link";
import Image from "next/image";
import { Camera, Mail, Instagram, Linkedin } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export function Footer() {
  return (
    <footer className="border-t bg-muted/50 mt-20 relative z-50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo-cortada.png"
                alt="ISO Scanning"
                width={180}
                height={36}
                className="h-8 w-auto"
                priority
              />
            </Link>
            <p className="text-sm text-muted-foreground">
              Conectando profissionais de fotografia e audiovisual com clientes
              em todo o Brasil.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold mb-4">Plataforma</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/profissionais"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Buscar Profissionais
                </Link>
              </li>
              <li>
                <Link
                  href="/equipamentos"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Equipamentos
                </Link>
              </li>
              <li>
                <Link
                  href="/como-funciona"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Como Funciona
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Para Profissionais</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/cadastro?tipo=profissional"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Cadastre-se
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Painel
                </Link>
              </li>
              <li>
                <Link
                  href="/ajuda"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Central de Ajuda
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contato</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                contato@mpf.com.br
              </li>
            </ul>
            <div className="flex gap-3 mt-4">
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors"
                onClick={() => trackEvent({ action: "click_social", category: "Social", label: "Footer: Instagram" })}
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors"
                onClick={() => trackEvent({ action: "click_social", category: "Social", label: "Footer: LinkedIn" })}
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} Marketplace Fotográfico. Todos os
            direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
