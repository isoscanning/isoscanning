"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserNav } from "@/components/user-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Menu,
  User,
  LogOut,
  Search,
  Package,
  UserPlus,
  LogIn,
  Settings,
} from "lucide-react";
import { useState } from "react";

export function Header() {
  const { user, userProfile, signOut, isAnonymous } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-[80] w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo-cortada.png"
            alt="ISO Scanning"
            width={220}
            height={40}
            className="h-9 w-auto drop-shadow"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7 text-foreground/85">
          <Link
            href="/profissionais"
            className="text-sm font-medium transition-colors hover:text-primary focus-visible:text-primary"
          >
            Encontrar Profissionais
          </Link>
          <Link
            href="/equipamentos"
            className="text-sm font-medium transition-colors hover:text-primary focus-visible:text-primary"
          >
            Equipamentos
          </Link>
          {user && !isAnonymous && (
            <Link
              href="/dashboard/equipamentos"
              className="text-sm font-medium transition-colors hover:text-primary focus-visible:text-primary"
            >
              Meus Equipamentos
            </Link>
          )}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <UserNav />
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden text-foreground/80 hover:text-accent"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      <div className="pointer-events-none h-px bg-border/30" aria-hidden />

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-sm">
          <nav className="container mx-auto flex flex-col gap-3 p-4 text-foreground/80">
            <Link
              href="/profissionais"
              className="flex items-center gap-3 text-sm font-medium hover:text-accent transition-colors hover:bg-accent/10 p-3 rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Search className="h-4 w-4 text-accent" />
              Encontrar Profissionais
            </Link>
            <Link
              href="/equipamentos"
              className="flex items-center gap-3 text-sm font-medium hover:text-success transition-colors hover:bg-success/10 p-3 rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Package className="h-4 w-4 text-success" />
              Equipamentos
            </Link>
            {user && !isAnonymous && (
              <Link
                href="/dashboard/equipamentos"
                className="flex items-center gap-3 text-sm font-medium hover:text-success transition-colors hover:bg-success/10 p-3 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Package className="h-4 w-4 text-success" />
                Meus Equipamentos
              </Link>
            )}
            <div className="border-t border-border/50 pt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tema</span>
                <ThemeToggle />
              </div>
              {user && !isAnonymous ? (
                <>
                  <div className="px-2 py-2 mb-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-border/50 shadow-sm">
                        <AvatarImage
                          src={user.photoURL || undefined}
                          alt={user.displayName || "Usuário"}
                        />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {user.displayName?.[0]?.toUpperCase() ||
                            user.email?.[0]?.toUpperCase() ||
                            "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <p className="text-sm font-medium">
                          {userProfile?.displayName || user.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start bg-transparent border-accent/30 hover:bg-accent/10 hover:text-accent"
                    >
                      <User className="h-4 w-4 mr-2 text-accent" />
                      Meu Perfil
                    </Button>
                  </Link>
                  <Link
                    href="/dashboard/perfil"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start bg-transparent border-primary/30 hover:bg-primary/10 hover:text-primary"
                    >
                      <Settings className="h-4 w-4 mr-2 text-primary" />
                      Configurações
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </Button>
                </>
              ) : (
                <>
                  <div className="px-2 py-2 mb-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-border/50 shadow-sm">
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <p className="text-sm font-medium">Minha Conta</p>
                        <p className="text-xs text-muted-foreground">
                          Entre ou cadastre-se
                        </p>
                      </div>
                    </div>
                  </div>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start bg-transparent border-accent/30 hover:bg-accent/10 hover:text-accent"
                    >
                      <LogIn className="h-4 w-4 mr-2 text-accent" />
                      Entrar
                    </Button>
                  </Link>
                  <Link
                    href="/cadastro"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      size="sm"
                      className="w-full justify-start bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 shadow-sm"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Cadastrar
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
