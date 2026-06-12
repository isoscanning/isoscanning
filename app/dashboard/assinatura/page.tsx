"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import apiClient from "@/lib/api-service";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  CreditCard,
  Zap,
  Crown,
  Shield,
  ArrowRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface Subscription {
  id: string;
  plan: "pro" | "vip";
  billing_cycle: "monthly" | "annual";
  status: "pending" | "active" | "overdue" | "cancelled";
  current_period_end: string | null;
  subscription_tier: string;
  subscription_expires_at: string | null;
}

const PLAN_LABELS: Record<string, string> = {
  pro: "Pro",
  vip: "Ultra",
};

const PLAN_ICONS: Record<string, React.ElementType> = {
  pro: Crown,
  vip: Shield,
  free: Zap,
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  active: {
    label: "Ativa",
    color: "bg-green-500/10 text-green-600 border-green-200",
    icon: CheckCircle2,
  },
  pending: {
    label: "Aguardando pagamento",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
    icon: Clock,
  },
  overdue: {
    label: "Inadimplente",
    color: "bg-red-500/10 text-red-600 border-red-200",
    icon: AlertCircle,
  },
  cancelled: {
    label: "Cancelada",
    color: "bg-gray-500/10 text-gray-600 border-gray-200",
    icon: XCircle,
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatCycle(cycle: string): string {
  return cycle === "annual" ? "Anual" : "Mensal";
}

export default function AssinaturaPage() {
  const { userProfile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const paymentStatus = searchParams.get("status");

  const fetchSubscription = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/billing/subscription");
      setSubscription(data.subscription);
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        console.error("[assinatura] fetch error:", err);
      }
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // If returning from payment, refresh profile and subscription after a short delay
  // (webhook may take a few seconds to process)
  useEffect(() => {
    if (paymentStatus === "success") {
      const timer = setTimeout(async () => {
        setRefreshing(true);
        await refreshProfile();
        await fetchSubscription();
        setRefreshing(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [paymentStatus, refreshProfile, fetchSubscription]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await apiClient.delete("/billing/subscription");
      toast({
        title: "Assinatura cancelada",
        description:
          "Seu acesso se mantém até o fim do período pago. Você retornará ao plano Free após esse período.",
      });
      await fetchSubscription();
      await refreshProfile();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao cancelar",
        description:
          err?.response?.data?.message ?? "Tente novamente mais tarde.",
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    await fetchSubscription();
    setRefreshing(false);
  };

  const tier = userProfile?.subscriptionTier ?? "free";
  const PlanIcon = PLAN_ICONS[tier] ?? Zap;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Minha Assinatura</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seu plano e informações de cobrança.
          </p>
        </div>

        {/* Payment return banner */}
        {paymentStatus === "success" && (
          <Card className="mb-6 border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="flex items-center gap-3 pt-6">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-700">
                  Pagamento recebido!
                </p>
                <p className="text-sm text-green-600">
                  {refreshing
                    ? "Atualizando seu plano..."
                    : "Seu plano foi ativado. Aproveite todos os recursos!"}
                </p>
              </div>
              {refreshing && (
                <Loader2 className="ml-auto h-4 w-4 animate-spin text-green-600" />
              )}
            </CardContent>
          </Card>
        )}

        {/* Current plan card */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <PlanIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">
                Plano {tier === "free" ? "Free" : PLAN_LABELS[tier] ?? tier}
              </CardTitle>
              <CardDescription>
                {tier === "free"
                  ? "Plano gratuito"
                  : "Assinatura ativa"}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="Atualizar status"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </CardHeader>
        </Card>

        {/* Subscription details */}
        {loading ? (
          <Card>
            <CardContent className="py-12 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : subscription ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Detalhes da assinatura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              {(() => {
                const cfg =
                  STATUS_CONFIG[subscription.status] ?? STATUS_CONFIG.pending;
                const StatusIcon = cfg.icon;
                return (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge
                      variant="outline"
                      className={`flex items-center gap-1.5 ${cfg.color}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </Badge>
                  </div>
                );
              })()}

              {/* Plan */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plano</span>
                <span className="text-sm font-medium">
                  {PLAN_LABELS[subscription.plan] ?? subscription.plan}
                </span>
              </div>

              {/* Cycle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Ciclo de cobrança
                </span>
                <span className="text-sm font-medium">
                  {formatCycle(subscription.billing_cycle)}
                </span>
              </div>

              {/* Next renewal */}
              {subscription.current_period_end && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {subscription.status === "cancelled"
                      ? "Acesso até"
                      : "Próxima renovação"}
                  </span>
                  <span className="text-sm font-medium">
                    {formatDate(subscription.current_period_end)}
                  </span>
                </div>
              )}

              {/* Pending state helper */}
              {subscription.status === "pending" && (
                <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 p-3 text-sm text-yellow-700 dark:text-yellow-400">
                  <AlertCircle className="inline h-4 w-4 mr-1.5" />
                  Seu pagamento está sendo processado. Assim que confirmado, seu
                  plano será ativado automaticamente.
                </div>
              )}

              {/* Overdue helper */}
              {subscription.status === "overdue" && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 p-3 text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="inline h-4 w-4 mr-1.5" />
                  Pagamento em atraso. Regularize para manter o acesso aos
                  recursos do plano.
                </div>
              )}
            </CardContent>

            {/* Cancel action */}
            {(subscription.status === "active" ||
              subscription.status === "overdue") && (
              <div className="px-6 pb-6">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
                      disabled={cancelling}
                    >
                      {cancelling && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Cancelar assinatura
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ao cancelar, você continuará tendo acesso ao plano{" "}
                        <strong>
                          {PLAN_LABELS[subscription.plan] ?? subscription.plan}
                        </strong>{" "}
                        até{" "}
                        <strong>
                          {formatDate(subscription.current_period_end)}
                        </strong>
                        . Após essa data, sua conta retornará ao plano Free.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Manter assinatura</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={handleCancel}
                      >
                        Confirmar cancelamento
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </Card>
        ) : (
          /* No subscription — show upsell */
          <Card className="mb-6">
            <CardContent className="py-10 text-center space-y-4">
              <CreditCard className="mx-auto h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-semibold">Nenhuma assinatura ativa</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Você está no plano Free. Faça upgrade para desbloquear todos
                  os recursos.
                </p>
              </div>
              <Link href="/precos">
                <Button className="mt-2">
                  Ver planos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Upgrade CTA for non-free without active subscription */}
        {!loading && subscription?.status === "cancelled" && (
          <Card>
            <CardContent className="py-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Quer continuar com os benefícios? Assine novamente a qualquer
                momento.
              </p>
              <Link href="/precos">
                <Button variant="outline">
                  Ver planos disponíveis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
