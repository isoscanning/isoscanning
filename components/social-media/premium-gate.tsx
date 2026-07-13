"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Lock, Check, Sparkles } from "lucide-react";

// Paywall das features premium de social media (Relatório com IA e
// Simulador de Feed) — exibida quando o dono do cronograma não é Pro/Ultra.

export function PremiumGate({ title, description, bullets }: {
  title: string;
  description: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-blue-500 via-pink-500 to-amber-400" />
      <div className="p-8 text-center space-y-5 max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-violet-600 text-white flex items-center justify-center mx-auto shadow-lg">
          <Lock className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
            Recurso Pro · Ultra
          </p>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <ul className="text-left space-y-2 mx-auto w-fit">
          {bullets.map((b) => (
            <li key={b} className="text-sm flex gap-2 items-start">
              <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              {b}
            </li>
          ))}
        </ul>
        <div className="space-y-2 pt-1">
          <Link href="/precos">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Sparkles className="h-4 w-4" />
              Fazer upgrade do plano
            </Button>
          </Link>
          <p className="text-[11px] text-muted-foreground">
            Disponível nos planos <strong>Pro</strong> e <strong>Ultra</strong>. O acesso vale para toda a equipe do cronograma.
          </p>
        </div>
      </div>
    </div>
  );
}
