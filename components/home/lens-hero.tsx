"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { animate, motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { AuthAwareLink } from "@/components/auth-aware-link"
import { Aperture, fNumber } from "@/components/visor/aperture"

const HERO_PHOTO = "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=2400&q=80&auto=format&fit=crop"
const CLIP_RATIO = 0.89 // raio interno do anel / raio do SVG

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const range = (v: number, a: number, b: number) => clamp01((v - a) / (b - a))
const ease = (t: number) => t * t * (3 - 2 * t)
const mix = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * Hero preso no scroll: o diafragma acorda em f/8, abre até f/1.4 enquanto
 * cresce e vai para o centro, e o furo da lente revela uma foto em tela cheia.
 */
export function LensHero() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const irisRef = useRef<HTMLDivElement>(null)
  const photoRef = useRef<HTMLDivElement>(null)
  const photoImgRef = useRef<HTMLDivElement>(null)
  const fRef = useRef<HTMLSpanElement>(null)
  const h1Ref = useRef<HTMLHeadingElement>(null)

  const { scrollYProgress: p } = useScroll({ target: sectionRef, offset: ["start start", "end end"] })
  const intro = useMotionValue(0)
  const open = useMotionValue(0)

  // Texto sai de foco (desfoca e sobe) logo no começo do scroll.
  const textOpacity = useTransform(p, [0.02, 0.2], [1, 0])
  const textBlur = useTransform(p, [0.02, 0.2], ["blur(0px)", "blur(10px)"])
  const textY = useTransform(p, [0.02, 0.2], [0, -40])
  const capOpacity = useTransform(p, [0.7, 0.86], [0, 1])
  const capY = useTransform(p, [0.7, 0.86], [24, 0])
  const hintOpacity = useTransform(p, [0, 0.05], [1, 0])

  // Inclinação leve da lente seguindo o mouse.
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 60, damping: 18 })
  const sy = useSpring(my, { stiffness: 60, damping: 18 })
  const rotY = useTransform([sx, p] as const, ([x, pv]: number[]) => x * 14 * (1 - range(pv, 0, 0.2)))
  const rotX = useTransform([sy, p] as const, ([y, pv]: number[]) => -y * 10 * (1 - range(pv, 0, 0.2)))

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const ctrl = animate(intro, 1, { duration: reduce ? 0 : 1.8, delay: reduce ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] })

    const onMove = (e: PointerEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5)
      my.set(e.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener("pointermove", onMove, { passive: true })

    let slot = { x: 0, y: 0, d: 1 }
    const measure = () => {
      const s = slotRef.current?.getBoundingClientRect()
      const st = stageRef.current?.getBoundingClientRect()
      if (!s || !st) return
      // Medido sem o deslocamento do texto (o slot vive dentro do bloco que sobe).
      const ty = textY.get()
      slot = { x: s.left - st.left + s.width / 2, y: s.top - st.top - ty + s.height / 2, d: s.width }
      render()
    }

    const render = () => {
      const iris = irisRef.current
      const photo = photoRef.current
      const stage = stageRef.current
      if (!iris || !photo || !stage) return
      const vw = stage.clientWidth
      const vh = stage.clientHeight
      const pv = p.get()
      const g = ease(range(pv, 0.06, 0.74))

      const o = intro.get() * 0.32 + ease(range(pv, 0.04, 0.7)) * 0.68
      open.set(o)
      if (fRef.current) fRef.current.textContent = `f/${fNumber(o)}`

      const cx = mix(slot.x, vw / 2, g)
      const cy = mix(slot.y, vh / 2, g)
      const dFinal = (Math.hypot(vw, vh) / CLIP_RATIO) * 1.06
      const scale = (dFinal / slot.d) ** g
      const d = slot.d * scale

      iris.style.width = `${slot.d}px`
      iris.style.height = `${slot.d}px`
      iris.style.transform = `translate3d(${cx - slot.d / 2}px, ${cy - slot.d / 2}px, 0) scale(${scale})`
      // Totalmente aberta, a lente já saiu do quadro; some para o reflexo do
      // vidro não clarear a foto enquanto ela se funde no fundo.
      iris.style.opacity = String(1 - range(pv, 0.72, 0.8))

      const r = (d / 2) * CLIP_RATIO
      photo.style.clipPath = `circle(${r.toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px)`
      if (photoImgRef.current) photoImgRef.current.style.transform = `scale(${mix(1.18, 1, g)})`

      if (h1Ref.current) {
        if (pv > 0.06) h1Ref.current.setAttribute("data-af-off", "")
        else h1Ref.current.removeAttribute("data-af-off")
      }
    }

    measure()
    const ro = new ResizeObserver(measure)
    if (stageRef.current) ro.observe(stageRef.current)
    const offP = p.on("change", render)
    const offI = intro.on("change", render)
    return () => {
      ctrl.stop()
      ro.disconnect()
      offP()
      offI()
      window.removeEventListener("pointermove", onMove)
    }
  }, [p, intro, open, mx, my, textY])

  return (
    <section ref={sectionRef} className="relative -mt-16" style={{ height: "260vh" }}>
      <div ref={stageRef} className="sticky top-0 h-svh overflow-hidden">
        {/* Foto revelada pelo furo da lente */}
        <div ref={photoRef} className="absolute inset-0" style={{ clipPath: "circle(0px at 50% 50%)" }}>
          <div ref={photoImgRef} className="absolute inset-0 will-change-transform">
            <Image src={HERO_PHOTO} alt="Ensaio fotográfico" fill priority sizes="100vw" className="object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/30" />
          {/* Funde a foto no fundo da página quando o hero solta */}
          <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-[var(--visor-bg)] via-[var(--visor-bg)]/60 to-transparent" />
        </div>

        {/* Lente */}
        <div ref={irisRef} className="pointer-events-none absolute left-0 top-0 origin-center will-change-transform" style={{ perspective: 900 }}>
          <motion.div style={{ rotateX: rotX, rotateY: rotY }} className="h-full w-full">
            <div className="absolute inset-[6%] rounded-full bg-[radial-gradient(closest-side,rgba(143,179,255,0.18),transparent)] blur-2xl" />
            <Aperture open={open} className="relative h-full w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]" />
          </motion.div>
        </div>

        {/* Texto */}
        <motion.div style={{ opacity: textOpacity, filter: textBlur, y: textY }} className="relative z-10 h-full">
          <div className="container mx-auto grid h-full items-center gap-6 px-6 pb-10 pt-24 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:pt-16">
            <div className="max-w-xl">
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="mb-6 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--visor-muted)]"
              >
                <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[var(--visor-accent)] align-[2px]" />
                A plataforma que conecta talentos
              </motion.p>
              <h1
                ref={h1Ref}
                data-af
                data-af-label="f/8.0 · 1/125 · ISO 100"
                className="text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl xl:text-7xl"
              >
                Onde a criatividade encontra <span className="text-[var(--visor-accent)]">oportunidade.</span>
              </h1>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="mt-6 max-w-md text-base leading-relaxed text-[var(--visor-muted)] sm:text-lg"
              >
                Conectamos fotógrafos, videomakers e editores aos melhores projetos. Sua próxima grande oportunidade começa aqui.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="mt-9 flex flex-col gap-3 sm:flex-row"
              >
                <AuthAwareLink
                  href="/cadastro"
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Começar gratuitamente
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </AuthAwareLink>
                <Link
                  href="/profissionais"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--visor-line-strong)] px-7 text-sm font-medium text-white/85 transition hover:border-white/30 hover:bg-white/5"
                >
                  Explorar profissionais
                </Link>
              </motion.div>
              <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--visor-faint)]">
                Perfis verificados · Avaliações reais · Comece grátis
              </p>
            </div>

            <div className="order-first flex flex-col items-center lg:order-none">
              <div ref={slotRef} className="aspect-square w-[min(58vw,260px)] sm:w-[min(46vw,360px)] lg:w-[min(38vw,480px)]" />
              <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--visor-faint)]">
                Abertura <span ref={fRef} className="ml-2 text-[var(--visor-text)]">f/22</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Legenda depois que a lente abre */}
        <motion.div style={{ opacity: capOpacity, y: capY }} className="absolute inset-x-0 bottom-0 z-10">
          <div className="container mx-auto flex flex-col gap-3 px-6 pb-14 sm:flex-row sm:items-end sm:justify-between">
            <p className="text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">Seu trabalho, em foco.</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">85mm · f/1.4 · 1/500 · ISO 200</p>
          </div>
        </motion.div>

        <motion.div
          style={{ opacity: hintOpacity }}
          className="absolute bottom-16 left-1/2 z-10 hidden -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--visor-faint)] lg:block"
        >
          Role para abrir a lente
        </motion.div>
      </div>
    </section>
  )
}
