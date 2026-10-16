"use client"

import "./visor.css"
import type { ReactNode } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SmoothScroll } from "./smooth-scroll"
import { Viewfinder } from "./viewfinder"

/**
 * Casca padrão das páginas públicas no estilo "Visor": fundo grafite único,
 * scroll suave (Lenis), retículo de foco que percorre os títulos `data-af`,
 * HUD de visor no desktop e grão de filme. Ver components/visor/README.md.
 */
export function VisorShell({ children, viewfinder = true }: { children: ReactNode; viewfinder?: boolean }) {
  return (
    <div className="visor dark relative min-h-screen overflow-x-clip">
      <SmoothScroll />
      {viewfinder && <Viewfinder />}
      <div className="visor-grain" aria-hidden />
      <Header />
      <main>{children}</main>
      <div className="border-t border-[var(--visor-line)]">
        <Footer />
      </div>
    </div>
  )
}
