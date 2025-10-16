"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, LogIn, UserPlus } from "lucide-react";

export function UserNav() {
  const { user, userProfile, signOut, isAnonymous } = useAuth();

  if (!user || isAnonymous) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-10 w-10 rounded-full hover:bg-accent/10"
          >
            <Avatar className="h-10 w-10 ring-2 ring-accent/20 hover:ring-accent transition-all">
              <AvatarFallback className="bg-primary/20 text-primary">
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56 bg-popover text-popover-foreground shadow-lg border border-border/60"
          align="end"
          sideOffset={8}
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">Minha Conta</p>
              <p className="text-xs leading-none text-muted-foreground">
                Entre ou cadastre-se
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              asChild
              className="cursor-pointer hover:bg-accent/10 dark:hover:bg-primary/25"
            >
              <Link
                href="/login"
                className="flex items-center w-full text-foreground"
              >
                <LogIn className="mr-2 h-4 w-4 text-accent" />
                <span>Entrar</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className="cursor-pointer hover:bg-success/10 dark:hover:bg-success/20"
            >
              <Link
                href="/cadastro"
                className="flex items-center w-full text-success"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                <span>Criar conta</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full hover:bg-accent/10"
        >
          <Avatar className="h-10 w-10 ring-2 ring-accent/30 hover:ring-accent hover:scale-105 transition-all">
            <AvatarImage
              src={user.photoURL || undefined}
              alt={user.displayName || ""}
            />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {user.displayName?.[0]?.toUpperCase() ||
                user.email?.[0]?.toUpperCase() ||
                "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 bg-popover text-popover-foreground shadow-xl border border-border/60"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="font-normal bg-accent/10 dark:bg-primary/25 rounded-md p-3">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold leading-none text-primary">
              {userProfile?.displayName || user.displayName}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            asChild
            className="cursor-pointer hover:bg-accent/10 dark:hover:bg-primary/25"
          >
            <Link
              href="/dashboard"
              className="flex items-center w-full text-foreground"
            >
              <User className="mr-2 h-4 w-4 text-accent" />
              <span>Meu Perfil</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            asChild
            className="cursor-pointer hover:bg-accent/10 dark:hover:bg-primary/25"
          >
            <Link
              href="/dashboard/perfil"
              className="flex items-center w-full text-foreground"
            >
              <Settings className="mr-2 h-4 w-4 text-accent" />
              <span>Configurações</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut()}
          className="cursor-pointer text-destructive hover:bg-destructive/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
