"use client"

import { useEffect } from "react"
import Lenis from "lenis"

/** Velocidade atual do scroll (px/frame), lida pelo HUD do visor. */
export const scrollState = { velocity: 0 }

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const lenis = new Lenis({ lerp: 0.09, autoRaf: true, anchors: { offset: -80 } })
    const off = lenis.on("scroll", (l: Lenis) => {
      scrollState.velocity = l.velocity
    })
    return () => {
      off()
      lenis.destroy()
      scrollState.velocity = 0
    }
  }, [])
  return null
}
