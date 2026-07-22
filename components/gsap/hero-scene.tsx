"use client"

import { ReactNode, useRef } from "react"
import { gsap, SplitText, useGSAP } from "@/lib/gsap"

interface HeroSceneProps extends React.HTMLAttributes<HTMLElement> {
    children: ReactNode
    className?: string
}

/**
 * Envolve a seção do hero e orquestra duas coisas com GSAP:
 *
 *  1. `[data-hero-heading]` — o título entra linha por linha saindo de dentro de
 *     uma máscara (SplitText com `mask: "lines"`). `autoSplit` re-divide as linhas
 *     sozinho quando a fonte termina de carregar ou a largura da tela muda.
 *  2. `[data-hero-item]` — os demais blocos entram em cascata na sequência.
 *  3. `[data-parallax="0.4"]` — o elemento se desloca no scroll na velocidade
 *     informada (0 = travado no conteúdo, 1 = anda uma tela inteira).
 *
 * Quem tem `prefers-reduced-motion: reduce` recebe tudo posicionado e visível,
 * sem cascata e sem parallax.
 */
export function HeroScene({
    children,
    className = "",
    ...rest
}: HeroSceneProps) {
    const scope = useRef<HTMLElement>(null)

    useGSAP(
        () => {
            const mm = gsap.matchMedia()

            mm.add("(prefers-reduced-motion: reduce)", () => {
                gsap.set("[data-hero-heading], [data-hero-item]", {
                    opacity: 1,
                    y: 0,
                    clearProps: "transform",
                })
            })

            mm.add("(prefers-reduced-motion: no-preference)", () => {
                const heading =
                    scope.current?.querySelector<HTMLElement>("[data-hero-heading]")

                if (heading) {
                    SplitText.create(heading, {
                        type: "lines",
                        mask: "lines",
                        autoSplit: true,
                        onSplit: (self) => {
                            // O h1 só fica visível depois de dividido, senão o texto
                            // pisca sem máscara entre a divisão e a animação.
                            gsap.set(heading, { opacity: 1 })
                            return gsap.fromTo(
                                self.lines,
                                { yPercent: 115, opacity: 0 },
                                {
                                    yPercent: 0,
                                    opacity: 1,
                                    duration: 0.95,
                                    stagger: 0.12,
                                    ease: "power3.out",
                                    delay: 0.15,
                                },
                            )
                        },
                    })
                }

                gsap.fromTo(
                    "[data-hero-item]",
                    { y: 28, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.75,
                        stagger: 0.13,
                        ease: "power3.out",
                        delay: 0.35,
                    },
                )

                gsap.utils
                    .toArray<HTMLElement>("[data-parallax]")
                    .forEach((el) => {
                        const speed = parseFloat(el.dataset.parallax || "0.3")
                        gsap.to(el, {
                            yPercent: speed * 100,
                            ease: "none",
                            scrollTrigger: {
                                trigger: scope.current,
                                start: "top top",
                                end: "bottom top",
                                scrub: true,
                            },
                        })
                    })

            })

            return () => mm.revert()
        },
        { scope },
    )

    return (
        <section ref={scope} className={className} {...rest}>
            {children}
        </section>
    )
}
