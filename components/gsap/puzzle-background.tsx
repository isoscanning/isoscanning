"use client"

import { ReactNode, useMemo, useRef } from "react"
import { gsap, useGSAP } from "@/lib/gsap"

interface PuzzleBackgroundProps
    extends React.HTMLAttributes<HTMLDivElement> {
    children: ReactNode
    className?: string
    cols?: number
    rows?: number
}

/** Semente fixa: o recorte do quebra-cabeça precisa ser o mesmo no servidor e
 *  no cliente, senão a hidratação acusa diferença. */
function seededRandom(seed: number) {
    let s = seed
    return () => {
        s = (s * 1664525 + 1013904223) % 4294967296
        return s / 4294967296
    }
}

/**
 * Monta o contorno de UMA peça.
 *
 * Cada lado é reto (quando encosta na borda do tabuleiro) ou tem um encaixe.
 * O encaixe é um arco de círculo grande o bastante para fechar quase uma volta
 * — é isso que dá a silhueta clássica de peça de quebra-cabeça. O sinal do
 * arco de uma peça é sempre o oposto do da vizinha, então macho e fêmea se
 * correspondem e o tabuleiro fecha sem folga.
 */
function piecePath(
    x: number,
    y: number,
    w: number,
    h: number,
    tabs: { top: number; right: number; bottom: number; left: number },
) {
    const d: string[] = [`M ${x} ${y}`]

    // Cada lado é percorrido no sentido horário.
    const side = (
        ax: number,
        ay: number,
        bx: number,
        by: number,
        tab: number,
    ) => {
        if (tab === 0) {
            d.push(`L ${bx} ${by}`)
            return
        }
        const ux = bx - ax
        const uy = by - ay
        const len = Math.hypot(ux, uy)
        const nx = ux / len
        const ny = uy / len

        const p1x = ax + nx * len * 0.42
        const p1y = ay + ny * len * 0.42
        const p2x = ax + nx * len * 0.58
        const p2y = ay + ny * len * 0.58
        const r = len * 0.115 // > metade da corda (0.08), senão o arco não fecha

        d.push(`L ${p1x} ${p1y}`)
        d.push(
            `A ${r} ${r} 0 1 ${tab > 0 ? 1 : 0} ${p2x} ${p2y}`,
        )
        d.push(`L ${bx} ${by}`)
    }

    side(x, y, x + w, y, tabs.top)
    side(x + w, y, x + w, y + h, tabs.right)
    side(x + w, y + h, x, y + h, tabs.bottom)
    side(x, y + h, x, y, tabs.left)
    d.push("Z")

    return d.join(" ")
}

/**
 * Fundo de seção em que peças de quebra-cabeça se montam conforme a seção
 * entra na tela.
 *
 * Substitui o gradiente roxo/rosa do <GradientBackground variant="vibrant" />,
 * que estava fora da paleta do sistema. Aqui só há azul: azul-escuro no tema
 * escuro, azul claro no tema claro — o tema claro precisa continuar claro,
 * senão o texto da seção, que usa as cores do tema, ficaria ilegível.
 *
 * É SVG e não WebGL de propósito: são ~48 formas estáticas, e um canvas 3D
 * aqui seria pagar caro por algo que o navegador desenha de graça.
 */
export function PuzzleBackground({
    children,
    className = "",
    cols = 8,
    rows = 5,
    ...rest
}: PuzzleBackgroundProps) {
    const scope = useRef<HTMLDivElement>(null)

    const { pieces, width, height } = useMemo(() => {
        const w = 100
        const h = (rows / cols) * 100
        const pw = w / cols
        const ph = h / rows
        const rand = seededRandom(20260721)

        // Sorteia o sentido de cada encaixe UMA vez por aresta interna; as duas
        // peças que a compartilham leem o mesmo valor com sinais opostos.
        const vertical: number[][] = [] // arestas entre colunas
        const horizontal: number[][] = [] // arestas entre linhas
        for (let r = 0; r < rows; r++) {
            vertical[r] = []
            for (let c = 0; c < cols - 1; c++) {
                vertical[r][c] = rand() > 0.5 ? 1 : -1
            }
        }
        for (let r = 0; r < rows - 1; r++) {
            horizontal[r] = []
            for (let c = 0; c < cols; c++) {
                horizontal[r][c] = rand() > 0.5 ? 1 : -1
            }
        }

        const list: {
            d: string
            cx: number
            cy: number
            tone: number
        }[] = []

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                list.push({
                    d: piecePath(c * pw, r * ph, pw, ph, {
                        top: r === 0 ? 0 : -horizontal[r - 1][c],
                        right: c === cols - 1 ? 0 : vertical[r][c],
                        bottom: r === rows - 1 ? 0 : horizontal[r][c],
                        left: c === 0 ? 0 : -vertical[r][c - 1],
                    }),
                    cx: (c + 0.5) * pw,
                    cy: (r + 0.5) * ph,
                    tone: rand(),
                })
            }
        }

        return { pieces: list, width: w, height: h }
    }, [cols, rows])

    useGSAP(
        () => {
            const root = scope.current
            if (!root) return

            const pieceEls = gsap.utils.toArray<SVGPathElement>("[data-piece]")
            const coreEls = gsap.utils.toArray<SVGPathElement>("[data-spark]")
            const haloEls = gsap.utils.toArray<SVGPathElement>("[data-halo]")

            const mm = gsap.matchMedia()

            mm.add("(prefers-reduced-motion: reduce)", () => {
                gsap.set(pieceEls, {
                    opacity: 1,
                    scale: 1,
                    x: 0,
                    y: 0,
                    rotate: 0,
                })
                gsap.set([...coreEls, ...haloEls], { opacity: 0 })
            })

            mm.add("(prefers-reduced-motion: no-preference)", () => {
                const LAND = 1.5 // tempo de voo de cada peça
                const EACH = 0.075 // intervalo entre uma peça e a seguinte
                const SPARK = 0.6 // duração do arco elétrico

                gsap.set([...coreEls, ...haloEls], { opacity: 0 })

                // A ordem é embaralhada por semente, e não pelo `from: "random"`
                // do stagger, porque precisamos saber QUANDO cada peça assenta
                // para disparar a faísca dela no instante exato do encaixe.
                const order = pieceEls.map((_, i) => i)
                const rand = seededRandom(987654321)
                for (let i = order.length - 1; i > 0; i--) {
                    const j = Math.floor(rand() * (i + 1))
                    ;[order[i], order[j]] = [order[j], order[i]]
                }

                const tl = gsap.timeline({
                    scrollTrigger: {
                        trigger: root,
                        start: "top 78%",
                        once: true,
                    },
                })

                order.forEach((pieceIndex, step) => {
                    const at = step * EACH
                    const piece = pieceEls[pieceIndex]

                    tl.fromTo(
                        piece,
                        {
                            opacity: 0,
                            scale: 0.55,
                            x: (pieceIndex % 5) * 9 - 18,
                            y: ((pieceIndex % 7) - 3) * 7,
                            rotate: ((pieceIndex % 9) - 4) * 7,
                        },
                        {
                            opacity: 1,
                            scale: 1,
                            x: 0,
                            y: 0,
                            rotate: 0,
                            duration: LAND,
                            ease: "power3.out",
                        },
                        at,
                    )

                    // O choque: a peça está praticamente assentada, e uma
                    // descarga percorre o contorno dela. O drawSVG anima de
                    // "0% 14%" até "86% 100%", ou seja, um trecho curto que
                    // viaja ao longo do traçado em vez de desenhá-lo inteiro.
                    const impact = at + LAND * 0.78
                    const core = coreEls[pieceIndex]
                    const halo = haloEls[pieceIndex]

                    tl.fromTo(
                        [halo, core],
                        { drawSVG: "0% 14%", opacity: 1 },
                        {
                            drawSVG: "86% 100%",
                            duration: SPARK,
                            ease: "power1.inOut",
                            // Sem isto o GSAP aplica o estado inicial já na
                            // criação do tween, e as 40 faíscas acendem todas
                            // juntas antes da primeira peça sequer voar.
                            immediateRender: false,
                        },
                        impact,
                    ).to(
                        [halo, core],
                        { opacity: 0, duration: 0.28, ease: "power2.out" },
                        impact + SPARK * 0.72,
                    )
                })
            })

            return () => mm.revert()
        },
        { scope },
    )

    return (
        <div
            ref={scope}
            {...rest}
            className={`relative overflow-hidden bg-slate-100 dark:bg-[#060c18] ${className}`}
        >
            <svg
                aria-hidden="true"
                className="absolute inset-0 h-full w-full"
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="xMidYMid slice"
            >
                {/* Peças. Os traços são propositalmente quase da mesma cor do
                    preenchimento: as junções ficam sugeridas, não riscadas. */}
                {pieces.map((piece, i) => (
                    <path
                        key={`piece-${i}`}
                        data-piece
                        d={piece.d}
                        // transform-box: fill-box faz o GSAP girar/escalar cada
                        // peça em torno do próprio centro, e não da origem do SVG.
                        style={{
                            transformBox: "fill-box",
                            transformOrigin: "center",
                        }}
                        className={
                            piece.tone > 0.72
                                ? "fill-blue-200/60 stroke-blue-300/25 dark:fill-[#101d33] dark:stroke-[#16273f]"
                                : piece.tone > 0.4
                                  ? "fill-blue-100/60 stroke-blue-200/25 dark:fill-[#0b1526] dark:stroke-[#12203a]"
                                  : "fill-slate-50/50 stroke-blue-200/20 dark:fill-[#08111f] dark:stroke-[#101c30]"
                        }
                        strokeWidth={0.11}
                    />
                ))}

                {/* Descarga: um halo largo e translúcido por baixo, um núcleo
                    fino e brilhante por cima. Dois traçados custam bem menos
                    que um filtro SVG de desfoque animado em 40 elementos. */}
                {pieces.map((piece, i) => (
                    <path
                        key={`halo-${i}`}
                        data-halo
                        d={piece.d}
                        fill="none"
                        strokeLinecap="round"
                        className="stroke-blue-400/25 dark:stroke-sky-400/25"
                        strokeWidth={1.1}
                        opacity={0}
                    />
                ))}
                {pieces.map((piece, i) => (
                    <path
                        key={`core-${i}`}
                        data-spark
                        d={piece.d}
                        fill="none"
                        strokeLinecap="round"
                        className="stroke-blue-500 dark:stroke-sky-200"
                        strokeWidth={0.3}
                        opacity={0}
                    />
                ))}
            </svg>

            <div className="relative z-10">{children}</div>
        </div>
    )
}
