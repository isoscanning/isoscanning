"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { fetchNotifications, markNotificationAsRead, AppNotification } from "@/lib/data-service";
import { useAuth } from "@/lib/auth-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function NotificationBell() {
    const { userProfile } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!userProfile) return;

        const loadNotifications = async () => {
            const result = await fetchNotifications();
            setNotifications(result.data);
            setUnreadCount(result.unreadCount);
        };

        loadNotifications();

        // Polling every minute for new matching notifications
        const interval = setInterval(loadNotifications, 60000);
        return () => clearInterval(interval);
    }, [userProfile]);

    const handleNotificationClick = async (notification: AppNotification) => {
        if (!notification.isRead) {
            await markNotificationAsRead(notification.id);
            setNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        }

        setIsOpen(false);

        if (notification.type === "job_match" && notification.referenceId) {
            router.push(`/dashboard/vagas/${notification.referenceId}`);
        } else if (notification.type === "equipment_match" && notification.referenceId) {
            router.push(`/equipamentos/${notification.referenceId}`);
        }
    };

    if (!userProfile) return null;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative group hover:bg-zinc-800 transition-colors">
                    <Bell className="h-5 w-5 text-zinc-400 group-hover:text-white transition-colors" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full border border-zinc-950 animate-pulse" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 mr-4 border-zinc-800 bg-zinc-950/95 backdrop-blur-xl shadow-2xl" align="end">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
                    <h4 className="font-semibold text-zinc-100">Notificações</h4>
                    {unreadCount > 0 && (
                        <span className="text-xs font-semibold bg-red-500 text-white px-2 py-0.5 rounded-full">
                            {unreadCount} novas
                        </span>
                    )}
                </div>
                <ScrollArea className="h-80 select-none">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-zinc-500 text-sm">
                            Nenhuma notificação por enquanto.
                        </div>
                    ) : (
                        <div className="flex flex-col py-2">
                            {notifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`flex flex-col items-start p-3 px-4 transition-colors hover:bg-zinc-800/50 text-left cursor-pointer ${!notification.isRead ? "bg-zinc-900/40 relative" : "opacity-80"
                                        }`}
                                >
                                    {!notification.isRead && (
                                        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-red-500 rounded-full" />
                                    )}
                                    <span className="text-sm font-semibold text-zinc-100 mb-1 leading-tight">
                                        {notification.title}
                                    </span>
                                    <span className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                        {notification.message}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 mt-2 font-medium uppercase tracking-wider">
                                        {formatDistanceToNow(new Date(notification.createdAt), {
                                            addSuffix: true,
                                            locale: ptBR,
                                        })}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
