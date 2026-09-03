"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, CheckCheck, Loader2, Inbox } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type AppNotification,
} from "@/lib/data-service";
import {
  NOTIFICATION_GROUP_LABELS,
  notificationClickUrl,
  notificationMeta,
  type NotificationMeta,
} from "@/lib/notifications/notification-links";

const PAGE_SIZE = 30;

const TONE_BAR: Record<NotificationMeta["tone"], string> = {
  success: "border-l-emerald-500",
  info: "border-l-sky-500",
  warning: "border-l-amber-500",
  error: "border-l-red-500",
};

type GroupFilter = "all" | NotificationMeta["group"];

/**
 * Histórico completo do sino: paginação, filtro por não lidas e por área,
 * marcar todas como lidas. Clicar abre o mesmo deep link do push.
 */
export default function NotificacoesPage() {
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [group, setGroup] = useState<GroupFilter>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!authLoading && !userProfile) router.push("/login");
  }, [authLoading, userProfile, router]);

  const load = useCallback(async (reset: boolean) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    const offset = reset ? 0 : items.length;
    const res = await fetchNotifications({ limit: PAGE_SIZE, offset, unreadOnly });
    setItems((prev) => (reset ? res.data : [...prev, ...res.data.filter((n) => !prev.some((p) => p.id === n.id))]));
    setTotal(res.total);
    setUnreadCount(res.unreadCount);
    setLoading(false);
    setLoadingMore(false);
  }, [items.length, unreadOnly]);

  useEffect(() => {
    if (!userProfile) return;
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile, unreadOnly]);

  const visible = useMemo(
    () => (group === "all" ? items : items.filter((n) => notificationMeta(n.type).group === group)),
    [items, group]
  );

  const groupsPresent = useMemo(() => {
    const set = new Set<NotificationMeta["group"]>();
    items.forEach((n) => set.add(notificationMeta(n.type).group));
    return Array.from(set);
  }, [items]);

  const open = async (n: AppNotification) => {
    if (!n.isRead) {
      void markNotificationAsRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    router.push(notificationClickUrl(n.type, n.referenceId));
  };

  const markAll = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    await markAllNotificationsAsRead();
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnreadCount(0);
    setMarkingAll(false);
    if (unreadOnly) void load(true);
  };

  if (authLoading || !userProfile) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-3xl space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Bell className="h-7 w-7 text-primary" /> Notificações
              </h1>
              <p className="text-muted-foreground mt-1">
                Tudo o que aconteceu com seus contratos, vagas, orçamentos, briefings e comunidade.
                {unreadCount > 0 && <> <strong>{unreadCount}</strong> não {unreadCount === 1 ? "lida" : "lidas"}.</>}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={markAll} disabled={markingAll || unreadCount === 0} className="gap-2">
              <CheckCheck className="h-4 w-4" /> {markingAll ? "Marcando..." : "Marcar todas como lidas"}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border p-0.5 bg-muted/40">
              <button
                type="button"
                onClick={() => setUnreadOnly(false)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${!unreadOnly ? "bg-background shadow font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setUnreadOnly(true)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${unreadOnly ? "bg-background shadow font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                Não lidas{unreadCount > 0 ? ` (${unreadCount})` : ""}
              </button>
            </div>
            {groupsPresent.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                <FilterChip active={group === "all"} onClick={() => setGroup("all")}>Tudo</FilterChip>
                {groupsPresent.map((g) => (
                  <FilterChip key={g} active={group === g} onClick={() => setGroup(g)}>
                    {NOTIFICATION_GROUP_LABELS[g]}
                  </FilterChip>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
            </div>
          ) : visible.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center space-y-2">
                <Inbox className="h-10 w-10 mx-auto text-muted-foreground/60" />
                <p className="font-medium">{unreadOnly ? "Nenhuma notificação não lida" : "Nenhuma notificação por aqui"}</p>
                <p className="text-sm text-muted-foreground">
                  Quando alguém interagir com você — candidatura, contrato, orçamento, comentário — aparece aqui e no sino.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {visible.map((n) => {
                const meta = notificationMeta(n.type);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => open(n)}
                    className={`w-full text-left rounded-xl border border-l-4 ${TONE_BAR[meta.tone]} px-4 py-3 transition-colors hover:bg-muted/40 ${n.isRead ? "bg-background opacity-80" : "bg-primary/[0.04]"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-sm leading-tight ${n.isRead ? "font-medium" : "font-semibold"}`}>{n.title}</p>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
                      </div>
                      {!n.isRead && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" aria-label="Não lida" />}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <span>{NOTIFICATION_GROUP_LABELS[meta.group]}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}</span>
                    </div>
                  </button>
                );
              })}
              {items.length < total && (
                <div className="pt-2 text-center">
                  <Button variant="ghost" onClick={() => load(false)} disabled={loadingMore} className="gap-2">
                    {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                    Carregar mais ({total - items.length} restantes)
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:text-foreground hover:border-foreground/30"}`}
    >
      {children}
    </button>
  );
}
