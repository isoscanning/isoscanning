"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Instagram, Facebook, Youtube, Linkedin, Twitter, Music2, Radio } from "lucide-react";
import {
  SocialMediaPost, NetworkType,
  POST_TYPE_CONFIG, MONTHS_PT,
} from "@/lib/social-media-types";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const NETWORK_ICONS: Record<NetworkType, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube,
};

interface SharedSchedule {
  id: string;
  client_name: string;
  month: number;
  year: number;
  networks: NetworkType[];
}

interface SharedCalendarData {
  schedule: SharedSchedule;
  posts: SocialMediaPost[];
}

function buildCalendarDays(month: number, year: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function SharedCalendarPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<SharedCalendarData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [viewMonth, setViewMonth] = useState<{ month: number; year: number } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    try {
      const res = await fetch(`/api/social-media/share/${token}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Link inválido ou expirado");
        return;
      }
      const json: SharedCalendarData = await res.json();
      setData(json);
      if (!silent && !viewMonth) {
        setViewMonth({ month: json.schedule.month, year: json.schedule.year });
      }
      setLastUpdated(new Date());
      setSecondsAgo(0);
    } catch {
      if (!silent) setError("Erro ao carregar o cronograma");
    }
  }, [token, viewMonth]);

  // Initial fetch
  useEffect(() => {
    fetchData(false);
  }, [token]);

  // Set viewMonth once schedule is loaded
  useEffect(() => {
    if (data && !viewMonth) {
      setViewMonth({ month: data.schedule.month, year: data.schedule.year });
    }
  }, [data, viewMonth]);

  // Polling every 8s
  useEffect(() => {
    intervalRef.current = setInterval(() => fetchData(true), 8000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  // "Atualizado há X segundos" tick
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setSecondsAgo((s) => s + 1);
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  function navigateMonth(dir: -1 | 1) {
    if (!viewMonth) return;
    let { month, year } = viewMonth;
    month += dir;
    if (month > 12) { month = 1; year++; }
    if (month < 1) { month = 12; year--; }
    setViewMonth({ month, year });
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3 p-8">
          <div className="text-5xl">🔗</div>
          <h1 className="text-xl font-bold">Link inválido</h1>
          <p className="text-muted-foreground text-sm max-w-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || !viewMonth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Radio className="h-5 w-5 animate-pulse text-blue-500" />
          <span className="text-sm">Carregando cronograma...</span>
        </div>
      </div>
    );
  }

  const { schedule, posts } = data;
  const monthName = MONTHS_PT[viewMonth.month - 1];
  const calendarDays = buildCalendarDays(viewMonth.month, viewMonth.year);

  const postsInView = posts.filter((p) => {
    const d = new Date(p.scheduled_date + "T00:00:00");
    return d.getMonth() + 1 === viewMonth.month && d.getFullYear() === viewMonth.year;
  });

  const postsByDate: Record<string, SocialMediaPost[]> = {};
  for (const p of postsInView) {
    const key = p.scheduled_date;
    if (!postsByDate[key]) postsByDate[key] = [];
    postsByDate[key].push(p);
  }

  const isOwnerMonth =
    schedule.month === viewMonth.month && schedule.year === viewMonth.year;

  const updatedLabel =
    secondsAgo < 5
      ? "Agora mesmo"
      : secondsAgo < 60
      ? `Há ${secondsAgo}s`
      : `Há ${Math.floor(secondsAgo / 60)}min`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Radio className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground leading-none mb-0.5">Cronograma de</p>
              <h1 className="font-bold text-sm leading-tight">{schedule.client_name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-semibold text-blue-500">AO VIVO</span>
            </div>
            {lastUpdated && (
              <span className="text-[10px] text-muted-foreground hidden sm:block">
                {updatedLabel}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Calendar */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">

          {/* Month nav */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold">
              {monthName} {viewMonth.year}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setViewMonth({ month: schedule.month, year: schedule.year })}
                className="px-2.5 py-1 text-xs rounded-lg hover:bg-muted transition-colors font-medium"
              >
                Atual
              </button>
              <button
                onClick={() => navigateMonth(1)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          {isOwnerMonth ? (
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                if (!day) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[100px] border-b border-r border-border last:border-r-0 bg-muted/20"
                    />
                  );
                }

                const dateStr = `${viewMonth.year}-${pad(viewMonth.month)}-${pad(day)}`;
                const dayPosts = postsByDate[dateStr] || [];
                const isToday =
                  new Date().toISOString().slice(0, 10) === dateStr;

                return (
                  <div
                    key={dateStr}
                    className={`min-h-[100px] border-b border-r border-border last:border-r-0 p-1.5 flex flex-col gap-1 ${
                      isToday ? "bg-blue-500/5" : ""
                    }`}
                  >
                    <span
                      className={`text-xs font-medium self-start px-1 ${
                        isToday
                          ? "text-blue-600 dark:text-blue-400 font-bold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {day}
                    </span>

                    {dayPosts.map((post) => {
                      const typeConfig = POST_TYPE_CONFIG[post.post_type];
                      const Icon = NETWORK_ICONS[post.network] || Instagram;
                      return (
                        <div
                          key={post.id}
                          className="rounded-md p-1.5 bg-card border border-border shadow-sm flex flex-col gap-1 select-none"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${typeConfig.bgColor} ${typeConfig.color}`}
                            >
                              {typeConfig.label}
                            </span>
                            <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                          </div>
                          <p className="text-[11px] font-medium leading-tight line-clamp-2">
                            {post.title}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <div className="text-4xl opacity-30">📅</div>
              <p className="text-muted-foreground text-sm">
                Sem posts em {monthName} {viewMonth.year}
              </p>
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-muted-foreground mt-4 opacity-60">
          Visualização somente-leitura · Gerado por IsoScanning
        </p>
      </main>
    </div>
  );
}
