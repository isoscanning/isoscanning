"use client"

import { useRef } from "react"
import type { LucideIcon } from "lucide-react"
import { gsap, useGSAP } from "@/lib/gsap"

export interface Step {
    step: number
    title: string
    desc: string
    icon: LucideIcon
}

/**
 * Os 4 passos do "Como Funciona" ligados por um traço que o DrawSVG desenha
 * conforme a pessoa rola, acendendo cada passo no momento em que a linha o
 * alcança. Substitui as divs de gradiente estáticas que existiam antes.
 *
 * A linha só aparece a partir de `md` — no mobile o grid vira uma coluna só.
 * Com `prefers-reduced-motion: reduce` tudo já nasce desenhado e visível.
 */
export function StepsPath({ steps }: { steps: Step[] }) {
    const scope = useRef<HTMLDivElement>(null)

    useGSAP(
        () => {
            const mm = gsap.matchMedia()

            mm.add("(prefers-reduced-motion: reduce)", () => {
                gsap.set("[data-step]", { opacity: 1, y: 0 })
                gsap.set("[data-steps-line]", { opacity: 1, drawSVG: "100%" })
            })

            mm.add("(prefers-reduced-motion: no-preference)", () => {
                const tl = gsap.timeline({
                    scrollTrigger: {
                        trigger: scope.current,
                        start: "top 78%",
                        end: "bottom 65%",
                        scrub: 0.6,
                    },
                })

                tl.set("[data-steps-line]", { opacity: 1 }, 0).fromTo(
                    "[data-steps-line]",
                    { drawSVG: "0%" },
                    { drawSVG: "100%", ease: "none", duration: 1.05 },
                    0,
                )

                gsap.utils
                    .toArray<HTMLElement>("[data-step]")
                    .forEach((el, i) => {
                        tl.fromTo(
                            el,
                            { opacity: 0, y: 32 },
                            {
                                opacity: 1,
                                y: 0,
                                duration: 0.3,
                                ease: "power2.out",
                            },
                            i * 0.25,
                        )
                    })
            })

            return () => mm.revert()
        },
        { scope },
    )

    return (
        <div ref={scope} className="relative">
            {/* Traço ligando o centro do 1º ícone ao centro do último.
                Em um grid de 4 colunas os centros ficam em 12.5% e 87.5%.
                top-10 = metade da altura do ícone (h-20). */}
            <svg
                aria-hidden="true"
                className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] w-auto h-1 text-primary/45 overflow-visible pointer-events-none"
                viewBox="0 0 1000 4"
                preserveAspectRatio="none"
            >
                <line
                    data-steps-line
                    x1="0"
                    y1="2"
                    x2="1000"
                    y2="2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {steps.map((item) => (
                    <div
                        key={item.step}
                        data-step
                        className="relative text-center group"
                    >
                        <div className="relative z-10">
                            <div className="h-20 w-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25 group-hover:scale-110 transition-transform duration-300">
                                <item.icon className="h-10 w-10 text-primary-foreground" />
                            </div>
                            <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-background border-2 border-primary flex items-center justify-center font-bold text-primary">
                                {item.step}
                            </div>
                        </div>

                        <h3 className="text-xl font-bold mt-6 mb-2">{item.title}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            {item.desc}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}
