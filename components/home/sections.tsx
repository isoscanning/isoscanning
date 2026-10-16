"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { animate, motion, useInView, useMotionValue, useScroll, useTransform, type MotionValue } from "framer-motion"
import { ArrowRight, Calendar, Check, Package, Search, Star, Users, Wallet } from "lucide-react"
import { AuthAwareLink } from "@/components/auth-aware-link"
import { Aperture } from "@/components/visor/aperture"
import { EASE, FocusParagraph, Reveal, SectionLabel as Label, visorBtnGhost as btnGhost, visorBtnPrimary as btnPrimary, visorTitle as h2 } from "@/components/visor/ui"

export function ProblemSection() {
  const pains = [
    "Buscas intermináveis por profissionais qualificados",
    "Talento incrível sem visibilidade no mercado",
    "Tempo perdido com contatos que não dão retorno",
  ]
  return (
    <section className="relative py-20 md:py-28">
      <div className="container mx-auto px-6">
        <Label index="01">O problema</Label>
        <h2 data-af data-af-label="f/2.8 · 1/250 · ISO 400" className={`${h2} max-w-4xl`}>
          Cansado de perder oportunidades?
        </h2>
        <FocusParagraph
          text="Sabemos como é difícil encontrar os profissionais certos ou conseguir visibilidade para o seu trabalho."
          className="mt-10 max-w-4xl text-2xl font-medium leading-snug tracking-[-0.02em] text-white sm:text-3xl lg:text-4xl"
        />
        <div className="mt-20 grid border-t border-[var(--visor-line)] md:grid-cols-3">
          {pains.map((t, i) => (
            <Reveal key={t} delay={i * 0.08} className="border-b border-[var(--visor-line)] py-8 md:border-b-0 md:border-r md:px-8 md:last:border-r-0 md:first:pl-0">
              <p className="font-mono text-[11px] tracking-[0.2em] text-[var(--visor-faint)]">0{i + 1}</p>
              <p className="mt-4 text-lg leading-snug text-[var(--visor-muted)]">{t}</p>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-16">
          <p className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
            A ISO Scanning resolve isso<span className="text-[var(--visor-accent)]">.</span>
          </p>
        </Reveal>
      </div>
    </section>
  )
}

/* --------------------------------------------------- 02 · plataforma */

function Cell({ icon: Icon, title, desc, href, cta, className = "" }: {
  icon: typeof Users
  title: string
  desc: string
  href: string
  cta: string
  className?: string
}) {
  const onMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`)
  }
  const corners = [
    { top: 14, left: 14, borderTopWidth: 1.5, borderLeftWidth: 1.5, transform: "translate(-6px,-6px)" },
    { top: 14, right: 14, borderTopWidth: 1.5, borderRightWidth: 1.5, transform: "translate(6px,-6px)" },
    { bottom: 14, left: 14, borderBottomWidth: 1.5, borderLeftWidth: 1.5, transform: "translate(-6px,6px)" },
    { bottom: 14, right: 14, borderBottomWidth: 1.5, borderRightWidth: 1.5, transform: "translate(6px,6px)" },
  ]
  return (
    <Link href={href} onPointerMove={onMove} className={`visor-cell group flex flex-col gap-10 bg-[var(--visor-bg)] p-8 sm:p-10 ${className}`}>
      {corners.map((s, i) => (
        <span key={i} className="visor-cell-af" style={s} />
      ))}
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--visor-line-strong)] text-white/80">
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </span>
      <div>
        <h3 className="text-xl font-semibold tracking-[-0.02em]">{title}</h3>
        <p className="mt-3 max-w-sm leading-relaxed text-[var(--visor-muted)]">{desc}</p>
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-white/80 transition-all group-hover:gap-3 group-hover:text-white">
          {cta} <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  )
}

export function PlatformSection() {
  return (
    <section className="relative py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <Label index="02">Plataforma</Label>
            <h2 data-af data-af-label="f/4.0 · 1/320 · ISO 200" className={`${h2} max-w-3xl`}>
              Tudo que você precisa. Em um só lugar.
            </h2>
          </div>
          <p className="max-w-sm leading-relaxed text-[var(--visor-muted)]">
            Encontre gente, alugue equipamento, organize a agenda e o dinheiro sem trocar de ferramenta.
          </p>
        </div>
        <Reveal className="mt-16">
          <div className="grid gap-px overflow-hidden rounded-3xl border border-[var(--visor-line)] bg-[var(--visor-line)] md:grid-cols-2">
            <Cell
              icon={Users}
              title="Encontre profissionais"
              desc="Busque fotógrafos, videomakers e editores qualificados por localização, especialidade e disponibilidade."
              href="/profissionais"
              cta="Explorar"
              className="md:min-h-[300px]"
            />
            <Cell
              icon={Package}
              title="Marketplace de equipamentos"
              desc="Alugue ou anuncie câmeras, lentes, iluminação e outros equipamentos profissionais."
              href="/equipamentos"
              cta="Ver equipamentos"
              className="md:min-h-[300px]"
            />
            <Cell
              icon={Calendar}
              title="Agendamento integrado"
              desc="Calendário de disponibilidade com confirmação automática e sincronização com o Google Agenda."
              href="/como-funciona"
              cta="Saiba mais"
            />
            <Cell
              icon={Wallet}
              title="Gestão financeira"
              desc="Receitas, valores a receber, notas fiscais e o teto do MEI acompanhados em tempo real."
              href="/cadastro"
              cta="Começar"
            />
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------------------------------------------- 03 · financeiro */

function Count({ to, prefix = "R$ " }: { to: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "0px 0px -5% 0px" })
  const v = useMotionValue(0)
  useEffect(() => {
    if (!inView) return
    const c = animate(v, to, { duration: 1.6, ease: EASE })
    return () => c.stop()
  }, [inView, to, v])
  useEffect(
    () =>
      v.on("change", (n) => {
        if (ref.current) ref.current.textContent = `${prefix}${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }),
    [v, prefix],
  )
  return (
    <span ref={ref} className="tabular-nums">
      {prefix}0,00
    </span>
  )
}

export function FinanceSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-15% 0px" })
  return (
    <section className="relative py-20 md:py-28">
      <div className="container mx-auto grid items-center gap-16 px-6 lg:grid-cols-2">
        <div>
          <Label index="03">Financeiro</Label>
          <h2 data-af data-af-label="f/5.6 · 1/200 · ISO 160" className={h2}>
            Gestão financeira na palma da mão.
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-[var(--visor-muted)]">
            Diga adeus às planilhas e anotações avulsas. Controle seus ganhos, monitore valores a receber e acompanhe o limite anual do seu MEI.
          </p>
          <ul className="mt-10 space-y-4">
            {[
              "Receitas e saldos em tempo real",
              "Alerta do teto anual do MEI",
              "Notas fiscais centralizadas",
              "Pagamentos detalhados por trabalho",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3 text-white/85">
                <Check className="h-4 w-4 text-[var(--visor-accent)]" strokeWidth={2} />
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <AuthAwareLink href="/cadastro" authenticatedHref="/dashboard/financeiro" className={btnPrimary}>
              Começar sem custo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </AuthAwareLink>
          </div>
        </div>

        <Reveal delay={0.1}>
          <div ref={ref} className="rounded-3xl border border-[var(--visor-line)] bg-[var(--visor-surface)] p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-[var(--visor-line)] pb-5">
              <div>
                <p className="font-semibold">Visão do mês</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--visor-faint)]">Abril · 2026</p>
              </div>
              <span className="flex items-center gap-2 rounded-full border border-[var(--visor-line-strong)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/70">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--visor-accent)]" /> Ao vivo
              </span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[var(--visor-line)] p-4">
                <p className="text-xs text-[var(--visor-muted)]">Receita no mês</p>
                <p className="mt-2 text-xl font-semibold sm:text-2xl"><Count to={5320} /></p>
              </div>
              <div className="rounded-2xl border border-[var(--visor-line)] p-4">
                <p className="text-xs text-[var(--visor-muted)]">A receber</p>
                <p className="mt-2 text-xl font-semibold sm:text-2xl"><Count to={1550} /></p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-[var(--visor-line)] p-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-[var(--visor-muted)]">Saldo restante do teto MEI</p>
                  <p className="mt-2 text-xl font-semibold sm:text-2xl"><Count to={68450} /></p>
                </div>
                <p className="font-mono text-[11px] text-[var(--visor-faint)]">de R$ 81.000</p>
              </div>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full rounded-full bg-[var(--visor-accent)]"
                  initial={{ width: 0 }}
                  animate={{ width: inView ? "15%" : 0 }}
                  transition={{ duration: 1.4, delay: 0.2, ease: EASE }}
                />
              </div>
            </div>
            <div className="mt-6 divide-y divide-[var(--visor-line)]">
              {[
                { t: "Casamento · cliente VIP", s: "Recebido", v: "R$ 2.500,00" },
                { t: "Ensaio externo corporativo", s: "Pendente", v: "R$ 850,00" },
              ].map((r) => (
                <div key={r.t} className="flex items-center justify-between py-3.5">
                  <div>
                    <p className="text-sm font-medium">{r.t}</p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--visor-faint)]">{r.s}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{r.v}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* -------------------------------------------- 04 · para profissionais */

const FRAMES = [
  { src: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=700&h=875&fit=crop", alt: "Fotógrafo profissional", n: "12A", exif: "35mm · f/2 · 1/160" },
  { src: "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=700&h=875&fit=crop", alt: "Fotografia de casamento", n: "13A", exif: "85mm · f/1.4 · 1/500" },
  { src: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=700&h=875&fit=crop", alt: "Videomaker trabalhando", n: "14A", exif: "24mm · f/4 · 1/50" },
  { src: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=700&h=875&fit=crop", alt: "Ensaio fotográfico", n: "15A", exif: "50mm · f/1.8 · 1/250" },
]

export function ProsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const x = useTransform(scrollYProgress, [0, 1], ["6%", "-14%"])
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-end">
          <div>
            <Label index="04">Para profissionais</Label>
            <h2 data-af data-af-label="f/1.8 · 1/500 · ISO 100" className={h2}>
              Mostre seu talento. Conquiste clientes.
            </h2>
          </div>
          <div>
            <p className="max-w-lg text-lg leading-relaxed text-[var(--visor-muted)]">
              Crie seu portfólio, defina sua disponibilidade e seja encontrado por quem precisa do seu trabalho.
            </p>
            <ul className="mt-8 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {["Portfólio online profissional", "Agenda integrada", "Visibilidade para clientes locais", "Avaliações que constroem reputação", "Aluguel dos seus equipamentos"].map((t) => (
                <li key={t} className="flex items-center gap-3 text-sm text-white/85">
                  <Check className="h-4 w-4 shrink-0 text-[var(--visor-accent)]" strokeWidth={2} /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Tira de filme / folha de contato */}
      <div ref={ref} className="mt-20">
        <motion.div style={{ x }} className="w-max rounded-xl bg-[#0c0c0e] px-4 py-3 ring-1 ring-[var(--visor-line)]">
          <div className="visor-sprockets" />
          <div className="my-3 flex gap-4">
            {[...FRAMES, ...FRAMES.slice(0, 2)].map((f, i) => (
              <figure key={i} className="group relative w-[240px] sm:w-[300px]">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[3px]">
                  <Image src={f.src} alt={f.alt} fill sizes="300px" className="object-cover grayscale-[35%] transition duration-700 group-hover:scale-105 group-hover:grayscale-0" />
                  <figcaption className="absolute inset-x-0 bottom-0 translate-y-full bg-black/70 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/80 backdrop-blur transition-transform duration-500 group-hover:translate-y-0">
                    {f.exif}
                  </figcaption>
                </div>
                <p className="mt-2 flex justify-between font-mono text-[10px] tracking-[0.2em] text-[#e9b55a]/70">
                  <span>{f.n}</span>
                  <span>▸ ISO 400</span>
                </p>
              </figure>
            ))}
          </div>
          <div className="visor-sprockets" />
        </motion.div>
      </div>

      <div className="container mx-auto mt-14 px-6">
        <AuthAwareLink href="/cadastro" className={btnPrimary}>
          Criar meu perfil grátis <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </AuthAwareLink>
      </div>
    </section>
  )
}

/* ------------------------------------------------ 05 · como funciona */

export function StepsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 55%"] })
  const fill = useTransform(scrollYProgress, [0, 1], ["0%", "100%"])
  const steps = [
    { icon: Search, t: "Busque", d: "Encontre profissionais ou equipamentos com filtros avançados." },
    { icon: Star, t: "Compare", d: "Veja portfólios, avaliações e disponibilidade em tempo real." },
    { icon: Users, t: "Conecte", d: "Fale direto com o profissional e peça orçamentos." },
    { icon: Check, t: "Contrate", d: "Agende o serviço, feche o contrato e avalie a experiência." },
  ]
  return (
    <section className="relative py-20 md:py-28">
      <div className="container mx-auto px-6">
        <Label index="05">Como funciona</Label>
        <h2 data-af data-af-label="f/8.0 · 1/250 · ISO 100" className={`${h2} max-w-3xl`}>
          Do primeiro clique ao trabalho fechado.
        </h2>
        <div ref={ref} className="relative mt-20">
          <div className="absolute left-[7px] top-2 h-[calc(100%-1rem)] w-px bg-[var(--visor-line)] md:left-0 md:right-0 md:top-[7px] md:h-px md:w-auto" />
          <motion.div
            style={{ height: fill }}
            className="absolute left-[7px] top-2 w-px bg-[var(--visor-accent)] shadow-[0_0_12px_var(--visor-accent)] md:hidden"
          />
          <motion.div
            style={{ width: fill }}
            className="absolute left-0 top-[7px] hidden h-px bg-[var(--visor-accent)] shadow-[0_0_12px_var(--visor-accent)] md:block"
          />
          <div className="grid gap-12 md:grid-cols-4 md:gap-8">
            {steps.map((s, i) => (
              <StepItem key={s.t} index={i} total={steps.length} progress={scrollYProgress} {...s} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function StepItem({ icon: Icon, t, d, index, total, progress }: {
  icon: typeof Search
  t: string
  d: string
  index: number
  total: number
  progress: MotionValue<number>
}) {
  const at = index / (total - 1)
  const on = useTransform(progress, [Math.max(0, at - 0.08), at], [0, 1])
  const opacity = useTransform(on, [0, 1], [0.35, 1])
  const scale = useTransform(on, [0, 1], [0.6, 1])
  return (
    <motion.div style={{ opacity }} className="relative pl-10 md:pl-0 md:pt-12">
      <motion.span
        style={{ scale }}
        className="absolute left-0 top-0 h-[15px] w-[15px] rounded-full border border-[var(--visor-accent)] bg-[var(--visor-bg)]"
      >
        <motion.span style={{ opacity: on }} className="absolute inset-[3px] rounded-full bg-[var(--visor-accent)]" />
      </motion.span>
      <p className="font-mono text-[11px] tracking-[0.2em] text-[var(--visor-faint)]">0{index + 1}</p>
      <h3 className="mt-3 flex items-center gap-2 text-xl font-semibold tracking-[-0.02em]">
        <Icon className="h-4 w-4 text-white/60" strokeWidth={1.5} /> {t}
      </h3>
      <p className="mt-3 leading-relaxed text-[var(--visor-muted)]">{d}</p>
    </motion.div>
  )
}

/* -------------------------------------------- 06 · teste + depoimentos */

const TESTIMONIALS = [
  {
    quote: "Como fotógrafo, minha visibilidade aumentou muito. Já fechei 5 contratos pela plataforma.",
    name: "Anderson Larcher Franco",
    role: "Fotógrafo",
    avatar: "/testimonials/anderson_larcher_franco.jpg",
  },
  {
    quote: "A plataforma me ajudou a encontrar os melhores profissionais para criar conteúdo audiovisual para os meus clientes.",
    name: "Sophia Lima",
    role: "Social Media",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocKA830QyjWL8_NFaZx4Zp0iZ8OFypHFz2iEw8t2LZKgN6MhOIbFEA=s96-c",
  },
  {
    quote: "Consegui alugar os equipamentos que faltavam para um grande ensaio por um preço excelente.",
    name: "Gutemberg Silva",
    role: "Fotógrafo",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocLwBB-pvML3a6yiJh-HnB_V4fQF22Q26YZugESkqIF2PDc4Jz88=s96-c",
  },
]

/** Foto do Google expira; se falhar, mostra as iniciais. */
function Avatar({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false)
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("")
  return (
    <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/[0.06] text-xs font-semibold text-white/70 ring-1 ring-[var(--visor-line-strong)]">
      {failed ? (
        initials
      ) : (
        <Image src={src} alt={name} fill sizes="40px" className="object-cover" unoptimized onError={() => setFailed(true)} />
      )}
    </div>
  )
}

export function TrialSection() {
  return (
    <section className="relative py-20 md:py-28">
      <div className="container mx-auto px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-[var(--visor-line)] bg-[var(--visor-surface)] px-6 py-16 text-center sm:px-12 md:py-24">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--visor-accent)] to-transparent opacity-70" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--visor-accent-soft)] blur-3xl" />
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--visor-accent)]">14 dias grátis</p>
            <h2 data-af data-af-label="f/2.0 · 1/400 · ISO 100" className={`${h2} mx-auto mt-6 max-w-3xl`}>
              Teste o Pro grátis por 14 dias.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--visor-muted)]">
              Todo cadastro novo ganha 14 dias do plano Pro, sem cartão de crédito. Selo verificado, contato direto no perfil, calendários com IA, briefings, contratos e muito mais.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/cadastro" className={btnPrimary}>
                Criar conta e testar o Pro <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="/precos" className={btnGhost}>
                Ver planos
              </Link>
            </div>
            <p className="mt-6 text-sm text-[var(--visor-faint)]">Depois do teste sua conta continua no Free, sem custo.</p>
          </div>
        </Reveal>

        <div className="mt-24 grid gap-px overflow-hidden rounded-3xl border border-[var(--visor-line)] bg-[var(--visor-line)] md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08} className="flex flex-col justify-between gap-10 bg-[var(--visor-bg)] p-8 sm:p-10">
              <div>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-3.5 w-3.5 fill-white/80 text-white/80" />
                  ))}
                </div>
                <p className="mt-6 text-lg leading-relaxed text-white/85">“{t.quote}”</p>
              </div>
              <div className="flex items-center gap-3">
                <Avatar src={t.avatar} name={t.name} />
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-[var(--visor-muted)]">{t.role}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------- 07 · final */

export function FinalSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: false, margin: "-20% 0px" })
  const open = useMotionValue(0)
  useEffect(() => {
    const c = animate(open, inView ? 0.62 : 0.05, { duration: 1.6, ease: EASE })
    return () => c.stop()
  }, [inView, open])
  return (
    <section className="relative py-20 md:py-28">
      <div ref={ref} className="container mx-auto flex flex-col items-center px-6 text-center">
        <Aperture open={open} holeFill="#050506" className="h-24 w-24 sm:h-28 sm:w-28" />
        <h2 data-af data-af-label="f/1.4 · 1/1000 · ISO 100" className={`${h2} mt-12 max-w-4xl`}>
          Pronto para transformar sua carreira criativa?
        </h2>
        <p className="mt-6 max-w-xl text-lg text-[var(--visor-muted)]">
          Junte-se a centenas de profissionais que já estão construindo seu futuro na ISO Scanning.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <AuthAwareLink href="/cadastro" className={btnPrimary}>
            Criar conta gratuita <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </AuthAwareLink>
          <Link href="/login" className={btnGhost}>
            Já tenho conta
          </Link>
        </div>
        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--visor-faint)]">
          Sem cartão de crédito · Configuração em 2 minutos · Cancele quando quiser
        </p>
      </div>
    </section>
  )
}
