"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LpHeader } from "@/components/lp-header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FullPageScroller } from "@/components/full-page-scroller";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ScrollReveal, SplitWordReveal, BlurReveal, TiltCard } from "@/components/scroll-reveal";
import { ParticleBackground } from "@/components/particle-background";
import { FloatingParticles } from "@/components/video-background";
import { MouseGlow } from "@/components/mouse-glow";
import {
  ArrowRight,
  CheckCircle2,
  Star,
  Calendar,
  Users,
  Zap,
  MessageSquare,
  Check,
  X,
  Crown,
  Shield,
  Quote,
  Share2,
  Sparkles,
  GripVertical,
  Radio,
  FolderOpen,
  CalendarDays,
  UserCheck,
  Layers,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  RefreshCw,
  Link2,
  Film,
  Hash,
  SendHorizonal,
  Trash2,
} from "lucide-react";

// ── Demo mockup data (all fictitious) ──────────────────────────────────────
const DEMO_CLIENT = "BELLA VITA";
const DEMO_NICHE = "Gastronomia e Lifestyle";

const DEMO_POSTS = [
  { day: 2, type: "CARROSSEL", typeColor: "bg-blue-600", title: "Receita Especial da Casa", time: "12:00" },
  { day: 4, type: "REELS", typeColor: "bg-orange-500", title: "Behind the Kitchen", time: "19:00" },
  { day: 8, type: "CARROSSEL", typeColor: "bg-blue-600", title: "5 Vinhos para Harmonizar", time: "12:00" },
  { day: 11, type: "REELS", typeColor: "bg-orange-500", title: "Prato do Chef em 60s", time: "19:00" },
  { day: 15, type: "CARROSSEL", typeColor: "bg-blue-600", title: "Dicas de Mise en Place", time: "12:00" },
  { day: 17, type: "REELS", typeColor: "bg-orange-500", title: "Harmonização Perfeita", time: "19:00" },
  { day: 22, type: "CARROSSEL", typeColor: "bg-blue-600", title: "Sobremesas Clássicas", time: "12:00" },
  { day: 24, type: "REELS", typeColor: "bg-orange-500", title: "Mesa Posta Especial", time: "19:00" },
  { day: 29, type: "CARROSSEL", typeColor: "bg-blue-600", title: "Temperos do Mundo", time: "12:00" },
];

// June 2026 starts on Monday (index 1)
const JUNE_WEEKS = [
  [null, 1, 2, 3, 4, 5, 6],
  [7, 8, 9, 10, 11, 12, 13],
  [14, 15, 16, 17, 18, 19, 20],
  [21, 22, 23, 24, 25, 26, 27],
  [28, 29, 30, null, null, null, null],
];

function getPostForDay(day: number | null) {
  if (!day) return null;
  return DEMO_POSTS.find((p) => p.day === day) ?? null;
}

// ── Mockup: Calendar ─────────────────────────────────────────────────────
function CalendarMockup() {
  return (
    <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl text-[11px] font-sans select-none" style={{ background: "#080d18" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8" style={{ background: "#0c1221" }}>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-white font-bold text-sm">{DEMO_CLIENT}</span>
          </div>
          <div className="text-white/40 text-[10px] mt-0.5">{DEMO_NICHE} · {DEMO_POSTS.length} posts · Cronograma principal</div>
        </div>
        <div className="flex gap-1.5">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/8 border border-white/10 text-white/70">
            <Share2 className="h-2.5 w-2.5" /><span>Compartilhar</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/8 border border-white/10 text-white/70">
            <Users className="h-2.5 w-2.5" /><span>Equipe</span>
          </div>
        </div>
      </div>
      {/* Month nav */}
      <div className="px-4 py-2 border-b border-white/8 flex items-center justify-between" style={{ background: "#0c1221" }}>
        <h3 className="text-white font-semibold text-xs">Junho 2026 — {DEMO_CLIENT}</h3>
        <div className="flex items-center gap-0.5 text-white/50">
          <div className="p-1 rounded"><ChevronLeft className="h-3 w-3" /></div>
          <span className="text-[10px] px-1.5">Junho 2026</span>
          <div className="p-1 rounded"><ChevronRight className="h-3 w-3" /></div>
        </div>
      </div>
      {/* Weekdays */}
      <div className="grid grid-cols-7 border-b border-white/8">
        {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d) => (
          <div key={d} className="py-1.5 text-center text-[9px] font-semibold text-white/30">{d}</div>
        ))}
      </div>
      {/* Days grid */}
      {JUNE_WEEKS.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day, di) => {
            const post = getPostForDay(day);
            return (
              <div
                key={`${wi}-${di}`}
                className={`min-h-[52px] border-b border-r border-white/5 last:border-r-0 p-1 ${!day ? "bg-white/2" : ""}`}
              >
                {day && (
                  <>
                    <span className={`text-[9px] font-medium px-0.5 ${day === 10 ? "text-blue-400 font-bold" : "text-white/30"}`}>{day}</span>
                    {post && (
                      <div className={`mt-0.5 rounded px-1 py-0.5 ${post.typeColor}`}>
                        <div className="text-[8px] font-bold text-white/90">{post.type} · {post.time}</div>
                        <div className="text-[9px] text-white font-medium leading-tight line-clamp-1">{post.title}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
      {/* Footer */}
      <div className="px-4 py-1.5 border-t border-white/8 flex items-center justify-between" style={{ background: "#0c1221" }}>
        <span className="text-white/30 text-[9px]">{DEMO_POSTS.length} posts neste mês · {DEMO_POSTS.length} rascunho</span>
        <span className="text-white/20 text-[9px]">Cronograma gerado com IA · 3x/semana</span>
      </div>
    </div>
  );
}

// ── Mockup: Share Modal ──────────────────────────────────────────────────
function ShareModalMockup() {
  return (
    <div className="rounded-xl border border-white/10 shadow-2xl overflow-hidden text-[11px] select-none" style={{ background: "#0c1221", maxWidth: 340 }}>
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <Share2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">Compartilhar Cronograma</div>
            <div className="text-white/40 text-[10px]">Visualização pública somente-leitura</div>
          </div>
        </div>
        <span className="text-white/30 text-base leading-none mt-0.5 cursor-pointer">×</span>
      </div>
      <div className="px-5 pb-3">
        <div className="flex items-center justify-between p-3 rounded-xl border border-white/10" style={{ background: "#080d18" }}>
          <div>
            <div className="font-semibold text-white/80 text-xs mb-0.5">Compartilhamento inativo</div>
            <div className="text-white/35 text-[10px]">O link está bloqueado temporariamente</div>
          </div>
          <div className="relative h-5 w-9 rounded-full bg-white/20">
            <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow translate-x-0.5" />
          </div>
        </div>
        <p className="text-center text-white/30 text-[10px] mt-3">Ative o compartilhamento para exibir e copiar o link.</p>
      </div>
      <div className="px-5 pb-5">
        <div className="p-3 rounded-xl border border-white/10" style={{ background: "#080d18" }}>
          <div className="font-semibold text-white/80 text-xs mb-0.5">Revogar link atual</div>
          <div className="text-white/35 text-[10px] mb-2.5">Gera um novo token. Links anteriores param de funcionar.</div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 w-fit">
            <RefreshCw className="h-3 w-3 text-red-400" />
            <span className="text-red-400 text-[10px] font-semibold">Revogar</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mockup: Team Management ──────────────────────────────────────────────
function TeamMockup() {
  return (
    <div className="rounded-xl border border-white/10 shadow-2xl overflow-hidden text-[11px] select-none" style={{ background: "#080d18" }}>
      <div className="px-5 pt-4 pb-3 border-b border-white/8" style={{ background: "#0c1221" }}>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-white/50" />
          <span className="font-bold text-white text-sm">Gestão de Equipe</span>
        </div>
        <div className="text-white/30 text-[10px] mt-0.5">Cronograma: {DEMO_CLIENT}</div>
      </div>
      <div className="p-4 border-b border-white/8">
        <div className="font-semibold text-white/70 text-xs mb-2.5">Convidar Colaborador</div>
        <div className="text-white/40 text-[10px] mb-2.5">Busque pelo nome ou @usuário de alguém cadastrado na plataforma</div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { icon: Edit3, label: "Editor", sub: "Pode editar posts e conteúdo" },
            { icon: CheckCircle2, label: "Aprovador", sub: "Pode aprovar e rejeitar posts" },
            { icon: Eye, label: "Visualizador", sub: "Apenas leitura", active: true },
          ].map(({ icon: Icon, label, sub, active }) => (
            <div key={label} className={`rounded-lg border p-2 text-center ${active ? "border-blue-500 bg-blue-500/10" : "border-white/10 bg-white/3"}`}>
              <Icon className={`h-3.5 w-3.5 mx-auto mb-1 ${active ? "text-blue-400" : "text-white/40"}`} />
              <div className={`font-semibold text-[10px] ${active ? "text-blue-300" : "text-white/60"}`}>{label}</div>
              <div className="text-[8px] text-white/25 leading-tight">{sub}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5">
          <span className="text-white/20 text-[10px]">Digite o nome ou @usuário...</span>
        </div>
      </div>
      <div className="p-4 border-b border-white/8">
        <div className="font-semibold text-white/70 text-xs mb-2.5">Membros da Equipe</div>
        <div className="text-white/30 text-[10px] mb-2">1 colaborador com acesso a este cronograma</div>
        {[{ name: "Lucas Mendes", role: "Editor", since: "10/06/2026", initial: "L" }].map((m) => (
          <div key={m.name} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-[10px]">{m.initial}</div>
              <div>
                <div className="text-white/80 font-semibold text-xs">{m.name}</div>
                <div className="text-white/30 text-[9px]">Desde {m.since}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="px-2 py-0.5 rounded border border-white/15 text-white/50 text-[9px]">{m.role} ▾</div>
              <Trash2 className="h-3 w-3 text-white/20" />
            </div>
          </div>
        ))}
      </div>
      <div className="p-4">
        <div className="font-semibold text-white/70 text-xs mb-2">Referência de Funções</div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "Proprietário", desc: "Acesso total", color: "bg-blue-500/20 text-blue-300" },
            { label: "Editor", desc: "Pode editar posts e conteúdo", color: "bg-green-500/20 text-green-300" },
            { label: "Aprovador", desc: "Pode aprovar e rejeitar posts", color: "bg-yellow-500/20 text-yellow-300" },
            { label: "Visualizador", desc: "Apenas leitura", color: "bg-gray-500/20 text-gray-300" },
          ].map((r) => (
            <div key={r.label} className="flex items-center gap-1.5">
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${r.color}`}>{r.label}</span>
              <span className="text-white/30 text-[9px]">{r.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Mockup: Post Detail ───────────────────────────────────────────────────
function PostDetailMockup() {
  return (
    <div className="rounded-xl border border-white/10 shadow-2xl overflow-hidden text-[11px] select-none" style={{ background: "#0c1221" }}>
      <div className="px-5 pt-4 pb-2 border-b border-white/8 flex items-center gap-2">
        <Calendar className="h-3.5 w-3.5 text-white/40" />
        <span className="text-white/50 text-xs">Quinta-Feira, 04 de Junho</span>
        <span className="mx-1 text-white/20">·</span>
        <span className="text-white/50 text-xs">19:00h</span>
      </div>
      <div className="flex border-b border-white/8">
        {["Conteúdo", "Comentários"].map((tab, i) => (
          <button key={tab} className={`px-5 py-2.5 text-xs font-semibold ${i === 0 ? "border-b-2 border-blue-500 text-blue-400" : "text-white/30"}`}>
            <span className="flex items-center gap-1.5">
              {i === 0 ? <Film className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />} {tab}
            </span>
          </button>
        ))}
      </div>
      <div className="p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="text-white/30 text-[10px]">Clique em editar para modificar</div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/15 text-white/50 text-[10px]">
            <Edit3 className="h-2.5 w-2.5" /> Editar
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="font-semibold text-white/60 text-[10px] flex items-center gap-1"><Film className="h-3 w-3" /> Legenda / Copy</div>
            <div className="text-blue-400 text-[9px] flex items-center gap-1"><Sparkles className="h-2.5 w-2.5" /> Reescrever com IA</div>
          </div>
          <div className="p-2.5 rounded-lg border border-white/8 bg-white/3 text-white/65 text-[10px] leading-relaxed">
            Cada prato conta uma história. ✨ Descubra os segredos da nossa cozinha e a paixão em cada detalhe. 🍷 Clique no bio para reservar. <span className="text-blue-400">#gastronomia #bellavita #restaurante</span>
          </div>
        </div>
        <div>
          <div className="font-semibold text-white/60 text-[10px] flex items-center gap-1 mb-1.5"><Hash className="h-3 w-3" /> Hashtags</div>
          <div className="flex flex-wrap gap-1">
            {["#gastronomia", "#bellavita", "#restaurante", "#cheflife", "#vinhos"].map((h) => (
              <span key={h} className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/20 text-blue-300/80 text-[9px]">{h}</span>
            ))}
          </div>
        </div>
        <div>
          <div className="font-semibold text-white/60 text-[10px] mb-1.5">Brief para o Criador de Conteúdo</div>
          <div className="p-2.5 rounded-lg border border-white/8 bg-white/3 text-white/55 text-[10px] leading-relaxed">
            Grave um Reels de 45 segundos mostrando o preparo do prato do chef, com música ambiente do restaurante e close nos ingredientes.
          </div>
        </div>
        <div>
          <div className="font-semibold text-white/60 text-[10px] mb-1.5 flex items-center gap-1"><FolderOpen className="h-3 w-3" /> Links de produção</div>
          <div className="flex items-center gap-2 text-[9px] text-white/30 mb-1"><Link2 className="h-3 w-3" /> Material para produção · <em>Nenhum link cadastrado</em></div>
          <div className="flex items-center gap-2 text-[9px] text-white/30"><Film className="h-3 w-3" /> Conteúdo pronto · <em>Nenhum link cadastrado</em></div>
        </div>
        <div className="pt-1">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-500/90 w-fit">
            <SendHorizonal className="h-3 w-3 text-black" />
            <span className="text-black font-bold text-[10px]">Enviar para revisão</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── LP Content Data ───────────────────────────────────────────────────────
const perfis = [
  {
    badge: "PARA AGÊNCIAS",
    title: "Escale com múltiplos clientes.",
    description: "Gerencie calendários de conteúdo de vários clientes ao mesmo tempo, com equipes separadas e total organização.",
    bullets: ["Até 5 contas de clientes no plano Pro", "Contas ilimitadas no plano Ultra", "Equipe de até 5 colaboradores por conta", "Link de aprovação ao vivo para cada cliente"],
    link: "Ver planos para agências",
    bgClass: "bg-blue-950/20", borderClass: "border-blue-500/20",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    linkClass: "text-blue-400 hover:text-blue-300",
  },
  {
    badge: "PARA FREELANCERS",
    title: "Impressione. Entregue mais rápido.",
    description: "Gere calendários completos em segundos com IA e surpreenda seus clientes com uma entrega profissional e visual.",
    bullets: ["Calendário mensal gerado com IA em segundos", "Reels, Carrossel, Story, Feed — todos os formatos", "Link de visualização ao vivo para o cliente", "Comece grátis com 1 conta no plano Free"],
    link: "Ver planos para freelancers",
    bgClass: "bg-cyan-950/20", borderClass: "border-cyan-500/20",
    badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    linkClass: "text-cyan-400 hover:text-cyan-300",
  },
  {
    badge: "PARA EQUIPES",
    title: "Colabore sem perder o fio.",
    description: "Editors, aprovadores e viewers trabalham juntos no mesmo calendário — com roles claros e sem conflitos de edição.",
    bullets: ["Roles: Owner, Editor, Aprovador, Viewer", "Comentários por post para feedback rápido", "Links de material e vídeo por post", "Drag-and-drop para reorganizar o calendário"],
    link: "Ver planos para equipes",
    bgClass: "bg-indigo-950/20", borderClass: "border-indigo-500/20",
    badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    linkClass: "text-indigo-400 hover:text-indigo-300",
  },
];

const allFeatures = [
  { icon: Sparkles, title: "Geração com IA", description: "Gere um calendário mensal completo em segundos. A IA cria títulos, tipos de post e distribuição de datas com base no nicho e tom de voz do cliente.", color: "from-blue-500 to-blue-600", shadow: "shadow-blue-500/25" },
  { icon: CalendarDays, title: "Calendário Visual", description: "Visualize todos os posts do mês em um calendário grid interativo. Arraste cards entre datas para reorganizar o cronograma sem retrabalho.", color: "from-blue-500 to-cyan-500", shadow: "shadow-cyan-500/25" },
  { icon: Share2, title: "Link de Aprovação", description: "Compartilhe o calendário com o cliente via link público somente-leitura. O cliente vê as atualizações em tempo real, sem precisar criar conta.", color: "from-blue-600 to-blue-500", shadow: "shadow-blue-500/25" },
  { icon: Users, title: "Gestão de Equipe", description: "Adicione colaboradores com roles específicos: Editor pode alterar conteúdo, Aprovador valida posts e Viewer apenas acompanha o calendário.", color: "from-blue-500 to-blue-600", shadow: "shadow-blue-500/25" },
  { icon: Layers, title: "Tipos de Post", description: "Reels, Carrossel, Feed Imagem, Feed Vídeo, Story, Shorts e Thread. Identifique cada post com badges coloridos para uma visão clara do mix de conteúdo.", color: "from-cyan-500 to-blue-600", shadow: "shadow-blue-500/25" },
  { icon: MessageSquare, title: "Comentários e Feedback", description: "Equipe e aprovadores deixam comentários diretamente no post. Mantenha o histórico de feedback centralizado e evite mensagens perdidas no WhatsApp.", color: "from-blue-500 to-blue-600", shadow: "shadow-blue-500/25" },
  { icon: FolderOpen, title: "Links de Material", description: "Salve o link do material a ser produzido e o link do conteúdo pronto em cada post. Tudo acessível em um lugar só para editor e aprovador.", color: "from-blue-600 to-cyan-500", shadow: "shadow-cyan-500/25" },
  { icon: Radio, title: "Visualização Ao Vivo", description: "O link de compartilhamento atualiza automaticamente a cada 8 segundos. O cliente vê o calendário evoluir em tempo real, gerando confiança e transparência.", color: "from-blue-500 to-blue-600", shadow: "shadow-blue-500/25" },
];

const competitors = [
  { platform: "Hootsuite", focus: "Agendamento e publicação", ia: "Não", team: "Pago extra", share: "Não", price: "US$ 99/mês", highlight: false },
  { platform: "Buffer", focus: "Agendamento simplificado", ia: "Básica", team: "Limitado", share: "Não", price: "US$ 15/mês", highlight: false },
  { platform: "Later", focus: "Foco em Instagram", ia: "Não", team: "Básico", share: "Parcial", price: "US$ 25/mês", highlight: false },
  { platform: "Notion / Planilha", focus: "Planejamento manual", ia: "Não", team: "Sim", share: "Parcial", price: "Variável", highlight: false },
  { platform: "IsoScanning", focus: "Calendário IA + Equipe + Aprovação ao vivo", ia: "Nativo", team: "Com roles", share: "Ao vivo", price: "R$ 0 — R$ 159,90", highlight: true },
];

const steps = [
  { step: 1, title: "Crie o Cronograma", description: "Cadastre o cliente, defina as redes sociais, nicho e tom de voz. Leva menos de 2 minutos.", icon: Calendar },
  { step: 2, title: "Gere com IA", description: "Clique em gerar e a IA monta o calendário mensal completo com posts distribuídos ao longo do mês.", icon: Sparkles },
  { step: 3, title: "Ajuste e Colabore", description: "Arraste posts, edite títulos, mude tipos e receba feedback da equipe via comentários.", icon: GripVertical },
  { step: 4, title: "Compartilhe ao Vivo", description: "Envie o link de aprovação ao cliente. Ele vê o calendário atualizado em tempo real, sem precisar de conta.", icon: Share2 },
];

const testimonials = [
  { quote: "Antes levava um dia inteiro para montar o cronograma de cada cliente no Notion. Com a IA da IsoScanning, gero o mês inteiro em segundos e ainda compartilho o link direto para aprovação. Meus clientes amam a transparência.", name: "Camila Rocha", role: "Social Media Freelancer", initial: "C" },
  { quote: "Gerencio 8 clientes simultaneamente. Com os roles de equipe, minha editora cuida do conteúdo e eu só entro para aprovar. O link ao vivo virou meu diferencial nas propostas — os clientes percebem o profissionalismo na hora.", name: "Bruno Tavares", role: "Dono de Agência Digital", initial: "B" },
  { quote: "O drag-and-drop salvou minha vida. Quando o cliente pede para mudar a data de um post, é questão de segundos. Sem retrabalho, sem planilha desatualizada, sem estresse.", name: "Luana Ferreira", role: "Gestora de Conteúdo", initial: "L" },
];

const faqs = [
  { q: "Como funciona a geração de calendário com IA?", a: "Você informa o nome do cliente, o nicho, as redes sociais e o tom de voz desejado. A IA gera um calendário mensal completo com títulos de posts, tipos de conteúdo (Reels, Carrossel, Story, etc.) e datas distribuídas de forma estratégica ao longo do mês." },
  { q: "O cliente precisa criar uma conta para ver o calendário?", a: "Não! O link de compartilhamento é público e somente-leitura. Basta enviar o link para o cliente e ele visualiza o calendário em tempo real, sem precisar se cadastrar em nenhum lugar." },
  { q: "Posso desativar o link de compartilhamento sem perder o link?", a: "Sim. Você pode ativar e desativar o compartilhamento com um toggle. Quando desativado, o link para de funcionar mas o token é mantido — ao reativar, o mesmo link voltará a funcionar." },
  { q: "Como funcionam os roles da equipe?", a: "Existem quatro roles: Owner (acesso total), Editor (pode editar posts e conteúdo), Aprovador (pode editar e comentar para dar feedback) e Viewer (apenas visualiza). Isso garante que cada pessoa tenha exatamente o nível de acesso que precisa." },
  { q: "Posso gerenciar calendários de meses diferentes?", a: "Sim. Cada cronograma pertence a um cliente e você pode navegar entre meses livremente. Se um mês estiver vazio, um botão de gerar com IA aparece automaticamente para você criar o calendário daquele mês." },
  { q: "Quantas contas de clientes posso gerenciar?", a: "No plano Free você gerencia 1 conta. No plano Pro até 5 contas com geração de IA ilimitada. No Ultra as contas são ilimitadas e você ainda pode adicionar até 5 membros de equipe por conta." },
  { q: "O que são os links de material e vídeo nos posts?", a: "Cada post tem dois campos opcionais: 'Link do Material' (para o arquivo a ser produzido, como um briefing no Drive) e 'Link do Conteúdo Pronto' (para o vídeo ou imagem finalizada). Isso centraliza tudo no calendário, eliminando trocas de arquivo por WhatsApp." },
  { q: "Posso criar posts manualmente além da geração com IA?", a: "Sim! Você pode criar posts manualmente clicando no botão '+' em qualquer dia do calendário. Defina título, tipo, rede social, horário, copy e hashtags. Posts manuais e gerados por IA convivem no mesmo calendário." },
];

const LightRays = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div
      className="absolute -top-[50%] left-[10%] w-[150px] h-[200%] bg-gradient-to-r from-transparent via-blue-500/10 to-transparent -rotate-45 transform-gpu blur-[20px]"
      animate={{ opacity: [0.3, 0.8, 0.2, 0.6, 0.3], x: [0, 40, -30, 20, 0], scale: [1, 1.2, 0.9, 1.1, 1] }}
      transition={{ duration: 12, ease: "easeInOut", repeat: Infinity }}
    />
    <motion.div
      className="absolute -top-[50%] right-[20%] w-[100px] h-[200%] bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -rotate-45 transform-gpu blur-[15px]"
      animate={{ opacity: [0.2, 0.7, 0.3, 0.9, 0.2], x: [0, -60, 40, -20, 0], scale: [1, 1.3, 0.8, 1.2, 1] }}
      transition={{ duration: 15, ease: "easeInOut", repeat: Infinity }}
    />
    <motion.div
      className="absolute -top-[50%] left-[50%] w-[250px] h-[200%] bg-gradient-to-r from-transparent via-blue-600/10 to-transparent -rotate-45 transform-gpu blur-[30px]"
      animate={{ opacity: [0.4, 0.9, 0.5, 0.8, 0.4], x: [0, 70, -40, 50, 0], scale: [1, 1.1, 0.95, 1.15, 1] }}
      transition={{ duration: 18, ease: "easeInOut", repeat: Infinity }}
    />
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────
export default function LpSocialMedia() {
  return (
    <div className="md:h-screen md:overflow-hidden flex flex-col bg-background">
      <LpHeader ctaHref="/cadastro" ctaLabel="Criar Conta Grátis" produtoHref="/lp/social-media" />

      <main className="flex-1 flex flex-col">
        <FullPageScroller sectionsCount={10}>

          {/* ===== 1. HERO ===== */}
          <section className="relative min-h-[100vh] h-auto py-20 md:py-0 md:min-h-0 md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex items-center justify-center overflow-hidden">
            <MouseGlow color="59, 130, 246" size={600} opacity={0.13} />
            <ParticleBackground />
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/12 dark:bg-blue-500/8 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-cyan-500/12 dark:bg-cyan-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
            </div>

            <div className="container mx-auto px-4 relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
                {/* Text column */}
                <div className="space-y-7 text-center lg:text-left">
                  <ScrollReveal delay={0.1}>
                    <Badge variant="secondary" className="px-4 py-1.5 text-sm gap-2 bg-blue-500/10 text-blue-500 border-blue-500/20 whitespace-normal text-center max-w-xs sm:max-w-none">
                      <Sparkles className="h-4 w-4 shrink-0" />
                      <span className="sm:hidden">Social Media com IA</span>
                      <span className="hidden sm:inline">Gestão de Social Media com Inteligência Artificial</span>
                    </Badge>
                  </ScrollReveal>

                  <ScrollReveal delay={0.25}>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                      <span className="text-foreground">Calendários criados</span>
                      <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400">
                        por IA em segundos.
                      </span>
                    </h1>
                  </ScrollReveal>

                  <ScrollReveal delay={0.4}>
                    <p className="text-lg sm:text-xl text-muted-foreground font-light leading-relaxed">
                      Do briefing ao link de aprovação com o cliente —{" "}
                      <span className="font-medium text-foreground">sem planilhas, sem WhatsApp perdido.</span>{" "}
                      Colabore com sua equipe e entregue com mais velocidade.
                    </p>
                  </ScrollReveal>

                  <ScrollReveal delay={0.55}>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                      <Link href="/cadastro">
                        <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300 group">
                          Criar meu primeiro calendário
                          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                      <Link href="/precos">
                        <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full bg-background/50 backdrop-blur-sm border-2 hover:bg-background/80 transition-all duration-300">
                          Ver planos
                        </Button>
                      </Link>
                    </div>
                  </ScrollReveal>

                  <ScrollReveal delay={0.7}>
                    <div className="flex flex-wrap justify-center lg:justify-start gap-4 text-sm font-medium">
                      {[
                        { icon: Sparkles, text: "Calendário em segundos" },
                        { icon: Radio, text: "Link ao vivo para o cliente" },
                        { icon: UserCheck, text: "Começa grátis" },
                      ].map(({ icon: Icon, text }) => (
                        <div key={text} className="flex items-center gap-2 bg-muted/50 backdrop-blur px-4 py-2 rounded-full border border-border/50">
                          <Icon className="h-4 w-4 text-blue-500" />
                          <span>{text}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollReveal>
                </div>

                {/* Calendar mockup column */}
                <ScrollReveal delay={0.35} direction="up" distance={40} className="hidden lg:block">
                  <div className="relative">
                    <div className="absolute -inset-4 bg-blue-500/10 rounded-3xl blur-2xl" />
                    <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl" style={{ maxHeight: 420 }}>
                      <CalendarMockup />
                      <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-[#080d18] to-transparent pointer-events-none" />
                    </div>
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-xs font-semibold text-blue-500 whitespace-nowrap">Atualizado há 3s</span>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </section>

          {/* ===== 2. PARA QUEM É ===== */}
          <section className="min-h-[100vh] h-auto py-20 md:py-0 md:min-h-0 md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center bg-slate-950 relative overflow-hidden">
            <LightRays />
            <div className="container mx-auto px-4 relative z-10">
              <ScrollReveal>
                <div className="text-center mb-8 space-y-3">
                  <Badge className="bg-white/5 text-white/50 border-white/10 px-3 py-1 text-[10px] font-semibold tracking-widest uppercase">Feito para quem entrega conteúdo</Badge>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                    Qual é o seu{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400">modelo de trabalho?</span>
                  </h2>
                  <p className="text-base text-white/60 max-w-2xl mx-auto">Freelancer solo, agência com equipe ou gestor de conteúdo interno — a plataforma se adapta ao seu fluxo.</p>
                </div>
              </ScrollReveal>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {perfis.map((item, i) => (
                  <ScrollReveal key={i} delay={i * 0.1} className="h-full">
                    <Card className={`h-full flex flex-col p-6 rounded-3xl border ${item.borderClass} ${item.bgClass} backdrop-blur-sm shadow-2xl`}>
                      <div className="mb-3">
                        <Badge className={`${item.badgeClass} px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider`}>{item.badge}</Badge>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2 leading-tight">{item.title}</h3>
                      <p className="text-white/60 text-sm leading-relaxed mb-4">{item.description}</p>
                      <ul className="space-y-2.5 mb-5 flex-1">
                        {item.bullets.map((bullet, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-white/80 font-medium">
                            <Check className={`w-4 h-4 mt-0.5 shrink-0 ${item.linkClass.split(" ")[0]}`} /><span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                      <Link href="/precos" className={`mt-auto font-semibold text-sm flex items-center group transition-colors ${item.linkClass}`}>
                        {item.link}<ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Card>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* ===== 3. FUNCIONALIDADES ===== */}
          <section className="min-h-[100vh] h-auto py-20 md:py-0 md:min-h-0 md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -top-32 -left-32 w-72 h-72 bg-blue-500/6 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-500/6 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="container mx-auto px-4 relative">
              <div className="text-center mb-16 space-y-4">
                <ScrollReveal direction="up" distance={16} delay={0}>
                  <span className="text-blue-500 font-semibold text-sm uppercase tracking-wider">Tudo incluso</span>
                </ScrollReveal>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
                  <SplitWordReveal text="O que você vai encontrar" delay={0.1} />
                  {" "}
                  <BlurReveal delay={0.52} className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-400 dark:to-cyan-400">
                    na plataforma
                  </BlurReveal>
                </h2>
              </div>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
                <Carousel opts={{ align: "start", loop: true }} className="w-full">
                  <CarouselContent className="-ml-4 py-4">
                    {allFeatures.map((feature, i) => (
                      <CarouselItem key={i} className="pl-4 basis-full md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                        <ScrollReveal delay={(i % 4) * 0.1} direction="up" distance={40} className="h-full">
                          <div className="p-1 h-full">
                            <TiltCard intensity={8}>
                              <Card className="group border-2 hover:border-blue-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 h-full">
                                <CardContent className="pt-8 pb-8 space-y-6 text-center flex flex-col items-center h-full">
                                  <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg ${feature.shadow} group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                                    <feature.icon className="h-8 w-8 text-white" />
                                  </div>
                                  <div className="flex-1 flex flex-col">
                                    <h3 className="font-bold text-lg mb-3">{feature.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed text-sm flex-1">{feature.description}</p>
                                  </div>
                                </CardContent>
                              </Card>
                            </TiltCard>
                          </div>
                        </ScrollReveal>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="absolute -left-2 md:-left-12 border-border/50 bg-background/50 backdrop-blur-sm" />
                  <CarouselNext className="absolute -right-2 md:-right-12 border-border/50 bg-background/50 backdrop-blur-sm" />
                </Carousel>
              </div>
            </div>
          </section>

          {/* ===== 4. DEMO "VEJA NA PRÁTICA" ===== */}
          <section className="min-h-[100vh] h-auto py-16 md:py-0 md:min-h-0 md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center bg-slate-950 relative overflow-hidden">
            <LightRays />
            <div className="container mx-auto px-4 relative z-10">
              <ScrollReveal>
                <div className="text-center mb-8 space-y-3">
                  <Badge className="bg-white/5 text-white/50 border-white/10 px-3 py-1 text-[10px] font-semibold tracking-widest uppercase">Interface real do produto</Badge>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                    Veja como é na{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">prática</span>
                  </h2>
                  <p className="text-white/60 text-sm sm:text-base max-w-xl mx-auto">
                    Cada tela foi construída para ser rápida, clara e fácil de usar — com ou sem experiência em ferramentas de marketing.
                  </p>
                </div>
              </ScrollReveal>

              {/* Desktop layout */}
              <div className="hidden lg:flex gap-5 max-w-7xl mx-auto items-start">
                {/* Calendar - main panel */}
                <ScrollReveal delay={0.1} className="flex-[3] min-w-0">
                  <div className="space-y-2.5">
                    <div className="relative rounded-xl overflow-hidden border border-white/10" style={{ maxHeight: 430 }}>
                      <CalendarMockup />
                      <div className="absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
                    </div>
                    <div>
                      <p className="text-white/80 font-semibold text-sm">Calendário com IA</p>
                      <p className="text-white/40 text-xs">Visualize e reorganize posts no grid mensal</p>
                    </div>
                  </div>
                </ScrollReveal>

                {/* 3 smaller panels */}
                <div className="flex-[2] min-w-0 space-y-3">
                  {[
                    { label: "Link de Compartilhamento", desc: "Ative ou revogue o acesso público com um clique", component: <ShareModalMockup />, height: 128 },
                    { label: "Gestão de Equipe", desc: "Convide colaboradores com roles específicos", component: <TeamMockup />, height: 128 },
                    { label: "Detalhes do Post", desc: "Copy, hashtags, brief e links num só lugar", component: <PostDetailMockup />, height: 128 },
                  ].map((screen, i) => (
                    <ScrollReveal key={screen.label} delay={0.15 + i * 0.1}>
                      <div className="space-y-1.5">
                        <div className="relative rounded-xl overflow-hidden border border-white/10" style={{ maxHeight: screen.height }}>
                          {screen.component}
                          <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
                        </div>
                        <div>
                          <p className="text-white/75 font-semibold text-xs">{screen.label}</p>
                          <p className="text-white/30 text-[10px]">{screen.desc}</p>
                        </div>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>

              {/* Mobile: carousel */}
              <div className="lg:hidden relative px-2">
                <Carousel opts={{ align: "start", loop: true }}>
                  <CarouselContent className="-ml-3">
                    {[
                      { label: "Calendário com IA", desc: "Visualize e reorganize posts no grid mensal", component: <CalendarMockup />, height: 280 },
                      { label: "Link de Compartilhamento", desc: "Ative ou revogue o acesso público com um clique", component: <ShareModalMockup />, height: 300 },
                      { label: "Gestão de Equipe", desc: "Convide colaboradores com roles específicos", component: <TeamMockup />, height: 300 },
                      { label: "Detalhes do Post", desc: "Copy, hashtags, brief e links num só lugar", component: <PostDetailMockup />, height: 300 },
                    ].map((screen) => (
                      <CarouselItem key={screen.label} className="pl-3 basis-[88vw] sm:basis-[70vw]">
                        <div className="space-y-2.5">
                          <div className="relative rounded-xl overflow-hidden border border-white/10" style={{ maxHeight: screen.height }}>
                            {screen.component}
                            <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
                          </div>
                          <div>
                            <p className="text-white/80 font-semibold text-sm">{screen.label}</p>
                            <p className="text-white/40 text-xs">{screen.desc}</p>
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <div className="flex justify-center gap-3 mt-5">
                    <CarouselPrevious className="relative inset-auto translate-y-0 border-white/10 bg-black/50 text-white hover:bg-white/10 hover:text-white" />
                    <CarouselNext className="relative inset-auto translate-y-0 border-white/10 bg-black/50 text-white hover:bg-white/10 hover:text-white" />
                  </div>
                </Carousel>
              </div>
            </div>
          </section>

          {/* ===== 5. COMPARATIVO ===== */}
          <section className="min-h-[100vh] h-auto py-20 md:py-0 md:min-h-0 md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center bg-muted/30 dark:bg-muted/10 border-y border-border/40">
            <div className="container mx-auto px-4">
              <ScrollReveal>
                <div className="text-center mb-12 space-y-4 max-w-3xl mx-auto">
                  <span className="text-blue-500 font-semibold text-sm uppercase tracking-wider">Por que IsoScanning?</span>
                  <h2 className="text-3xl sm:text-4xl font-bold">Compare com as alternativas</h2>
                  <p className="text-muted-foreground">Ferramentas de agendamento existem há anos. Mas nenhuma combina geração por IA, colaboração em equipe e link de aprovação ao vivo — tudo em um só lugar.</p>
                </div>
              </ScrollReveal>

              <div className="max-w-6xl mx-auto pb-4">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[800px] border-collapse bg-background rounded-2xl overflow-hidden shadow-sm border border-border">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border text-left">
                        {["Plataforma", "Foco", "Geração IA", "Equipe c/ Roles", "Link ao Vivo", "Preço"].map((h) => (
                          <th key={h} className="p-4 font-semibold text-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {competitors.map((comp, i) => (
                        <tr key={i} className={`border-b border-border/50 transition-colors ${comp.highlight ? "bg-blue-500/5 hover:bg-blue-500/10" : "hover:bg-muted/30"}`}>
                          <td className="p-4 font-medium">
                            {comp.highlight
                              ? <span className="flex items-center gap-2 text-blue-500 font-bold"><Zap className="h-4 w-4" /> {comp.platform}</span>
                              : comp.platform}
                          </td>
                          <td className="p-4 text-muted-foreground text-sm">{comp.focus}</td>
                          <td className={`p-4 font-semibold text-sm ${comp.highlight ? "text-green-500" : "text-muted-foreground"}`}>{comp.ia}</td>
                          <td className={`p-4 font-semibold text-sm ${comp.highlight ? "text-green-500" : "text-muted-foreground"}`}>{comp.team}</td>
                          <td className={`p-4 font-semibold text-sm ${comp.highlight ? "text-green-500" : "text-muted-foreground"}`}>{comp.share}</td>
                          <td className={`p-4 font-semibold text-sm ${comp.highlight ? "text-blue-500 text-base" : "text-muted-foreground"}`}>{comp.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-4 md:hidden">
                  {competitors.map((comp, i) => (
                    <Card key={i} className={`overflow-hidden border-2 ${comp.highlight ? "border-blue-500/50 shadow-lg shadow-blue-500/10 bg-blue-500/5" : "border-border/50"}`}>
                      <CardContent className="p-5 flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b border-border/50 pb-3">
                          <span className={`font-bold text-lg ${comp.highlight ? "text-blue-500 flex items-center gap-2" : "text-foreground"}`}>
                            {comp.highlight && <Zap className="h-4 w-4" />}{comp.platform}
                          </span>
                          <span className={`font-bold text-sm ${comp.highlight ? "text-blue-500" : "text-muted-foreground"}`}>{comp.price}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          {[["IA", comp.ia], ["Equipe", comp.team], ["Ao Vivo", comp.share]].map(([label, val]) => (
                            <div key={label}>
                              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</span>
                              <span className={`text-sm font-semibold ${comp.highlight ? "text-green-500" : "text-muted-foreground"}`}>{val}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <ScrollReveal delay={0.2}>
                <div className="text-center mt-8">
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium bg-blue-500/10 inline-block px-6 py-3 rounded-full border border-blue-500/20">
                    <CheckCircle2 className="inline-block h-5 w-5 mr-2 -mt-0.5" />
                    IA nativa + equipe com roles + link ao vivo — só na IsoScanning.
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* ===== 6. COMO FUNCIONA ===== */}
          <section className="min-h-[100vh] h-auto py-20 md:py-0 md:min-h-0 md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center">
            <div className="container mx-auto px-4">
              <ScrollReveal>
                <div className="text-center mb-16 space-y-4">
                  <span className="text-blue-500 font-semibold text-sm uppercase tracking-wider">Do zero ao cliente em minutos</span>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">Como funciona na prática</h2>
                  <p className="text-lg text-muted-foreground max-w-xl mx-auto">Quatro passos e seu cliente já tem um calendário completo esperando aprovação.</p>
                </div>
              </ScrollReveal>

              <div className="max-w-5xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  {steps.map((item, i) => (
                    <ScrollReveal key={item.step} delay={i * 0.15}>
                      <div className="relative text-center group">
                        {i < steps.length - 1 && (
                          <div className="hidden md:block absolute top-10 left-[60%] w-full h-0.5 bg-gradient-to-r from-blue-500/50 to-blue-500/10" />
                        )}
                        <div className="relative z-10">
                          <div className="h-20 w-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300">
                            <item.icon className="h-10 w-10 text-white" />
                          </div>
                          <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-background border-2 border-blue-500 flex items-center justify-center font-bold text-blue-500 text-sm">
                            {item.step}
                          </div>
                        </div>
                        <h3 className="text-lg font-bold mt-6 mb-2">{item.title}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>

              <ScrollReveal delay={0.5}>
                <div className="text-center mt-16">
                  <Link href="/cadastro">
                    <Button size="lg" className="h-14 px-10 text-lg rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300 group">
                      Começar agora — É grátis
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* ===== 7. DEPOIMENTOS ===== */}
          <section className="min-h-[100vh] h-auto py-20 md:py-0 md:min-h-0 md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center bg-slate-950">
            <div className="container mx-auto px-4">
              <ScrollReveal>
                <div className="text-center mb-16 space-y-4">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                    Quem entrega, confia.
                  </h2>
                  <p className="text-lg text-white/70 max-w-xl mx-auto">Veja o que gestores e criadores de conteúdo estão dizendo</p>
                </div>
              </ScrollReveal>

              <div className="max-w-4xl mx-auto relative px-4 md:px-12">
                <Carousel opts={{ align: "center", loop: true }} className="w-full">
                  <CarouselContent>
                    {testimonials.map((t, i) => (
                      <CarouselItem key={i}>
                        <div className="p-2">
                          <Card className="bg-[#0f0f13] border-blue-500/20 shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                              <Quote className="w-48 h-48 text-blue-400 rotate-180" />
                            </div>
                            <CardContent className="p-8 md:p-12 flex flex-col justify-center min-h-[300px] relative z-10">
                              <div className="bg-blue-500/20 w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                                <Quote className="h-6 w-6 text-blue-400" />
                              </div>
                              <p className="text-lg md:text-xl font-medium text-white/90 leading-relaxed mb-8">&ldquo;{t.quote}&rdquo;</p>
                              <div className="flex gap-1 mb-8">
                                {[...Array(5)].map((_, j) => <Star key={j} className="h-5 w-5 fill-blue-500 text-blue-500" />)}
                              </div>
                              <div className="flex items-center gap-4 pt-6 border-t border-white/10">
                                <div className="h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl shadow-[0_0_10px_rgba(59,130,246,0.4)]">
                                  {t.initial}
                                </div>
                                <div>
                                  <p className="font-bold text-white text-lg">{t.name}</p>
                                  <p className="text-sm text-white/50">{t.role}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="absolute -left-2 md:-left-12 border-white/10 bg-black/50 text-white hover:bg-white/10 hover:text-white" />
                  <CarouselNext className="absolute -right-2 md:-right-12 border-white/10 bg-black/50 text-white hover:bg-white/10 hover:text-white" />
                </Carousel>
              </div>
            </div>
          </section>

          {/* ===== 8. PREÇOS ===== */}
          <section id="precos" className="scroll-mt-16 min-h-[100vh] h-auto py-20 md:py-0 md:min-h-0 md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center">
            <div className="container mx-auto px-4">
              <ScrollReveal>
                <div className="text-center mb-4 space-y-2">
                  <span className="text-blue-500 font-semibold text-sm uppercase tracking-wider">Planos e Preços</span>
                  <h2 className="text-2xl sm:text-3xl font-bold">
                    Comece grátis.{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-400 dark:to-cyan-400">Escale no seu ritmo.</span>
                  </h2>
                  <p className="text-base text-muted-foreground max-w-2xl mx-auto">Sem contratos. Cancele quando quiser.</p>
                </div>
              </ScrollReveal>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {[
                  {
                    name: "Free", description: "Para quem quer experimentar a gestão com IA", price: "R$ 0", period: "/mês",
                    cta: "Começar Grátis", ctaVariant: "outline" as const, popular: false, icon: Zap, iconColor: "text-muted-foreground",
                    features: ["Gestão de 1 conta de social media", "1 calendário com IA por mês", "Criação manual de posts", "Todos os tipos de post", "Link de compartilhamento ao vivo"],
                    notIncluded: ["Múltiplos clientes", "Gestão de equipe", "Calendários ilimitados"],
                  },
                  {
                    name: "Pro", description: "Para freelancers e agências em crescimento", price: "R$ 59,90", period: "/mês",
                    cta: "Assinar Pro", ctaVariant: "default" as const, popular: true, icon: Crown, iconColor: "text-primary",
                    features: ["Gestão de até 5 contas de clientes", "Calendários com IA ilimitados", "Criação manual de posts", "Todos os tipos de post", "Link de compartilhamento ao vivo", "Comentários e feedback por post", "Links de material e vídeo por post"],
                    notIncluded: ["Gestão de equipe", "Contas ilimitadas"],
                  },
                  {
                    name: "Ultra", description: "Para agências e power users sem limites", price: "R$ 159,90", period: "/mês",
                    cta: "Ser Ultra", ctaVariant: "outline" as const, popular: false, icon: Shield, iconColor: "text-blue-500",
                    features: ["Contas de social media ILIMITADAS", "Calendários com IA ilimitados", "Até 5 membros de equipe por conta para gestão de social media", "Roles: Owner, Editor, Aprovador, Viewer", "Comentários e feedback por post", "Links de material e vídeo por post", "Link de compartilhamento ao vivo", "Suporte VIP Prioritário"],
                    notIncluded: [],
                  },
                ].map((plan, i) => (
                  <ScrollReveal key={plan.name} delay={i * 0.1}>
                    <Card className={`relative flex flex-col h-full border-2 transition-all duration-300 hover:shadow-xl ${plan.popular ? "border-primary shadow-lg shadow-primary/10" : "hover:border-blue-500/40"}`}>
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-primary text-primary-foreground px-3 py-0.5 text-[9px] font-semibold shadow-md">Mais Popular</Badge>
                        </div>
                      )}
                      <CardContent className="p-4 flex flex-col gap-2 h-full">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${plan.popular ? "bg-primary/10" : "bg-muted"}`}>
                            <plan.icon className={`h-5 w-5 ${plan.iconColor}`} />
                          </div>
                          <h3 className="font-bold text-lg">{plan.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground min-h-[36px]">{plan.description}</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold">{plan.price}</span>
                          <span className="text-xs text-muted-foreground">{plan.period}</span>
                        </div>
                        <div className="flex-1 space-y-1.5 mt-1">
                          {plan.features.map((f) => (
                            <div key={f} className="flex items-start gap-2 text-xs">
                              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /><span>{f}</span>
                            </div>
                          ))}
                          {plan.notIncluded.map((f, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground/60 opacity-60">
                              <X className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" /><span>{f}</span>
                            </div>
                          ))}
                        </div>
                        <Link href="/precos" className="mt-auto pt-1">
                          <Button variant={plan.ctaVariant} className={`w-full h-11 text-sm ${plan.popular ? "shadow-md hover:shadow-lg hover:shadow-primary/20" : ""}`}>
                            {plan.cta}
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </ScrollReveal>
                ))}
              </div>

              <ScrollReveal delay={0.4}>
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Quer ver todos os detalhes?{" "}
                  <Link href="/precos" className="text-blue-500 font-semibold hover:underline">Consulte a página completa de preços →</Link>
                </p>
              </ScrollReveal>
            </div>
          </section>

          {/* ===== 9. FAQ ===== */}
          <section id="faq" className="scroll-mt-16 min-h-[100vh] h-auto py-20 md:py-0 md:min-h-0 md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center bg-muted/30 dark:bg-muted/10">
            <div className="container mx-auto px-4">
              <div className="max-w-6xl mx-auto">
                <ScrollReveal>
                  <div className="text-center mb-10 space-y-2">
                    <span className="text-blue-500 font-semibold text-sm uppercase tracking-wider">FAQ</span>
                    <h2 className="text-3xl sm:text-4xl font-bold">Dúvidas Frequentes</h2>
                  </div>
                </ScrollReveal>

                <ScrollReveal delay={0.2}>
                  <Card className="border-2 shadow-xl bg-background/50 backdrop-blur">
                    <CardContent className="p-6 md:p-10 flex flex-col md:flex-row gap-6 md:gap-12">
                      <Accordion type="single" collapsible className="w-full flex-1">
                        {faqs.slice(0, 4).map((faq, i) => (
                          <AccordionItem key={i} value={`item-${i}`} className="py-1">
                            <AccordionTrigger className="text-base font-medium hover:no-underline hover:text-blue-500 text-left">{faq.q}</AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-sm md:text-base leading-relaxed">{faq.a}</AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                      <Accordion type="single" collapsible className="w-full flex-1">
                        {faqs.slice(4).map((faq, i) => (
                          <AccordionItem key={i} value={`item-${i + 4}`} className="py-1">
                            <AccordionTrigger className="text-base font-medium hover:no-underline hover:text-blue-500 text-left">{faq.q}</AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-sm md:text-base leading-relaxed">{faq.a}</AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              </div>
            </div>
          </section>

          {/* ===== 10. FINAL CTA ===== */}
          <section className="min-h-[100vh] h-auto pt-20 md:pt-0 md:min-h-0 md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center relative overflow-hidden bg-slate-950">
            <FloatingParticles count={15} />
            <div className="absolute inset-0 overflow-hidden pointer-events-none flex justify-center items-center">
              <div className="w-[800px] h-[400px] bg-blue-600/10 dark:bg-blue-500/10 blur-[120px] rounded-[100%]" />
            </div>

            <div className="container mx-auto px-4 relative z-10 flex-1 flex flex-col justify-center">
              <div className="max-w-4xl mx-auto text-center text-white space-y-8">
                <ScrollReveal>
                  <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight">
                    Pronto pra entregar{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400">
                      calendários incríveis?
                    </span>
                  </h2>
                </ScrollReveal>

                <ScrollReveal delay={0.2}>
                  <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto font-light">
                    Gere seu primeiro calendário com IA hoje mesmo e surpreenda seu cliente com um link ao vivo.
                  </p>
                </ScrollReveal>

                <ScrollReveal delay={0.35}>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                    <Link href="/cadastro">
                      <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xl transition-all duration-300 group">
                        Criar conta grátis
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                    <Link href="/precos">
                      <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-base rounded-xl bg-black/40 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-sm">
                        Ver planos e preços
                      </Button>
                    </Link>
                  </div>

                  <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 mt-10">
                    {[
                      { color: "bg-blue-500", text: "Setup em menos de 5 minutos" },
                      { color: "bg-cyan-500", text: "Cancele quando quiser" },
                      { color: "bg-blue-400", text: "Sem cartão para começar" },
                    ].map(({ color, text }) => (
                      <div key={text} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-sm">
                        <div className={`w-2 h-2 rounded-full ${color}`} />
                        <span className="text-white/70 text-xs font-medium">{text}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-white/40 text-xs mt-6 font-light">Sem compromisso. Comece com o plano gratuito e faça upgrade quando precisar.</p>
                </ScrollReveal>
              </div>
            </div>

            <div className="w-full mt-auto relative z-20">
              <Footer />
            </div>
          </section>

        </FullPageScroller>
      </main>
    </div>
  );
}
