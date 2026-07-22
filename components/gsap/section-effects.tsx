"use client"

import { useEffect } from "react"
import { gsap, SplitText, ScrollTrigger } from "@/lib/gsap"

/**
 * Efeitos pontuais de seção, ligados por atributo — nenhum markup precisa ser
 * envolvido em JSX, então os `<h2>` e os ícones da home continuam como estavam.
 *
 *   [data-typed]                  → título entra sendo digitado, com cursor
 *   [data-icon-anim="search"]     → ícone varre, como quem procura sem achar
 *   [data-icon-anim="trend"]      → seta despenca e recomeça
 *   [data-icon-anim="clock"]      → ponteiro avança aos tiques
 */
export function SectionEffects() {
    useEffect(() => {
        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches

        const cleanups: Array<() => void> = []

        // ── Títulos digitados ───────────────────────────────────────────
        const typed = Array.from(
            document.querySelectorAll<HTMLElement>("[data-typed]"),
        )

        if (reduceMotion) {
            // Sem animação o título simplesmente já está escrito.
            typed.forEach((el) => el.classList.add("typed-done"))
        } else {
            // Dividir antes das fontes carregarem produz larguras erradas e o
            // texto "pula" quando a fonte chega.
            document.fonts.ready.then(() => {
                typed.forEach((el) => {
                    // "words,chars" e não só "chars": dividir apenas em
                    // caracteres faz o SplitText engolir o espaço que fecha um
                    // <span>, e o título saía "Cansado deperder".
                    const split = SplitText.create(el, {
                        type: "words,chars",
                        charsClass: "typed-char",
                        wordsClass: "typed-word",
                    })
                    el.classList.add("typed-ready")

                    const speed = 0.042
                    const tl = gsap.timeline({
                        scrollTrigger: {
                            trigger: el,
                            start: "top 82%",
                            once: true,
                        },
                    })

                    split.chars.forEach((char, i) => {
                        tl.call(
                            () => {
                                // O cursor acompanha o caractere que acabou de
                                // ser escrito, como numa máquina de escrever.
                                split.chars.forEach((c) =>
                                    c.classList.remove("is-caret"),
                                )
                                char.classList.add("is-on", "is-caret")
                            },
                            undefined,
                            i * speed,
                        )
                    })

                    // Terminou de digitar: o cursor pisca mais um pouco e sai.
                    tl.call(
                        () => {
                            gsap.delayedCall(1.8, () => {
                                split.chars.forEach((c) =>
                                    c.classList.remove("is-caret"),
                                )
                            })
                        },
                        undefined,
                        split.chars.length * speed,
                    )

                    cleanups.push(() => {
                        tl.scrollTrigger?.kill()
                        tl.kill()
                        split.revert()
                    })
                })

                ScrollTrigger.refresh()
            })
        }

        // ── Ícones ──────────────────────────────────────────────────────
        if (!reduceMotion) {
            const icons = Array.from(
                document.querySelectorAll<HTMLElement>("[data-icon-anim]"),
            )

            icons.forEach((icon) => {
                const kind = icon.dataset.iconAnim
                const common = {
                    scrollTrigger: { trigger: icon, start: "top 88%" },
                }

                let tween: gsap.core.Tween | gsap.core.Timeline | undefined

                if (kind === "search") {
                    // Varredura que nunca encontra nada: o ícone percorre um
                    // caminho e volta ao ponto de partida.
                    tween = gsap.to(icon, {
                        ...common,
                        keyframes: [
                            { x: -4, y: -3, duration: 0.6 },
                            { x: 4, y: -1, duration: 0.7 },
                            { x: 2, y: 4, duration: 0.6 },
                            { x: 0, y: 0, duration: 0.6 },
                        ],
                        ease: "power1.inOut",
                        repeat: -1,
                        repeatDelay: 1.6,
                    })
                }

                if (kind === "trend") {
                    // A seta cai e some; volta por cima para recomeçar.
                    tween = gsap
                        .timeline({
                            ...common,
                            repeat: -1,
                            repeatDelay: 1.4,
                        })
                        .fromTo(
                            icon,
                            { y: -5, opacity: 0.45 },
                            { y: 5, opacity: 1, duration: 1, ease: "power2.in" },
                        )
                        .to(icon, {
                            y: 9,
                            opacity: 0,
                            duration: 0.35,
                            ease: "power1.in",
                        })
                }

                if (kind === "clock") {
                    // Doze tiques por volta: o movimento é discreto, mas a
                    // leitura de "tempo passando" é imediata.
                    tween = gsap.to(icon, {
                        ...common,
                        rotation: 360,
                        duration: 14,
                        ease: "steps(12)",
                        repeat: -1,
                        transformOrigin: "50% 50%",
                    })
                }

                if (tween) {
                    cleanups.push(() => {
                        tween!.scrollTrigger?.kill()
                        tween!.kill()
                        gsap.set(icon, { clearProps: "all" })
                    })
                }
            })
        }

        // ── Números que contam de zero ──────────────────────────────────
        // O gatilho é a entrada na tela, e não o load da página: o painel
        // financeiro fica bem abaixo da dobra, então contar no load faria a
        // animação inteira acontecer sem ninguém ver.
        const counters = Array.from(
            document.querySelectorAll<HTMLElement>("[data-count]"),
        )

        counters.forEach((el) => {
            const target = parseFloat(el.dataset.count || "0")
            const decimals =
                el.dataset.countDecimals != null
                    ? parseInt(el.dataset.countDecimals, 10)
                    : 2
            const format = new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
            })

            if (reduceMotion) {
                el.textContent = format.format(target)
                return
            }

            // O gatilho é o painel inteiro, não cada número: com um gatilho
            // por elemento, os valores do rodapé do card ficavam zerados na
            // tela enquanto esperavam a própria vez de disparar.
            const trigger = el.closest<HTMLElement>("[data-count-scope]") || el

            // Zerar de saída só faz sentido se o número ainda está abaixo da
            // dobra; caso contrário o usuário veria o valor real virar zero.
            if (el.getBoundingClientRect().top > window.innerHeight) {
                el.textContent = format.format(0)
            }

            const counter = { value: 0 }

            const tween = gsap.to(counter, {
                value: target,
                duration: 1.9,
                ease: "power2.out",
                scrollTrigger: { trigger, start: "top 85%", once: true },
                onStart: () => {
                    el.textContent = format.format(0)
                },
                onUpdate: () => {
                    el.textContent = format.format(counter.value)
                },
            })

            cleanups.push(() => {
                tween.scrollTrigger?.kill()
                tween.kill()
            })
        })

        // ── Barras de progresso ─────────────────────────────────────────
        const bars = Array.from(
            document.querySelectorAll<HTMLElement>("[data-bar]"),
        )

        bars.forEach((el) => {
            const pct = parseFloat(el.dataset.bar || "0")

            if (reduceMotion) {
                el.style.width = `${pct}%`
                return
            }

            const trigger = el.closest<HTMLElement>("[data-count-scope]") || el

            const tween = gsap.fromTo(
                el,
                { width: "0%" },
                {
                    width: `${pct}%`,
                    duration: 1.9,
                    ease: "power2.out",
                    // Sem isto o GSAP zera a largura já na criação do tween, e
                    // a barra fica vazia antes mesmo de a seção entrar na tela.
                    immediateRender: false,
                    scrollTrigger: { trigger, start: "top 85%", once: true },
                },
            )

            cleanups.push(() => {
                tween.scrollTrigger?.kill()
                tween.kill()
            })
        })

        return () => cleanups.forEach((fn) => fn())
    }, [])

    return null
}
