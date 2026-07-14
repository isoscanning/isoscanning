"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import useSWR from "swr";
import { useAuth } from "@/lib/auth-context";
import { isPlatformAdmin } from "@/lib/admin-config";
import apiClient from "@/lib/api-service";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  Users,
  Camera,
  Package,
  Briefcase,
  FileSignature,
  Calculator,
  MessageSquare,
  CreditCard,
  Eye,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const REFRESH_MS = 15000;

interface FeatureUsage {
  key: string;
  label: string;
  records: number;
  users: number;
  last_24h: number;
  last_7d: number;
  last_activity: string | null;
}

interface PlatformMetrics {
  generated_at: string;
  users: {
    total: number;
    clients: number;
    professionals: number;
    active: number;
    new_24h: number;
    new_7d: number;
    new_30d: number;
    by_tier: { free: number; standard: number; pro: number; vip: number };
  };
  signups_by_day: { day: string; count: number }[];
  features: FeatureUsage[];
  extras: {
    active_subscriptions: number;
    subscriptions_by_plan: Record<string, number>;
    contracts_by_status: Record<string, number>;
    quotes_by_status: Record<string, number>;
    conversations: number;
    equipments_available: number;
    jobs_active: number;
    profile_views_30d: number;
  };
}

const fetcher = (url: string) =>
  apiClient.get<PlatformMetrics>(url).then((res) => res.data);

const nf = new Intl.NumberFormat("pt-BR");

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(value: string) {
  const [, month, day] = value.split("-");
  return `${day}/${month}`;
}

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  standard: "Standard",
  pro: "Pro",
  vip: "VIP",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  signed: "Assinado",
  cancelled: "Cancelado",
  pending: "Pendente",
  answered: "Respondido",
  active: "Ativa",
  overdue: "Em atraso",
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">
            {label}
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold">
          {value === undefined ? "—" : nf.format(value)}
        </p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { userProfile, loading } = useAuth();
  const { resolvedTheme } = useTheme();
  const isAdmin = isPlatformAdmin(userProfile?.email);

  useEffect(() => {
    if (!loading && (!userProfile || !isAdmin)) {
      router.replace("/dashboard");
    }
  }, [loading, userProfile, isAdmin, router]);

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<PlatformMetrics>(!loading && isAdmin ? "/admin/metrics" : null, fetcher, {
      refreshInterval: REFRESH_MS,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    });

  const dark = resolvedTheme === "dark";
  // Paleta validada (dataviz): azul sequencial p/ série única e
  // rampa ordinal de 4 passos p/ tiers, por superfície (claro/escuro).
  const chart = useMemo(
    () => ({
      series: dark ? "#3987e5" : "#2a78d6",
      grid: dark ? "#2c2c2a" : "#e1e0d9",
      tick: "#898781",
      tiers: dark
        ? ["#6da7ec", "#3987e5", "#256abf", "#184f95"]
        : ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab"],
    }),
    [dark]
  );

  const features = useMemo(() => {
    if (!data?.features) return [];
    return [...data.features].sort((a, b) => b.users - a.users);
  }, [data]);

  const maxFeatureUsers = features.length
    ? Math.max(...features.map((f) => f.users), 1)
    : 1;

  const feat = (key: string) => data?.features?.find((f) => f.key === key);

  if (loading || !userProfile || !isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const tierEntries = data?.users?.by_tier
    ? (Object.entries(data.users.by_tier) as [string, number][])
    : [];
  const tierTotal = tierEntries.reduce((acc, [, v]) => acc + v, 0);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-8">
        {/* Cabeçalho */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold md:text-3xl">
                Painel Administrativo
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Visão geral de uso da plataforma — acesso exclusivo do fundador.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              Ao vivo · atualizado às {formatDateTime(data?.generated_at)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              disabled={isValidating}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isValidating ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
          </div>
        </div>

        {error && (
          <Card className="mb-8 border-red-500/40">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
              <div className="text-sm">
                <p className="font-medium">Não foi possível carregar as métricas.</p>
                <p className="text-muted-foreground">
                  {(error as any)?.response?.data?.message ||
                    (error as Error)?.message ||
                    "Erro desconhecido"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => mutate()}
              >
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {isLoading && !data ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : data ? (
          <div className="space-y-8">
            {/* Usuários */}
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Usuários
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={Users}
                  label="Usuários cadastrados"
                  value={data.users.total}
                  sub={`+${nf.format(data.users.new_24h ?? 0)} nas últimas 24h · +${nf.format(data.users.new_7d ?? 0)} em 7 dias`}
                />
                <StatCard
                  icon={Camera}
                  label="Profissionais"
                  value={data.users.professionals}
                />
                <StatCard icon={Users} label="Clientes" value={data.users.clients} />
                <StatCard
                  icon={CreditCard}
                  label="Assinaturas ativas"
                  value={data.extras.active_subscriptions}
                  sub={Object.entries(data.extras.subscriptions_by_plan || {})
                    .map(([plan, count]) => `${TIER_LABELS[plan] || plan}: ${nf.format(count)}`)
                    .join(" · ") || undefined}
                />
              </div>
            </section>

            {/* Conteúdo gerado */}
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Conteúdo da plataforma
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={Package}
                  label="Equipamentos"
                  value={feat("equipments")?.records}
                  sub={`${nf.format(data.extras.equipments_available)} disponíveis`}
                />
                <StatCard
                  icon={Briefcase}
                  label="Jobs (vagas)"
                  value={feat("jobs")?.records}
                  sub={`${nf.format(data.extras.jobs_active)} ativas`}
                />
                <StatCard
                  icon={FileSignature}
                  label="Contratos gerados"
                  value={feat("contratos")?.records}
                  sub={Object.entries(data.extras.contracts_by_status || {})
                    .map(([s, c]) => `${STATUS_LABELS[s] || s}: ${nf.format(c)}`)
                    .join(" · ") || undefined}
                />
                <StatCard
                  icon={Calculator}
                  label="Orçamentos (calculadora)"
                  value={feat("calculadora")?.records}
                />
                <StatCard
                  icon={MessageSquare}
                  label="Solicitações de orçamento"
                  value={feat("solicitacoes")?.records}
                  sub={Object.entries(data.extras.quotes_by_status || {})
                    .map(([s, c]) => `${STATUS_LABELS[s] || s}: ${nf.format(c)}`)
                    .join(" · ") || undefined}
                />
                <StatCard
                  icon={MessageSquare}
                  label="Mensagens (chat)"
                  value={feat("chat")?.records}
                  sub={`${nf.format(data.extras.conversations)} conversas`}
                />
                <StatCard
                  icon={Users}
                  label="Candidaturas a vagas"
                  value={feat("candidaturas")?.records}
                />
                <StatCard
                  icon={Eye}
                  label="Visualizações de perfil (30d)"
                  value={data.extras.profile_views_30d}
                />
              </div>
            </section>

            {/* Crescimento + tiers */}
            <section className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Novos cadastros por dia
                  </CardTitle>
                  <CardDescription>
                    Últimos 30 dias · {nf.format(data.users.new_30d ?? 0)} novos usuários
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.signups_by_day}
                      margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chart.series} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={chart.series} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={chart.grid} strokeDasharray="0" vertical={false} />
                      <XAxis
                        dataKey="day"
                        tickFormatter={formatDay}
                        tick={{ fill: chart.tick, fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: chart.grid }}
                        interval={4}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: chart.tick, fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={48}
                      />
                      <Tooltip
                        cursor={{ stroke: chart.tick, strokeWidth: 1 }}
                        labelFormatter={(label) => formatDay(String(label))}
                        formatter={(value) => [nf.format(Number(value)), "Cadastros"]}
                        contentStyle={{
                          background: dark ? "#151a2e" : "#ffffff",
                          border: `1px solid ${chart.grid}`,
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke={chart.series}
                        strokeWidth={2}
                        fill="url(#signupFill)"
                        activeDot={{ r: 4, strokeWidth: 2, stroke: dark ? "#151a2e" : "#ffffff" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Usuários por plano</CardTitle>
                  <CardDescription>Distribuição de assinaturas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full">
                    {tierEntries.map(([tier, count], i) =>
                      count > 0 ? (
                        <div
                          key={tier}
                          title={`${TIER_LABELS[tier] || tier}: ${nf.format(count)}`}
                          style={{
                            width: `${(count / Math.max(tierTotal, 1)) * 100}%`,
                            backgroundColor: chart.tiers[i],
                          }}
                        />
                      ) : null
                    )}
                  </div>
                  <ul className="mt-4 space-y-2">
                    {tierEntries.map(([tier, count], i) => (
                      <li
                        key={tier}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: chart.tiers[i] }}
                          />
                          {TIER_LABELS[tier] || tier}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {nf.format(count)}
                          {tierTotal > 0 && (
                            <span className="ml-2 text-xs">
                              {Math.round((count / tierTotal) * 100)}%
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>

            {/* Uso por funcionalidade */}
            <section>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Uso por funcionalidade</CardTitle>
                  <CardDescription>
                    Quantos usuários distintos inserem dados em cada área (cards de
                    Acesso Rápido) e a atividade recente de cada uma.
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">Funcionalidade</th>
                        <th className="py-2 pr-4 font-medium">Usuários</th>
                        <th className="py-2 pr-4 text-right font-medium">Registros</th>
                        <th className="py-2 pr-4 text-right font-medium">24h</th>
                        <th className="py-2 pr-4 text-right font-medium">7 dias</th>
                        <th className="py-2 text-right font-medium">Última atividade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {features.map((f) => (
                        <tr key={f.key} className="border-b border-border/50 last:border-0 hover:bg-muted/40">
                          <td className="py-2.5 pr-4 font-medium">{f.label}</td>
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${(f.users / maxFeatureUsers) * 100}%`,
                                    backgroundColor: chart.series,
                                  }}
                                />
                              </div>
                              <span className="tabular-nums">{nf.format(f.users)}</span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">
                            {nf.format(f.records)}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">
                            {f.last_24h > 0 ? (
                              <span className="font-medium text-emerald-500">
                                +{nf.format(f.last_24h)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">
                            {nf.format(f.last_7d)}
                          </td>
                          <td className="py-2.5 text-right text-muted-foreground">
                            {formatDateTime(f.last_activity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </section>

            <p className="text-center text-xs text-muted-foreground">
              Atualização automática a cada {REFRESH_MS / 1000} segundos.
            </p>
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
