"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, UserPlus } from "lucide-react";
import { useState } from "react";

interface LpHeaderProps {
  ctaHref?: string;
  ctaLabel?: string;
  produtoHref?: string;
}

export function LpHeader({
  ctaHref = "/cadastro",
  ctaLabel = "Criar Conta Grátis",
  produtoHref = "/",
}: LpHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-[80] w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/40">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image
            src="/logo-cortada.png"
            alt="ISO Scanning"
            width={200}
            height={36}
            className="h-8 w-auto drop-shadow"
            priority
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-foreground/80">
          <Link href={produtoHref} className="hover:text-primary transition-colors">
            Produto
          </Link>
          <Link href="#precos" className="hover:text-primary transition-colors">
            Preços
          </Link>
          <Link href="#faq" className="hover:text-primary transition-colors">
            Suporte
          </Link>
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="gap-2">
              <LogIn className="h-4 w-4" />
              Entrar
            </Button>
          </Link>
          <Link href={ctaHref}>
            <Button
              size="sm"
              className="gap-2 rounded-full shadow-md hover:shadow-lg hover:shadow-primary/20 transition-all"
            >
              <UserPlus className="h-4 w-4" />
              {ctaLabel}
            </Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/98 backdrop-blur-sm">
          <nav className="container mx-auto flex flex-col gap-1 p-4">
            {[
              { href: produtoHref, label: "Produto" },
              { href: "#precos", label: "Preços" },
              { href: "#faq", label: "Suporte" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-border/50 mt-2 pt-3 flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <LogIn className="h-4 w-4" />
                  Entrar
                </Button>
              </Link>
              <Link href={ctaHref} onClick={() => setMobileMenuOpen(false)}>
                <Button size="sm" className="w-full gap-2 rounded-full">
                  <UserPlus className="h-4 w-4" />
                  {ctaLabel}
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
