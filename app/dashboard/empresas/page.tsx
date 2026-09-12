"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, Plus, Loader2, Users, Wallet, MoreVertical, Settings2, Archive, ArchiveRestore, Trash2, ExternalLink, Crown, User } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/lib/plans/use-plan";
import { UpgradeButton } from "@/components/plan/plan-gate";
import { isPlanErrorBody } from "@/lib/plans/plan-limits";
import { useConfirmDialog } from "@/components/confirm-dialog";
import {
  companiesService,
  COMPANY_COLORS,
  COMPANY_ROLE_LABELS,
  formatCnpj,
  saveFinanceScope,
  type CompanyDetail,
  type CompanyListRow,
  type TaxRegime,
} from "@/lib/finances-service";
import { errorMessage } from "@/app/dashboard/financeiro/components/labels";
import { CompanySettingsDialog } from "@/app/dashboard/financeiro/components/company-settings-dialog";

const REGIMES: Array<{ value: TaxRegime; label: string }> = [
  { value: "simples", label: "Simples Nacional" },
  { value: "mei", label: "MEI" },
  { value: "other", label: "Outro / não sei" },
];

function CreateCompanyDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COMPANY_COLORS[0]);
  const [regime, setRegime] = useState<TaxRegime>("simples");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const digits = cnpj.replace(/\D/g, "");
    if (name.trim().length < 2) {
      toast.error("Dê um nome à empresa");
      return;
    }
    if (digits && digits.length !== 14) {
      toast.error("CNPJ precisa ter 14 dígitos");
      return;
    }
    setSaving(true);
    try {
      const company = await companiesService.create({
        name: name.trim(),
        legal_name: legalName.trim() || null,
        cnpj: digits || null,
        description: description.trim() || null,
        color,
        tax_regime: regime,
      });
      toast.success("Empresa cadastrada");
      onCreated(company.id);
    } catch (err) {
      if (!isPlanErrorBody((err as { response?: { data?: unknown } })?.response?.data)) toast.error(errorMessage(err, "Erro ao cadastrar a empresa"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Nova empresa</DialogTitle>
          <DialogDescription>
            Sua empresa ganha um financeiro próprio, separado do pessoal, com regime tributário e projetos. Depois você liga times a ela e escolhe quem acessa.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome fantasia</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Studio Luz Fotografia" maxLength={80} autoFocus />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Razão social (opcional)</Label>
              <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} maxLength={160} />
            </div>
            <div className="space-y-2">
              <Label>CNPJ (opcional)</Label>
              <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} inputMode="numeric" placeholder="00.000.000/0000-00" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Regime tributário</Label>
            <Select value={regime} onValueChange={(v) => setRegime(v as TaxRegime)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{REGIMES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={1000} placeholder="O que a empresa faz, cidade, sócios..." />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {COMPANY_COLORS.map((c) => (
                <button key={c} type="button" aria-label={`Cor ${c}`} onClick={() => setColor(c)} className={`h-8 w-8 rounded-full border-2 transition ${color === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Cadastrar empresa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmpresasInner() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = usePlan();
  const { confirm, dialog } = useConfirmDialog();

  const [rows, setRows] = useState<CompanyListRow[] | null>(null);
  const [createOpen, setCreateOpen] = useState(searchParams.get("nova") === "1");
  const [settingsFor, setSettingsFor] = useState<CompanyDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await companiesService.listMine());
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao carregar suas empresas"));
      setRows([]);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !userProfile) router.push("/login");
  }, [authLoading, userProfile, router]);

  useEffect(() => {
    if (userProfile) void load();
  }, [userProfile, load]);

  const openSettings = useCallback(async (companyId: string) => {
    setLoadingDetail(companyId);
    try {
      setSettingsFor(await companiesService.getDetail(companyId));
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível abrir a empresa"));
    } finally {
      setLoadingDetail(null);
    }
  }, []);

  // Deep link ?empresa=<id> abre as configurações
  useEffect(() => {
    const id = searchParams.get("empresa");
    if (id && rows && rows.some((r) => r.company.id === id && r.role === "admin")) void openSettings(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const owned = (rows ?? []).filter((r) => r.company.owner_id === userProfile?.id && !r.company.archived_at).length;
  const limit = plan.limitOf("companies");
  const canCreate = plan.allows("companies", owned);

  async function toggleArchive(row: CompanyListRow) {
    try {
      if (row.company.archived_at) await companiesService.unarchive(row.company.id);
      else await companiesService.archive(row.company.id);
      toast.success(row.company.archived_at ? "Empresa reativada" : "Empresa arquivada (somente leitura)");
      load();
    } catch (err) {
      if (!isPlanErrorBody((err as { response?: { data?: unknown } })?.response?.data)) toast.error(errorMessage(err, "Não foi possível alterar"));
    }
  }

  function remove(row: CompanyListRow) {
    confirm({
      title: `Excluir ${row.company.name}?`,
      description: "Só empresas sem lançamentos e sem times ligados podem ser excluídas. Caso contrário, arquive.",
      destructive: true,
      confirmLabel: "Excluir",
      onConfirm: async () => {
        try {
          await companiesService.remove(row.company.id);
          toast.success("Empresa excluída");
          load();
        } catch (err) {
          toast.error(errorMessage(err, "Não foi possível excluir"));
        }
      },
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {dialog}
      <Header />
      <main className="flex-1 py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <span className="p-2 rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"><Building2 className="h-6 w-6" /></span>
                Empresas
              </h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                Trabalha como autônomo e também tem empresa? Cadastre-a aqui: ela ganha financeiro, regime tributário e projetos próprios.
                Ligue seus times a ela e escolha quem vê e quem lança. O que é seu, pessoal, continua no seu financeiro.
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1">
              {canCreate ? (
                <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-2 h-4 w-4" /> Nova empresa</Button>
              ) : (
                <UpgradeButton>Empresas no Pro</UpgradeButton>
              )}
              {limit !== null && <span className="text-xs text-muted-foreground">{owned} de {limit} {limit === 1 ? "empresa" : "empresas"} no plano {plan.label}</span>}
            </div>
          </div>

          {/* Pessoal sempre existe */}
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center"><User className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Você, como autônomo</p>
                <p className="text-sm text-muted-foreground">Seu financeiro pessoal e os times sem empresa. Trabalhos fechados por fora ou por times pessoais caem aqui.</p>
              </div>
              <Button asChild variant="outline" onClick={() => saveFinanceScope(null)}><Link href="/dashboard/financeiro"><Wallet className="mr-2 h-4 w-4" /> Meu financeiro</Link></Button>
            </CardContent>
          </Card>

          {rows === null ? (
            <div className="grid gap-4 md:grid-cols-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
          ) : rows.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center space-y-4">
                <Building2 className="h-12 w-12 mx-auto opacity-30" />
                <div>
                  <p className="font-medium">Nenhuma empresa cadastrada</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    Cadastre sua empresa para separar o financeiro dela do seu, ligar times e trabalhar com sócio ou contador.
                  </p>
                </div>
                {canCreate ? <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-2 h-4 w-4" /> Cadastrar minha empresa</Button> : <UpgradeButton />}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {rows.map((row) => {
                const c = row.company;
                const isOwner = c.owner_id === userProfile?.id;
                return (
                  <Card key={c.id} className={`transition hover:shadow-md ${c.archived_at ? "opacity-60" : ""}`}>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-white font-semibold" style={{ backgroundColor: c.color }}>
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{[c.legal_name, c.cnpj ? formatCnpj(c.cnpj) : null].filter(Boolean).join(" · ") || "Sem CNPJ informado"}</p>
                          {c.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{c.description}</p>}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link href={`/dashboard/financeiro?empresa=${c.id}`} onClick={() => saveFinanceScope(c.id)}><Wallet className="mr-2 h-4 w-4" /> Abrir financeiro</Link></DropdownMenuItem>
                            {row.role === "admin" && <DropdownMenuItem onClick={() => openSettings(c.id)}><Settings2 className="mr-2 h-4 w-4" /> Configurar e acessos</DropdownMenuItem>}
                            <DropdownMenuItem asChild><Link href="/dashboard/times"><Users className="mr-2 h-4 w-4" /> Times</Link></DropdownMenuItem>
                            {isOwner && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => toggleArchive(row)}>{c.archived_at ? <><ArchiveRestore className="mr-2 h-4 w-4" /> Reativar</> : <><Archive className="mr-2 h-4 w-4" /> Arquivar</>}</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => remove(row)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant={row.role === "admin" ? "default" : "secondary"} className="text-[11px]">
                          {isOwner ? <Crown className="mr-1 h-3 w-3" /> : null}{isOwner ? "Dona" : COMPANY_ROLE_LABELS[row.role]}
                        </Badge>
                        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {row.teams_count} {row.teams_count === 1 ? "time" : "times"}</span>
                        <span>{c.tax_regime === "mei" ? "MEI" : c.tax_regime === "simples" ? "Simples Nacional" : "Outro regime"}</span>
                        {c.archived_at && <Badge variant="outline" className="text-[11px]"><Archive className="mr-1 h-3 w-3" /> Arquivada</Badge>}
                      </div>
                      <div className="flex gap-2">
                        <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => saveFinanceScope(c.id)}>
                          <Link href={`/dashboard/financeiro?empresa=${c.id}`}><ExternalLink className="mr-1 h-4 w-4" /> Financeiro</Link>
                        </Button>
                        {row.role === "admin" && (
                          <Button size="sm" variant="outline" onClick={() => openSettings(c.id)} disabled={loadingDetail === c.id}>
                            {loadingDetail === c.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Settings2 className="mr-1 h-4 w-4" />} Configurar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />

      <CreateCompanyDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setCreateOpen(false);
          saveFinanceScope(id);
          load().then(() => openSettings(id));
        }}
      />

      {settingsFor && (
        <CompanySettingsDialog
          detail={settingsFor}
          open={!!settingsFor}
          onOpenChange={(o) => { if (!o) setSettingsFor(null); }}
          onChanged={() => { openSettings(settingsFor.company.id); load(); }}
        />
      )}
    </div>
  );
}

export default function EmpresasPage() {
  return (
    <Suspense fallback={null}>
      <EmpresasInner />
    </Suspense>
  );
}
