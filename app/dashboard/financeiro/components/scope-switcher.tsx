"use client";

import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Users } from "lucide-react";
import { COMPANY_ROLE_LABELS, type CompanyListRow } from "@/lib/finances-service";

/**
 * Troca entre o financeiro PESSOAL e as empresas da EMPRESA (uma por time)
 * que o usuário pode abrir. "Pessoal" é sempre o primeiro.
 */
export function ScopeSwitcher({
  companies, value, onChange, loading,
}: {
  companies: CompanyListRow[];
  value: string | null;
  onChange: (companyId: string | null) => void;
  loading?: boolean;
}) {
  const current = value ? companies.find((w) => w.company.id === value) : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value ?? "personal"} onValueChange={(v) => onChange(v === "personal" ? null : v)} disabled={loading}>
        <SelectTrigger className="w-[260px] bg-background border-emerald-500/30" aria-label="Financeiro pessoal ou da empresa">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="personal">
            <span className="inline-flex items-center gap-2"><User className="h-4 w-4 text-emerald-600" /> Meu financeiro (pessoal)</span>
          </SelectItem>
          {companies.length > 0 && <SelectSeparator />}
          {companies.map((w) => (
            <SelectItem key={w.company.id} value={w.company.id}>
              <span className="inline-flex items-center gap-2">
                <Building2 className="h-4 w-4 text-teal-600" /> {w.company.name}
                {w.company.archived_at ? <span className="text-xs text-muted-foreground">(arquivada)</span> : null}
              </span>
            </SelectItem>
          ))}
          <SelectSeparator />
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            <Link href="/dashboard/empresas" className="inline-flex items-center gap-1 hover:text-foreground">
              <Users className="h-3.5 w-3.5" /> Cadastrar ou gerenciar empresas
            </Link>
          </div>
        </SelectContent>
      </Select>
      {current && (
        <Badge variant="outline" className="border-teal-500/40 text-teal-700 dark:text-teal-300" title={`${current.teams_count} time(s) ligado(s)`}>
          {COMPANY_ROLE_LABELS[current.role]}
        </Badge>
      )}
    </div>
  );
}
