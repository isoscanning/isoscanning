"use client"

import dynamic from "next/dynamic"
import { ParticleBackground } from "@/components/particle-background"

/**
 * O three.js pesa ~131 kB gzip mesmo tree-shaken, então ele NÃO pode entrar no
 * bundle inicial da home. Aqui ele vira um chunk separado, buscado só depois da
 * página ficar interativa — o First Load JS não muda e o LCP não é afetado.
 *
 * Enquanto o chunk não chega, mostra o canvas 2D que as outras 12 páginas já
 * usam, então a seção nunca fica vazia.
 */
export const ParticleFieldLazy = dynamic(
    () => import("./particle-field").then((m) => m.ParticleField),
    {
        ssr: false,
        loading: () => <ParticleBackground />,
    },
)
