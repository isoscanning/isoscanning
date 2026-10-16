"use client"

import { useRef, type ReactNode } from "react"
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion"

/** Curva padrão do Visor: sai rápido, assenta devagar. */
export const EASE = [0.22, 1, 0.36, 1] as const

/* Classes reutilizáveis (Tailwind). */
export const visorTitle = "text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl lg:text-6xl"
export const visorBtnPrimary =
  "group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-black transition hover:bg-white/90"
export const visorBtnGhost =
  "inline-flex h-12 items-center justify-center rounded-full border border-[var(--visor-line-strong)] px-7 text-sm font-medium text-white/85 transition hover:border-white/30 hover:bg-white/5"
export const visorMono = "font-mono text-[11px] uppercase tracking-[0.22em]"

/** Rótulo de seção: "01 —— O problema". */
export function SectionLabel({ index, children }: { index: string; children: ReactNode }) {
  return (
    <p className={`mb-6 flex items-center gap-3 ${visorMono} text-[var(--visor-faint)]`}>
      <span className="text-[var(--visor-accent)]">{index}</span>
      <span className="h-px w-8 bg-[var(--visor-line-strong)]" />
      {children}
    </p>
  )
}

/** Entrada padrão de bloco: sobe 24px e aparece uma vez. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.9, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function FocusWord({ word, i, total, progress }: { word: string; i: number; total: number; progress: MotionValue<number> }) {
  const start = (i / total) * 0.8
  const end = start + 0.2
  const opacity = useTransform(progress, [start, end], [0.12, 1])
  const filter = useTransform(progress, [start, end], ["blur(8px)", "blur(0px)"])
  return (
    <motion.span style={{ opacity, filter }} className="inline-block">
      {word}&nbsp;
    </motion.span>
  )
}

/** Parágrafo que entra em foco palavra por palavra com o scroll (rack focus). */
export function FocusParagraph({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 50%"] })
  const words = text.split(" ")
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <FocusWord key={i} word={w} i={i} total={words.length} progress={scrollYProgress} />
      ))}
    </p>
  )
}
