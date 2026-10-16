"use client"

import { useEffect, useRef } from "react"
import { scrollState } from "./smooth-scroll"

const CORNER = 14
const PAD = 14

type Box = { x: number; y: number; w: number; h: number }

/**
 * Retículo de foco automático que viaja entre os títulos marcados com
 * `data-af`. Escolhe o alvo mais próximo da linha de foco (42% da tela),
 * desliza até ele, "trava" (cantos no acento + pulso + leitura de exposição)
 * e tira o título do desfoque. Também desenha o HUD do visor no desktop.
 */
export function Viewfinder() {
  const afRef = useRef<HTMLDivElement>(null)
  const cornersRef = useRef<(HTMLSpanElement | null)[]>([])
  const centerRef = useRef<HTMLSpanElement>(null)
  const dotRef = useRef<HTMLSpanElement>(null)
  const pulseRef = useRef<HTMLSpanElement>(null)
  const readoutRef = useRef<HTMLSpanElement>(null)
  const frameRef = useRef<HTMLSpanElement>(null)
  const needleRef = useRef<HTMLSpanElement>(null)
  const hudRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const af = afRef.current
    const root = af?.closest(".visor") as HTMLElement | null
    if (!af || !root) return
    root.classList.add("af-ready")

    const range = document.createRange()
    let raf = 0
    let last = performance.now()
    let cur: Box | null = null
    let active: HTMLElement | null = null
    let travelling = false
    let locked = false
    let settle = 0
    let needle = 0

    const textBox = (el: HTMLElement): Box => {
      range.selectNodeContents(el)
      const r = range.getBoundingClientRect()
      return { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 }
    }

    const lock = (el: HTMLElement, box: Box) => {
      locked = true
      travelling = false
      el.setAttribute("data-af-focused", "")
      af.dataset.locked = "1"
      const label = el.dataset.afLabel ?? "f/2.8 · 1/250 · ISO 200"
      if (readoutRef.current) readoutRef.current.textContent = label
      const p = pulseRef.current
      if (p) {
        p.style.transform = `translate3d(${box.x}px, ${box.y}px, 0)`
        p.style.width = `${box.w}px`
        p.style.height = `${box.h}px`
        af.dataset.pulse = "0"
        void p.offsetWidth // reinicia a animação
        af.dataset.pulse = "1"
      }
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const vh = window.innerHeight
      const focal = vh * 0.42

      const all = Array.from(root.querySelectorAll<HTMLElement>("[data-af]"))
      let best: HTMLElement | null = null
      let bestScore = Infinity
      for (const el of all) {
        const r = el.getBoundingClientRect()
        // Quem já passou da metade de cima sem travar (scroll rápido) fica nítido.
        if (r.bottom < vh * 0.35 && !el.hasAttribute("data-af-focused")) el.setAttribute("data-af-focused", "")
        if (el.hasAttribute("data-af-off")) continue
        if (r.bottom < vh * 0.06 || r.top > vh * 0.94) continue
        const s = Math.abs((r.top + r.bottom) / 2 - focal)
        if (s < bestScore) {
          bestScore = s
          best = el
        }
      }
      if (!best || bestScore > vh * 0.4) best = null

      if (best !== active) {
        active = best
        locked = false
        travelling = true
        settle = 0
        af.dataset.locked = "0"
      }

      // HUD: agulha do fotômetro segue a velocidade do scroll e volta ao zero.
      const v = Math.max(-2, Math.min(2, scrollState.velocity / 25))
      needle += (v - needle) * (1 - Math.exp(-6 * dt))
      if (needleRef.current) needleRef.current.style.transform = `translateX(${needle * 28}px)`
      // HUD some quando o rodapé entra na tela, para não ficar por cima dele.
      if (hudRef.current) {
        const nearEnd = window.scrollY + vh > document.documentElement.scrollHeight - 380
        hudRef.current.style.opacity = nearEnd ? "0" : "1"
      }
      if (frameRef.current) {
        const idx = active ? all.indexOf(active) + 1 : 0
        frameRef.current.textContent = `FR ${String(idx).padStart(2, "0")}/${String(all.length).padStart(2, "0")}`
      }

      if (!active) {
        af.dataset.visible = "0"
        return
      }
      const d = textBox(active)
      if (!cur) {
        // Primeira aparição: nasce do centro da tela, pequeno.
        cur = { x: window.innerWidth / 2 - 30, y: vh / 2 - 30, w: 60, h: 60 }
      }
      const a = 1 - Math.exp(-(travelling ? 6.5 : 24) * dt)
      cur.x += (d.x - cur.x) * a
      cur.y += (d.y - cur.y) * a
      cur.w += (d.w - cur.w) * a
      cur.h += (d.h - cur.h) * a
      const dist = Math.abs(d.x - cur.x) + Math.abs(d.y - cur.y) + Math.abs(d.w - cur.w) + Math.abs(d.h - cur.h)
      if (!locked) {
        settle = dist < 4 ? settle + dt : 0
        if (settle > 0.12) lock(active, cur)
      }

      af.dataset.visible = "1"
      const { x, y, w, h } = cur
      const pos: [number, number][] = [
        [x, y],
        [x + w - CORNER, y],
        [x, y + h - CORNER],
        [x + w - CORNER, y + h - CORNER],
      ]
      cornersRef.current.forEach((c, i) => {
        if (c) c.style.transform = `translate3d(${pos[i][0]}px, ${pos[i][1]}px, 0)`
      })
      if (centerRef.current) centerRef.current.style.transform = `translate3d(${x + w / 2}px, ${y + h / 2}px, 0)`
      if (dotRef.current) dotRef.current.style.transform = `translate3d(${x + w + 6}px, ${y - 12}px, 0)`
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      root.classList.remove("af-ready")
      range.detach()
    }
  }, [])

  return (
    <>
      <div ref={afRef} className="visor-af" aria-hidden data-visible="0" data-locked="0">
        {(["tl", "tr", "bl", "br"] as const).map((c, i) => (
          <span
            key={c}
            data-c={c}
            className="visor-af-corner"
            ref={(el) => {
              cornersRef.current[i] = el
            }}
          />
        ))}
        <span ref={centerRef} className="visor-af-center" />
        <span ref={pulseRef} className="visor-af-box" />
        {/* Confirmação de foco: só um ponto no canto, sem texto por cima do conteúdo */}
        <span ref={dotRef} className="visor-af-label">
          <span className="dot" />
        </span>
      </div>

      <div ref={hudRef} className="visor-hud hidden transition-opacity duration-500 lg:block" aria-hidden>
        <span className="visor-hud-tick left-0 top-0 border-l border-t" />
        <span className="visor-hud-tick right-0 top-0 border-r border-t" />
        <span className="visor-hud-tick bottom-0 left-0 border-b border-l" />
        <span className="visor-hud-tick bottom-0 right-0 border-b border-r" />

        <div className="absolute bottom-1 left-10 flex items-center gap-3">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--visor-accent)] opacity-80" />
          <span ref={readoutRef}>f/8.0 · 1/125 · ISO 100</span>
        </div>

        <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-2">
          <span>−2</span>
          <span className="relative flex h-3 w-[120px] items-center justify-between">
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className={`w-px bg-white/25 ${i === 4 ? "h-3" : i % 2 ? "h-1" : "h-2"}`} />
            ))}
            <span
              ref={needleRef}
              className="absolute -bottom-2 left-1/2 -ml-[3px] h-0 w-0 border-x-[3px] border-b-[4px] border-x-transparent border-b-[var(--visor-accent)]"
            />
          </span>
          <span>+2</span>
        </div>

        <span ref={frameRef} className="absolute bottom-1 right-10">
          FR 00/00
        </span>
      </div>
    </>
  )
}
