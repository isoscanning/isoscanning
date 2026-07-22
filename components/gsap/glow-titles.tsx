"use client"

import { useEffect } from "react"
import { gsap } from "@/lib/gsap"
import { emitFieldPulse } from "@/lib/particle-bus"

/**
 * Liga o comportamento de hover em todo elemento marcado com `data-glow`.
 *
 * Não envolve nada em JSX de propósito: os títulos da home continuam sendo
 * `<h1>`/`<h2>` comuns, e o SplitText do GSAP que já atua no título do hero
 * não é perturbado. Basta acrescentar o atributo.
 *
 * Ao passar o mouse o título acende (via a custom property `--glow`, animada
 * pelo GSAP) e dispara uma onda de interferência que atravessa o campo de
 * partículas atrás da página.
 */
export function GlowTitles() {
    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
        if (!window.matchMedia("(hover: hover)").matches) return

        const targets = Array.from(
            document.querySelectorAll<HTMLElement>("[data-glow]"),
        )

        // Evita disparar uma onda a cada micro-movimento do cursor sobre o
        // título — só a primeira entrada conta.
        const cleanups = targets.map((el) => {
            const enter = (e: PointerEvent) => {
                gsap.to(el, {
                    "--glow": 1,
                    duration: 0.5,
                    ease: "power2.out",
                    overwrite: true,
                })
                emitFieldPulse(
                    e.clientX,
                    e.clientY,
                    parseFloat(el.dataset.glow || "1") || 1,
                )
            }

            const leave = () => {
                gsap.to(el, {
                    "--glow": 0,
                    duration: 0.7,
                    ease: "power2.out",
                    overwrite: true,
                })
            }

            el.addEventListener("pointerenter", enter)
            el.addEventListener("pointerleave", leave)

            return () => {
                el.removeEventListener("pointerenter", enter)
                el.removeEventListener("pointerleave", leave)
                gsap.killTweensOf(el)
            }
        })

        return () => cleanups.forEach((fn) => fn())
    }, [])

    return null
}
