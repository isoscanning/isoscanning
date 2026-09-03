"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import {
    fetchNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    AppNotification,
} from "@/lib/data-service";
import { notificationClickUrl, notificationMeta } from "@/lib/notifications/notification-links";
import { useAuth } from "@/lib/auth-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const TONE_DOT: Record<string, string> = {
    success: "bg-emerald-500",
    info: "bg-sky-500",
    warning: "bg-amber-500",
    error: "bg-red-500",
};

export function NotificationBell() {
    const { userProfile } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);
    const router = useRouter();

    const load = useCallback(async () => {
        const result = await fetchNotifications({ limit: 20 });
        setNotifications(result.data);
        setUnreadCount(result.unreadCount);
    }, []);

    useEffect(() => {
        if (!userProfile) return;

        load();

        // Realtime: INSERT na tabela (RLS já filtra pelo dono; o filter é só economia de eventos)
        const channel = supabase
            .channel(`realtime:notifications:${userProfile.id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `profile_id=eq.${userProfile.id}`,
                },
                (payload) => {
                    const row = payload.new as {
                        id: string; profile_id: string; title: string; message: string;
                        type: AppNotification["type"]; reference_id: string | null; is_read: boolean; created_at: string;
                    };
                    const incoming: AppNotification = {
                        id: row.id,
                        profileId: row.profile_id,
                        title: row.title,
                        message: row.message,
                        type: row.type,
                        referenceId: row.reference_id,
                        isRead: row.is_read,
                        createdAt: row.created_at,
                    };

                    const meta = notificationMeta(incoming.type);
                    const show = meta.tone === "error" ? toast.error
                        : meta.tone === "warning" ? toast.warning
                        : meta.tone === "success" ? toast.success
                        : toast.info;
                    show(meta.toast, {
                        description: incoming.title,
                        duration: 6000,
                        action: {
                            label: "Abrir",
                            onClick: () => { void open(incoming); },
                        },
                    });

                    setNotifications((prev) => (prev.some((n) => n.id === incoming.id) ? prev : [incoming, ...prev]));
                    if (!incoming.isRead) setUnreadCount((prev) => prev + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userProfile, load]);

    const open = async (notification: AppNotification) => {
        if (!notification.isRead) {
            void markNotificationAsRead(notification.id);
            setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
            setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        setIsOpen(false);
        router.push(notificationClickUrl(notification.type, notification.referenceId));
    };

    const handleMarkAll = async () => {
        if (unreadCount === 0 || markingAll) return;
        setMarkingAll(true);
        await markAllNotificationsAsRead();
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        setMarkingAll(false);
    };

    if (!userProfile) return null;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative group hover:bg-accent transition-colors"
                    aria-label={unreadCount > 0 ? `Notificações: ${unreadCount} não lidas` : "Notificações"}
                >
                    <Bell className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border border-zinc-950">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 mr-4 border-zinc-800 bg-zinc-950/95 backdrop-blur-xl shadow-2xl" align="end">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
                    <h4 className="font-semibold text-zinc-100">Notificações</h4>
                    {unreadCount > 0 ? (
                        <button
                            type="button"
                            onClick={handleMarkAll}
                            disabled={markingAll}
                            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 transition-colors disabled:opacity-50"
                            title="Marcar todas como lidas"
                        >
                            <CheckCheck className="h-3.5 w-3.5" />
                            {markingAll ? "Marcando..." : "Marcar todas"}
                        </button>
                    ) : (
                        <span className="text-xs text-zinc-500">Tudo lido</span>
                    )}
                </div>
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-sm">
                        Nenhuma notificação por enquanto.
                    </div>
                ) : (
                    <ScrollArea className="max-h-[60vh] md:max-h-80 select-none">
                        <div className="flex flex-col py-2">
                            {notifications.map((notification) => {
                                const meta = notificationMeta(notification.type);
                                return (
                                    <button
                                        key={notification.id}
                                        onClick={() => open(notification)}
                                        className={`relative flex flex-col items-start p-3 pl-5 pr-4 transition-colors hover:bg-zinc-800/50 text-left cursor-pointer ${!notification.isRead ? "bg-zinc-900/40" : "opacity-75"}`}
                                    >
                                        {!notification.isRead && (
                                            <span className={`absolute left-2 top-4 w-1.5 h-1.5 rounded-full ${TONE_DOT[meta.tone] ?? TONE_DOT.info}`} />
                                        )}
                                        <span className="text-sm font-semibold text-zinc-100 mb-1 leading-tight">
                                            {notification.title}
                                        </span>
                                        <span className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                            {notification.message}
                                        </span>
                                        <span className="text-[10px] text-zinc-500 mt-2 font-medium uppercase tracking-wider">
                                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: ptBR })}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </ScrollArea>
                )}
                <div className="border-t border-zinc-800/50 px-4 py-2">
                    <button
                        type="button"
                        onClick={() => { setIsOpen(false); router.push("/dashboard/notificacoes"); }}
                        className="w-full text-center text-xs text-zinc-400 hover:text-zinc-100 transition-colors py-1"
                    >
                        Ver todas as notificações
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
