"use client"

// Ponto único de registro do GSAP.
// Importar plugins a partir daqui evita registro duplicado e impede que o
// bundler faça tree-shaking dos plugins (que são usados só por efeito colateral).
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SplitText } from "gsap/SplitText"
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin"
import { useGSAP } from "@gsap/react"

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, useGSAP)
}

export { gsap, ScrollTrigger, SplitText, DrawSVGPlugin, useGSAP }
