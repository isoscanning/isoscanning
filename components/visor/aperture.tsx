"use client"

import { useEffect, useId, useRef } from "react"
import type { MotionValue } from "framer-motion"

const BLADES = 9
const CLIP_R = 89 // raio interno do anel (unidades do viewBox -100..100)
const FAR_R = 220 // as costuras das lâminas vão até fora do recorte
const TICKS = 72

/** f/1.4 (aberto) até f/22 (fechado), arredondado como no anel da lente. */
export function fNumber(open: number) {
  const stops = Math.log2(22 / 1.4) * 2
  const f = 1.4 * Math.SQRT2 ** ((1 - open) * stops)
  return f >= 10 ? Math.round(f).toString() : f.toFixed(1)
}

/**
 * Geometria do diafragma: o furo é um polígono regular de 9 lados cujo
 * apótema cresce com a abertura (e gira um pouco, como numa lente de verdade).
 * Cada lâmina visível é a face entre a aresta do furo e as duas costuras que
 * continuam as arestas vizinhas até a borda — essas faces ladrilham o anel.
 */
function geometry(open: number) {
  const o = Math.min(1, Math.max(0, open))
  const r = 4 + (CLIP_R - 4) * o
  const rot = (1 - o) * 0.9 - Math.PI / 2
  const rc = r / Math.cos(Math.PI / BLADES)
  const v: [number, number][] = []
  for (let k = 0; k < BLADES; k++) {
    const a = rot + (k * 2 * Math.PI) / BLADES
    v.push([rc * Math.cos(a), rc * Math.sin(a)])
  }
  // Ponta da costura k: continua a aresta V_k → V_{k+1} além de V_{k+1}.
  const seamEnd = (k: number): [number, number] => {
    const [ax, ay] = v[k]
    const [bx, by] = v[(k + 1) % BLADES]
    let dx = bx - ax
    let dy = by - ay
    const len = Math.hypot(dx, dy) || 1
    dx /= len
    dy /= len
    const vd = bx * dx + by * dy
    const t = -vd + Math.sqrt(vd * vd - (bx * bx + by * by) + FAR_R * FAR_R)
    return [bx + t * dx, by + t * dy]
  }
  const ends = v.map((_, k) => seamEnd(k))
  const faces = v.map((_, k) => {
    const a = v[(k + 1) % BLADES]
    const b = v[(k + 2) % BLADES]
    const eb = ends[(k + 1) % BLADES]
    const ea = ends[k]
    return [a, b, eb, ea]
  })
  const fmt = (p: [number, number][]) => p.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ")
  return { hole: fmt(v), faces: faces.map(fmt) }
}

type Props = {
  open: MotionValue<number>
  className?: string
  /** Cor de fundo do furo (transparente quando há uma foto por baixo). */
  holeFill?: string
}

export function Aperture({ open, className, holeFill = "transparent" }: Props) {
  const uid = useId().replace(/:/g, "")
  const facesRef = useRef<(SVGPolygonElement | null)[]>([])
  const holeRef = useRef<SVGPolygonElement>(null)
  const glowRef = useRef<SVGPolygonElement>(null)
  const arcRef = useRef<SVGCircleElement>(null)

  useEffect(() => {
    const arcLen = 2 * Math.PI * 92
    const draw = (value: number) => {
      const g = geometry(value)
      g.faces.forEach((pts, i) => facesRef.current[i]?.setAttribute("points", pts))
      holeRef.current?.setAttribute("points", g.hole)
      glowRef.current?.setAttribute("points", g.hole)
      if (arcRef.current) {
        arcRef.current.style.strokeDasharray = `${arcLen}`
        arcRef.current.style.strokeDashoffset = `${arcLen * (1 - Math.min(1, Math.max(0, value)))}`
      }
    }
    draw(open.get())
    return open.on("change", draw)
  }, [open])

  return (
    <svg viewBox="-100 -100 200 200" className={className} aria-hidden>
      <defs>
        <radialGradient id={`${uid}-barrel`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#1d1f25" />
          <stop offset="100%" stopColor="#0a0b0e" />
        </radialGradient>
        <linearGradient id={`${uid}-bladeA`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2a2d34" />
          <stop offset="100%" stopColor="#111216" />
        </linearGradient>
        <linearGradient id={`${uid}-bladeB`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#202228" />
          <stop offset="100%" stopColor="#0c0d10" />
        </linearGradient>
        <radialGradient id={`${uid}-glass`} cx="34%" cy="28%" r="75%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.20)" />
          <stop offset="22%" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="60%" stopColor="rgba(143,179,255,0.03)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
        </radialGradient>
        <linearGradient id={`${uid}-coat`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(143,179,255,0)" />
          <stop offset="50%" stopColor="rgba(160,140,255,0.35)" />
          <stop offset="100%" stopColor="rgba(120,255,210,0)" />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          <circle r={CLIP_R} />
        </clipPath>
      </defs>

      {/* Corpo da lente + escala */}
      {/* Anel (não disco): o furo precisa deixar ver o que está atrás */}
      <path
        d={`M0,-99.5 A99.5,99.5 0 1 1 0,99.5 A99.5,99.5 0 1 1 0,-99.5 Z M0,-${CLIP_R} A${CLIP_R},${CLIP_R} 0 1 0 0,${CLIP_R} A${CLIP_R},${CLIP_R} 0 1 0 0,-${CLIP_R} Z`}
        fill={`url(#${uid}-barrel)`}
        fillRule="evenodd"
      />
      <circle r="99.5" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.5" />
      {Array.from({ length: TICKS }).map((_, i) => {
        const a = (i / TICKS) * Math.PI * 2
        const major = i % 8 === 0
        const r1 = major ? 94 : 95.5
        return (
          <line
            key={i}
            x1={(Math.cos(a) * r1).toFixed(2)}
            y1={(Math.sin(a) * r1).toFixed(2)}
            x2={(Math.cos(a) * 97.5).toFixed(2)}
            y2={(Math.sin(a) * 97.5).toFixed(2)}
            stroke={major ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.14)"}
            strokeWidth={major ? 0.6 : 0.4}
          />
        )
      })}
      <circle r="92" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
      <circle
        ref={arcRef}
        r="92"
        fill="none"
        stroke="var(--visor-accent, #8fb3ff)"
        strokeWidth="0.8"
        strokeLinecap="round"
        transform="rotate(-90)"
        opacity="0.8"
      />

      <g clipPath={`url(#${uid}-clip)`}>
        <circle r={CLIP_R} fill={holeFill} />
        {Array.from({ length: BLADES }).map((_, i) => (
          <polygon
            key={i}
            ref={(el) => {
              facesRef.current[i] = el
            }}
            fill={`url(#${uid}-${i % 2 ? "bladeA" : "bladeB"})`}
            stroke="rgba(0,0,0,0.55)"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        ))}
        {/* Aresta do furo com luz de borda */}
        <polygon ref={glowRef} fill="none" stroke="rgba(143,179,255,0.25)" strokeWidth="2.4" strokeLinejoin="round" />
        <polygon ref={holeRef} fill="none" stroke="rgba(200,215,255,0.75)" strokeWidth="0.45" strokeLinejoin="round" />
        {/* Vidro frontal: reflexo + tratamento antirreflexo */}
        <circle r={CLIP_R} fill={`url(#${uid}-glass)`} />
        <ellipse cx="18" cy="-46" rx="44" ry="7" fill={`url(#${uid}-coat)`} transform="rotate(-24)" opacity="0.7" />
      </g>
      <circle r={CLIP_R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" />
    </svg>
  )
}
